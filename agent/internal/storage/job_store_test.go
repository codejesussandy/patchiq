package storage

import (
	"path/filepath"
	"testing"
	"time"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func newTestStore(t *testing.T) *JobStore {
	t.Helper()
	dbPath := filepath.Join(t.TempDir(), "test.db")
	store, err := NewJobStore(dbPath)
	require.NoError(t, err)
	t.Cleanup(func() { store.Close() })
	return store
}

func makeJob(id, jobType, status string) JobHistoryEntry {
	now := time.Now()
	return JobHistoryEntry{
		ID:        id,
		Type:      jobType,
		Status:    status,
		StartedAt: now,
		Payload:   map[string]interface{}{"key": "value"},
	}
}

func TestNewJobStore_Success(t *testing.T) {
	t.Parallel()
	store := newTestStore(t)
	assert.NotNil(t, store)
}

func TestNewJobStore_InvalidPath(t *testing.T) {
	t.Parallel()
	_, err := NewJobStore("/nonexistent/path/that/does/not/exist/test.db")
	assert.Error(t, err)
}

func TestSaveGet_Roundtrip(t *testing.T) {
	t.Parallel()
	store := newTestStore(t)

	job := makeJob("job-1", "install", "completed")
	job.ErrorMessage = "none"
	now := time.Now().Truncate(time.Second)
	job.CompletedAt = &now

	require.NoError(t, store.Save(job))

	got, err := store.Get("job-1")
	require.NoError(t, err)
	assert.Equal(t, job.ID, got.ID)
	assert.Equal(t, job.Type, got.Type)
	assert.Equal(t, job.Status, got.Status)
	assert.NotNil(t, got.CompletedAt)
}

func TestGet_NotFound(t *testing.T) {
	t.Parallel()
	store := newTestStore(t)

	_, err := store.Get("nonexistent-id")
	assert.Error(t, err)
}

func TestSave_Upsert(t *testing.T) {
	t.Parallel()
	store := newTestStore(t)

	job := makeJob("job-upsert", "patch", "pending")
	require.NoError(t, store.Save(job))

	job.Status = "completed"
	require.NoError(t, store.Save(job))

	got, err := store.Get("job-upsert")
	require.NoError(t, err)
	assert.Equal(t, "completed", got.Status)
}

func TestList_Pagination(t *testing.T) {
	t.Parallel()
	store := newTestStore(t)

	for i := 0; i < 5; i++ {
		job := makeJob(
			"job-"+string(rune('a'+i)),
			"test",
			"done",
		)
		job.StartedAt = time.Now().Add(time.Duration(i) * time.Second)
		require.NoError(t, store.Save(job))
	}

	all, err := store.List(10, 0)
	require.NoError(t, err)
	assert.Len(t, all, 5)

	first2, err := store.List(2, 0)
	require.NoError(t, err)
	assert.Len(t, first2, 2)

	next2, err := store.List(2, 2)
	require.NoError(t, err)
	assert.Len(t, next2, 2)

	last, err := store.List(2, 4)
	require.NoError(t, err)
	assert.Len(t, last, 1)
}

func TestCount(t *testing.T) {
	t.Parallel()
	store := newTestStore(t)

	count, err := store.Count()
	require.NoError(t, err)
	assert.Equal(t, 0, count)

	require.NoError(t, store.Save(makeJob("j1", "t", "done")))
	require.NoError(t, store.Save(makeJob("j2", "t", "done")))

	count, err = store.Count()
	require.NoError(t, err)
	assert.Equal(t, 2, count)
}

func TestCountByStatus(t *testing.T) {
	t.Parallel()
	store := newTestStore(t)

	require.NoError(t, store.Save(makeJob("j1", "t", "completed")))
	require.NoError(t, store.Save(makeJob("j2", "t", "completed")))
	require.NoError(t, store.Save(makeJob("j3", "t", "failed")))

	completed, err := store.CountByStatus("completed")
	require.NoError(t, err)
	assert.Equal(t, 2, completed)

	failed, err := store.CountByStatus("failed")
	require.NoError(t, err)
	assert.Equal(t, 1, failed)

	pending, err := store.CountByStatus("pending")
	require.NoError(t, err)
	assert.Equal(t, 0, pending)
}

func TestCleanup_RemovesOldJobs(t *testing.T) {
	t.Parallel()
	store := newTestStore(t)

	// Old job (31 days ago)
	old := makeJob("old-job", "t", "done")
	old.StartedAt = time.Now().AddDate(0, 0, -31)
	require.NoError(t, store.Save(old))

	// Recent job
	recent := makeJob("recent-job", "t", "done")
	recent.StartedAt = time.Now()
	require.NoError(t, store.Save(recent))

	deleted, err := store.Cleanup(30)
	require.NoError(t, err)
	assert.Equal(t, int64(1), deleted)

	count, err := store.Count()
	require.NoError(t, err)
	assert.Equal(t, 1, count)
}

func TestCleanup_NoOldJobs(t *testing.T) {
	t.Parallel()
	store := newTestStore(t)

	require.NoError(t, store.Save(makeJob("j1", "t", "done")))

	deleted, err := store.Cleanup(30)
	require.NoError(t, err)
	assert.Equal(t, int64(0), deleted)
}

func TestClose(t *testing.T) {
	t.Parallel()
	dbPath := filepath.Join(t.TempDir(), "test.db")
	store, err := NewJobStore(dbPath)
	require.NoError(t, err)
	assert.NoError(t, store.Close())
}
