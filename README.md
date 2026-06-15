<p align="center">
  <img src="assets/source-icon.png" width="88" alt="WhereMyTokens app mark" />
</p>

<h1 align="center">WhereMyTokens for macOS</h1>

<p align="center">
  <strong>A local-first macOS menu bar app for Claude Code, Codex, and Antigravity usage.</strong>
</p>

<p align="center">
  <img alt="macOS menu bar" src="https://img.shields.io/badge/macOS-menu_bar-000000?style=for-the-badge">
  <img alt="Claude Code" src="https://img.shields.io/badge/Claude_Code-supported-d97706?style=for-the-badge">
  <img alt="Codex tracking" src="https://img.shields.io/badge/Codex-supported-4f46e5?style=for-the-badge">
  <img alt="Antigravity" src="https://img.shields.io/badge/Antigravity-local_RPC-0f766e?style=for-the-badge">
  <img alt="Local only" src="https://img.shields.io/badge/local_first-no_cloud_sync-0f766e?style=for-the-badge">
</p>

<p align="center">
  <a href="README.ko.md">한국어</a> · <a href="README.ja.md">日本語</a> · <a href="README.zh-CN.md">中文</a> · <a href="README.es.md">Español</a>
</p>

<p align="center">
  <a href="#install"><strong>Install</strong></a>
  ·
  <a href="#first-run">First Run</a>
  ·
  <a href="#macos-design">macOS Design</a>
  ·
  <a href="#privacy">Privacy</a>
</p>

WhereMyTokens lives in the macOS menu bar and opens a compact dashboard for local AI-coding usage: token totals, cost estimates, cache efficiency, quota windows, session status, model usage, activity charts, and git output metrics.

This repository is the macOS port workspace. The original Windows app was imported as a baseline on `main`; active macOS work happens on `codex/dev-macos-port` and feature branches. Do not merge implementation work into `main` until the final review is complete.

<a id="screenshots"></a>

<table>
  <tr>
    <th>Dark Overview</th>
  </tr>
  <tr>
    <td><img src="assets/screenshot-overview-dark.png" alt="WhereMyTokens dark overview" /></td>
  </tr>
  <tr>
    <th>Light Overview</th>
  </tr>
  <tr>
    <td><img src="assets/screenshot-overview-light.png" alt="WhereMyTokens light overview" /></td>
  </tr>
</table>

## What's New

