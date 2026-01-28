#!/bin/bash
set -e
echo "Rolling back Node.js..."
echo "ROLLED_BACK" > "${STATUS_DIR}/.status"
echo "Rolled back at: $(date)" >> "${STATUS_DIR}/.status"
echo "Node.js rollback marker set"
