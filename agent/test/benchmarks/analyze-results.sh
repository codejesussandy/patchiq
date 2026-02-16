#!/bin/bash
#
# Benchmark Results Analysis Tool
#
# Parses JSON benchmark results and generates markdown report.
# Highlights metrics outside targets and suggests optimizations.
#
# Usage:
#   ./analyze-results.sh <results_dir>
#
# Examples:
#   ./analyze-results.sh results/
#   ./analyze-results.sh ../test/benchmarks/results/
#

set -euo pipefail

RESULTS_DIR="${1:-./ results}"
TIMESTAMP=$(date +"%Y%m%d-%H%M%S")
OUTPUT_FILE="benchmark-analysis-$TIMESTAMP.md"

echo "Benchmark Results Analysis"
echo "=========================="
echo "Results Directory: $RESULTS_DIR"
echo "Output: $OUTPUT_FILE"
echo "=========================="

# Check if jq is installed
if ! command -v jq &> /dev/null; then
    echo "ERROR: jq is required but not installed"
    echo "Install: brew install jq (macOS) or apt-get install jq (Linux)"
    exit 1
fi

# Find all benchmark JSON files
AGENT_BENCHMARKS=($(find "$RESULTS_DIR" -name "agent-benchmark-*.json" 2>/dev/null | sort -r))
BACKEND_BENCHMARKS=($(find "$RESULTS_DIR" -name "backend-benchmark-*.json" 2>/dev/null | sort -r))
DB_BENCHMARKS=($(find "$RESULTS_DIR" -name "database-benchmark-*.json" 2>/dev/null | sort -r))
SCALE_TESTS=($(find "$RESULTS_DIR" -name "scale-test-metrics-*.json" 2>/dev/null | sort -r))
LOAD_TESTS=($(find "$RESULTS_DIR" -name "concurrent-deployments-metrics-*.json" 2>/dev/null | sort -r))

echo "Found:"
echo "  Agent Benchmarks: ${#AGENT_BENCHMARKS[@]}"
echo "  Backend Benchmarks: ${#BACKEND_BENCHMARKS[@]}"
echo "  Database Benchmarks: ${#DB_BENCHMARKS[@]}"
echo "  Scale Tests: ${#SCALE_TESTS[@]}"
echo "  Load Tests: ${#LOAD_TESTS[@]}"
echo ""

# Initialize report
cat > "$OUTPUT_FILE" <<EOF
# Benchmark Analysis Report

**Generated:** $(date)
**Results Directory:** $RESULTS_DIR

---

## Summary

EOF

