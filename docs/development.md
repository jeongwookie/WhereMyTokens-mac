# Development

## Requirements

- macOS on Apple Silicon for the current packaged target.
- Node.js 18 or newer.
- Claude Code, Codex, or Antigravity installed if you want live local data during manual testing.

## Build And Run

```bash
git clone https://github.com/jeongwookie/WhereMyTokens-mac.git
cd WhereMyTokens-mac
npm install
npm run build
npm start
```

## Test

```bash
npm test
```

## Build macOS Artifacts

```bash
npm run dist:mac
```

Expected release artifacts:

| Artifact | Purpose |
|----------|---------|
| `release/mac-arm64/WhereMyTokens.app` | Built macOS app bundle. |
| `release/WhereMyTokens-X.Y.Z-mac-arm64.dmg` | Drag-to-Applications installer image. |
| `release/WhereMyTokens-X.Y.Z-arm64-mac.zip` | Zipped app archive. |

## Architecture

WhereMyTokens is an Electron menu bar app. The renderer never reads local files or credentials directly; filesystem, provider API, menu bar, and settings work stays in the Electron main process and is exposed through the preload bridge.

| Layer | Responsibility |
|-------|----------------|
| Electron main | Discovers provider sessions, parses usage sources, fetches provider usage, manages menu bar/window state, and persists settings. |
| Preload bridge | Exposes the typed `window.wmt` IPC surface with `contextIsolation` boundaries. |
| React renderer | Shows the dashboard, settings, notifications, activity charts, and compact quota widget. |
| `statusLine` bridge | Receives Claude Code JSON on stdin and writes a local bridge snapshot for the main process. |

## Release Checklist

- `npm run build` succeeds.
- `npm test` succeeds.
- `npm run dist:mac` succeeds.
- `codesign --verify --deep --strict --verbose=2 release/mac-arm64/WhereMyTokens.app` succeeds.
- `.app` includes `Resources/bridge/bridge.js` and `Resources/shared/platformPaths.js`.
- App launches without a Dock icon and shows a menu bar item.
- Dashboard popup renders real content, not a blank window.
- DMG and ZIP install into `/Applications`.
- Developer ID signing, notarization, and stapling are still required before fully polished public distribution.
