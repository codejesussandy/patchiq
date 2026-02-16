#!/bin/bash
set -e

PUBLIC_URL="http://localhost:3500"

echo "🔐 Getting auth token..."
TOKEN=$(curl -sf "$PUBLIC_URL/v1/auth/login" \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@patchiq.io","password":"admin123"}' \
  | python3 -c "import sys,json; print(json.load(sys.stdin)['data']['accessToken'])")

if [ -z "$TOKEN" ]; then
  echo "❌ Failed to get auth token"
  exit 1
fi

echo "✓ Got auth token: ${TOKEN:0:20}..."

echo ""
echo "📋 Getting agent versions..."
VERSIONS=$(curl -sf "$PUBLIC_URL/v1/agent-versions" -H "Authorization: Bearer $TOKEN")
echo "✓ Got agent versions"

upload() {
  PLATFORM=$1
  ARCH=$2
  FILE=$3

  echo ""
  echo "📦 Uploading $PLATFORM/$ARCH from $FILE..."

  VID=$(echo "$VERSIONS" | python3 -c "import sys,json; data=json.load(sys.stdin); vs=data['data']; print(next((v['id'] for v in vs if v['platform']=='$PLATFORM' and v['architecture']=='$ARCH'),''))")

  if [ -z "$VID" ]; then
    echo "❌ No DB record for $PLATFORM/$ARCH"
    return 1
  fi

  echo "   ID: $VID"
  echo "   Size: $(ls -lh $FILE | awk '{print $5}')"

  RESULT=$(curl -w "\n%{http_code}" -X POST "$PUBLIC_URL/v1/agent-versions/$VID/upload" \
    -H "Authorization: Bearer $TOKEN" \
    -H "Content-Type: application/octet-stream" \
    --data-binary "@$FILE")

  HTTP_CODE=$(echo "$RESULT" | tail -n1)

  if [ "$HTTP_CODE" = "200" ]; then
    echo "✅ Uploaded $PLATFORM/$ARCH successfully!"
  else
    echo "❌ Failed $PLATFORM/$ARCH (HTTP $HTTP_CODE)"
    echo "$RESULT"
    return 1
  fi
}

echo ""
echo "🚀 Starting uploads..."
upload "Mac" "arm64" "agent/patchify-agent"
upload "Linux" "amd64" "agent/patchiq-agent-linux-amd64"

echo ""
echo "✨ All uploads complete!"
