#!/bin/bash
set -e
echo "Rolling back OpenSSL Security Patch..."
echo "WARNING: Rollback of security patches is not recommended"
echo "ROLLED_BACK" > "${STATUS_DIR}/.status"
echo "Rolled back at: $(date)" >> "${STATUS_DIR}/.status"
echo "Previous version was: $(cat ${STATUS_DIR}/pre-patch-version.txt)" >> "${STATUS_DIR}/.status"
