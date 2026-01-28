#!/bin/bash
set -e
echo "Rolling back Zoom..."
echo "ROLLED_BACK" > "${STATUS_DIR}/.status"
echo "Rolled back at: $(date)" >> "${STATUS_DIR}/.status"
echo "Zoom rollback marker set"
