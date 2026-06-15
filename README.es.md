<p align="center">
  <img src="assets/source-icon.png" width="88" alt="WhereMyTokens app mark" />
</p>

<h1 align="center">WhereMyTokens for macOS</h1>

<p align="center">
  <strong>Una app local-first de barra de menús de macOS para uso de Claude Code, Codex y Antigravity.</strong>
</p>

<p align="center">
  <img alt="macOS menu bar" src="https://img.shields.io/badge/macOS-menu_bar-000000?style=for-the-badge">
  <img alt="Local only" src="https://img.shields.io/badge/local_first-no_cloud_sync-0f766e?style=for-the-badge">
</p>

<p align="center">
  <a href="README.md">English</a> · <a href="README.ko.md">한국어</a> · <a href="README.ja.md">日本語</a> · <a href="README.zh-CN.md">中文</a>
</p>

> This file is a macOS-port summary. The English and Korean READMEs are the canonical detailed documents for this branch.

<a id="screenshots"></a>

<table>
  <tr>
    <th>Vista oscura</th>
  </tr>
  <tr>
    <td><img src="assets/screenshot-overview-dark.png" alt="WhereMyTokens dark overview" /></td>
  </tr>
  <tr>
    <th>Vista clara</th>
  </tr>
  <tr>
    <td><img src="assets/screenshot-overview-light.png" alt="WhereMyTokens light overview" /></td>
  </tr>
</table>

## Novedades

| Versión | Fecha | Cambios |
|---------|-------|---------|
| **[v1.18.2](https://github.com/jeongwookie/WhereMyTokens/releases/tag/v1.18.2)** | 5 jun | Corrige long Rich quota card title overflow y conserva ellipsis y tooltip fallback. |
| **[v1.18.1](https://github.com/jeongwookie/WhereMyTokens/releases/tag/v1.18.1)** | 4 jun | Estabiliza Antigravity quota selection y pacing, y evita Partial History loops. |
| **[v1.18.0](https://github.com/jeongwookie/WhereMyTokens/releases/tag/v1.18.0)** | 2 jun | Añade local-only Antigravity provider, local RPC quota/session scan y persisted usage cache. |
| **[v1.17.0](https://github.com/jeongwookie/WhereMyTokens/releases/tag/v1.17.0)** | 2 jun | Reestructura Plan Usage sobre provider quota snapshots. |
| **[v1.16.1](https://github.com/jeongwookie/WhereMyTokens/releases/tag/v1.16.1)** | 27 may | Mejora budgeted ledger warmup y stale provider completion markers. |

## Instalación

### DMG

1. Descarga `WhereMyTokens-<version>-mac-arm64.dmg` desde los release assets.
2. Abre el DMG.
3. Arrastra `WhereMyTokens.app` a `/Applications`.
4. Lanza la app desde `/Applications`.

El build local actual usa ad-hoc signing, pero todavía no tiene Apple notarization. Para pruebas internas, haz clic derecho en la app y elige **Open**, o usa **System Settings -> Privacy & Security -> Open Anyway**. Para distribución pública se necesita Developer ID signing, notarization y stapling.

### ZIP

1. Descarga `WhereMyTokens-<version>-arm64-mac.zip`.
2. Descomprime el archivo.
3. Mueve `WhereMyTokens.app` a `/Applications`.

### Build desde código fuente

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

## Diseño macOS

- Dock icon is hidden; the app behaves as a macOS menu bar utility.
- The popup opens from the menu bar item and is clamped inside the active display.
- App data uses `~/Library/Application Support/WhereMyTokens`.
- Debug logs use `~/Library/Logs/WhereMyTokens`.
- The app bundle includes an `.icns` generated from the existing app mark.
- The current icon is wired correctly for packaging and internal testing, but public distribution should include a final macOS icon review at Finder, Dock, Spotlight, and DMG sizes.
- The current DMG uses the default `electron-builder` presentation; a polished public release should add a custom DMG background and notarized Developer ID signing.

## Privacidad

WhereMyTokens is local-first. It reads local Claude, Codex, and Antigravity sources and does not upload session logs.

Important local paths:

```text
~/Library/Application Support/WhereMyTokens
~/Library/Application Support/WhereMyTokens/live-session.json
~/Library/Application Support/WhereMyTokens/usage-ledger.json
~/.claude/projects/**/*.jsonl
~/.codex/sessions/**/*.jsonl
```

Antigravity support uses local RPC on `127.0.0.1` only. It does not use Google OAuth, refresh tokens, Google cloud usage endpoints, or offline database fallback.

Settings includes a **Rebuild ledger** action for replaying persisted usage totals from local history.
