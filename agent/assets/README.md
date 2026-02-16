# Agent Assets

This directory contains assets for building Windows executables.

## Files

### versioninfo.json
Windows version information metadata embedded in the .exe file.
Used by `goversioninfo` to add version details, company info, and icon to the binary.

### icon.ico (placeholder needed)
Windows application icon embedded in the .exe file.

**To create the icon:**

Option 1: Use online converter
1. Create a PNG logo (256x256 recommended)
2. Convert to .ico using https://convertio.co/png-ico/ or similar
3. Save as `icon.ico` in this directory

Option 2: Use ImageMagick
```bash
convert logo.png -define icon:auto-resize=256,128,64,48,32,16 icon.ico
```

Option 3: Use placeholder
For development/testing, you can use a simple 1x1 pixel .ico file.
The build will succeed without an icon, but the .exe won't have a custom icon in Windows Explorer.

## Build Integration

The Windows build process uses `goversioninfo` to embed these resources:

```bash
# Install goversioninfo
go install github.com/josephspurrier/goversioninfo/cmd/goversioninfo@latest

# Generate resource.syso (embedded during build)
goversioninfo -64 -icon=assets/icon.ico -o=resource.syso assets/versioninfo.json

# Build Windows binary (resource.syso is automatically included)
GOOS=windows GOARCH=amd64 go build -o dist/patchiq-agent-windows-amd64.exe ./cmd/agent
```

The Makefile handles this automatically when you run `make build-windows`.
