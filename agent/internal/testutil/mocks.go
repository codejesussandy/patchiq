package testutil

import (
	"context"
	"errors"
	"io"
	"net/http"
	"strings"
	"sync"
	"time"
)

// MockCommandExecutor mocks command execution for testing executors
type MockCommandExecutor struct {
	mu       sync.Mutex
	Commands []string
	Outputs  map[string]string
	Errors   map[string]error
	Delays   map[string]time.Duration
}

// NewMockCommandExecutor creates a new mock command executor
func NewMockCommandExecutor() *MockCommandExecutor {
	return &MockCommandExecutor{
		Commands: []string{},
		Outputs:  make(map[string]string),
		Errors:   make(map[string]error),
		Delays:   make(map[string]time.Duration),
	}
}

// SetOutput sets the output for a command pattern
func (m *MockCommandExecutor) SetOutput(cmdPattern string, output string) {
	m.mu.Lock()
	defer m.mu.Unlock()
	m.Outputs[cmdPattern] = output
}

// SetError sets an error for a command pattern
func (m *MockCommandExecutor) SetError(cmdPattern string, err error) {
	m.mu.Lock()
	defer m.mu.Unlock()
	m.Errors[cmdPattern] = err
}

// SetDelay sets a delay for a command pattern
func (m *MockCommandExecutor) SetDelay(cmdPattern string, delay time.Duration) {
	m.mu.Lock()
	defer m.mu.Unlock()
	m.Delays[cmdPattern] = delay
}

// ExecuteCommand executes a mocked command
func (m *MockCommandExecutor) ExecuteCommand(ctx context.Context, name string, args ...string) (string, error) {
	m.mu.Lock()
	defer m.mu.Unlock()

	fullCmd := name + " " + strings.Join(args, " ")
	m.Commands = append(m.Commands, fullCmd)

	// Check for exact match first
	if delay, ok := m.Delays[fullCmd]; ok {
		m.mu.Unlock()
		select {
		case <-time.After(delay):
		case <-ctx.Done():
			m.mu.Lock()
			return "", ctx.Err()
		}
		m.mu.Lock()
	}

	if output, ok := m.Outputs[fullCmd]; ok {
		err := m.Errors[fullCmd]
		return output, err
	}

	// Check for pattern match
	for pattern := range m.Outputs {
		if strings.Contains(fullCmd, pattern) {
			if delay, ok := m.Delays[pattern]; ok {
				m.mu.Unlock()
				select {
				case <-time.After(delay):
				case <-ctx.Done():
					m.mu.Lock()
					return "", ctx.Err()
				}
				m.mu.Lock()
			}

			output := m.Outputs[pattern]
			err := m.Errors[pattern]
			return output, err
		}
	}

	return "", nil
}

// GetCommands returns a copy of executed commands
func (m *MockCommandExecutor) GetCommands() []string {
	m.mu.Lock()
	defer m.mu.Unlock()
	return append([]string{}, m.Commands...)
}

// Reset clears all recorded commands and configured outputs/errors
func (m *MockCommandExecutor) Reset() {
	m.mu.Lock()
	defer m.mu.Unlock()
	m.Commands = []string{}
	m.Outputs = make(map[string]string)
	m.Errors = make(map[string]error)
	m.Delays = make(map[string]time.Duration)
}

// MockHTTPClient mocks HTTP requests for testing backend communication
type MockHTTPClient struct {
	mu          sync.Mutex
	Requests    []MockRequest
	Responses   map[string]*MockResponse
	Errors      map[string]error
	Delays      map[string]time.Duration
}

// MockRequest represents a captured HTTP request
type MockRequest struct {
	Method string
	URL    string
	Body   string
	Time   time.Time
}

// MockResponse represents a mocked HTTP response
type MockResponse struct {
	StatusCode int
	Body       []byte
	Headers    map[string]string
}

// NewMockHTTPClient creates a new mock HTTP client
func NewMockHTTPClient() *MockHTTPClient {
	return &MockHTTPClient{
		Requests:  []MockRequest{},
		Responses: make(map[string]*MockResponse),
		Errors:    make(map[string]error),
		Delays:    make(map[string]time.Duration),
	}
}

// SetResponse sets a mocked response for a URL pattern
func (m *MockHTTPClient) SetResponse(url string, body []byte, statusCode int) {
	m.mu.Lock()
	defer m.mu.Unlock()
	m.Responses[url] = &MockResponse{
		StatusCode: statusCode,
		Body:       body,
		Headers:    make(map[string]string),
	}
}

// SetResponseWithHeaders sets a mocked response with custom headers
func (m *MockHTTPClient) SetResponseWithHeaders(url string, body []byte, statusCode int, headers map[string]string) {
	m.mu.Lock()
	defer m.mu.Unlock()
	m.Responses[url] = &MockResponse{
		StatusCode: statusCode,
		Body:       body,
		Headers:    headers,
	}
}

