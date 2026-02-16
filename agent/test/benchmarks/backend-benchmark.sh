#!/bin/bash
#
# Backend API Benchmark Script
#
# Benchmarks all backend API endpoints for response times.
# Tests with varying concurrency levels (1, 10, 100).
# Outputs results in JSON format.
#
# Usage:
#   ./backend-benchmark.sh <backend_url> [num_requests]
#
# Examples:
#   ./backend-benchmark.sh https://localhost:3000 1000
#   ./backend-benchmark.sh https://hub.patchiq.io 5000
#

set -euo pipefail

BACKEND_URL="${1:-https://localhost:3000}"
NUM_REQUESTS="${2:-1000}"
OUTPUT_DIR="$(dirname "$0")/results"
TIMESTAMP=$(date +"%Y%m%d-%H%M%S")
OUTPUT_FILE="$OUTPUT_DIR/backend-benchmark-$TIMESTAMP.json"

mkdir -p "$OUTPUT_DIR"

echo "Backend API Benchmark"
echo "====================="
echo "Backend URL: $BACKEND_URL"
echo "Requests per endpoint: $NUM_REQUESTS"
echo "Output: $OUTPUT_FILE"
echo "====================="

# Initialize JSON
echo "{" > "$OUTPUT_FILE"
echo "  \"benchmark_info\": {" >> "$OUTPUT_FILE"
echo "    \"timestamp\": \"$(date -u +%Y-%m-%dT%H:%M:%SZ)\"," >> "$OUTPUT_FILE"
echo "    \"backend_url\": \"$BACKEND_URL\"," >> "$OUTPUT_FILE"
echo "    \"requests_per_endpoint\": $NUM_REQUESTS" >> "$OUTPUT_FILE"
echo "  }," >> "$OUTPUT_FILE"
echo "  \"endpoints\": [" >> "$OUTPUT_FILE"

# Endpoints to test
ENDPOINTS=(
    "GET:/api/v1/agents"
    "GET:/api/v1/deployments"
    "GET:/api/v1/patches"
    "GET:/api/v1/vulnerabilities"
    "GET:/api/v1/agent-versions/current"
)

first_endpoint=true

for endpoint_spec in "${ENDPOINTS[@]}"; do
    METHOD=$(echo "$endpoint_spec" | cut -d: -f1)
    PATH=$(echo "$endpoint_spec" | cut -d: -f2)

    if [[ "$first_endpoint" == "false" ]]; then
        echo "    ," >> "$OUTPUT_FILE"
    fi
    first_endpoint=false

    echo "Testing: $METHOD $PATH"

    # Benchmark with different concurrency levels
    for concurrency in 1 10 100; do
        echo "  Concurrency: $concurrency"

        TEMP_FILE="/tmp/benchmark_times_$$_${concurrency}.txt"
        rm -f "$TEMP_FILE"

        # Run concurrent requests
        for i in $(seq 1 "$concurrency"); do
            {
                start=$(date +%s%3N)
                curl -sf -X "$METHOD" "${BACKEND_URL}${PATH}" >/dev/null 2>&1 || true
                end=$(date +%s%3N)
                echo $((end - start)) >> "$TEMP_FILE"
            } &
        done

        wait

        # Calculate statistics
        if [[ -f "$TEMP_FILE" ]]; then
            times=($(sort -n "$TEMP_FILE"))
            count=${#times[@]}

            if [[ $count -gt 0 ]]; then
                sum=0
                for t in "${times[@]}"; do
                    sum=$((sum + t))
                done
                avg=$((sum / count))

                p50_idx=$((count * 50 / 100))
                p95_idx=$((count * 95 / 100))
                p99_idx=$((count * 99 / 100))

                p50=${times[$p50_idx]}
                p95=${times[$p95_idx]}
                p99=${times[$p99_idx]}

                echo "    {" >> "$OUTPUT_FILE"
                echo "      \"method\": \"$METHOD\"," >> "$OUTPUT_FILE"
                echo "      \"path\": \"$PATH\"," >> "$OUTPUT_FILE"
                echo "      \"concurrency\": $concurrency," >> "$OUTPUT_FILE"
                echo "      \"request_count\": $count," >> "$OUTPUT_FILE"
                echo "      \"response_times_ms\": {" >> "$OUTPUT_FILE"
                echo "        \"average\": $avg," >> "$OUTPUT_FILE"
                echo "        \"p50\": $p50," >> "$OUTPUT_FILE"
                echo "        \"p95\": $p95," >> "$OUTPUT_FILE"
                echo "        \"p99\": $p99" >> "$OUTPUT_FILE"
                echo "      }" >> "$OUTPUT_FILE"
                echo "    }" >> "$OUTPUT_FILE"

                echo "    Avg: ${avg}ms, p50: ${p50}ms, p95: ${p95}ms, p99: ${p99}ms"
            fi

            rm -f "$TEMP_FILE"
        fi
    done
done

echo "" >> "$OUTPUT_FILE"
echo "  ]" >> "$OUTPUT_FILE"
echo "}" >> "$OUTPUT_FILE"

echo "====================="
echo "Benchmark Complete"
echo "Results: $OUTPUT_FILE"
echo "====================="
