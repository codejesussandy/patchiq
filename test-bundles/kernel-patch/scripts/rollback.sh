#!/bin/bash
set -e
echo "Rolling back Kernel Security Update..."
echo "Previous kernel version available in GRUB menu"
echo "ROLLED_BACK" > "${STATUS_DIR}/.status"
echo "Rolled back at: $(date)" >> "${STATUS_DIR}/.status"
echo "Select previous kernel version during boot to complete rollback"
