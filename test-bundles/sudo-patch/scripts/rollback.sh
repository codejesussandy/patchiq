#!/bin/bash
set -e
echo "Rolling back Sudo Security Patch..."
echo "WARNING: Rollback of security patches is not recommended"
echo "ROLLED_BACK" > "${STATUS_DIR}/.status"
echo "Rolled back at: $(date)" >> "${STATUS_DIR}/.status"
