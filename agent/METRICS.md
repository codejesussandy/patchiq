# Agent Metrics Documentation

The PatchIQ agent exposes Prometheus-compatible metrics at the `/metrics` endpoint.

## Endpoint

- **URL**: `http://localhost:4504/metrics` (default port)
- **Format**: Prometheus text format
- **Method**: GET

## Available Metrics

### Agent Status

#### `agent_up`
- **Type**: Gauge
- **Description**: 1 if agent is running, 0 otherwise
- **Usage**: Monitor agent availability
- **Example**: `agent_up 1`

### Heartbeat Metrics

#### `agent_heartbeat_success_total`
- **Type**: Counter
- **Description**: Total number of successful heartbeats sent to backend
- **Usage**: Track successful backend communication

#### `agent_heartbeat_failures_total`
- **Type**: Counter
- **Description**: Total number of failed heartbeats
- **Usage**: Alert on communication failures

#### `agent_heartbeat_duration_seconds`
- **Type**: Histogram
- **Description**: Heartbeat request duration in seconds
- **Buckets**: Default Prometheus buckets (0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5, 10)
- **Usage**: Monitor heartbeat latency and detect slow backends

#### `agent_heartbeat_backoff_seconds`
- **Type**: Gauge
- **Description**: Current heartbeat backoff duration in seconds
- **Usage**: Monitor exponential backoff when backend is unavailable

### Command Execution Metrics

#### `agent_commands_executed_total`
- **Type**: Counter
- **Labels**: `type` (command type), `status` (success/failure)
- **Description**: Total commands executed by type and status
- **Usage**: Track command execution patterns and success rates
- **Example**: `agent_commands_executed_total{type="install_package",status="success"} 42`

#### `agent_command_duration_seconds`
- **Type**: Histogram
- **Labels**: `type` (command type)
- **Description**: Command execution duration in seconds by type
- **Buckets**: Default Prometheus buckets
- **Usage**: Monitor command execution time and detect slow operations

#### `agent_command_queue_size`
- **Type**: Gauge
- **Description**: Current number of commands in queue
- **Usage**: Monitor queue depth and detect backlogs

#### `agent_commands_dropped_total`
- **Type**: Counter
- **Description**: Total number of commands dropped due to queue overflow
- **Usage**: Alert on command loss

### Inventory Metrics

#### `agent_inventory_submissions_total`
- **Type**: Counter
- **Description**: Total number of inventory submissions to backend
- **Usage**: Track inventory sync frequency

#### `agent_inventory_skipped_total`
- **Type**: Counter
- **Description**: Total number of inventory submissions skipped due to deduplication
- **Usage**: Monitor deduplication effectiveness

#### `agent_inventory_duration_seconds`
- **Type**: Histogram
- **Description**: Inventory collection and submission duration in seconds
- **Buckets**: Default Prometheus buckets
- **Usage**: Monitor inventory collection performance

### Telemetry Metrics

#### `agent_telemetry_collection_duration_seconds`
- **Type**: Histogram
- **Description**: Telemetry collection duration in seconds
- **Buckets**: Default Prometheus buckets
- **Usage**: Monitor telemetry collection overhead

### Download Metrics

#### `agent_download_bytes_total`
- **Type**: Counter
- **Labels**: `file_type` (patch, script, etc.)
- **Description**: Total bytes downloaded by file type
- **Usage**: Track bandwidth usage and download patterns
- **Example**: `agent_download_bytes_total{file_type="patch"} 1073741824`

## Prometheus Configuration

Add this to your `prometheus.yml`:

```yaml
scrape_configs:
  - job_name: 'patchiq-agents'
    static_configs:
      - targets: ['localhost:4504']
    scrape_interval: 15s
    scrape_timeout: 10s
```

For multiple agents, use service discovery or list targets:

```yaml
scrape_configs:
  - job_name: 'patchiq-agents'
    static_configs:
      - targets:
          - 'agent1.example.com:4504'
          - 'agent2.example.com:4504'
          - 'agent3.example.com:4504'
```

## Example Queries

### Agent Uptime
```promql
# Count running agents
sum(agent_up)

# Agents that went down
sum(changes(agent_up[5m])) > 0
```

