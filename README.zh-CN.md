<p align="center">
  <img src="assets/source-icon.png" width="88" alt="WhereMyTokens app mark" />
</p>

<h1 align="center">WhereMyTokens for macOS</h1>

<p align="center">
  <strong>一个本地优先的 macOS 菜单栏应用，用于查看 Claude Code、Codex 和 Antigravity 使用量。</strong>
</p>

<p align="center">
  <img alt="macOS menu bar" src="https://img.shields.io/badge/macOS-menu_bar-000000?style=for-the-badge">
  <img alt="Local only" src="https://img.shields.io/badge/local_first-no_cloud_sync-0f766e?style=for-the-badge">
</p>

<p align="center">
  <a href="README.md">English</a> · <a href="README.ko.md">한국어</a> · <a href="README.ja.md">日本語</a> · <a href="README.es.md">Español</a>
</p>

> This file is a macOS edition summary. The English and Korean READMEs are the canonical detailed documents.

<a id="screenshots"></a>

<table>
  <tr>
    <th>深色总览</th>
  </tr>
  <tr>
    <td><img src="assets/screenshot-overview-dark.png" alt="WhereMyTokens dark overview" /></td>
  </tr>
  <tr>
    <th>浅色总览</th>
  </tr>
  <tr>
    <td><img src="assets/screenshot-overview-light.png" alt="WhereMyTokens light overview" /></td>
  </tr>
</table>

## 最新更新

| 版本 | 日期 | 主要变更 |
|------|------|----------|
| **mac-v1.0.0** | 2026-06-17 | 首个 macOS release track：菜单栏应用、DMG/ZIP、macOS 数据路径，以及 Claude/Codex/Antigravity tracking。 |

## 安装

### DMG

1. 从 release assets 下载 `WhereMyTokens-<version>-mac-arm64.dmg`。
2. 打开 DMG。
3. 将 `WhereMyTokens.app` 拖到 `/Applications`。
4. 从 `/Applications` 启动应用。

当前本地构建使用 ad-hoc signing，但还没有 Apple notarization。内部测试时可以右键应用并选择 **Open**，或使用 **System Settings -> Privacy & Security -> Open Anyway**。公开发布前需要 Developer ID signing、notarization 和 stapling。

### ZIP

1. 下载 `WhereMyTokens-<version>-arm64-mac.zip`。
2. 解压。
3. 将 `WhereMyTokens.app` 移到 `/Applications`。

### 从源码构建

```bash
npm install
npm run dist:mac
```

Generated artifacts:

| Artifact | Purpose |
|----------|---------|
| `release/mac-arm64/WhereMyTokens.app` | macOS app bundle. |
| `release/WhereMyTokens-<version>-mac-arm64.dmg` | Drag-to-Applications installer. |
| `release/WhereMyTokens-<version>-arm64-mac.zip` | Zipped app archive. |

Current target: Apple Silicon (`arm64`). Add x64 or universal builds before distributing to Intel Mac users.

## macOS 设计状态

- Dock icon is hidden; the app behaves as a macOS menu bar utility.
- The popup opens from the menu bar item and is clamped inside the active display.
- App data uses `~/Library/Application Support/WhereMyTokens`.
- Debug logs use `~/Library/Logs/WhereMyTokens`.
- The app bundle includes an `.icns` generated from the existing app mark.
- The current icon works for packaging and internal testing, but public distribution should include a final macOS icon review at Finder, Dock, Spotlight, and DMG sizes.
- The current DMG uses the default `electron-builder` presentation; a polished public release should add a custom DMG background and notarized Developer ID signing.

## 隐私

WhereMyTokens is local-first. It reads local Claude, Codex, and Antigravity sources and does not upload session logs.

Important local paths:

```text
~/Library/Application Support/WhereMyTokens
~/Library/Application Support/WhereMyTokens/live-session.json
~/Library/Application Support/WhereMyTokens/usage-ledger.json
~/.claude/projects/**/*.jsonl
~/.codex/sessions/**/*.jsonl
```

Settings includes a **重建账本** action for replaying persisted usage totals from local history.

Antigravity support uses local RPC on `127.0.0.1` only. 它不会使用 Google OAuth、refresh token、Google cloud usage endpoint 或离线数据库 fallback.
