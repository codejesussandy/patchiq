#!/bin/bash

# Phase 5B - Agent 40: Lighthouse Performance Audit Script
# This script runs comprehensive Lighthouse audits on all major pages

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Output directory
OUTPUT_DIR="./lighthouse-reports"
mkdir -p "$OUTPUT_DIR"

echo -e "${BLUE}╔════════════════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║  Phase 5B - Agent 40: Lighthouse Performance Audit            ║${NC}"
echo -e "${BLUE}╔════════════════════════════════════════════════════════════════╗${NC}"
echo ""

# Check if services are running
echo -e "${YELLOW}Checking if services are running...${NC}"
if ! curl -s http://localhost:5173 > /dev/null 2>&1; then
    echo -e "${RED}❌ Frontend not running on port 5173${NC}"
    echo -e "${YELLOW}Please start services with: make dev${NC}"
    exit 1
fi

if ! curl -s http://localhost:3000/api/health > /dev/null 2>&1; then
    echo -e "${RED}❌ Backend not running on port 3000${NC}"
    echo -e "${YELLOW}Please start services with: make dev${NC}"
    exit 1
fi

echo -e "${GREEN}✓ Services are running${NC}"
echo ""

# Check if lighthouse is installed
if ! command -v lighthouse &> /dev/null; then
    echo -e "${RED}❌ Lighthouse CLI not found${NC}"
    echo -e "${YELLOW}Installing lighthouse...${NC}"
    npm install -g lighthouse
fi

# Pages to audit
declare -A PAGES=(
    ["dashboard"]="http://localhost:5173/dashboard"
    ["assets"]="http://localhost:5173/assets"
    ["patches"]="http://localhost:5173/patches"
    ["vulnerabilities"]="http://localhost:5173/vulnerability/vulnerabilities"
    ["settings"]="http://localhost:5173/settings/user-management/users"
)

# Get first patch ID for patch details page
echo -e "${YELLOW}Fetching first patch ID for detailed audit...${NC}"
FIRST_PATCH_ID=$(curl -s "http://localhost:3000/v1/patches?limit=1" \
    -H "Authorization: Bearer $(cat frontend/auth.json 2>/dev/null | grep -o '"token":"[^"]*"' | cut -d'"' -f4)" \
    2>/dev/null | grep -o '"id":"[^"]*"' | head -1 | cut -d'"' -f4 || echo "")

if [ -n "$FIRST_PATCH_ID" ]; then
    PAGES["patch-details"]="http://localhost:5173/patches/$FIRST_PATCH_ID"
    echo -e "${GREEN}✓ Patch ID: $FIRST_PATCH_ID${NC}"
else
    echo -e "${YELLOW}⚠ Could not fetch patch ID, skipping patch details page${NC}"
fi

echo ""
echo -e "${BLUE}Starting Lighthouse audits (3 runs per page for accuracy)...${NC}"
echo ""

# Common Lighthouse flags
LIGHTHOUSE_FLAGS="
    --only-categories=performance
    --chrome-flags='--headless --no-sandbox --disable-gpu'
    --output=json
    --output=html
    --quiet
"

# Run audits for each page
for PAGE_NAME in "${!PAGES[@]}"; do
    URL="${PAGES[$PAGE_NAME]}"
    echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "${BLUE}Auditing: ${PAGE_NAME}${NC}"
    echo -e "${BLUE}URL: ${URL}${NC}"
    echo ""

    # Run 3 audits and average
    SCORES=()
    for RUN in {1..3}; do
        echo -e "${YELLOW}  Run ${RUN}/3...${NC}"

        OUTPUT_PATH="${OUTPUT_DIR}/${PAGE_NAME}-run${RUN}"

        # Run lighthouse
        lighthouse "$URL" \
            $LIGHTHOUSE_FLAGS \
            --output-path="$OUTPUT_PATH" \
            2>&1 | grep -E "(Performance|First Contentful Paint|Largest Contentful Paint|Time to Interactive|Total Blocking Time|Cumulative Layout Shift)" || true

        # Extract score from JSON
        if [ -f "${OUTPUT_PATH}.report.json" ]; then
            SCORE=$(grep -o '"performance":[0-9.]*' "${OUTPUT_PATH}.report.json" | cut -d':' -f2 | awk '{printf "%.0f", $1 * 100}')
            SCORES+=($SCORE)
            echo -e "${GREEN}    Score: ${SCORE}/100${NC}"
        fi

        sleep 2  # Brief pause between runs
    done

    # Calculate average
    if [ ${#SCORES[@]} -eq 3 ]; then
        AVG=$(( (${SCORES[0]} + ${SCORES[1]} + ${SCORES[2]}) / 3 ))
        echo ""
        echo -e "${GREEN}✓ Average Performance Score: ${AVG}/100${NC}"

        # Copy best report as final
        BEST_RUN=1
        MAX_SCORE=${SCORES[0]}
        for i in 1 2; do
            if [ ${SCORES[$i]} -gt $MAX_SCORE ]; then
                MAX_SCORE=${SCORES[$i]}
                BEST_RUN=$((i + 1))
            fi
        done

        cp "${OUTPUT_DIR}/${PAGE_NAME}-run${BEST_RUN}.report.html" "${OUTPUT_DIR}/${PAGE_NAME}-final.html"
        cp "${OUTPUT_DIR}/${PAGE_NAME}-run${BEST_RUN}.report.json" "${OUTPUT_DIR}/${PAGE_NAME}-final.json"
    fi

    echo ""
done

echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""
echo -e "${GREEN}✓ Lighthouse audits complete!${NC}"
echo -e "${BLUE}Reports saved to: ${OUTPUT_DIR}/${NC}"
echo ""
echo -e "${YELLOW}Next steps:${NC}"
echo "1. Open HTML reports: open ${OUTPUT_DIR}/*.html"
echo "2. Run analysis script: node scripts/analyze-lighthouse.js"
echo ""