### Heartbeat Health
```promql
# Heartbeat success rate (last 5 minutes)
rate(agent_heartbeat_success_total[5m]) / 
  (rate(agent_heartbeat_success_total[5m]) + rate(agent_heartbeat_failures_total[5m]))

# Agents with high failure rate (>10% in last 5 minutes)
rate(agent_heartbeat_failures_total[5m]) / 
  (rate(agent_heartbeat_success_total[5m]) + rate(agent_heartbeat_failures_total[5m])) > 0.1

# P95 heartbeat latency
histogram_quantile(0.95, rate(agent_heartbeat_duration_seconds_bucket[5m]))
```

### Command Execution
```promql
# Commands per second by type
sum by (type) (rate(agent_commands_executed_total[5m]))

# Command failure rate by type
sum by (type) (rate(agent_commands_executed_total{status="failure"}[5m])) /
  sum by (type) (rate(agent_commands_executed_total[5m]))

# P99 command execution time
histogram_quantile(0.99, sum by (type, le) (rate(agent_command_duration_seconds_bucket[5m])))

# Agents with queue overflow
sum(rate(agent_commands_dropped_total[5m])) > 0
```

### Inventory & Telemetry
```promql
# Inventory submission rate
rate(agent_inventory_submissions_total[5m])

# Inventory deduplication effectiveness
rate(agent_inventory_skipped_total[5m]) / 
  (rate(agent_inventory_submissions_total[5m]) + rate(agent_inventory_skipped_total[5m]))

# Inventory collection time P95
histogram_quantile(0.95, rate(agent_inventory_duration_seconds_bucket[5m]))
```

### Bandwidth Usage
```promql
# Total download rate by file type
sum by (file_type) (rate(agent_download_bytes_total[5m]))

# Total bandwidth across all agents (MB/s)
sum(rate(agent_download_bytes_total[5m])) / 1024 / 1024
```

## Grafana Dashboard

A sample Grafana dashboard JSON is available at `grafana-dashboard.json` (to be created).

Key panels to include:
1. Agent count (gauge)
2. Heartbeat success rate (time series)
3. Command execution rate by type (stacked area chart)
4. Command queue depth (time series)
5. P95/P99 command latency (time series)
6. Bandwidth usage by file type (stacked area chart)
7. Inventory submission rate (time series)

## Alerting Rules

Example Prometheus alerting rules:

```yaml
groups:
  - name: patchiq-agents
    interval: 30s
    rules:
      - alert: AgentDown
        expr: agent_up == 0
        for: 2m
        labels:
          severity: critical
        annotations:
          summary: "PatchIQ agent is down"
          description: "Agent {{ $labels.instance }} has been down for more than 2 minutes"

      - alert: HighHeartbeatFailureRate
        expr: |
          rate(agent_heartbeat_failures_total[5m]) / 
          (rate(agent_heartbeat_success_total[5m]) + rate(agent_heartbeat_failures_total[5m])) > 0.2
        for: 5m
        labels:
          severity: warning
        annotations:
          summary: "High heartbeat failure rate"
          description: "Agent {{ $labels.instance }} has >20% heartbeat failures"

      - alert: CommandQueueOverflow
        expr: rate(agent_commands_dropped_total[5m]) > 0
        for: 1m
        labels:
          severity: critical
        annotations:
          summary: "Commands being dropped"
          description: "Agent {{ $labels.instance }} is dropping commands due to queue overflow"

      - alert: SlowCommandExecution
        expr: |
          histogram_quantile(0.95, rate(agent_command_duration_seconds_bucket[5m])) > 60
        for: 10m
        labels:
          severity: warning
        annotations:
          summary: "Slow command execution"
          description: "Agent {{ $labels.instance }} P95 command execution time >60s"
```

## Implementation Status

### Minimum Requirements (Completed)
- ✅ Prometheus dependencies added
- ✅ Metrics package created with all metric definitions
- ✅ `/metrics` endpoint added to server
- ✅ `AgentUp` metric set to 1 in main.go
- ✅ Build succeeds
- ✅ `/metrics` endpoint accessible

### Optional Instrumentation (To Be Implemented)
The following metrics are defined but not yet instrumented in the code:
- ⏳ Heartbeat metrics (in `internal/backend/backend.go`)
- ⏳ Command metrics (in `internal/backend/backend.go`)
- ⏳ Inventory metrics (in `internal/backend/backend.go`)
- ⏳ Download metrics (in `internal/executors/`)

To instrument these, add metric calls at the appropriate locations in the backend and executor code.