// SetError sets an error for a URL pattern
func (m *MockHTTPClient) SetError(url string, err error) {
	m.mu.Lock()
	defer m.mu.Unlock()
	m.Errors[url] = err
}

// SetDelay sets a delay for a URL pattern
func (m *MockHTTPClient) SetDelay(url string, delay time.Duration) {
	m.mu.Lock()
	defer m.mu.Unlock()
	m.Delays[url] = delay
}

// Do executes a mocked HTTP request
func (m *MockHTTPClient) Do(req *http.Request) (*http.Response, error) {
	m.mu.Lock()
	defer m.mu.Unlock()

	url := req.URL.String()

	// Record request
	bodyBytes := []byte{}
	if req.Body != nil {
		bodyBytes, _ = io.ReadAll(req.Body)
	}

	m.Requests = append(m.Requests, MockRequest{
		Method: req.Method,
		URL:    url,
		Body:   string(bodyBytes),
		Time:   time.Now(),
	})

	// Check for delay
	if delay, ok := m.Delays[url]; ok {
		m.mu.Unlock()
		time.Sleep(delay)
		m.mu.Lock()
	}

	// Check for error
	if err, ok := m.Errors[url]; ok {
		return nil, err
	}

	// Check for exact match
	if resp, ok := m.Responses[url]; ok {
		return &http.Response{
			StatusCode: resp.StatusCode,
			Body:       io.NopCloser(strings.NewReader(string(resp.Body))),
			Header:     makeHeader(resp.Headers),
		}, nil
	}

	// Check for pattern match
	for pattern, resp := range m.Responses {
		if strings.Contains(url, pattern) {
			return &http.Response{
				StatusCode: resp.StatusCode,
				Body:       io.NopCloser(strings.NewReader(string(resp.Body))),
				Header:     makeHeader(resp.Headers),
			}, nil
		}
	}

	// Default: 404 Not Found
	return &http.Response{
		StatusCode: 404,
		Body:       io.NopCloser(strings.NewReader("Not Found")),
		Header:     http.Header{},
	}, nil
}

// GetRequests returns a copy of all captured requests
func (m *MockHTTPClient) GetRequests() []MockRequest {
	m.mu.Lock()
	defer m.mu.Unlock()
	return append([]MockRequest{}, m.Requests...)
}

// Reset clears all recorded requests and configured responses/errors
func (m *MockHTTPClient) Reset() {
	m.mu.Lock()
	defer m.mu.Unlock()
	m.Requests = []MockRequest{}
	m.Responses = make(map[string]*MockResponse)
	m.Errors = make(map[string]error)
	m.Delays = make(map[string]time.Duration)
}

// makeHeader creates an http.Header from a string map
func makeHeader(headers map[string]string) http.Header {
	h := http.Header{}
	for k, v := range headers {
		h.Set(k, v)
	}
	return h
}

// MockFileSystem mocks file system operations
type MockFileSystem struct {
	mu    sync.Mutex
	Files map[string][]byte
	Dirs  map[string]bool
}

// NewMockFileSystem creates a new mock file system
func NewMockFileSystem() *MockFileSystem {
	return &MockFileSystem{
		Files: make(map[string][]byte),
		Dirs:  make(map[string]bool),
	}
}

// WriteFile writes a file to the mock filesystem
func (m *MockFileSystem) WriteFile(path string, data []byte) error {
	m.mu.Lock()
	defer m.mu.Unlock()
	m.Files[path] = data
	return nil
}

// ReadFile reads a file from the mock filesystem
func (m *MockFileSystem) ReadFile(path string) ([]byte, error) {
	m.mu.Lock()
	defer m.mu.Unlock()
	if data, ok := m.Files[path]; ok {
		return data, nil
	}
	return nil, errors.New("file not found")
}

// FileExists checks if a file exists in the mock filesystem
func (m *MockFileSystem) FileExists(path string) bool {
	m.mu.Lock()
	defer m.mu.Unlock()
	_, ok := m.Files[path]
	return ok
}

// DirExists checks if a directory exists in the mock filesystem
func (m *MockFileSystem) DirExists(path string) bool {
	m.mu.Lock()
	defer m.mu.Unlock()
	return m.Dirs[path]
}

// MkdirAll creates a directory in the mock filesystem
func (m *MockFileSystem) MkdirAll(path string) error {
	m.mu.Lock()
	defer m.mu.Unlock()
	m.Dirs[path] = true
	return nil
}

// Reset clears all files and directories
func (m *MockFileSystem) Reset() {
	m.mu.Lock()
	defer m.mu.Unlock()
	m.Files = make(map[string][]byte)
	m.Dirs = make(map[string]bool)
}
