package main

import (
	"bufio"
	"context"
	"fmt"
	"net/http"
	urlpkg "net/url"
	"os"
	"path/filepath"
	"strconv"
	"strings"
	"time"

	"github.com/patchify/agent/internal/config"
)

// validateURL validates that a string is a valid HTTP/HTTPS URL
func validateURL(urlStr string) error {
	if urlStr == "" {
		return fmt.Errorf("URL cannot be empty")
	}

	if !strings.HasPrefix(urlStr, "http://") && !strings.HasPrefix(urlStr, "https://") {
		return fmt.Errorf("URL must start with http:// or https://")
	}

	parsed, err := urlpkg.Parse(urlStr)
	if err != nil {
		return fmt.Errorf("invalid URL format: %w", err)
	}

	if parsed.Host == "" {
		return fmt.Errorf("URL must include a host")
	}

	return nil
}

// validatePort validates that a string is a valid port number (1-65535)
func validatePort(portStr string) error {
	if portStr == "" {
		return fmt.Errorf("port cannot be empty")
	}

	port, err := strconv.Atoi(portStr)
	if err != nil {
		return fmt.Errorf("port must be a number")
	}

	if port < 1 || port > 65535 {
		return fmt.Errorf("port must be between 1 and 65535")
	}

	return nil
}

// testServerConnectivity tests if the server URL is reachable
func testServerConnectivity(serverURL string) error {
	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	// Try health endpoint first
	healthURL := serverURL + "/health"
	req, err := http.NewRequestWithContext(ctx, "GET", healthURL, nil)
	if err != nil {
		return fmt.Errorf("failed to create request: %w", err)
	}

	resp, err := http.DefaultClient.Do(req)
	if err != nil {
		return fmt.Errorf("cannot connect to server: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode < 200 || resp.StatusCode >= 300 {
		return fmt.Errorf("server returned status %d", resp.StatusCode)
	}

	return nil
}

// readLine reads a line from stdin, trimming whitespace
func readLine(reader *bufio.Reader) string {
	line, _ := reader.ReadString('\n')
	return strings.TrimSpace(line)
}

// runSetupWizard runs the interactive configuration wizard
func runSetupWizard() {
	fmt.Println(`
╔═══════════════════════════════════════════════════╗
║         Patchify Agent Setup Wizard               ║
╚═══════════════════════════════════════════════════╝
`)

	homeDir, _ := os.UserHomeDir()
	configPath := filepath.Join(homeDir, ".patchify-agent", "config.json")

	// Load existing config or create default
	cfg := config.DefaultConfig()
	if existingCfg, err := config.Load(configPath); err == nil && existingCfg != nil {
		cfg = existingCfg
		fmt.Printf("Found existing configuration at %s\n\n", configPath)
	}

	reader := bufio.NewReader(os.Stdin)

	// Prompt for server URL with validation
	for {
		defaultURL := cfg.ServerURL
		if defaultURL == "" {
			defaultURL = "http://dev.skenzeriq.com:5173/api"
		}
		fmt.Printf("Enter PatchIQ Server URL [%s]: ", defaultURL)
		serverURL := readLine(reader)
		if serverURL == "" {
			serverURL = defaultURL
		}

		// Validate URL format
		if err := validateURL(serverURL); err != nil {
			fmt.Printf("❌ Invalid URL: %v. Please try again.\n\n", err)
			continue
		}

		// Test connectivity
		fmt.Println("Testing connectivity...")
		if err := testServerConnectivity(serverURL); err != nil {
			fmt.Printf("⚠️  Connectivity test failed: %v\n", err)
			fmt.Print("Do you want to use this URL anyway? (y/n): ")
			override := readLine(reader)
			if override != "y" && override != "Y" {
				fmt.Println()
				continue
			}
		} else {
			fmt.Println("✓ Connection successful")
		}

		cfg.ServerURL = serverURL
		break
	}

	// Prompt for Web UI port with validation
	for {
		fmt.Printf("\nEnter Web UI Port [%d]: ", cfg.WebUIPort)
		portStr := readLine(reader)
		if portStr == "" {
			// Keep default
			break
		}

		if err := validatePort(portStr); err != nil {
			fmt.Printf("❌ Invalid port: %v. Please try again.\n", err)
			continue
		}

		port, _ := strconv.Atoi(portStr)
		cfg.WebUIPort = port
		break
	}

	// Prompt for proxy settings
	defaultProxy := cfg.ProxyURL
	if defaultProxy == "" {
		defaultProxy = "none"
	}
	fmt.Printf("\nHTTP Proxy URL [%s]: ", defaultProxy)
	proxyInput := readLine(reader)
	if proxyInput == "" {
		proxyInput = defaultProxy
	}

	if proxyInput != "none" && proxyInput != "" {
		// Validate proxy URL
		if err := validateURL(proxyInput); err != nil {
			fmt.Printf("⚠️  Invalid proxy URL: %v (continuing without proxy)\n", err)
			cfg.ProxyURL = ""
		} else {
			cfg.ProxyURL = proxyInput
			// Ask for proxy auth
			fmt.Printf("Proxy Username (leave blank for none) [%s]: ", cfg.ProxyUser)
			proxyUserInput := readLine(reader)
			if proxyUserInput != "" {
				cfg.ProxyUser = proxyUserInput
				fmt.Print("Proxy Password: ")
				proxyPassInput := readLine(reader)
				if proxyPassInput != "" {
					cfg.ProxyPassword = proxyPassInput
				}
			}
		}
	} else {
		cfg.ProxyURL = ""
		cfg.ProxyUser = ""
		cfg.ProxyPassword = ""
	}

	// Show summary
	fmt.Println("\n─────────────────────────────────────────────────────")
	fmt.Println("Configuration Summary:")
	fmt.Printf("  Server URL:  %s\n", cfg.ServerURL)
	fmt.Printf("  Web UI Port: %d\n", cfg.WebUIPort)
	if cfg.ProxyURL != "" {
		fmt.Printf("  Proxy:       %s\n", cfg.ProxyURL)
		if cfg.ProxyUser != "" {
			fmt.Printf("  Proxy Auth:  %s:****\n", cfg.ProxyUser)
		}
	} else {
		fmt.Printf("  Proxy:       none\n")
	}
	fmt.Printf("  Config File: %s\n", configPath)
	fmt.Println("─────────────────────────────────────────────────────")

	// Save config
	if err := cfg.Save(configPath); err != nil {
		fmt.Printf("\n❌ Failed to save configuration: %v\n", err)
		os.Exit(1)
	}

	fmt.Println("\n✓ Configuration saved successfully!")
	fmt.Println("\nTo start the agent, run:")
	fmt.Println("  ./patchify-agent")
	fmt.Println("\nOr to start with a different server:")
	fmt.Println("  ./patchify-agent --server http://your-server:5001/api")
}