# Analyze Agent Benchmarks
if [[ ${#AGENT_BENCHMARKS[@]} -gt 0 ]]; then
    echo "Analyzing agent benchmarks..."

    cat >> "$OUTPUT_FILE" <<EOF
## Agent Performance

EOF

    for benchmark in "${AGENT_BENCHMARKS[@]}"; do
        echo "  Processing: $benchmark"

        TIMESTAMP=$(jq -r '.benchmark_info.timestamp' "$benchmark" 2>/dev/null || echo "Unknown")
        AVG_CPU=$(jq -r '.summary.average_cpu_percent' "$benchmark" 2>/dev/null || echo "N/A")
        AVG_MEM=$(jq -r '.summary.average_memory_kb' "$benchmark" 2>/dev/null || echo "N/A")

        cat >> "$OUTPUT_FILE" <<EOF
### Benchmark: $TIMESTAMP

| Metric | Value | Target | Status |
|--------|-------|--------|--------|
| Average CPU | ${AVG_CPU}% | < 1% (idle) | $([ ${AVG_CPU%.*} -lt 1 ] 2>/dev/null && echo "✓ Pass" || echo "✗ Warning") |
| Average Memory | ${AVG_MEM} KB | < 50000 KB | $([ ${AVG_MEM%.*} -lt 50000 ] 2>/dev/null && echo "✓ Pass" || echo "✗ Warning") |

EOF
    done
fi

# Analyze Backend Benchmarks
if [[ ${#BACKEND_BENCHMARKS[@]} -gt 0 ]]; then
    echo "Analyzing backend benchmarks..."

    cat >> "$OUTPUT_FILE" <<EOF
## Backend API Performance

EOF

    for benchmark in "${BACKEND_BENCHMARKS[@]}"; do
        echo "  Processing: $benchmark"

        TIMESTAMP=$(jq -r '.benchmark_info.timestamp' "$benchmark" 2>/dev/null || echo "Unknown")

        cat >> "$OUTPUT_FILE" <<EOF
### Benchmark: $TIMESTAMP

| Endpoint | Concurrency | p95 (ms) | Target | Status |
|----------|-------------|----------|--------|--------|
EOF

        # Extract endpoint results
        jq -r '.endpoints[] | "\(.method) \(.path)|\(.concurrency)|\(.response_times_ms.p95)|200|TBD"' "$benchmark" 2>/dev/null | \
        while IFS='|' read -r endpoint concurrency p95 target status; do
            # Determine status
            if [[ $p95 -lt $target ]]; then
                status="✓ Pass"
            else
                status="✗ Fail"
            fi

            echo "| $endpoint | $concurrency | $p95 | < ${target} | $status |" >> "$OUTPUT_FILE"
        done

        echo "" >> "$OUTPUT_FILE"
    done
fi

# Analyze Database Benchmarks
if [[ ${#DB_BENCHMARKS[@]} -gt 0 ]]; then
    echo "Analyzing database benchmarks..."

    cat >> "$OUTPUT_FILE" <<EOF
## Database Performance

EOF

    for benchmark in "${DB_BENCHMARKS[@]}"; do
        echo "  Processing: $benchmark"

        TIMESTAMP=$(jq -r '.benchmark_info.timestamp' "$benchmark" 2>/dev/null || echo "Unknown")

        cat >> "$OUTPUT_FILE" <<EOF
### Benchmark: $TIMESTAMP

| Query | Average (ms) | Target | Status |
|-------|--------------|--------|--------|
EOF

        jq -r '.queries[] | "\(.query)|\(.average_ms)|100"' "$benchmark" 2>/dev/null | \
        while IFS='|' read -r query avg target; do
            if [[ $avg -lt $target ]]; then
                status="✓ Pass"
            else
                status="✗ Warning"
            fi

            echo "| $query | $avg | < ${target} | $status |" >> "$OUTPUT_FILE"
        done

        echo "" >> "$OUTPUT_FILE"
    done
fi

# Analyze Scale Tests
if [[ ${#SCALE_TESTS[@]} -gt 0 ]]; then
    echo "Analyzing scale tests..."

    cat >> "$OUTPUT_FILE" <<EOF
## Scale Test Results

EOF

    for test in "${SCALE_TESTS[@]}"; do
        echo "  Processing: $test"

        NUM_AGENTS=$(jq -r '.num_agents' "$test" 2>/dev/null || echo "Unknown")
        AGENT_COUNT=$(jq -r '.agent_count' "$test" 2>/dev/null || echo "Unknown")
        HEARTBEAT_TIME=$(jq -r '.concurrent_heartbeats_time_ms' "$test" 2>/dev/null || echo "Unknown")
        DEPLOYMENT_RATE=$(jq -r '.deployment_success_rate_pct' "$test" 2>/dev/null || echo "Unknown")

        cat >> "$OUTPUT_FILE" <<EOF
### Scale Test: $NUM_AGENTS Agents

| Metric | Value | Target | Status |
|--------|-------|--------|--------|
| Agents Registered | $AGENT_COUNT | $NUM_AGENTS | $([ "$AGENT_COUNT" -eq "$NUM_AGENTS" ] 2>/dev/null && echo "✓ Pass" || echo "✗ Fail") |
| Concurrent Heartbeats | ${HEARTBEAT_TIME} ms | < 2000 ms | $([ ${HEARTBEAT_TIME%.*} -lt 2000 ] 2>/dev/null && echo "✓ Pass" || echo "✗ Fail") |
| Deployment Success Rate | ${DEPLOYMENT_RATE}% | ≥ 95% | $([ ${DEPLOYMENT_RATE%.*} -ge 95 ] 2>/dev/null && echo "✓ Pass" || echo "✗ Fail") |

EOF
    done
fi

# Analyze Load Tests
if [[ ${#LOAD_TESTS[@]} -gt 0 ]]; then
    echo "Analyzing load tests..."

    cat >> "$OUTPUT_FILE" <<EOF
## Load Test Results

EOF

    for test in "${LOAD_TESTS[@]}"; do
        echo "  Processing: $test"

        NUM_DEPLOYMENTS=$(jq -r '.num_deployments' "$test" 2>/dev/null || echo "Unknown")
        SUCCESS_RATE=$(jq -r '.success_rate_pct' "$test" 2>/dev/null || echo "Unknown")
        COMPLETION_TIME=$(jq -r '.completion_time_s' "$test" 2>/dev/null || echo "Unknown")

        cat >> "$OUTPUT_FILE" <<EOF
### Load Test: $NUM_DEPLOYMENTS Concurrent Deployments

| Metric | Value | Target | Status |
|--------|-------|--------|--------|
| Success Rate | ${SUCCESS_RATE}% | ≥ 95% | $([ ${SUCCESS_RATE%.*} -ge 95 ] 2>/dev/null && echo "✓ Pass" || echo "✗ Fail") |
| Completion Time | ${COMPLETION_TIME}s | < 600s | $([ ${COMPLETION_TIME%.*} -lt 600 ] 2>/dev/null && echo "✓ Pass" || echo "✗ Warning") |

EOF
    done
fi

# Add recommendations
cat >> "$OUTPUT_FILE" <<EOF
---

## Recommendations

### Performance Optimizations

EOF

# Analyze results and suggest optimizations
NEEDS_OPTIMIZATION=false

# Check agent CPU
if [[ ${#AGENT_BENCHMARKS[@]} -gt 0 ]]; then
    AVG_CPU=$(jq -r '.summary.average_cpu_percent' "${AGENT_BENCHMARKS[0]}" 2>/dev/null || echo "0")
    if (( $(echo "$AVG_CPU > 1" | bc -l 2>/dev/null || echo "0") )); then
        NEEDS_OPTIMIZATION=true
        cat >> "$OUTPUT_FILE" <<EOF
- **Agent CPU Usage:** Average CPU (${AVG_CPU}%) exceeds idle target (<1%). Consider:
  - Profiling agent to identify CPU hotspots
  - Optimizing polling loops
  - Reducing background processing

EOF
    fi
fi

# Check backend response times
if [[ ${#BACKEND_BENCHMARKS[@]} -gt 0 ]]; then
    # Check if any p95 > 200ms
    SLOW_ENDPOINTS=$(jq -r '.endpoints[] | select(.response_times_ms.p95 > 200) | "\(.method) \(.path): \(.response_times_ms.p95)ms"' "${BACKEND_BENCHMARKS[0]}" 2>/dev/null || echo "")

    if [[ -n "$SLOW_ENDPOINTS" ]]; then
        NEEDS_OPTIMIZATION=true
        cat >> "$OUTPUT_FILE" <<EOF
- **Backend API Response Times:** Some endpoints exceed 200ms p95 target:
\`\`\`
$SLOW_ENDPOINTS
\`\`\`
  Consider:
  - Adding indexes to database queries
  - Implementing caching for frequently accessed data
  - Optimizing N+1 query patterns

EOF
    fi
fi

# If no optimizations needed
if [[ "$NEEDS_OPTIMIZATION" == "false" ]]; then
    cat >> "$OUTPUT_FILE" <<EOF
- All metrics within targets. No optimizations required at this time.

EOF
fi

cat >> "$OUTPUT_FILE" <<EOF
### Monitoring

- Continue monitoring performance in production
- Set up alerts for metrics exceeding thresholds
- Review benchmarks monthly or after significant changes

---

## Conclusion

**Overall Status:** $(if [[ "$NEEDS_OPTIMIZATION" == "false" ]]; then echo "✓ Pass"; else echo "⚠ Review Required"; fi)

EOF

if [[ "$NEEDS_OPTIMIZATION" == "true" ]]; then
    cat >> "$OUTPUT_FILE" <<EOF
Some metrics exceed targets. Review recommendations and implement optimizations before production release.
EOF
else
    cat >> "$OUTPUT_FILE" <<EOF
All performance metrics within acceptable ranges. System is ready for production deployment.
EOF
fi

cat >> "$OUTPUT_FILE" <<EOF

---

**Generated by:** analyze-results.sh
**Date:** $(date)
EOF

echo "=========================="
echo "Analysis Complete"
echo "Report: $OUTPUT_FILE"
echo "=========================="
