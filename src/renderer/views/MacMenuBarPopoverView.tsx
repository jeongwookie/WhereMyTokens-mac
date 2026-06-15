import React, { useCallback, useMemo, useState } from 'react';
import { ExternalLink, LayoutPanelTop, RefreshCw, Settings, X } from 'lucide-react';
import { AppState, ProviderId, SessionInfo } from '../types';
import { useTheme } from '../ThemeContext';
import { buildQuotaDisplayModels, QuotaDisplayRowViewModel } from '../quotaDisplayModels';
import { fmtCostShort, fmtTokens, quotaPctBarColor, stateColor, stateLabel } from '../theme';
import { providerDisplayName } from '../limitDisplay';

interface Props {
  state: AppState;
  onRefresh: () => Promise<void>;
  onOpenDashboard: () => void;
  onOpenSettings: () => void;
  onToggleCompactWidget: () => void;
  onClose: () => void;
}

type Period = 'today' | 'all';

interface QuotaRowViewModel {
  key: string;
  provider: ProviderId;
  title: string;
  label: string;
  quotaPct: number;
  resetMs: number | null;
  visualKind: QuotaDisplayRowViewModel['visualKind'];
  costUSD: number;
  tokens: number;
  pending: boolean;
  waiting: boolean;
}

const noDrag = { WebkitAppRegion: 'no-drag' } as React.CSSProperties;
const drag = { WebkitAppRegion: 'drag' } as React.CSSProperties;

function clampPct(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.max(0, Math.min(100, value));
}

function formatPct(value: number | null | undefined): string {
  if (value == null || !Number.isFinite(value)) return '--';
  if (value <= 0) return '0%';
  if (value < 1) return '<1%';
  return `${Math.round(value)}%`;
}

function formatReset(resetMs: number | null): string {
  if (resetMs == null || resetMs <= 0) return '';
  const totalMinutes = Math.max(1, Math.round(resetMs / 60000));
  if (totalMinutes < 60) return `${totalMinutes}m`;
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  if (hours >= 10 || minutes === 0) return `${hours}h`;
  return `${hours}h ${minutes}m`;
}

function buildQuotaRows(state: AppState): QuotaRowViewModel[] {
  const { widgetGroups } = buildQuotaDisplayModels({
    usage: state.usage,
    providerQuotas: state.providerQuotas,
    settings: state.settings,
    historyWarmupPending: state.historyWarmupPending,
    historyWarmupStartsAt: state.historyWarmupStartsAt,
    formatWarmupEta: () => 'syncing',
    simpleIncludesRich: true,
  });

  return widgetGroups.flatMap(group => group.rows.map(row => {
    const quotaPct = clampPct(row.quotaPct);
    return {
      key: row.key,
      provider: group.provider,
      title: group.label,
      label: row.label,
      quotaPct,
      resetMs: row.resetMs,
      visualKind: row.visualKind,
      costUSD: row.hideCost ? 0 : row.stats.costUSD,
      tokens: row.stats.totalTokens,
      pending: row.pending,
      waiting: !row.pending && quotaPct <= 0 && row.resetMs == null && row.stats.totalTokens <= 0,
    };
  })).slice(0, 8);
}

function periodUsage(state: AppState, period: Period): { tokens: number; cost: number; requests: number } {
  if (period === 'today') {
    return {
      tokens: state.usage.todayTokens,
      cost: state.usage.todayCost,
      requests: state.usage.todayRequestCount,
    };
  }
  return {
    tokens: state.usage.allTimeInputTokens + state.usage.allTimeOutputTokens + state.usage.allTimeCacheTokens,
    cost: state.usage.allTimeCost,
    requests: state.usage.allTimeRequestCount,
  };
}

function activeSessions(state: AppState): SessionInfo[] {
  const weight: Record<SessionInfo['state'], number> = { active: 0, compacting: 1, waiting: 2, idle: 3 };
  return [...state.sessions]
    .filter(session => session.state !== 'idle')
    .sort((a, b) => {
      const byState = weight[a.state] - weight[b.state];
      if (byState !== 0) return byState;
      return Date.parse(b.lastModified ?? b.startedAt) - Date.parse(a.lastModified ?? a.startedAt);
    })
    .slice(0, 3);
}

function primaryQuota(rows: QuotaRowViewModel[]): QuotaRowViewModel | null {
  if (rows.length === 0) return null;
  const fiveHour = rows.filter(row => /5h/i.test(row.label));
  const candidates = fiveHour.length > 0 ? fiveHour : rows;
  return candidates.reduce((best, row) => row.quotaPct > best.quotaPct ? row : best, candidates[0]);
}

