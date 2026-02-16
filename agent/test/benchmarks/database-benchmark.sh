#!/bin/bash
#
# Database Performance Benchmark Script
#
# Benchmarks common database queries for execution time.
# Requires database access (via backend or direct connection).
#
# Usage:
#   ./database-benchmark.sh <backend_url>
#

set -euo pipefail

BACKEND_URL="${1:-https://localhost:3000}"
OUTPUT_DIR="$(dirname "$0")/results"
TIMESTAMP=$(date +"%Y%m%d-%H%M%S")
OUTPUT_FILE="$OUTPUT_DIR/database-benchmark-$TIMESTAMP.json"

mkdir -p "$OUTPUT_DIR"

echo "Database Performance Benchmark"
echo "=============================="
echo "Backend URL: $BACKEND_URL"
echo "Output: $OUTPUT_FILE"
echo "=============================="

# Initialize JSON
echo "{" > "$OUTPUT_FILE"
echo "  \"benchmark_info\": {" >> "$OUTPUT_FILE"
echo "    \"timestamp\": \"$(date -u +%Y-%m-%dT%H:%M:%SZ)\"," >> "$OUTPUT_FILE"
echo "    \"backend_url\": \"$BACKEND_URL\"" >> "$OUTPUT_FILE"
echo "  }," >> "$OUTPUT_FILE"
echo "  \"queries\": [" >> "$OUTPUT_FILE"

# Note: This script assumes backend exposes a /metrics/database endpoint
# Or queries are benchmarked via API calls

# Test queries via API endpoints
QUERIES=(
    "Agents List:GET:/api/v1/agents"
    "Agents by ID:GET:/api/v1/agents/{id}"
    "Deployments List:GET:/api/v1/deployments"
    "Patches List:GET:/api/v1/patches"
    "Vulnerabilities List:GET:/api/v1/vulnerabilities"
)

first_query=true

for query_spec in "${QUERIES[@]}"; do
    QUERY_NAME=$(echo "$query_spec" | cut -d: -f1)
    METHOD=$(echo "$query_spec" | cut -d: -f2)
    PATH=$(echo "$query_spec" | cut -d: -f3)

    # Replace {id} with actual ID if needed
    if [[ "$PATH" == *"{id}"* ]]; then
        # Get first agent ID
        AGENT_ID=$(curl -sf "${BACKEND_URL}/api/v1/agents?limit=1" | jq -r '.data[0].id' 2>/dev/null || echo "test-id")
        PATH="${PATH//\{id\}/$AGENT_ID}"
    fi

    if [[ "$first_query" == "false" ]]; then
        echo "    ," >> "$OUTPUT_FILE"
    fi
    first_query=false

    echo "Testing: $QUERY_NAME"

    # Run query 10 times and measure
    TEMP_FILE="/tmp/db_benchmark_$$.txt"
    rm -f "$TEMP_FILE"

    for i in {1..10}; do
        start=$(date +%s%3N)
        curl -sf -X "$METHOD" "${BACKEND_URL}${PATH}" >/dev/null 2>&1
        end=$(date +%s%3N)
        echo $((end - start)) >> "$TEMP_FILE"
    done

    # Calculate statistics
    if [[ -f "$TEMP_FILE" ]]; then
        times=($(sort -n "$TEMP_FILE"))
        count=${#times[@]}

        sum=0
        for t in "${times[@]}"; do
            sum=$((sum + t))
        done
        avg=$((sum / count))

        echo "    {" >> "$OUTPUT_FILE"
        echo "      \"query\": \"$QUERY_NAME\"," >> "$OUTPUT_FILE"
        echo "      \"average_ms\": $avg," >> "$OUTPUT_FILE"
        echo "      \"samples\": $count" >> "$OUTPUT_FILE"
        echo "    }" >> "$OUTPUT_FILE"

        echo "  Average: ${avg}ms"
        rm -f "$TEMP_FILE"
    fi
done

echo "" >> "$OUTPUT_FILE"
echo "  ]" >> "$OUTPUT_FILE"
echo "}" >> "$OUTPUT_FILE"

echo "=============================="
echo "Benchmark Complete"
echo "Results: $OUTPUT_FILE"
echo "=============================="
