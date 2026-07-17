# macOS v1.22 parity progress

## Fixed scope

- Windows reference: `v1.22.0` / `6bc542ae06cc7337781c39cad5e706e7008216e6`
- macOS baseline: `d5cbf2e6a3d95c6b48fc8cc4ce441ea0bb8df0a7`
- Working branch: `codex/macos-v1-22-parity`
- Shared-core/monorepo extraction is explicitly out of scope.
- Preserve the macOS Keychain, menu bar, login item, and Application Support behavior.
- Do not port the Windows taskbar helper.
- Never run destructive tests against the user's live Application Support data.
- Keep the legacy usage ledger as a recoverable backup for at least one release.

## Completion gates

1. Renderer-inclusive build and full tests pass.
2. UsageIndex/provider ingestion and legacy-ledger migration survive restart and corruption fixtures.
3. Codex reset credits and trend breakdown are rendered in the dashboard reached from the macOS popover.
4. System/English/Japanese localization works without regressing menu-bar behavior.
5. DMG and ZIP artifacts build; the packaged app passes an isolated launch smoke test.
6. Signing/notarization is attempted only when an existing usable Developer ID identity and credentials are available.

## Work ownership

| Owner | Current scope | Exclusive files/directories |
| --- | --- | --- |
| Luna | Completed | Renderer build baseline and macOS popover i18n/UX |
| Tera | Completed | UsageIndex regression fixtures and safe legacy-ledger preservation |
| Root | Completed | Core integration, startup wiring, security, packaging, and packaged-app validation |

Agents must not edit outside their current exclusive scope without handing the file back to Root.

## Phase status

- **Completed:** Windows v1.22 feature synchronization, macOS adaptation, regression testing, and local release validation.
- **Release:** `mac-v1.1.0` is the public release target. The validated artifacts are ad-hoc signed because Developer ID Application signing credentials and notarization configuration are not available in this environment.

## Decision log

- 2026-07-17: The persistent `/Users/jeongwook/WhereMyTokens-mac` checkout had unrelated user changes. It was preserved untouched; this work uses a separate worktree at `/Users/jeongwook/WhereMyTokens-mac-v122`.
- 2026-07-17: References stay pinned for this effort even if either upstream branch moves.
- 2026-07-17: Legacy totals are not imported without source attribution. The original `usage-ledger.json` is retained and copied once, byte-for-byte, to `usage-ledger.legacy-v1.json`; UsageIndex rebuilds canonical data from available provider sources.
- 2026-07-17: The macOS release version is `1.1.0`. Windows taskbar helper code and taskbar-only locale keys remain excluded.
- 2026-07-17: Production `fast-uri` is pinned to fixed `3.1.3`; no force audit upgrade was used.

## Verification log

- Baseline before branch creation: `npm test` passed 366/366, while `npm run build` failed because `src/renderer/index.html` was missing.
- Final `npm test`: 492 total, 491 passed, 0 failed, 1 Windows-only Electron smoke skipped by design. The same built-in SQLite adapter was also executed successfully with the macOS Electron runtime.
- UsageIndex macOS parity: memory/SQLite equivalence, restart, reset/reindex, in-flight invalidation, corrupt DB preservation, rollback, compaction, and schema-v1 migration passed.
- Legacy ledger: missing source, exact-byte preservation, malformed/non-UTF-8 content, no-overwrite, 12-way race, symlink rejection, non-regular source, and startup ordering passed. Packaged-app smoke confirmed mode `0600`, identical bytes, SQLite schema v4, and `PRAGMA integrity_check = ok`.
- Renderer: full main+renderer build, static catalog coverage, popover i18n parity, and taskbar-key absence passed.
- Production dependency audit: 0 vulnerabilities; packaged `fast-uri` version inspected as `3.1.3`.
- `npm run dist:mac`: succeeded for arm64 DMG and ZIP. `codesign --verify --deep --strict`, ZIP integrity, DMG checksum, mounted-DMG layout, and extracted-ZIP signature checks passed.
- Packaged app: launched twice with isolated `HOME` and credential discovery disabled. It created the expected Application Support UsageIndex, rendered the 430x640 menu-bar popover while remaining a background/Dock-hidden process, persisted Japanese/KRW/dark settings across restart, and exited twice with status 0 and no residual processes.
- Signing: no Developer ID Application identity was available. Electron Builder used ad-hoc hardened-runtime signing. Gatekeeper rejection is expected until Developer ID signing and notarization are supplied.
- Final artifacts:
  - `release/WhereMyTokens-1.1.0-mac-arm64.dmg` — SHA-256 `dc588b4c7b682fd7a68ce3069313204bad63738fcbc11337528cfcc202ce6c47`
  - `release/WhereMyTokens-1.1.0-arm64-mac.zip` — SHA-256 `0cb8705b0f3d89d6b1e654671a24785e86096deb5630968d82bfc01f3d013c63`

## Windows-to-macOS map

| Capability | Windows source | macOS destination/status |
| --- | --- | --- |
| UsageIndex | `src/main/usageIndex/**` | Completed; SQLite schema v4, recovery, reset, compaction, and migration fixtures verified |
| Provider ingestion | `src/main/providers/**` | Completed for Claude, Codex, and Antigravity with source attribution |
| Reset credits | state/provider/renderer surfaces | Completed with cache, failure-state, and renderer coverage |
| Trend breakdown | state/IPC/renderer surfaces | Completed with throttled breakdown refresh and selection coverage |
| i18n | `src/renderer/i18n/**` | Completed for System/English/Japanese, including the native popover shell |
| Taskbar mini | Windows native helper | Excluded; no active taskbar code or locale keys in the macOS build |

## Resume point

Implementation and local validation are complete on `codex/macos-v1-22-parity`. The `mac-v1.1.0` release uses the validated DMG/ZIP artifacts. A future release may add a Developer ID Application certificate and notarize/staple the same release configuration; it must not repeat or overwrite the preserved user worktrees.
