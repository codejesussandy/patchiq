#!/bin/bash
#
# Agent Performance Benchmark Script
#
# Benchmarks agent CPU, memory, network, and disk I/O performance.
# Outputs results in JSON format for analysis.
#
# Usage:
#   ./agent-benchmark.sh [agent_id] [duration]
#
# Examples:
#   ./agent-benchmark.sh agent-123 300
#   ./agent-benchmark.sh all 600
#

set -euo pipefail

# Configuration
AGENT_ID="${1:-all}"
DURATION="${2:-300}"
SAMPLE_INTERVAL=5
OUTPUT_DIR="$(dirname "$0")/results"
TIMESTAMP=$(date +"%Y%m%d-%H%M%S")
OUTPUT_FILE="$OUTPUT_DIR/agent-benchmark-$TIMESTAMP.json"

mkdir -p "$OUTPUT_DIR"

# Detect OS
detect_os() {
    case "$(uname -s)" in
        Darwin*)
            echo "macos"
            ;;
        Linux*)
            echo "linux"
            ;;
        CYGWIN*|MINGW*|MSYS*)
            echo "windows"
            ;;
        *)
            echo "unknown"
            ;;
    esac
}

OS=$(detect_os)

echo "Agent Performance Benchmark"
echo "============================"
echo "OS: $OS"
echo "Agent ID: $AGENT_ID"
echo "Duration: ${DURATION}s"
echo "Sample Interval: ${SAMPLE_INTERVAL}s"
echo "Output: $OUTPUT_FILE"
echo "============================"

# Initialize JSON output
echo "{" > "$OUTPUT_FILE"
echo "  \"benchmark_info\": {" >> "$OUTPUT_FILE"
echo "    \"timestamp\": \"$(date -u +%Y-%m-%dT%H:%M:%SZ)\"," >> "$OUTPUT_FILE"
echo "    \"os\": \"$OS\"," >> "$OUTPUT_FILE"
echo "    \"agent_id\": \"$AGENT_ID\"," >> "$OUTPUT_FILE"
echo "    \"duration_seconds\": $DURATION," >> "$OUTPUT_FILE"
echo "    \"sample_interval_seconds\": $SAMPLE_INTERVAL" >> "$OUTPUT_FILE"
echo "  }," >> "$OUTPUT_FILE"
echo "  \"samples\": [" >> "$OUTPUT_FILE"

# Find agent process
find_agent_pid() {
    case "$OS" in
        macos|linux)
            pgrep -f "patchiq-agent" | head -n 1
            ;;
        windows)
            # Use tasklist or wmic
            # For now, placeholder
            echo "0"
            ;;
    esac
}

AGENT_PID=$(find_agent_pid)

if [[ -z "$AGENT_PID" ]] || [[ "$AGENT_PID" == "0" ]]; then
    echo "ERROR: Agent process not found"
    exit 1
fi

echo "Found agent process: PID $AGENT_PID"

# Benchmark CPU usage
get_cpu_usage() {
    local pid=$1

    case "$OS" in
        macos)
            ps -p "$pid" -o %cpu | tail -n 1 | tr -d ' '
            ;;
        linux)
            ps -p "$pid" -o %cpu | tail -n 1 | tr -d ' '
            ;;
        windows)
            echo "0"  # Placeholder
            ;;
    esac
}

# Benchmark memory usage
get_memory_usage() {
    local pid=$1

    case "$OS" in
        macos)
            # RSS in bytes
            ps -p "$pid" -o rss | tail -n 1 | tr -d ' '
            ;;
        linux)
            # RSS in KB
            ps -p "$pid" -o rss | tail -n 1 | tr -d ' '
            ;;
        windows)
            echo "0"  # Placeholder
            ;;
    esac
}

# Benchmark network usage (requires additional tools)
get_network_stats() {
    # This is complex and requires packet capture or netstat parsing
    # For now, return placeholder
    echo "0"
}

# Benchmark disk I/O (requires additional tools)
get_disk_io() {
    # Requires iostat or similar
    # For now, return placeholder
    echo "0"
}

# Collect samples
elapsed=0
sample_count=0
first_sample=true

while [[ $elapsed -lt $DURATION ]]; do
    # Check if process still exists
    if ! ps -p "$AGENT_PID" > /dev/null 2>&1; then
        echo "WARNING: Agent process terminated"
        break
    fi

    # Collect metrics
    cpu=$(get_cpu_usage "$AGENT_PID")
    memory=$(get_memory_usage "$AGENT_PID")
    network=$(get_network_stats)
    disk_io=$(get_disk_io)

    # Add comma if not first sample
    if [[ "$first_sample" == "false" ]]; then
        echo "    ," >> "$OUTPUT_FILE"
    fi
    first_sample=false

    # Write sample
    echo "    {" >> "$OUTPUT_FILE"
    echo "      \"timestamp\": $(date +%s)," >> "$OUTPUT_FILE"
    echo "      \"elapsed_seconds\": $elapsed," >> "$OUTPUT_FILE"
    echo "      \"cpu_percent\": $cpu," >> "$OUTPUT_FILE"
    echo "      \"memory_kb\": $memory," >> "$OUTPUT_FILE"
    echo "      \"network_bytes\": $network," >> "$OUTPUT_FILE"
    echo "      \"disk_io_bytes\": $disk_io" >> "$OUTPUT_FILE"
    echo "    }" >> "$OUTPUT_FILE"

    ((sample_count++))
    echo "Sample $sample_count: CPU=${cpu}% MEM=${memory}KB (${elapsed}s / ${DURATION}s)"

    sleep "$SAMPLE_INTERVAL"
    ((elapsed+=SAMPLE_INTERVAL))
done

# Close samples array
echo "" >> "$OUTPUT_FILE"
echo "  ]," >> "$OUTPUT_FILE"

# Calculate summary statistics
echo "  \"summary\": {" >> "$OUTPUT_FILE"
echo "    \"sample_count\": $sample_count," >> "$OUTPUT_FILE"
echo "    \"total_duration_seconds\": $elapsed" >> "$OUTPUT_FILE"

# Calculate averages (requires jq for accurate calculation)
if command -v jq &> /dev/null; then
    avg_cpu=$(jq '[.samples[].cpu_percent] | add/length' "$OUTPUT_FILE" 2>/dev/null || echo "0")
    avg_mem=$(jq '[.samples[].memory_kb] | add/length' "$OUTPUT_FILE" 2>/dev/null || echo "0")

    echo "    ,\"average_cpu_percent\": $avg_cpu," >> "$OUTPUT_FILE"
    echo "    \"average_memory_kb\": $avg_mem" >> "$OUTPUT_FILE"
fi

echo "  }" >> "$OUTPUT_FILE"

# Close JSON
echo "}" >> "$OUTPUT_FILE"

echo "============================"
echo "Benchmark Complete"
echo "Samples collected: $sample_count"
echo "Results saved to: $OUTPUT_FILE"
echo "============================"

# Display summary
if command -v jq &> /dev/null; then
    echo ""
    echo "Summary:"
    jq '.summary' "$OUTPUT_FILE"
fi
