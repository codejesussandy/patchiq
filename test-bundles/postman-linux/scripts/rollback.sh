#!/bin/bash
set -e
echo "Rolling back Postman..."
echo "ROLLED_BACK" > "${STATUS_DIR}/.status"
echo "Rolled back at: $(date)" >> "${STATUS_DIR}/.status"
echo "Postman rollback marker set"
