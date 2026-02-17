#!/bin/bash
# Generate large dataset for performance testing

set -e

echo "================================================"
echo "  Large Dataset Generator for Performance Tests"
echo "================================================"
echo ""

# Default values
ASSET_COUNT=1000
PRESET="full"

# Parse arguments
while [[ $# -gt 0 ]]; do
  case $1 in
    --assets=*)
      ASSET_COUNT="${1#*=}"
      shift
      ;;
    --preset=*)
      PRESET="${1#*=}"
      shift
      ;;
    *)
      echo "Unknown option: $1"
      echo "Usage: $0 [--assets=1000] [--preset=full|standard|minimal]"
      exit 1
      ;;
  esac
done

echo "Configuration:"
echo "  - Preset: $PRESET"
echo "  - Asset Count: $ASSET_COUNT"
echo ""

cd "$(dirname "$0")/../backend"

echo "Checking database connection..."
if ! npx prisma db execute --stdin <<< "SELECT 1;" &> /dev/null; then
  echo "❌ Database not accessible. Please start services:"
  echo "   make dev-services"
  exit 1
fi

echo "✅ Database connected"
echo ""

# Check current counts
echo "Current database counts:"
CURRENT_ASSETS=$(npx prisma db execute --stdin <<< "SELECT COUNT(*) FROM \"Asset\";" 2>/dev/null | tail -1 | tr -d ' ' || echo "0")
echo "  Assets: $CURRENT_ASSETS"
echo ""

if [ "$CURRENT_ASSETS" -ge "$ASSET_COUNT" ]; then
  echo "✅ Already have $CURRENT_ASSETS assets (target: $ASSET_COUNT)"
  echo "Skipping data generation."
  exit 0
fi

echo "Generating test data..."
echo "This may take several minutes for large datasets..."
echo ""

# Run the generator
if [ "$PRESET" == "custom" ]; then
  npx ts-node scripts/generate-test-data.ts --assets=$ASSET_COUNT
else
  npx ts-node scripts/generate-test-data.ts --preset=$PRESET
fi

echo ""
echo "✅ Test data generation complete!"
echo ""
echo "New database counts:"
NEW_ASSETS=$(npx prisma db execute --stdin <<< "SELECT COUNT(*) FROM \"Asset\";" 2>/dev/null | tail -1 | tr -d ' ' || echo "?")
echo "  Assets: $NEW_ASSETS"
echo ""
echo "You can now run performance tests:"
echo "  cd frontend && npm run test -- e2e/phase5b-agent41-dataset-performance.spec.ts"
echo ""