function statusText(row: QuotaRowViewModel | null): string {
  if (!row) return 'Waiting for quota data';
  if (row.pending) return `${row.title} ${row.label} is syncing`;
  if (row.waiting) return `${row.title} ${row.label} is waiting`;
  const reset = formatReset(row.resetMs);
  return reset ? `${row.title} ${row.label} resets in ${reset}` : `${row.title} ${row.label}`;
}

function topLine(rows: QuotaRowViewModel[], currency: string, usdToKrw: number): string {
  const h5Rows = rows.filter(row => /5h/i.test(row.label));
  const scope = h5Rows.length > 0 ? h5Rows : rows.slice(0, 2);
  if (scope.length === 0) return '5h quota data is loading';
  const parts = scope.slice(0, 3).map(row => {
    const value = row.pending ? 'scan' : row.waiting ? '--' : formatPct(row.quotaPct);
    return `${providerDisplayName(row.provider)} ${row.label} ${value}`;
  });
  const cost = scope.reduce((sum, row) => sum + row.costUSD, 0);
  if (cost > 0) parts.push(fmtCostShort(cost, currency, usdToKrw));
  return parts.join(' / ');
}

function IconButton({
  title,
  onClick,
  children,
}: {
  title: string;
  onClick: () => void;
  children: React.ReactNode;
}) {
  const C = useTheme();
  return (
    <button
      title={title}
      onClick={onClick}
      style={{
        ...noDrag,
        width: 28,
        height: 28,
        padding: 0,
        borderRadius: 5,
        border: `1px solid ${C.headerBorder}`,
        background: 'rgba(255,255,255,0.08)',
        color: C.headerSub,
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        cursor: 'pointer',
      }}
    >
      {children}
    </button>
  );
}

function PeriodToggle({ period, onPeriod }: { period: Period; onPeriod: (period: Period) => void }) {
  const C = useTheme();
  return (
    <div style={{ ...noDrag, display: 'inline-flex', gap: 2, padding: 2, borderRadius: 5, background: 'rgba(255,255,255,0.08)' }}>
      {(['today', 'all'] as Period[]).map(item => (
        <button
          key={item}
          onClick={() => onPeriod(item)}
          style={{
            height: 22,
            minWidth: 46,
            border: 'none',
            borderRadius: 4,
            background: period === item ? `${C.accent}33` : 'transparent',
            color: period === item ? C.accent : C.headerSub,
            fontSize: 11,
            fontWeight: 800,
            cursor: 'pointer',
          }}
        >
          {item}
        </button>
      ))}
    </div>
  );
}

function QuotaRow({ row, currency, usdToKrw }: { row: QuotaRowViewModel; currency: string; usdToKrw: number }) {
  const C = useTheme();
  const color = row.pending || row.waiting ? C.textMuted : quotaPctBarColor(row.quotaPct, C);
  const value = row.pending ? 'scan' : row.waiting ? 'waiting' : formatPct(row.quotaPct);
  const reset = row.visualKind === 'percentOnly' ? '' : formatReset(row.resetMs);
  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: 'minmax(0, 116px) minmax(0, 1fr) auto',
        gap: 10,
        alignItems: 'center',
        minHeight: 46,
        padding: '9px 10px',
        borderRadius: 7,
        background: C.bgRow,
        border: `1px solid ${C.borderSub}`,
      }}
    >
      <div style={{ minWidth: 0 }}>
        <div style={{ color: C.text, fontSize: 12, fontWeight: 900, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{row.title}</div>
        <div style={{ color: C.textMuted, fontSize: 10, fontWeight: 700 }}>{row.label}{reset ? ` / ${reset}` : ''}</div>
      </div>
      <div style={{ height: 7, borderRadius: 999, background: C.bgCard, overflow: 'hidden', border: `1px solid ${C.borderSub}` }}>
        <div style={{ width: row.pending || row.waiting ? '8%' : `${row.quotaPct}%`, height: '100%', borderRadius: 999, background: color }} />
      </div>
      <div style={{ minWidth: 76, textAlign: 'right' }}>
        <div style={{ color, fontSize: 15, fontWeight: 900 }}>{value}</div>
        <div style={{ color: C.textMuted, fontSize: 10, fontWeight: 700 }}>{row.costUSD > 0 ? fmtCostShort(row.costUSD, currency, usdToKrw) : row.tokens > 0 ? fmtTokens(row.tokens) : ''}</div>
      </div>
    </div>
  );
}

