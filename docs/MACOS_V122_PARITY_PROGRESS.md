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
3. Codex reset credits and trend breakdown are rendered in the macOS popover.
4. System/English/Japanese localization works without regressing menu-bar behavior.
5. DMG and ZIP artifacts build; the packaged app passes an isolated launch smoke test.
6. Signing/notarization is attempted only when an existing usable Developer ID identity and credentials are available.

## Work ownership

| Owner | Current scope | Exclusive files/directories |
| --- | --- | --- |
| Luna | Phase 0 renderer/build baseline | `src/renderer/index.html`, renderer build/test scripts, Phase 0 package scripts only |
| Tera | UsageIndex backend port | New `src/main/usageIndex/**` and its focused tests only |
| Root | Integration and conflict-prone surfaces | `StateManager`, shared types, IPC, `App.tsx`, dependency lockfile, final packaging |

Agents must not edit outside their current exclusive scope without handing the file back to Root.

## Phase status

- **In progress:** Phase 0 — restore the renderer-inclusive build and establish clean regression gates.
- **Next:** integrate the UsageIndex backend, then migrate provider ingestion and the legacy ledger.

## Decision log

- 2026-07-17: The persistent `/Users/jeongwook/WhereMyTokens-mac` checkout had unrelated user changes. It was preserved untouched; this work uses a separate worktree at `/Users/jeongwook/WhereMyTokens-mac-v122`.
- 2026-07-17: References stay pinned for this effort even if either upstream branch moves.

## Verification log

- Baseline known before branch creation: `npm test` passed 366/366, while `npm run build` failed because `src/renderer/index.html` was missing.
- Current branch verification: pending.

## Windows-to-macOS map

| Capability | Windows source | macOS destination/status |
| --- | --- | --- |
| UsageIndex | `src/main/usageIndex/**` | Backend port in progress |
| Provider ingestion | `src/main/providers/**` | Pending mapping and integration |
| Reset credits | state/provider/renderer surfaces | Pending |
| Trend breakdown | state/IPC/renderer surfaces | Pending |
| i18n | `src/renderer/i18n/**` | Pending, retain macOS popover shell |
| Taskbar mini | Windows native helper | Excluded; adapt only useful status concepts to menu bar/popover |

## Resume point

Run the full Phase 0 gates, record the exact results here, commit the baseline repair, then integrate Tera's UsageIndex-only changes through Root-owned state and IPC surfaces.
