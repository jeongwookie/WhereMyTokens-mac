# Feature Details

WhereMyTokens for macOS is a local-first menu bar app for AI coding usage observability.

## macOS App Shell

- Runs as a menu bar utility and hides the Dock icon on startup.
- Opens a compact dashboard below the menu bar item.
- Stores app data under `~/Library/Application Support/WhereMyTokens`.
- Stores logs under `~/Library/Logs/WhereMyTokens`.
- Builds DMG and ZIP artifacts with `electron-builder`.

## Session Tracking

- Provider checkboxes for Claude Code, Codex, Antigravity, or any enabled combination.
- Local session discovery from Claude and Codex session files.
- Antigravity cascade discovery through local RPC while the IDE is running.
- Session grouping by project and git branch.
- Context, status, model, token, and cost summaries for active and recent work.

## Quotas And Alerts

- Provider quota cards for Claude, Codex, Antigravity, and future provider adapters.
- Per-target quota display modes: Rich, Simple, or hidden.
- Quota Pace compares usage percentage with elapsed reset-window time.
- System notifications for configurable usage thresholds.
- Claude Code `statusLine` bridge support for live local context and fallback quota data.

## Analytics

- Today and all-time totals for tokens, cost, calls, sessions, cache efficiency, and savings.
- Persistent local usage ledger for long-range totals and faster startup.
- Trend card combining usage cost/tokens with git net-line output.
- Activity heatmaps, rhythm charts, model usage, and tool breakdowns.
- Git output metrics from local repositories tied to tracked sessions.

## Customization

- Auto, light, and dark themes.
- USD or KRW display with configurable exchange rate.
- Menu bar label modes for usage percentage, token count, or cost.
- Floating Quota Pace widget with always-on-top support.
- Dashboard layout controls for hiding or reordering optional cards.
- Optional start at login.
