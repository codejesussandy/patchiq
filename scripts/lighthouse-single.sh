#!/bin/bash

# Quick single-page Lighthouse audit for testing
# Usage: ./scripts/lighthouse-single.sh <page-name> <url>

PAGE_NAME=${1:-dashboard}
URL=${2:-http://localhost:5173/dashboard}
OUTPUT_DIR="./lighthouse-reports"

mkdir -p "$OUTPUT_DIR"

echo "Running Lighthouse audit on: $PAGE_NAME"
echo "URL: $URL"
echo ""

lighthouse "$URL" \
    --only-categories=performance \
    --output=json \
    --output=html \
    --output-path="${OUTPUT_DIR}/${PAGE_NAME}" \
    --chrome-flags="--headless --no-sandbox --disable-gpu" \
    --view

echo ""
echo "Report saved to: ${OUTPUT_DIR}/${PAGE_NAME}.report.html"
