#!/bin/bash
# Build all test bundles as .tar.gz files

set -e

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
OUTPUT_DIR="$SCRIPT_DIR/dist"

echo "Building test bundles..."
echo ""

# Create output directory
mkdir -p "$OUTPUT_DIR"

# Build each bundle
for bundle_dir in hello-world nginx mock-patch; do
    if [ -d "$SCRIPT_DIR/$bundle_dir" ]; then
        echo "Building $bundle_dir bundle..."

        # Make scripts executable
        chmod +x "$SCRIPT_DIR/$bundle_dir/scripts/"*.sh 2>/dev/null || true

        # Create tar.gz
        cd "$SCRIPT_DIR/$bundle_dir"
        tar -czvf "$OUTPUT_DIR/$bundle_dir.tar.gz" manifest.json scripts/

        echo "  Created: $OUTPUT_DIR/$bundle_dir.tar.gz"
        echo ""
    fi
done

echo "All bundles built successfully!"
echo ""
echo "Bundle files:"
ls -la "$OUTPUT_DIR"/*.tar.gz
