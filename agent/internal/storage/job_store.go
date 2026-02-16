package storage

import (
	"database/sql"
	"encoding/json"
	"fmt"
	"time"

	_ "github.com/mattn/go-sqlite3"
)

// JobHistoryEntry represents a command execution record
type JobHistoryEntry struct {
	ID           string                 `json:"id"`
	Type         string                 `json:"type"`
	Payload      map[string]interface{} `json:"payload,omitempty"`
	Status       string                 `json:"status"`
	Result       map[string]interface{} `json:"result,omitempty"`
	ErrorMessage string                 `json:"errorMessage,omitempty"`
	StartedAt    time.Time              `json:"startedAt"`
	CompletedAt  *time.Time             `json:"completedAt,omitempty"`
}

// JobStore manages persistent job history using SQLite
type JobStore struct {
	db *sql.DB
}

// NewJobStore creates a new job store with SQLite backend
func NewJobStore(dbPath string) (*JobStore, error) {
	db, err := sql.Open("sqlite3", dbPath)
	if err != nil {
		return nil, fmt.Errorf("failed to open database: %w", err)
	}

	// Enable WAL mode for better concurrency
	if _, err := db.Exec("PRAGMA journal_mode=WAL"); err != nil {
		return nil, fmt.Errorf("failed to enable WAL mode: %w", err)
	}

	// Create schema
	schema := `
	CREATE TABLE IF NOT EXISTS jobs (
		id TEXT PRIMARY KEY,
		type TEXT NOT NULL,
		payload TEXT,
		status TEXT NOT NULL,
		result TEXT,
		error_message TEXT,
		started_at TIMESTAMP NOT NULL,
		completed_at TIMESTAMP,
		created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
	);

	CREATE INDEX IF NOT EXISTS idx_started_at ON jobs(started_at DESC);
	CREATE INDEX IF NOT EXISTS idx_status ON jobs(status);
	CREATE INDEX IF NOT EXISTS idx_type ON jobs(type);
	CREATE INDEX IF NOT EXISTS idx_completed_at ON jobs(completed_at DESC);
	`

	if _, err := db.Exec(schema); err != nil {
		return nil, fmt.Errorf("failed to create schema: %w", err)
	}

	return &JobStore{db: db}, nil
}

// Save saves or updates a job entry
func (s *JobStore) Save(job JobHistoryEntry) error {
	payloadJSON, _ := json.Marshal(job.Payload)
	resultJSON, _ := json.Marshal(job.Result)

	query := `
	INSERT OR REPLACE INTO jobs
	(id, type, payload, status, result, error_message, started_at, completed_at)
	VALUES (?, ?, ?, ?, ?, ?, ?, ?)
	`

	_, err := s.db.Exec(query,
		job.ID,
		job.Type,
		string(payloadJSON),
		job.Status,
		string(resultJSON),
		job.ErrorMessage,
		job.StartedAt,
		job.CompletedAt,
	)

	return err
}

// Get retrieves a job by ID
func (s *JobStore) Get(id string) (*JobHistoryEntry, error) {
	query := `
	SELECT id, type, payload, status, result, error_message, started_at, completed_at
	FROM jobs
	WHERE id = ?
	`

	var job JobHistoryEntry
	var payloadJSON, resultJSON sql.NullString
	var completedAt sql.NullTime

	err := s.db.QueryRow(query, id).Scan(
		&job.ID,
		&job.Type,
		&payloadJSON,
		&job.Status,
		&resultJSON,
		&job.ErrorMessage,
		&job.StartedAt,
		&completedAt,
	)

	if err != nil {
		return nil, err
	}

	if payloadJSON.Valid {
		json.Unmarshal([]byte(payloadJSON.String), &job.Payload)
	}

	if resultJSON.Valid {
		json.Unmarshal([]byte(resultJSON.String), &job.Result)
	}

	if completedAt.Valid {
		job.CompletedAt = &completedAt.Time
	}

	return &job, nil
}

// List retrieves jobs with pagination
func (s *JobStore) List(limit, offset int) ([]JobHistoryEntry, error) {
	query := `
	SELECT id, type, payload, status, result, error_message, started_at, completed_at
	FROM jobs
	ORDER BY started_at DESC
	LIMIT ? OFFSET ?
	`

	rows, err := s.db.Query(query, limit, offset)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var jobs []JobHistoryEntry
	for rows.Next() {
		var job JobHistoryEntry
		var payloadJSON, resultJSON sql.NullString
		var completedAt sql.NullTime

		err := rows.Scan(
			&job.ID,
			&job.Type,
			&payloadJSON,
			&job.Status,
			&resultJSON,
			&job.ErrorMessage,
			&job.StartedAt,
			&completedAt,
		)

		if err != nil {
			continue
		}

		if payloadJSON.Valid {
			json.Unmarshal([]byte(payloadJSON.String), &job.Payload)
		}

		if resultJSON.Valid {
			json.Unmarshal([]byte(resultJSON.String), &job.Result)
		}

		if completedAt.Valid {
			job.CompletedAt = &completedAt.Time
		}

		jobs = append(jobs, job)
	}

	return jobs, nil
}

// Cleanup deletes jobs older than specified days
func (s *JobStore) Cleanup(retentionDays int) (int64, error) {
	query := `DELETE FROM jobs WHERE started_at < ?`
	cutoff := time.Now().AddDate(0, 0, -retentionDays)

	result, err := s.db.Exec(query, cutoff)
	if err != nil {
		return 0, err
	}

	return result.RowsAffected()
}

// Close closes the database connection
func (s *JobStore) Close() error {
	return s.db.Close()
}

// Count returns total number of jobs
func (s *JobStore) Count() (int, error) {
	var count int
	err := s.db.QueryRow("SELECT COUNT(*) FROM jobs").Scan(&count)
	return count, err
}

// CountByStatus returns job count by status
func (s *JobStore) CountByStatus(status string) (int, error) {
	var count int
	err := s.db.QueryRow("SELECT COUNT(*) FROM jobs WHERE status = ?", status).Scan(&count)
	return count, err
}