| Version | Date | Highlights |
|---------|------|------------|
| **[v1.18.2](https://github.com/jeongwookie/WhereMyTokens/releases/tag/v1.18.2)** | Jun 5 | Fix long Rich quota card titles so Plan Usage columns stay aligned while keeping ellipsis and tooltip fallback. |
| **[v1.18.1](https://github.com/jeongwookie/WhereMyTokens/releases/tag/v1.18.1)** | Jun 4 | Stabilize Antigravity quota selection and pacing, prevent startup Partial History loops, mask account labels, and keep model token stats visible. |
| **[v1.18.0](https://github.com/jeongwookie/WhereMyTokens/releases/tag/v1.18.0)** | Jun 2 | Add local-only Antigravity provider support with process discovery, local RPC quota/session scanning, persisted usage cache, and provider ledger import. |
| **[v1.17.0](https://github.com/jeongwookie/WhereMyTokens/releases/tag/v1.17.0)** | Jun 2 | Refactor Plan Usage around provider quota snapshots, per-target display groups, and safer quota state migration. |
| **[v1.16.1](https://github.com/jeongwookie/WhereMyTokens/releases/tag/v1.16.1)** | May 27 | Keep budgeted ledger warmup running after truncated or failed full-history imports and avoid stale provider completion markers. |

## Install

### Option 1: DMG installer

Use this for normal macOS installation after a release asset is published.

1. Download `WhereMyTokens-<version>-mac-arm64.dmg` from the release assets.
2. Open the DMG.
3. Drag `WhereMyTokens.app` into `/Applications`.
4. Eject the DMG.
5. Launch `WhereMyTokens` from `/Applications`.

The current local build is ad-hoc signed but not Apple notarized. Until a Developer ID certificate and notarization pipeline are added, macOS Gatekeeper may show an "unidentified developer" warning on first launch. For internal testing, right-click the app and choose **Open**, or use **System Settings -> Privacy & Security -> Open Anyway**. For public distribution, the release must be Developer ID signed, notarized, and stapled.

### Option 2: ZIP app archive

Use this when you want a simple archive instead of a mounted DMG.

1. Download `WhereMyTokens-<version>-arm64-mac.zip`.
2. Unzip it.
3. Move `WhereMyTokens.app` into `/Applications`.
4. Launch it from `/Applications`.

### Option 3: Build from source

Use this for development or private builds.

```bash
npm install
npm run dist:mac
```

Generated artifacts:

| Artifact | Purpose |
|----------|---------|
| `release/mac-arm64/WhereMyTokens.app` | Built macOS app bundle. |
| `release/WhereMyTokens-<version>-mac-arm64.dmg` | Drag-to-Applications installer image. |
| `release/WhereMyTokens-<version>-arm64-mac.zip` | Zipped app archive. |

The current packaged target is Apple Silicon (`arm64`). Add an x64 or universal target before publishing to Intel Mac users.

By building or installing, you agree to the [End-User License Agreement](EULA.txt).

## First Run

1. Look for the WhereMyTokens item in the macOS menu bar.
2. Click it to open the dashboard. The app hides the Dock icon and behaves like a menu bar utility.
3. Open **Settings** and choose which providers to track: Claude Code, Codex, Antigravity, or any combination.
4. Optional: enable **Claude Code Integration** to register the `statusLine` bridge for live Claude context and fallback rate-limit data.
5. Optional: enable **Start at login** if you want WhereMyTokens to launch automatically after macOS login.

Default local data location:

```text
~/Library/Application Support/WhereMyTokens
```

The Claude bridge snapshot is written to:

```text
~/Library/Application Support/WhereMyTokens/live-session.json
```

## Features

### Usage And Quotas

- Claude Code, Codex, and Antigravity provider checkboxes.
- Provider adapters live under `src/main/providers/` so future providers can join the same quota/session/usage shape.
- Rich quota cards for provider reset windows and model quota targets.
- Cache efficiency, saved-cost estimates, and provider health chips.
- Claude usage via Anthropic API, local `statusLine` bridge fallback, and cache fallback.
- Codex usage via live usage endpoint, cache fallback, and local JSONL `rate_limits`.
- Antigravity usage through the running IDE's local language server on `127.0.0.1`.

### Sessions

- Local session discovery for Claude and Codex JSONL/session files.
- Antigravity cascade discovery through local RPC while the IDE is running.
- Project and branch grouping from local git metadata.
- Context, status, model, token, and cost summaries for active and recent work.

### Analytics

- Today and all-time totals.
- Usage ledger and git output ledger stored locally as `usage-ledger.json` and `git-output-ledger.json`.
- **Rebuild ledger** in Settings can reset and replay the persisted usage ledger from local history when totals need repair.
- Trend card combining usage cost/tokens with git net-line output.
- Activity heatmaps, rhythm charts, model breakdowns, and tool activity summaries.

### macOS Utilities

- Menu bar label can show usage percent, token count, or cost.
- Floating quota widget can stay above other windows.
- Light, dark, and system-auto themes.
- Start-at-login setting.
- System notifications for quota thresholds.

## macOS Design

The macOS port is not just the older desktop tray shell repackaged:

| Area | Current decision |
|------|------------------|
| App shell | Menu bar utility with the Dock hidden on startup. |
| Status item | Uses a template-style menu bar icon so macOS can tint it correctly in light and dark menu bars. |
| Popup placement | Opens below the menu bar item on macOS and clamps inside the active display work area. |
| Data location | Uses `~/Library/Application Support/WhereMyTokens` instead of legacy roaming app data. |
| Logs | Uses `~/Library/Logs/WhereMyTokens` for debug instrumentation. |
| App icon | Generates `.icns` from the existing app mark and bundles it into `WhereMyTokens.app`. |
| Installer | Builds DMG and ZIP artifacts with `electron-builder`. |

Design status before public release:

- The dashboard UI is functional and verified on macOS, including the rendered popup.
- The menu bar behavior has been smoke-tested with a packaged `.app`.
- The app bundle icon is technically wired and visible to macOS, but the current icon is the existing black-and-white mark converted to ICNS. It is acceptable for internal testing; a public release should get a final macOS icon pass with a 1024x1024 source, Big Sur style proportions, Finder-scale legibility, and dark/light background checks.
- The DMG currently uses default `electron-builder` presentation. A polished public release should add a DMG background, clear Applications shortcut layout, Developer ID signing, notarization, and stapling.

## Privacy

WhereMyTokens is local-first. It does not run a cloud sync service and does not upload session logs.

| Local path or endpoint | Purpose |
|------------------------|---------|
| `~/.claude/sessions/*.json` | Claude session metadata. |
| `~/.claude/projects/**/*.jsonl` | Claude token, cost, context, and activity summaries. |
| `~/.claude/.credentials.json` | Claude OAuth material for Anthropic usage requests and token refresh. |
| `~/.codex/sessions/**/*.jsonl` | Recent Codex session usage and tool activity. |
| `~/.codex/archived_sessions/**/*.jsonl` | Archived Codex usage included in all-time totals. |
| `~/.codex/session-cleanup-archive/**/*.jsonl` | Codex cleanup archives included in all-time totals. |
| `~/.codex/auth.json` | ChatGPT/Codex OAuth material for live usage snapshots. |
| `127.0.0.1` Antigravity language server | Local-only session, quota, and token metadata while Antigravity is running. |
| `~/Library/Application Support/WhereMyTokens` | App settings, local caches, ledgers, notification history, and bridge state. |

Network access is limited to provider usage endpoints for enabled providers. Antigravity support uses loopback local RPC only; it does not use Google OAuth, refresh tokens, Google cloud usage endpoints, or offline database fallback.

To disable the Claude Code bridge, open **Settings -> Claude Code Integration -> Disable**. The app removes only the WhereMyTokens-owned `statusLine` entry and leaves other custom `statusLine` settings intact.

## Development

```bash
npm install
npm run build
npm test
npm run dist:mac
```

Useful verification for the macOS port:

```bash
npm run dist:mac
codesign --verify --deep --strict --verbose=2 release/mac-arm64/WhereMyTokens.app
"release/mac-arm64/WhereMyTokens.app/Contents/MacOS/WhereMyTokens"
```

Runtime smoke test checklist:

- App process stays alive after launch.
- No fatal stderr output during startup.
- Child process args use `--user-data-dir=.../Library/Application Support/WhereMyTokens`.
- Menu bar item appears.
- Dashboard popup renders real content, not a blank window.
- Quitting leaves no `WhereMyTokens` process behind.

## Release Checklist

- Build DMG and ZIP on a clean macOS machine.
- Verify `.app` contents include `Resources/bridge/bridge.js` and `Resources/shared/platformPaths.js`.
- Verify code signing.
- Add Developer ID signing and notarization before public distribution.
- Review final app icon at Finder, Dock, Spotlight, and DMG sizes.
- Verify first-run install copy and Gatekeeper behavior.
- Confirm `main` has not received implementation merges before final owner review.
