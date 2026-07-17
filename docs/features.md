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

- Today and all-time header totals for tokens, cost, calls, sessions, cache efficiency, and savings.
- Persistent source-attributed local usage index for long-range totals, incremental startup, and project-aware filtering.
- Usage precision retention: request detail for 8 days, hourly buckets for 35 days, daily buckets for 180 days, and exact monthly authority indefinitely.
- Non-blocking first indexing with explicit incomplete coverage, plus a destructive `Reset index` action that rebuilds only from currently available sources.
- Trend buckets with drill-downs for provider input/output, thinking, response, tools, cache-aware work tokens, billing tokens, and git net-line categories.
- Activity tabs for 7-day heatmap, 5-month calendar, hourly distribution, weekly comparison, and rhythm breakdown.
- Model usage cards and activity breakdowns for Claude output categories and Codex tool-event categories.

## Code Output

- Commit and net-line metrics from local git repositories tied to tracked sessions.
- Cost per 100 added lines for today and all-time views.
- Output growth chart across recent local days.
- Local git author email filtering so only your commits are counted.

## Customization

- Auto, light, and dark themes.
- USD or KRW display with configurable exchange rate.
- Menu bar label modes for usage percentage, token count, or cost.
- Floating Quota Pace widget with always-on-top support.
- Dashboard layout controls for hiding or reordering optional cards.
- Project hide and exclude controls backed by the same canonical usage query path.
- Optional start at login.
