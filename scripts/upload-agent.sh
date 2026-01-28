#!/bin/bash
# Upload agent binary to MinIO and register in database

MINIO_ENDPOINT="localhost:5001"
MINIO_USER="patchiq_admin"
MINIO_PASS="patchiq_secret_key"
BUCKET="agents"
PLATFORM="linux"
ARCH="amd64"
VERSION="1.0.0"
BINARY_PATH="agent/patchiq-agent-linux-amd64"
OBJECT_KEY="${PLATFORM}/${ARCH}/patchiq-agent"

# Get file size
FILE_SIZE=$(stat -c%s "$BINARY_PATH")

echo "Uploading $BINARY_PATH to MinIO..."
echo "Bucket: $BUCKET"
echo "Object Key: $OBJECT_KEY"
echo "File Size: $FILE_SIZE bytes"

# Create bucket if not exists
curl -s -X PUT "http://${MINIO_ENDPOINT}/${BUCKET}" \
  -u "${MINIO_USER}:${MINIO_PASS}" || true

# Upload binary using MinIO S3 API
curl -X PUT "http://${MINIO_ENDPOINT}/${BUCKET}/${OBJECT_KEY}" \
  -u "${MINIO_USER}:${MINIO_PASS}" \
  -H "Content-Type: application/octet-stream" \
  --data-binary "@${BINARY_PATH}"

echo ""
echo "Upload complete!"
echo ""
echo "Object key for database: ${OBJECT_KEY}"
echo "File size: ${FILE_SIZE}"
