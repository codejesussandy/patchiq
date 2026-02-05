@echo off
echo Starting PatchIQ Agent...
cd /d "%~dp0"
patchiq-agent.exe -config config.json
pause
