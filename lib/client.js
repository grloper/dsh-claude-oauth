/**
 * @file dsh-claude-oauth - Client half (web)
 * @author grloper <https://github.com/grloper>
 * @license MIT
 */

window.__ModuleLoader__.load({
  id: 'dsh-claude-oauth',
  factory: (require) => {
    var module = { exports: {} }
    var exports = module.exports

    const React = require('react')
    const e = React.createElement

    const name = 'claude-oauth'
    const inject = ['slots', 'timer']
    const ANTHROPIC_PROVIDER = 'anthropic'

    const CSS_ID = 'dsh-claude-oauth/styles'
    const CSS = `
/* -------------------------------------------------------------
 * Claude OAuth Quota - Compact Toolbar Pill & Floating Popover
 * ------------------------------------------------------------- */
.cqp-trigger-wrap {
  position: relative;
  display: inline-flex;
  align-items: center;
  flex: none;
}
.cqp-pill {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  height: 26px;
  padding: 0 8px;
  border-radius: 6px;
  font: var(--dsw-font-xs-12, 12px/1.2 Inter, system-ui, -apple-system, sans-serif);
  color: var(--dsw-alias-label-secondary, #b7b9c2);
  background: var(--dsw-alias-interactive-bg, rgba(255, 255, 255, 0.04));
  border: 1px solid var(--dsw-alias-border-l2, rgba(255, 255, 255, 0.12));
  cursor: pointer;
  user-select: none;
  transition: all 0.15s ease;
  font-variant-numeric: tabular-nums;
  white-space: nowrap;
}
.cqp-pill:hover {
  background: var(--dsw-alias-interactive-bg-hover, rgba(255, 255, 255, 0.08));
  color: var(--dsw-alias-label-primary, #ffffff);
  border-color: var(--dsw-alias-border-l1, rgba(255, 255, 255, 0.22));
}
.cqp-pill.open {
  background: var(--dsw-alias-interactive-bg-hover, rgba(255, 255, 255, 0.12));
  border-color: #d97706;
}
.cqp-pill.warn {
  color: #fbbf24;
  border-color: rgba(245, 158, 11, 0.35);
  background: rgba(245, 158, 11, 0.09);
}
.cqp-pill.warn:hover {
  background: rgba(245, 158, 11, 0.16);
  border-color: rgba(245, 158, 11, 0.5);
}
.cqp-pill.depleted {
  color: #fb7185;
  border-color: rgba(244, 63, 94, 0.35);
  background: rgba(244, 63, 94, 0.09);
}
.cqp-pill.depleted:hover {
  background: rgba(244, 63, 94, 0.16);
  border-color: rgba(244, 63, 94, 0.5);
}

.cqp-pill-dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  flex: none;
  background: #38bdf8;
}
.cqp-pill-dot.warn { background: #f59e0b; }
.cqp-pill-dot.depleted { background: #f43f5e; }

.cqp-popover {
  position: absolute;
  bottom: calc(100% + 8px);
  right: 0;
  width: 330px;
  max-width: calc(100vw - 32px);
  background: var(--dsw-alias-bg-floating, #1a1a20);
  border: 1px solid var(--dsw-alias-border-l1, rgba(255, 255, 255, 0.14));
  border-radius: 12px;
  box-shadow: 0 16px 36px rgba(0, 0, 0, 0.5), 0 0 0 1px rgba(255, 255, 255, 0.06);
  padding: 14px 16px;
  display: flex;
  flex-direction: column;
  gap: 12px;
  z-index: 10000;
  backdrop-filter: blur(16px);
  animation: cqp-popover-in 0.12s cubic-bezier(0.16, 1, 0.3, 1);
  color: var(--dsw-alias-label-primary, #e6e7ec);
}
@keyframes cqp-popover-in {
  from { opacity: 0; transform: translateY(4px) scale(0.98); }
  to { opacity: 1; transform: translateY(0) scale(1); }
}

.cqp-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
}
.cqp-header-left {
  display: flex;
  align-items: center;
  gap: 8px;
}
.cqp-title {
  font-size: 13px;
  font-weight: 600;
  color: var(--dsw-alias-label-primary, #ffffff);
}
.cqp-badge {
  font-size: 10px;
  font-weight: 600;
  text-transform: uppercase;
  padding: 2px 7px;
  border-radius: 999px;
  background: rgba(217, 119, 6, 0.2);
  color: #fbbf24;
  border: 1px solid rgba(217, 119, 6, 0.35);
}
.cqp-icon-btn {
  background: transparent;
  border: 1px solid var(--dsw-alias-border-l2, rgba(255, 255, 255, 0.12));
  border-radius: 6px;
  color: var(--dsw-alias-label-secondary, #b7b9c2);
  width: 24px;
  height: 24px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: all 0.15s ease;
  font-size: 13px;
}
.cqp-icon-btn:hover:not(:disabled) {
  background: var(--dsw-alias-interactive-bg-hover, rgba(255, 255, 255, 0.1));
  color: var(--dsw-alias-label-primary, #ffffff);
}
.cqp-icon-btn:disabled {
  opacity: 0.5;
  cursor: default;
}

/* Graceful Depleted/Warning Cards (Replaces giant red bug banner) */
.cqp-notice-card {
  background: rgba(244, 63, 94, 0.09);
  border: 1px solid rgba(244, 63, 94, 0.28);
  border-radius: 8px;
  padding: 8px 10px;
  display: flex;
  flex-direction: column;
  gap: 3px;
}
.cqp-notice-card.warn {
  background: rgba(245, 158, 11, 0.09);
  border-color: rgba(245, 158, 11, 0.28);
}
.cqp-notice-title {
  font-size: 11px;
  font-weight: 600;
  color: #fb7185;
}
.cqp-notice-card.warn .cqp-notice-title {
  color: #fbbf24;
}
.cqp-notice-body {
  font-size: 11px;
  color: var(--dsw-alias-label-secondary, #cbd5e1);
  line-height: 1.35;
}

/* Meter progress tracks */
.cqp-meters {
  display: flex;
  flex-direction: column;
  gap: 10px;
}
.cqp-meter-item {
  display: flex;
  flex-direction: column;
  gap: 4px;
}
.cqp-meter-top {
  display: flex;
  justify-content: space-between;
  align-items: baseline;
  font-size: 11px;
}
.cqp-meter-label {
  color: var(--dsw-alias-label-tertiary, #94a3b8);
  font-weight: 500;
}
.cqp-meter-val {
  color: var(--dsw-alias-label-secondary, #e2e8f0);
  font-variant-numeric: tabular-nums;
  font-weight: 500;
}
.cqp-meter-val.warn { color: #fbbf24; }
.cqp-meter-val.depleted { color: #fb7185; }

.cqp-track {
  position: relative;
  width: 100%;
  height: 6px;
  border-radius: 999px;
  background: var(--dsw-alias-bg-base, rgba(255, 255, 255, 0.08));
  overflow: hidden;
}
.cqp-fill {
  position: absolute;
  inset: 0 auto 0 0;
  height: 100%;
  border-radius: 999px;
  transition: width 0.3s ease;
}
.cqp-fill-normal { background: linear-gradient(90deg, #38bdf8, #60a5fa); }
.cqp-fill-warn { background: linear-gradient(90deg, #f59e0b, #fbbf24); }
.cqp-fill-depleted { background: linear-gradient(90deg, #f43f5e, #fb7185); }

.cqp-meter-sub {
  display: flex;
  justify-content: space-between;
  font-size: 10px;
  color: var(--dsw-alias-label-tertiary, #71717a);
  font-variant-numeric: tabular-nums;
}

.cqp-footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding-top: 8px;
  border-top: 1px solid var(--dsw-alias-border-l2, rgba(255, 255, 255, 0.08));
  font-size: 10px;
  color: var(--dsw-alias-label-tertiary, #71717a);
}
.cqp-email {
  max-width: 180px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

/* -------------------------------------------------------------
 * Slim Dock Option (Only if user selects Above-Composer Dock)
 * ------------------------------------------------------------- */
.aoq-dock { box-sizing: border-box; width: 100%; margin: 0 auto; padding: 0; }
.aoq-panel-slim {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 4px 10px;
  font: var(--dsw-font-xs-12, 12px/1.3 Inter, system-ui);
  color: var(--dsw-alias-label-primary, #e6e7ec);
  background: var(--dsw-specific-tip, rgba(255,255,255,0.02));
  border: 1px solid var(--dsw-alias-border-l2, rgba(255,255,255,0.09));
  border-radius: 8px 8px 0 0;
  border-bottom: none;
}
.aoq-slim-pill {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  flex: 1;
  min-width: 0;
}
.aoq-slim-depleted {
  color: #fb7185;
  font-weight: 500;
  display: flex;
  align-items: center;
  gap: 6px;
}
.aoq-bars { display: flex; align-items: center; gap: 12px; flex: 1; min-width: 0; }
.aoq-row { display: flex; align-items: center; gap: 6px; flex: 1; }
.aoq-lab { font-size: 10px; color: var(--dsw-alias-label-tertiary, #94a3b8); flex: none; }
.aoq-track { position: relative; flex: 1; height: 5px; border-radius: 999px; background: rgba(255,255,255,0.08); overflow: hidden; }
.aoq-fill { position: absolute; inset: 0 auto 0 0; height: 100%; border-radius: 999px; background: #38bdf8; transition: width .3s ease; }
.aoq-fill.aoq-warn { background: #f59e0b; }
.aoq-fill.aoq-hot { background: #f43f5e; }
.aoq-pct { font-size: 10px; color: var(--dsw-alias-label-secondary, #cbd5e1); flex: none; font-variant-numeric: tabular-nums; }
.aoq-reset { font-size: 11px; color: var(--dsw-alias-label-tertiary, #71717a); white-space: nowrap; flex: none; }
.aoq-btn {
  flex: none; cursor: pointer; border: 1px solid var(--dsw-alias-border-l2, rgba(255,255,255,0.12));
  background: var(--dsw-alias-bg-base, transparent); color: var(--dsw-alias-label-secondary, inherit);
  border-radius: 6px; padding: 2px 8px; font: inherit; font-size: 11px; line-height: 16px;
}
.aoq-btn:hover:not(:disabled) { background: var(--dsw-alias-interactive-bg-hover, rgba(255,255,255,0.08)); }

/* Settings Page styles */
.dshc-container {
  display: flex;
  flex-direction: column;
  gap: 16px;
  padding: 0 0 24px;
  max-width: 640px;
  color: var(--dsw-alias-label-primary, inherit);
}
.dshc-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 16px;
  padding-bottom: 12px;
  border-bottom: 1px solid var(--dsw-alias-border-l2, rgba(255,255,255,0.08));
}
.dshc-title-row {
  display: flex;
  align-items: center;
  gap: 10px;
}
.dshc-logo {
  width: 26px;
  height: 26px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 7px;
  background: #d97706;
  color: #fff;
  font-weight: 700;
  font-size: 16px;
}
.dshc-title {
  font-size: 16px;
  font-weight: 600;
  margin: 0;
}
.dshc-desc {
  font-size: 13px;
  color: var(--dsw-alias-label-secondary, #8b949e);
  margin: 6px 0 0;
  line-height: 1.4;
}
.dshc-actions {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-shrink: 0;
}
.dshc-btn {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 6px 14px;
  font-size: 13px;
  font-weight: 500;
  border-radius: 6px;
  border: 1px solid var(--dsw-alias-border-l2, rgba(255,255,255,0.15));
  background: var(--dsw-alias-interactive-bg, rgba(255,255,255,0.06));
  color: var(--dsw-alias-label-primary, inherit);
  cursor: pointer;
  transition: all 0.15s ease;
}
.dshc-btn:hover:not(:disabled) {
  background: var(--dsw-alias-interactive-bg-hover, rgba(255,255,255,0.12));
}
.dshc-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}
.dshc-btn-gmail {
  background: #d97706;
  border-color: #f59e0b;
  color: #fff;
  font-weight: 600;
}
.dshc-btn-gmail:hover:not(:disabled) {
  background: #b45309;
}
.dshc-btn-danger {
  color: var(--dsw-alias-state-danger, #ef4444);
  border-color: rgba(239, 68, 68, 0.3);
}
.dshc-btn-danger:hover:not(:disabled) {
  background: rgba(239, 68, 68, 0.1);
}
.dshc-banner {
  padding: 10px 14px;
  border-radius: 8px;
  background: rgba(217, 119, 6, 0.12);
  border: 1px solid rgba(217, 119, 6, 0.3);
  color: #fbbf24;
  font-size: 13px;
  display: flex;
  align-items: center;
  gap: 8px;
  animation: dshc-pulse 2s infinite;
}
@keyframes dshc-pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.7; }
}
.dshc-card {
  background: var(--dsw-specific-card-fill, rgba(255,255,255,0.03));
  border: 1px solid var(--dsw-alias-border-l2, rgba(255,255,255,0.08));
  border-radius: 10px;
  padding: 16px;
  display: flex;
  flex-direction: column;
  gap: 12px;
}
.dshc-card-title {
  font-size: 13px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  color: var(--dsw-alias-label-tertiary, #9a9ca6);
  margin: 0;
}
.dshc-user-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
}
.dshc-user-info {
  display: flex;
  align-items: center;
  gap: 12px;
}
.dshc-avatar {
  width: 38px;
  height: 38px;
  border-radius: 50%;
  background: #d97706;
  color: #fff;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 16px;
  font-weight: 700;
}
.dshc-avatar.unauth {
  background: var(--dsw-alias-interactive-bg-hover, rgba(255,255,255,0.1));
  color: var(--dsw-alias-label-tertiary, #888);
}
.dshc-user-meta {
  display: flex;
  flex-direction: column;
  gap: 3px;
}
.dshc-user-email {
  font-size: 14px;
  font-weight: 600;
  color: var(--dsw-alias-label-primary, inherit);
  display: flex;
  align-items: center;
  gap: 8px;
}
.dshc-badge {
  font-size: 11px;
  font-weight: 600;
  padding: 2px 8px;
  border-radius: 999px;
  background: rgba(34, 197, 94, 0.15);
  color: #4ade80;
  border: 1px solid rgba(34, 197, 94, 0.3);
  text-transform: uppercase;
}
.dshc-user-sub {
  font-size: 12px;
  color: var(--dsw-alias-label-secondary, #8b949e);
}
.dshc-segmented {
  display: inline-flex;
  background: var(--dsw-alias-bg-base, rgba(255, 255, 255, 0.05));
  border: 1px solid var(--dsw-alias-border-l2, rgba(255, 255, 255, 0.1));
  border-radius: 8px;
  padding: 3px;
  gap: 4px;
}
.dshc-segmented-btn {
  border: none;
  background: transparent;
  color: var(--dsw-alias-label-secondary, #94a3b8);
  font: inherit;
  font-size: 12px;
  padding: 6px 12px;
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.15s ease;
}
.dshc-segmented-btn:hover {
  color: var(--dsw-alias-label-primary, #ffffff);
}
.dshc-segmented-btn.active {
  background: var(--dsw-alias-interactive-bg-active, rgba(255, 255, 255, 0.14));
  color: #ffffff;
  font-weight: 600;
}
.dshc-models-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(240px, 1fr));
  gap: 8px;
}
.dshc-model-item {
  padding: 8px 12px;
  border-radius: 6px;
  background: var(--dsw-alias-interactive-bg, rgba(255,255,255,0.03));
  border: 1px solid var(--dsw-alias-border-l2, rgba(255,255,255,0.06));
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 13px;
}
.dshc-check {
  color: #22c55e;
  font-weight: 700;
}
`

    function ensureStyles() {
      if (typeof document === 'undefined') return
      const sel = 'style[data-plugin-css=' + JSON.stringify(CSS_ID) + ']'
      if (document.querySelector(sel) !== null) return
      const tag = document.createElement('style')
      tag.dataset.plugin = 'dsh-claude-oauth'
      tag.dataset.pluginCss = CSS_ID
      tag.textContent = CSS
      document.head.appendChild(tag)
    }

    function ClaudeIcon(props) {
      const size = props.size || 14
      return e('svg', {
        width: size,
        height: size,
        viewBox: '0 0 16 16',
        fill: 'none',
        style: { flexShrink: 0 },
        xmlns: 'http://www.w3.org/2000/svg',
      },
        e('rect', {
          width: '16',
          height: '16',
          rx: '4',
          fill: props.bgColor || '#d97706',
        }),
        e('path', {
          d: 'M8 3.5v9M3.5 8h9M4.8 4.8l6.4 6.4M11.2 4.8l-6.4 6.4',
          stroke: '#ffffff',
          strokeWidth: '1.6',
          strokeLinecap: 'round',
        })
      )
    }

    function fmtReset(ts) {
      if (!ts) return 'resets —'
      let d = ts - Math.floor(Date.now() / 1000)
      if (d <= 0) return 'resetting…'
      const h = Math.floor(d / 3600), m = Math.floor((d % 3600) / 60), s = d % 60
      if (h > 0) return `${h}h ${m}m`
      if (m > 0) return `${m}m ${s}s`
      return `${s}s`
    }

    function fmtExactResetTime(ts) {
      if (!ts) return null
      try {
        const date = new Date(ts * 1000)
        return date.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })
      } catch {
        return null
      }
    }

    function primaryReset(d) {
      if (!d) return null
      return (d.representative === 'seven_day' ? (d.sevenDay && d.sevenDay.reset) : (d.fiveHour && d.fiveHour.reset)) ||
        (d.fiveHour && d.fiveHour.reset) ||
        (d.sevenDay && d.sevenDay.reset) ||
        d.reset
    }

    function cleanErrorMessage(err) {
      if (!err) return null
      let s = typeof err === 'string' ? err : String(err.message || err)
      try {
        const j = JSON.parse(s)
        if (j && j.error && j.error.message) return j.error.message
        if (j && j.message) return j.message
      } catch {}
      if (s.includes('429') || s.includes('rate_limit')) {
        const m = s.match(/"message":"([^"]+)"/)
        if (m && m[1]) return m[1]
        return 'Claude session limit reached. Will automatically resume after reset.'
      }
      if (s.includes('401') || s.includes('OAuth token rejected')) {
        return 'Authentication expired. Please sign in again in Settings.'
      }
      return s.length > 100 ? s.slice(0, 100) + '…' : s
    }

    function isDepletedQuota(d) {
      if (!d) return false
      if (d.status === 'rejected') return true
      if (d.fiveHour && (d.fiveHour.status === 'rejected' || (d.fiveHour.utilization != null && d.fiveHour.utilization >= 1))) return true
      if (d.sevenDay && (d.sevenDay.status === 'rejected' || (d.sevenDay.utilization != null && d.sevenDay.utilization >= 1))) return true
      return false
    }

    function isWarnQuota(d) {
      if (!d || isDepletedQuota(d)) return false
      if (d.fiveHour && d.fiveHour.utilization != null && d.fiveHour.utilization >= 0.8) return true
      if (d.sevenDay && d.sevenDay.utilization != null && d.sevenDay.utilization >= 0.8) return true
      return false
    }

    function QuotaMeter(props) {
      const util = props.util
      const pct = util == null ? 0 : Math.max(0, Math.min(100, Math.round(util * 100)))
      const remaining = 100 - pct
      const isDepleted = pct >= 100 || props.status === 'rejected'
      const isWarn = pct >= 80 && !isDepleted
      const fillCls = isDepleted ? ' cqp-fill-depleted' : isWarn ? ' cqp-fill-warn' : ' cqp-fill-normal'

      const resetText = fmtReset(props.resetTs)
      const exactTime = fmtExactResetTime(props.resetTs)

      return e('div', { className: 'cqp-meter-item' },
        e('div', { className: 'cqp-meter-top' },
          e('span', { className: 'cqp-meter-label' }, props.label),
          e('span', { className: 'cqp-meter-val' + (isDepleted ? ' depleted' : isWarn ? ' warn' : '') },
            util == null ? '—' : isDepleted ? 'Exhausted (0% left)' : `${remaining}% left (${pct}% used)`
          )
        ),
        e('div', { className: 'cqp-track' },
          e('div', { className: 'cqp-fill' + fillCls, style: { width: `${pct}%` } })
        ),
        props.resetTs ? e('div', { className: 'cqp-meter-sub' },
          e('span', null, `Resets in ${resetText}`),
          exactTime ? e('span', null, `at ${exactTime}`) : null
        ) : null
      )
    }

    function useAnthropicActive(modelDirectories, sessionId) {
      const gateAvailable = !!(modelDirectories && sessionId)
      const read = React.useCallback(() => {
        if (!gateAvailable) return true
        try {
          const dir = modelDirectories.directoryFor(sessionId)
          const cur = dir && dir.store && dir.store.getSnapshot().current
          if (!cur) return true
          return cur.provider === ANTHROPIC_PROVIDER
        } catch (_) { return true }
      }, [gateAvailable, modelDirectories, sessionId])

      const [active, setActive] = React.useState(read)
      React.useEffect(() => {
        setActive(read())
        if (!gateAvailable) return undefined
        let stop = null
        try {
          const dir = modelDirectories.directoryFor(sessionId)
          if (dir && dir.store && typeof dir.store.subscribe === 'function') {
            stop = dir.store.subscribe(() => setActive(read()))
          }
        } catch (_) {}
        return () => { if (typeof stop === 'function') stop() }
      }, [read, gateAvailable, modelDirectories, sessionId])
      return active
    }

    function useQuotaData(timer, anthropicActive) {
      const [data, setData] = React.useState(null)
      const [loading, setLoading] = React.useState(false)
      const [, tickNow] = React.useState(0)

      const load = React.useCallback((force) => {
        setLoading(true)
        fetch('/api/anthropic-oauth/quota' + (force ? '?force=1' : ''), { cache: 'no-store' })
          .then((r) => r.json())
          .then((d) => setData(d))
          .catch((err) => setData({ ok: false, error: String((err && err.message) || err) }))
          .finally(() => setLoading(false))
      }, [])

      React.useEffect(() => {
        if (!anthropicActive) return undefined
        load(false)
        const disposeRefresh = timer && timer.interval ? timer.interval(() => load(false), 60000) : setInterval(() => load(false), 60000)
        const disposeTick = timer && timer.interval ? timer.interval(() => tickNow((n) => n + 1), 1000) : setInterval(() => tickNow((n) => n + 1), 1000)
        const onFocus = () => load(false)
        window.addEventListener('focus', onFocus)
        return () => {
          if (typeof disposeRefresh === 'function') disposeRefresh()
          else clearInterval(disposeRefresh)
          if (typeof disposeTick === 'function') disposeTick()
          else clearInterval(disposeTick)
          window.removeEventListener('focus', onFocus)
        }
      }, [load, anthropicActive, timer])

      return { data, loading, load }
    }

    function usePlacementPref() {
      const [placement, setPlacement] = React.useState(() => {
        try {
          return localStorage.getItem('dsh-claude-quota-placement') || 'toolbar'
        } catch {
          return 'toolbar'
        }
      })
      React.useEffect(() => {
        const handler = (e) => {
          if (e && e.detail) setPlacement(e.detail)
        }
        window.addEventListener('claude-quota-pref-change', handler)
        return () => window.removeEventListener('claude-quota-pref-change', handler)
      }, [])
      return placement
    }

    /**
     * Primary Quota Component: Compact Chip in composer bottom toolbar
     */
    function makeToolbarQuota(timer, modelDirectories) {
      return function ClaudeToolbarQuota(props) {
        const sessionId = props && props.sessionId
        const anthropicActive = useAnthropicActive(modelDirectories, sessionId)
        const placement = usePlacementPref()
        const { data, loading, load } = useQuotaData(timer, anthropicActive)
        const [open, setOpen] = React.useState(false)
        const popoverRef = React.useRef(null)
        const triggerRef = React.useRef(null)

        // Close on outside click or escape
        React.useEffect(() => {
          if (!open) return undefined
          const handleClick = (ev) => {
            if (popoverRef.current && !popoverRef.current.contains(ev.target) &&
                triggerRef.current && !triggerRef.current.contains(ev.target)) {
              setOpen(false)
            }
          }
          const handleKey = (ev) => {
            if (ev.key === 'Escape') setOpen(false)
          }
          document.addEventListener('pointerdown', handleClick)
          document.addEventListener('keydown', handleKey)
          return () => {
            document.removeEventListener('pointerdown', handleClick)
            document.removeEventListener('keydown', handleKey)
          }
        }, [open])

        if (!anthropicActive || placement !== 'toolbar') return null

        const isDepleted = isDepletedQuota(data)
        const isWarn = isWarnQuota(data)
        const resetTs = primaryReset(data)
        const resetCountdown = resetTs ? fmtReset(resetTs) : ''
        const exactReset = resetTs ? fmtExactResetTime(resetTs) : null

        let pillText = 'Claude Quota'
        if (loading && !data) {
          pillText = 'Checking…'
        } else if (!data || !data.ok) {
          pillText = 'Check quota'
        } else if (isDepleted) {
          pillText = resetCountdown ? `Limit reached · ${resetCountdown}` : 'Limit reached'
        } else if (data.fiveHour && data.fiveHour.utilization != null) {
          const pct = Math.round(data.fiveHour.utilization * 100)
          pillText = resetCountdown ? `5h: ${pct}% · ${resetCountdown}` : `5h: ${pct}%`
        }

        const tierBadge = data && (data.sub || 'Pro').toUpperCase()
        const errorMessage = data && !data.ok ? cleanErrorMessage(data.error) : (data && data.errorMessage)

        return e('div', { className: 'cqp-trigger-wrap' },
          e('button', {
            ref: triggerRef,
            type: 'button',
            className: 'cqp-pill' + (open ? ' open' : '') + (isDepleted ? ' depleted' : isWarn ? ' warn' : ''),
            onClick: () => setOpen(o => !o),
            title: 'Claude quota status (click for details)',
            'aria-expanded': open,
          },
            e(ClaudeIcon, { size: 14 }),
            e('span', { className: 'cqp-pill-dot' + (isDepleted ? ' depleted' : isWarn ? ' warn' : '') }),
            e('span', null, pillText),
          ),

          open ? e('div', {
            ref: popoverRef,
            role: 'dialog',
            className: 'cqp-popover',
            'aria-label': 'Claude Quota Details',
          },
            e('div', { className: 'cqp-header' },
              e('div', { className: 'cqp-header-left' },
                e(ClaudeIcon, { size: 16 }),
                e('span', { className: 'cqp-title' }, 'Claude Quota'),
                tierBadge ? e('span', { className: 'cqp-badge' }, tierBadge) : null
              ),
              e('button', {
                type: 'button',
                className: 'cqp-icon-btn',
                onClick: (ev) => { ev.stopPropagation(); load(true) },
                disabled: loading,
                title: 'Refresh quota',
              }, loading ? '…' : '↻')
            ),

            isDepleted ? e('div', { className: 'cqp-notice-card' },
              e('div', { className: 'cqp-notice-title' }, '⚠️ 5-Hour Limit Reached'),
              e('div', { className: 'cqp-notice-body' },
                `Usage limit is reached. It will automatically reset in ${resetCountdown || 'shortly'}${exactReset ? ` (at ${exactReset})` : ''}.`
              )
            ) : errorMessage ? e('div', { className: 'cqp-notice-card' + (isWarn ? ' warn' : '') },
              e('div', { className: 'cqp-notice-title' }, '⚠️ Quota Notice'),
              e('div', { className: 'cqp-notice-body' }, errorMessage)
            ) : null,

            e('div', { className: 'cqp-meters' },
              e(QuotaMeter, {
                label: '5-Hour Session',
                util: data && data.fiveHour && data.fiveHour.utilization,
                status: data && data.fiveHour && data.fiveHour.status,
                resetTs: data && data.fiveHour && data.fiveHour.reset,
              }),
              e(QuotaMeter, {
                label: '7-Day Limit',
                util: data && data.sevenDay && data.sevenDay.utilization,
                status: data && data.sevenDay && data.sevenDay.status,
                resetTs: data && data.sevenDay && data.sevenDay.reset,
              })
            ),

            e('div', { className: 'cqp-footer' },
              e('span', { className: 'cqp-email' },
                data && data.tier ? `Tier: ${data.tier}` : 'Auto-updates after each turn'
              ),
              data && data.fetchedAt ? e('span', null, `Updated ${new Date(data.fetchedAt * 1000).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}`) : null
            )
          ) : null
        )
      }
    }

    /**
     * Slim Dock Option: Refactored ultra-thin single line dock (if chosen in settings)
     */
    function makeDockQuota(timer, modelDirectories) {
      return function ClaudeDockQuota(props) {
        const sessionId = props && props.sessionId
        const anthropicActive = useAnthropicActive(modelDirectories, sessionId)
        const placement = usePlacementPref()
        const { data, loading, load } = useQuotaData(timer, anthropicActive)

        if (!anthropicActive || placement !== 'dock') return null

        const isDepleted = isDepletedQuota(data)
        const resetTs = primaryReset(data)
        const resetCountdown = resetTs ? fmtReset(resetTs) : ''

        let inner
        if (loading && !data) {
          inner = e('span', { style: { fontSize: '11px', color: 'var(--dsw-alias-label-tertiary)' } }, 'Checking Claude quota…')
        } else if (!data || !data.ok) {
          inner = e('span', { style: { fontSize: '11px', color: 'var(--dsw-alias-label-secondary)' } },
            cleanErrorMessage(data && data.error) || 'Quota probe unavailable'
          )
        } else if (isDepleted) {
          inner = e('div', { className: 'aoq-slim-pill aoq-slim-depleted' },
            e(ClaudeIcon, { size: 14 }),
            e('span', null, `⚠️ Claude 5h limit reached · Resets in ${resetCountdown || 'shortly'}`)
          )
        } else {
          const u5 = data.fiveHour && data.fiveHour.utilization
          const pct5 = u5 == null ? 0 : Math.round(u5 * 100)
          const u7 = data.sevenDay && data.sevenDay.utilization
          const pct7 = u7 == null ? 0 : Math.round(u7 * 100)

          inner = e(React.Fragment, null,
            e('div', { style: { display: 'flex', alignItems: 'center', gap: '6px', flex: 'none' } },
              e(ClaudeIcon, { size: 14 }),
              e('span', { style: { fontSize: '11px', fontWeight: '600' } }, 'Claude')
            ),
            e('div', { className: 'aoq-bars' },
              e('div', { className: 'aoq-row' },
                e('span', { className: 'aoq-lab' }, '5h'),
                e('div', { className: 'aoq-track' },
                  e('div', { className: 'aoq-fill' + (pct5 >= 90 ? ' aoq-hot' : pct5 >= 80 ? ' aoq-warn' : ''), style: { width: `${pct5}%` } })
                ),
                e('span', { className: 'aoq-pct' }, `${pct5}%`)
              ),
              e('div', { className: 'aoq-row' },
                e('span', { className: 'aoq-lab' }, '7d'),
                e('div', { className: 'aoq-track' },
                  e('div', { className: 'aoq-fill' + (pct7 >= 90 ? ' aoq-hot' : pct7 >= 80 ? ' aoq-warn' : ''), style: { width: `${pct7}%` } })
                ),
                e('span', { className: 'aoq-pct' }, `${pct7}%`)
              )
            ),
            resetCountdown ? e('span', { className: 'aoq-reset' }, resetCountdown) : null
          )
        }

        return e('div', { className: 'aoq-dock' },
          e('div', { className: 'aoq-panel-slim' },
            inner,
            e('button', {
              type: 'button',
              className: 'aoq-btn',
              disabled: loading,
              onClick: () => load(true),
              title: 'Refresh quota',
            }, loading ? '…' : '↻')
          )
        )
      }
    }

    function ClaudeSettings(props) {
      const [status, setStatus] = React.useState({
        ok: false,
        authenticated: false,
        email: null,
        sub: null,
        tier: null,
        message: 'Loading...',
        models: [],
        rateLimit: null
      })
      const [loading, setLoading] = React.useState(false)
      const [polling, setPolling] = React.useState(false)
      const [, setTick] = React.useState(0)

      const [placement, setPlacement] = React.useState(() => {
        try {
          return localStorage.getItem('dsh-claude-quota-placement') || 'toolbar'
        } catch {
          return 'toolbar'
        }
      })

      const handlePlacementChange = (newVal) => {
        setPlacement(newVal)
        try {
          localStorage.setItem('dsh-claude-quota-placement', newVal)
          window.dispatchEvent(new CustomEvent('claude-quota-pref-change', { detail: newVal }))
        } catch {}
      }

      const fetchStatus = React.useCallback(async () => {
        setLoading(true)
        try {
          const res = await fetch('/api/anthropic-oauth/status', { cache: 'no-store' })
          const data = await res.json()
          setStatus(data)
          return data
        } catch (err) {
          setStatus(prev => ({ ...prev, ok: false, message: err.message }))
        } finally {
          setLoading(false)
        }
      }, [])

      React.useEffect(() => {
        fetchStatus()
        const timer = setInterval(() => setTick(t => t + 1), 1000)
        return () => clearInterval(timer)
      }, [fetchStatus])

      React.useEffect(() => {
        if (!polling) return
        const interval = setInterval(async () => {
          try {
            const res = await fetch('/api/anthropic-oauth/status', { cache: 'no-store' })
            const data = await res.json()
            if (data && data.authenticated) {
              setStatus(data)
              setPolling(false)
              clearInterval(interval)
            }
          } catch {}
        }, 2000)
        const timeout = setTimeout(() => {
          setPolling(false)
          clearInterval(interval)
        }, 180000)
        return () => {
          clearInterval(interval)
          clearTimeout(timeout)
        }
      }, [polling])

      const handleLogin = React.useCallback(() => {
        window.open('/api/anthropic-oauth/login', '_blank')
        setPolling(true)
      }, [])

      const handleRefresh = React.useCallback(async () => {
        setLoading(true)
        try {
          await fetch('/api/anthropic-oauth/sync', { method: 'POST' })
          await fetchStatus()
        } catch {}
        finally { setLoading(false) }
      }, [fetchStatus])

      const handleLogout = React.useCallback(async () => {
        if (!window.confirm('Are you sure you want to disconnect your Claude account?')) return
        setLoading(true)
        try {
          await fetch('/api/anthropic-oauth/logout', { method: 'POST' })
          await fetchStatus()
        } catch {}
        finally { setLoading(false) }
      }, [fetchStatus])

      const isAuth = !!status.authenticated
      const q = status.rateLimit

      return e('div', { className: 'dshc-container' },
        e('div', { className: 'dshc-header' },
          e('div', null,
            e('div', { className: 'dshc-title-row' },
              e('div', { className: 'dshc-logo' }, 'C'),
              e('h2', { className: 'dshc-title' }, 'Claude (Anthropic)')
            ),
            e('p', { className: 'dshc-desc' },
              'Sign in with your Claude Pro / Max account via Google (Gmail) or email OAuth to use Claude Sonnet 4.5, 3.7, and Opus in DSH.'
            )
          ),
          e('div', { className: 'dshc-actions' },
            !isAuth
              ? e('button', {
                  className: 'dshc-btn dshc-btn-gmail',
                  disabled: loading || polling,
                  onClick: handleLogin
                }, polling ? 'Waiting for Google login...' : 'Sign in with Google / Gmail')
              : e(React.Fragment, null,
                  e('button', {
                    className: 'dshc-btn',
                    disabled: loading,
                    onClick: handleRefresh
                  }, loading ? 'Refreshing...' : 'Refresh Quota'),
                  e('button', {
                    className: 'dshc-btn dshc-btn-danger',
                    disabled: loading,
                    onClick: handleLogout
                  }, 'Sign out')
                )
          )
        ),

        polling ? e('div', { className: 'dshc-banner' },
          'A browser tab opened to Claude sign-in. Choose "Continue with Google" (Gmail) and authorize. This page will update automatically once complete.'
        ) : null,

        e('section', { className: 'dshc-card' },
          e('h3', { className: 'dshc-card-title' }, 'Account Status'),
          e('div', { className: 'dshc-user-row' },
            e('div', { className: 'dshc-user-info' },
              e('div', { className: 'dshc-avatar' + (!isAuth ? ' unauth' : '') },
                isAuth ? ((status.email || 'C')[0].toUpperCase()) : '?'
              ),
              e('div', { className: 'dshc-user-meta' },
                e('div', { className: 'dshc-user-email' },
                  isAuth ? (status.email || 'Connected Claude Account') : 'Not signed in',
                  isAuth ? e('span', { className: 'dshc-badge' }, (status.sub || 'Pro').toUpperCase()) : null
                ),
                e('div', { className: 'dshc-user-sub' },
                  isAuth
                    ? `Connected via OAuth · Tier: ${status.tier || 'default'} · Ready for agent and chat runs`
                    : 'Click "Sign in with Google / Gmail" to connect your account.'
                )
              )
            )
          )
        ),

        isAuth ? e('section', { className: 'dshc-card' },
          e('h3', { className: 'dshc-card-title' }, 'Quota Display Preferences'),
          e('div', { style: { display: 'flex', flexDirection: 'column', gap: '8px' } },
            e('p', { className: 'dshc-desc', style: { margin: 0 } },
              'Choose how the live token usage and quota countdown are displayed in the chat interface:'
            ),
            e('div', { className: 'dshc-segmented' },
              e('button', {
                type: 'button',
                className: 'dshc-segmented-btn' + (placement === 'toolbar' ? ' active' : ''),
                onClick: () => handlePlacementChange('toolbar'),
              }, 'Composer Toolbar (Compact Pill · Recommended)'),
              e('button', {
                type: 'button',
                className: 'dshc-segmented-btn' + (placement === 'dock' ? ' active' : ''),
                onClick: () => handlePlacementChange('dock'),
              }, 'Above Composer (Slim Dock)'),
              e('button', {
                type: 'button',
                className: 'dshc-segmented-btn' + (placement === 'hidden' ? ' active' : ''),
                onClick: () => handlePlacementChange('hidden'),
              }, 'Hidden')
            )
          )
        ) : null,

        isAuth ? e('section', { className: 'dshc-card' },
          e('h3', { className: 'dshc-card-title' }, 'Subscription Quota & Usage'),
          q ? e('div', { style: { display: 'flex', flexDirection: 'column', gap: '12px' } },
            e(QuotaMeter, {
              label: '5-Hour Session Window',
              util: q.fiveHour && q.fiveHour.utilization,
              status: q.fiveHour && q.fiveHour.status,
              resetTs: q.fiveHour && q.fiveHour.reset,
            }),
            e(QuotaMeter, {
              label: '7-Day Weekly Limit',
              util: q.sevenDay && q.sevenDay.utilization,
              status: q.sevenDay && q.sevenDay.status,
              resetTs: q.sevenDay && q.sevenDay.reset,
            }),
            e('div', { style: { display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: 'var(--dsw-alias-label-tertiary, #94a3b8)', paddingTop: '4px' } },
              e('span', null, `Status: ${q.status || 'active'}`),
              q.fetchedAt ? e('span', null, `Last synced: ${new Date(q.fetchedAt * 1000).toLocaleTimeString()}`) : null
            )
          ) : e('div', { style: { fontSize: '13px', color: 'var(--dsw-alias-label-secondary)' } },
            'Quota data will update after the first turn or click Refresh Quota.'
          )
        ) : null,

        e('section', { className: 'dshc-card' },
          e('h3', { className: 'dshc-card-title' }, 'Available Claude Models'),
          (status.models && status.models.length)
            ? e('div', { className: 'dshc-models-grid' },
                status.models.map((m) =>
                  e('div', { className: 'dshc-model-item', key: (m && m.id) || String(m) },
                    e('span', { className: 'dshc-check' }, '✓'),
                    e('span', null, (m && (m.name || m.id)) || String(m))
                  )
                )
              )
            : e('div', { style: { fontSize: '13px', color: 'var(--dsw-alias-label-secondary)' } },
                isAuth
                  ? 'Fetching the live model list from your Claude account…'
                  : 'Sign in to load the current model list from your Claude account.'
              ),
          e('p', { className: 'dshc-desc', style: { margin: '4px 0 0', fontSize: '12px' } },
            'Select Claude in the composer model picker or configure default models in Settings → Models.'
          )
        )
      )
    }

    function apply(ctx) {
      ensureStyles()
      const modelDirs = ctx.get ? ctx.get('modelDirectories') : ctx.modelDirectories

      // Primary: Sleek compact chip in composer toolbar (0 vertical space used)
      ctx.slots.inject('conversation.input.right', () => ctx.slots.register(
        {
          name: 'conversation.input.right',
          id: 'claude-composer-quota',
          order: 15,
          inject: (sessionId) => ({ sessionId }),
        },
        makeToolbarQuota(ctx.timer, modelDirs)
      ))

      // Secondary: Slim dock (only renders if user explicitly selects dock in settings)
      ctx.slots.inject('conversation.composer.dock', () => ctx.slots.register(
        {
          name: 'conversation.composer.dock',
          id: 'anthropic-quota',
          order: 40,
        },
        makeDockQuota(ctx.timer, modelDirs)
      ))

      // Settings section
      ctx.slots.inject('settings.section', () => ctx.slots.register(
        {
          name: 'settings.section',
          id: 'claude',
          order: 13,
          label: () => 'Claude',
        },
        (props) => e(ClaudeSettings, { ...props, ctx })
      ))
    }

    exports.name = name
    exports.inject = inject
    exports.apply = apply
    return module.exports
  },
})
