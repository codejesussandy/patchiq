package metrics

import (
	"github.com/prometheus/client_golang/prometheus"
	"github.com/prometheus/client_golang/prometheus/promauto"
)

// Agent metrics
var (
	// AgentUp indicates if agent is running (1) or not (0)
	AgentUp = promauto.NewGauge(prometheus.GaugeOpts{
		Name: "agent_up",
		Help: "1 if agent is running, 0 otherwise",
	})

	// HeartbeatSuccess counts successful heartbeats
	HeartbeatSuccess = promauto.NewCounter(prometheus.CounterOpts{
		Name: "agent_heartbeat_success_total",
		Help: "Total number of successful heartbeats",
	})

	// HeartbeatFailures counts failed heartbeats
	HeartbeatFailures = promauto.NewCounter(prometheus.CounterOpts{
		Name: "agent_heartbeat_failures_total",
		Help: "Total number of failed heartbeats",
	})

	// HeartbeatDuration tracks heartbeat latency
	HeartbeatDuration = promauto.NewHistogram(prometheus.HistogramOpts{
		Name:    "agent_heartbeat_duration_seconds",
		Help:    "Heartbeat request duration in seconds",
		Buckets: prometheus.DefBuckets,
	})

	// CommandsExecuted counts commands by type and status
	CommandsExecuted = promauto.NewCounterVec(
		prometheus.CounterOpts{
			Name: "agent_commands_executed_total",
			Help: "Total commands executed by type and status",
		},
		[]string{"type", "status"},
	)

	// CommandDuration tracks command execution time by type
	CommandDuration = promauto.NewHistogramVec(
		prometheus.HistogramOpts{
			Name:    "agent_command_duration_seconds",
			Help:    "Command execution duration in seconds by type",
			Buckets: prometheus.DefBuckets,
		},
		[]string{"type"},
	)

	// CommandQueueSize tracks current queue size
	CommandQueueSize = promauto.NewGauge(prometheus.GaugeOpts{
		Name: "agent_command_queue_size",
		Help: "Current number of commands in queue",
	})

	// CommandsDropped counts dropped commands due to queue overflow
	CommandsDropped = promauto.NewCounter(prometheus.CounterOpts{
		Name: "agent_commands_dropped_total",
		Help: "Total number of commands dropped due to queue overflow",
	})

	// InventorySubmissions counts inventory submissions
	InventorySubmissions = promauto.NewCounter(prometheus.CounterOpts{
		Name: "agent_inventory_submissions_total",
		Help: "Total number of inventory submissions",
	})

	// InventorySkipped counts skipped inventory submissions due to deduplication
	InventorySkipped = promauto.NewCounter(prometheus.CounterOpts{
		Name: "agent_inventory_skipped_total",
		Help: "Total number of inventory submissions skipped due to deduplication",
	})

	// InventoryDuration tracks inventory collection and submission time
	InventoryDuration = promauto.NewHistogram(prometheus.HistogramOpts{
		Name:    "agent_inventory_duration_seconds",
		Help:    "Inventory collection and submission duration in seconds",
		Buckets: prometheus.DefBuckets,
	})

	// TelemetryCollectionDuration tracks telemetry collection time
	TelemetryCollectionDuration = promauto.NewHistogram(prometheus.HistogramOpts{
		Name:    "agent_telemetry_collection_duration_seconds",
		Help:    "Telemetry collection duration in seconds",
		Buckets: prometheus.DefBuckets,
	})

	// DownloadBytes tracks bytes downloaded by type
	DownloadBytes = promauto.NewCounterVec(
		prometheus.CounterOpts{
			Name: "agent_download_bytes_total",
			Help: "Total bytes downloaded by file type",
		},
		[]string{"file_type"},
	)

	// BackoffDuration tracks current heartbeat backoff duration
	BackoffDuration = promauto.NewGauge(prometheus.GaugeOpts{
		Name: "agent_heartbeat_backoff_seconds",
		Help: "Current heartbeat backoff duration in seconds",
	})

	// UpdateSuccess counts successful agent self-updates
	UpdateSuccess = promauto.NewCounter(prometheus.CounterOpts{
		Name: "agent_update_success_total",
		Help: "Total number of successful agent self-updates",
	})

	// UpdateFailure counts failed agent self-updates
	UpdateFailure = promauto.NewCounterVec(
		prometheus.CounterOpts{
			Name: "agent_update_failure_total",
			Help: "Total number of failed agent self-updates by reason",
		},
		[]string{"reason"},
	)

	// RollbackTotal counts agent self-update rollbacks
	RollbackTotal = promauto.NewCounterVec(
		prometheus.CounterOpts{
			Name: "agent_rollback_total",
			Help: "Total number of agent self-update rollbacks by reason",
		},
		[]string{"reason"},
	)

	// UpdateDuration tracks agent self-update duration
	UpdateDuration = promauto.NewHistogram(prometheus.HistogramOpts{
		Name:    "agent_update_duration_seconds",
		Help:    "Agent self-update duration in seconds",
		Buckets: []float64{10, 30, 60, 120, 300, 600}, // 10s to 10min
	})

	// UpdateCorruption counts detected corrupted binaries
	UpdateCorruption = promauto.NewCounterVec(
		prometheus.CounterOpts{
			Name: "agent_update_corruption_total",
			Help: "Total number of corrupted binaries detected by type",
		},
		[]string{"type"},
	)
)
