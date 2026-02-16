# PatchIQ Test App Bundle

This is a test bundle for validating the PatchIQ hub-centric deployment engine.

## Structure

```
test-app-bundle/
├── manifest.json          # Package metadata and script paths
├── scripts/
│   ├── install.sh        # Installation script
│   ├── update.sh         # Update script
│   ├── rollback.sh       # Rollback script
│   └── uninstall.sh      # Uninstall script
├── files/
│   └── test-app.txt      # Sample application file
└── README.md             # This file
```

## Testing

### Manual Test

1. Extract this bundle
2. Run installation:
   ```bash
   cd test-app-bundle
   ./scripts/install.sh
   ```

3. Verify installation:
   ```bash
   ls -la ~/.patchiq-test-app
   cat ~/.patchiq-test-app/version.txt
   ```

4. Test uninstall:
   ```bash
   ./scripts/uninstall.sh
   ```

### Bundle Test

1. Create tar.gz bundle:
   ```bash
   tar -czf test-app-1.0.0.tar.gz test-app-bundle/
   ```

2. Test with agent script executor (requires running agent)

## Installation Location

- User install: `~/.patchiq-test-app`
- System install: `/opt/patchiq-test-app`

## What Gets Installed

- Application files in installation directory
- version.txt - Current version
- metadata.json - Installation metadata
- test-app.sh - Executable script
- Symlink in ~/bin (if directory exists)
