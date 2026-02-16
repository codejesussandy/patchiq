#!/bin/bash
#
# Performance Monitoring Script
#
# Monitors backend, database, and agent performance during load testing.
# Collects CPU, memory, network, and API metrics.
#
# Usage:
#   ./monitor-performance.sh <backend_url> <duration_seconds> [output_file]
#
# Examples:
#   ./monitor-performance.sh https://localhost:3000 300
#   ./monitor-performance.sh https://hub.patchiq.io 600 performance.log
#

set -euo pipefail

# Configuration
BACKEND_URL="${1:-https://localhost:3000}"
DURATION="${2:-300}"
OUTPUT_FILE="${3:-performance-monitor-$(date +%Y%m%d-%H%M%S).log}"
INTERVAL=5  # Sample every 5 seconds

# Create output directory
OUTPUT_DIR="$(dirname "$0")/results"
mkdir -p "$OUTPUT_DIR"
OUTPUT_PATH="$OUTPUT_DIR/$OUTPUT_FILE"

# Logging
log() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $*" | tee -a "$OUTPUT_PATH"
}

log "========================================="
log "Performance Monitoring"
log "========================================="
log "Backend URL: $BACKEND_URL"
log "Duration: ${DURATION}s"
log "Sample Interval: ${INTERVAL}s"
log "Output: $OUTPUT_PATH"
log "========================================="

# Initialize metrics file
METRICS_FILE="$OUTPUT_DIR/performance-metrics-$(date +%Y%m%d-%H%M%S).jsonl"
log "Metrics will be written to: $METRICS_FILE"

# Function to collect backend metrics
collect_backend_metrics() {
    local timestamp=$(date +%s)

    # Try to fetch metrics from backend
    local metrics_response=$(curl -sf "${BACKEND_URL}/metrics" 2>&1 || echo "ERROR")

    if [[ "$metrics_response" != "ERROR" ]]; then
        echo "{\"timestamp\":$timestamp,\"source\":\"backend\",\"data\":$metrics_response}" >> "$METRICS_FILE"
    fi

    # Try to fetch health check
    local health_response=$(curl -sf "${BACKEND_URL}/health" 2>&1 || echo "ERROR")

    if [[ "$health_response" != "ERROR" ]]; then
        echo "{\"timestamp\":$timestamp,\"source\":\"health\",\"data\":$health_response}" >> "$METRICS_FILE"
    fi
}

# Function to collect API response times
collect_api_metrics() {
    local timestamp=$(date +%s)

    # Test key endpoints
    local endpoints=(
        "/api/v1/agents"
        "/api/v1/deployments"
        "/api/v1/patches"
        "/api/v1/vulnerabilities"
    )

    for endpoint in "${endpoints[@]}"; do
        local start_time=$(date +%s%3N)
        local http_code=$(curl -sf -w "%{http_code}" -o /dev/null "${BACKEND_URL}${endpoint}" 2>&1 || echo "000")
        local end_time=$(date +%s%3N)
        local response_time=$((end_time - start_time))

        echo "{\"timestamp\":$timestamp,\"endpoint\":\"$endpoint\",\"http_code\":$http_code,\"response_time_ms\":$response_time}" >> "$METRICS_FILE"
    done
}

# Function to collect system metrics (if running locally)
collect_system_metrics() {
    local timestamp=$(date +%s)

    # CPU usage
    if command -v top &> /dev/null; then
        local cpu_usage=$(top -l 1 -n 0 | grep "CPU usage" | awk '{print $3}' | sed 's/%//' || echo "0")
        echo "{\"timestamp\":$timestamp,\"metric\":\"cpu_usage\",\"value\":\"$cpu_usage\"}" >> "$METRICS_FILE"
    fi

    # Memory usage
    if command -v vm_stat &> /dev/null; then
        local mem_stats=$(vm_stat | grep "Pages free" | awk '{print $3}' | sed 's/\.//' || echo "0")
        echo "{\"timestamp\":$timestamp,\"metric\":\"memory_free_pages\",\"value\":\"$mem_stats\"}" >> "$METRICS_FILE"
    elif command -v free &> /dev/null; then
        local mem_free=$(free -m | grep "Mem:" | awk '{print $4}' || echo "0")
        echo "{\"timestamp\":$timestamp,\"metric\":\"memory_free_mb\",\"value\":\"$mem_free\"}" >> "$METRICS_FILE"
    fi

    # Docker container stats (if backend is in Docker)
    if command -v docker &> /dev/null; then
        local backend_container=$(docker ps | grep "backend" | awk '{print $1}' || echo "")

        if [[ -n "$backend_container" ]]; then
            local container_stats=$(docker stats --no-stream "$backend_container" --format "{{.CPUPerc}},{{.MemUsage}}" || echo "0%,0B")
            local cpu_pct=$(echo "$container_stats" | cut -d',' -f1 | sed 's/%//')
            local mem_usage=$(echo "$container_stats" | cut -d',' -f2)

            echo "{\"timestamp\":$timestamp,\"metric\":\"backend_container_cpu\",\"value\":\"$cpu_pct\"}" >> "$METRICS_FILE"
            echo "{\"timestamp\":$timestamp,\"metric\":\"backend_container_memory\",\"value\":\"$mem_usage\"}" >> "$METRICS_FILE"
        fi
    fi
}

# Function to collect database metrics
collect_database_metrics() {
    local timestamp=$(date +%s)

    # If database metrics endpoint is available
    local db_metrics=$(curl -sf "${BACKEND_URL}/metrics/database" 2>&1 || echo "ERROR")

    if [[ "$db_metrics" != "ERROR" ]]; then
        echo "{\"timestamp\":$timestamp,\"source\":\"database\",\"data\":$db_metrics}" >> "$METRICS_FILE"
    fi
}

# Main monitoring loop
log "Starting monitoring (duration: ${DURATION}s)..."

elapsed=0
samples=0

while [[ $elapsed -lt $DURATION ]]; do
    ((samples++))
    log "Sample #$samples (${elapsed}s / ${DURATION}s)"

    # Collect all metrics
    collect_backend_metrics
    collect_api_metrics
    collect_system_metrics
    collect_database_metrics

    # Wait for next interval
    sleep "$INTERVAL"
    ((elapsed+=INTERVAL))
done

log "========================================="
log "Monitoring Complete"
log "========================================="
log "Total samples: $samples"
log "Total duration: ${elapsed}s"
log "Metrics file: $METRICS_FILE"
log "========================================="

# Generate summary
log "Generating summary..."

# Calculate average API response times
if command -v jq &> /dev/null; then
    log "API Response Time Summary:"

    for endpoint in "/api/v1/agents" "/api/v1/deployments" "/api/v1/patches" "/api/v1/vulnerabilities"; do
        local avg_response=$(grep "\"endpoint\":\"$endpoint\"" "$METRICS_FILE" | jq -s 'map(.response_time_ms) | add/length' || echo "N/A")
        log "  $endpoint: ${avg_response}ms (average)"
    done
else
    log "jq not installed - skipping summary calculations"
fi

log "========================================="
log "Performance monitoring completed successfully"
log "Results saved to: $OUTPUT_PATH"
log "Metrics saved to: $METRICS_FILE"
log "========================================="
