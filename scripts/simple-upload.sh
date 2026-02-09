#!/bin/bash
set -e

TOKEN="$1"
FILE_PATH="$2"
PKG_ID="$3"
NAME="$4"
DISPLAY_NAME="$5"
VERSION="$6"
PLATFORM="$7"
CATEGORY="$8"
VENDOR="$9"

BACKEND="http://localhost:5173"
FILENAME=$(basename "$FILE_PATH")

echo "📦 Creating package: $DISPLAY_NAME"
RESPONSE=$(curl -s -X POST "$BACKEND/v1/hub/packages" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d "{
    \"packageId\": \"$PKG_ID\",
    \"name\": \"$NAME\",
    \"displayName\": \"$DISPLAY_NAME\",
    \"version\": \"$VERSION\",
    \"platform\": \"$PLATFORM\",
    \"category\": \"$CATEGORY\",
    \"vendor\": \"$VENDOR\",
    \"installSource\": \"bundle\",
    \"requiresRoot\": true,
    \"requiresReboot\": false,
    \"isActive\": true
  }")

CREATED_ID=$(echo "$RESPONSE" | jq -r '.data.packageId // empty')
if [ -z "$CREATED_ID" ]; then
  echo "❌ Failed to create package"
  echo "$RESPONSE" | jq '.'
  exit 1
fi
echo "✅ Package created: $CREATED_ID"

echo "📤 Uploading file: $FILENAME"
UPLOAD_RESPONSE=$(curl -s -X POST "$BACKEND/v1/hub/packages/$CREATED_ID/upload" \
  -H "Authorization: Bearer $TOKEN" \
  -F "file=@$FILE_PATH")

SUCCESS=$(echo "$UPLOAD_RESPONSE" | jq -r '.success // false')
if [ "$SUCCESS" = "true" ]; then
  echo "✅ Uploaded successfully"
else
  echo "❌ Upload failed"
  echo "$UPLOAD_RESPONSE" | jq '.'
  exit 1
fi
