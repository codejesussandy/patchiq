#!/bin/bash
set -e
echo "Rolling back Visual Studio Code..."
echo "ROLLED_BACK" > /opt/vscode/.status
echo "Rolled back at: $(date)" >> /opt/vscode/.status
echo "Note: Package manager rollback requires manual intervention"
echo "VS Code rollback marker set"
