#!/bin/bash
set -e
echo "Rolling back Slack..."
echo "ROLLED_BACK" > "${STATUS_DIR}/.status"
echo "Rolled back at: $(date)" >> "${STATUS_DIR}/.status"
echo "Slack rollback marker set"
