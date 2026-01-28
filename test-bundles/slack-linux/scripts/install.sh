#!/bin/bash
set -e
echo "Installing Slack ${SLACK_VERSION}..."

if command -v snap &> /dev/null; then
    snap install slack --classic
elif command -v apt-get &> /dev/null; then
    wget -O /tmp/slack.deb "https://downloads.slack-edge.com/releases/linux/${SLACK_VERSION}/prod/x64/slack-desktop-${SLACK_VERSION}-amd64.deb"
    apt-get install -y /tmp/slack.deb
    rm /tmp/slack.deb
elif command -v dnf &> /dev/null; then
    wget -O /tmp/slack.rpm "https://downloads.slack-edge.com/releases/linux/${SLACK_VERSION}/prod/x64/slack-${SLACK_VERSION}-x86_64.rpm"
    dnf install -y /tmp/slack.rpm
    rm /tmp/slack.rpm
fi

mkdir -p "${STATUS_DIR}"
echo "INSTALLED" > "${STATUS_DIR}/.status"
echo "Installed version: ${SLACK_VERSION}" >> "${STATUS_DIR}/.status"
echo "Installed at: $(date)" >> "${STATUS_DIR}/.status"

echo "Slack ${SLACK_VERSION} installed successfully"