function SessionRow({ session }: { session: SessionInfo }) {
  const C = useTheme();
  const color = stateColor(session.state, C);
  const title = session.projectName || session.cwd.split(/[\\/]/).filter(Boolean).pop() || providerDisplayName(session.provider);
  const meta = [
    session.gitBranch || session.worktreeBranch || null,
    providerDisplayName(session.provider),
    session.modelName || null,
  ].filter(Boolean).join(' / ');
  return (
    <div style={{ display: 'grid', gridTemplateColumns: '10px minmax(0, 1fr) auto', gap: 9, alignItems: 'center', padding: '8px 10px', borderRadius: 7, background: C.bgRow, border: `1px solid ${C.borderSub}` }}>
      <span style={{ width: 7, height: 7, borderRadius: '50%', background: color }} />
      <span style={{ minWidth: 0 }}>
        <span style={{ display: 'block', color: C.text, fontSize: 12, fontWeight: 900, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{title}</span>
        <span style={{ display: 'block', marginTop: 2, color: C.textMuted, fontSize: 10, fontWeight: 700, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{meta || session.source}</span>
      </span>
      <span style={{ color, fontSize: 11, fontWeight: 900 }}>{stateLabel(session.state)}</span>
    </div>
  );
}

export default function MacMenuBarPopoverView({
  state,
  onRefresh,
  onOpenDashboard,
  onOpenSettings,
  onToggleCompactWidget,
  onClose,
}: Props) {
  const C = useTheme();
  const [period, setPeriod] = useState<Period>('today');
  const [refreshing, setRefreshing] = useState(false);
  const rows = useMemo(() => buildQuotaRows(state), [state]);
  const selected = useMemo(() => primaryQuota(rows), [rows]);
  const usage = useMemo(() => periodUsage(state, period), [period, state]);
  const sessions = useMemo(() => activeSessions(state), [state]);
  const usageLine = `${fmtTokens(usage.tokens)} tokens / ${fmtCostShort(usage.cost, state.settings.currency, state.settings.usdToKrw)} / ${usage.requests} calls`;
  const quotaLine = topLine(rows, state.settings.currency, state.settings.usdToKrw);

  const handleRefresh = useCallback(async () => {
    if (refreshing) return;
    setRefreshing(true);
    try {
      await onRefresh();
    } finally {
      setRefreshing(false);
    }
  }, [onRefresh, refreshing]);

  return (
    <div
      style={{
        ...drag,
        height: '100vh',
        boxSizing: 'border-box',
        paddingTop: 0,
        background: 'transparent',
        color: C.text,
        fontFamily: C.fontSans,
        overflow: 'hidden',
        userSelect: 'none',
      }}
    >
      <div style={{ width: 0, height: 0, borderLeft: '10px solid transparent', borderRight: '10px solid transparent', borderBottom: `18px solid ${C.headerBg}`, margin: '0 auto' }} />
      <main
        style={{
          margin: '0 auto',
          width: 430,
          height: 622,
          borderRadius: 8,
          overflow: 'hidden',
          background: C.bg,
          border: `1px solid ${C.border}`,
          boxShadow: '0 22px 44px rgba(15,23,42,0.24)',
          display: 'grid',
          gridTemplateRows: 'auto 1fr auto',
          minHeight: 0,
        }}
      >
        <header style={{ background: C.headerBg, color: C.headerText, padding: '14px 14px 12px', borderBottom: `1px solid ${C.headerBorder}` }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) auto', alignItems: 'center', gap: 10 }}>
            <div style={{ minWidth: 0 }}>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, minWidth: 0 }}>
                <div style={{ fontSize: 16, fontWeight: 900, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>WhereMyTokens</div>
                <div style={{ color: C.headerSub, fontSize: 10, fontWeight: 800 }}>Menu Bar</div>
              </div>
              <div title={quotaLine} style={{ marginTop: 4, color: C.headerSub, fontSize: 11, fontFamily: C.fontMono, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {quotaLine}
              </div>
            </div>
            <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
              <PeriodToggle period={period} onPeriod={setPeriod} />
              <IconButton title="Close popover" onClick={onClose}><X size={14} strokeWidth={2.4} /></IconButton>
            </div>
          </div>
        </header>

        <div
          style={{
            ...noDrag,
            minHeight: 0,
            overflowY: 'auto',
            overflowX: 'hidden',
            padding: 12,
            display: 'grid',
            alignContent: 'start',
            gap: 10,
          }}
        >
          <section style={{ borderRadius: 8, background: C.bgCard, border: `1px solid ${C.border}`, padding: 12 }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) auto', gap: 12, alignItems: 'center' }}>
              <div style={{ minWidth: 0 }}>
                <div style={{ color: C.textMuted, fontSize: 10, fontWeight: 900, textTransform: 'uppercase', letterSpacing: 0.8 }}>5h status</div>
                <div style={{ marginTop: 4, color: C.text, fontSize: 22, fontWeight: 900 }}>{selected && !selected.waiting && !selected.pending ? formatPct(selected.quotaPct) : '--'}</div>
                <div title={statusText(selected)} style={{ marginTop: 2, color: C.textDim, fontSize: 11, fontWeight: 700, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {statusText(selected)}
                </div>
              </div>
              <div style={{ minWidth: 116, textAlign: 'right', color: C.textDim, fontSize: 11, fontWeight: 800 }}>
                <div>{period}</div>
                <div style={{ marginTop: 5, color: C.accent, fontSize: 14, fontWeight: 900 }}>{fmtCostShort(usage.cost, state.settings.currency, state.settings.usdToKrw)}</div>
                <div style={{ marginTop: 2 }}>{fmtTokens(usage.tokens)} tok</div>
              </div>
            </div>
          </section>

          <section style={{ display: 'grid', gap: 7 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', padding: '0 2px' }}>
              <div style={{ color: C.textDim, fontSize: 11, fontWeight: 900, textTransform: 'uppercase', letterSpacing: 0.8 }}>Quota windows</div>
              <div title={usageLine} style={{ color: C.textMuted, fontSize: 10, fontFamily: C.fontMono, maxWidth: 220, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{usageLine}</div>
            </div>
            {rows.length === 0 ? (
              <div style={{ borderRadius: 7, background: C.bgRow, border: `1px solid ${C.borderSub}`, padding: 12, color: C.textMuted, fontSize: 12, fontWeight: 700 }}>Quota data is loading.</div>
            ) : rows.map(row => <QuotaRow key={row.key} row={row} currency={state.settings.currency} usdToKrw={state.settings.usdToKrw} />)}
          </section>

          <section style={{ display: 'grid', gap: 7 }}>
            <div style={{ color: C.textDim, fontSize: 11, fontWeight: 900, textTransform: 'uppercase', letterSpacing: 0.8, padding: '0 2px' }}>Now coding</div>
            {sessions.length === 0 ? (
              <div style={{ borderRadius: 7, background: C.bgRow, border: `1px solid ${C.borderSub}`, padding: 12, color: C.textMuted, fontSize: 12, fontWeight: 700 }}>No live coding sessions.</div>
            ) : sessions.map(session => <SessionRow key={session.sessionId || `${session.provider}-${session.cwd}`} session={session} />)}
          </section>
        </div>

        <footer style={{ ...noDrag, display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 6, padding: 10, background: C.bgCard, borderTop: `1px solid ${C.border}` }}>
          <FooterButton title="Refresh now" label={refreshing ? 'Syncing' : 'Refresh'} onClick={handleRefresh}><RefreshCw size={13} /></FooterButton>
          <FooterButton title="Show floating widget" label="Widget" onClick={onToggleCompactWidget}><LayoutPanelTop size={13} /></FooterButton>
          <FooterButton title="Open full dashboard" label="Open" onClick={onOpenDashboard}><ExternalLink size={13} /></FooterButton>
          <FooterButton title="Open settings" label="Prefs" onClick={onOpenSettings}><Settings size={13} /></FooterButton>
        </footer>
      </main>
    </div>
  );
}

function FooterButton({
  title,
  label,
  onClick,
  children,
}: {
  title: string;
  label: string;
  onClick: () => void;
  children: React.ReactNode;
}) {
  const C = useTheme();
  return (
    <button
      title={title}
      onClick={onClick}
      style={{
        height: 30,
        borderRadius: 5,
        border: `1px solid ${C.borderSub}`,
        background: C.bgRow,
        color: C.textDim,
        fontSize: 11,
        fontWeight: 800,
        cursor: 'pointer',
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 5,
        minWidth: 0,
      }}
    >
      {children}
      <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{label}</span>
    </button>
  );
}
