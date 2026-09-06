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
/* Composer Dock Quota styles */
.aoq-dock{box-sizing:border-box;width:100%;margin:0 auto;padding:0}
.aoq-panel{display:flex;align-items:center;gap:12px;padding:6px 12px;
  font:var(--dsw-font-xs-13, 13px/1.4 Inter, system-ui);
  color:var(--dsw-alias-label-primary, #e6e7ec);
  background:var(--dsw-specific-tip, transparent);
  border:1px solid var(--dsw-alias-border-l1, #34343c);
  border-radius:12px 12px 0 0;border-bottom:none;position:relative}
.aoq-bars{display:flex;flex-direction:column;gap:5px;flex:1;min-width:0}
.aoq-row{display:flex;align-items:center;gap:8px}
.aoq-lab{width:22px;flex:none;color:var(--dsw-alias-label-tertiary, #9a9ca6);
  font-variant-numeric:tabular-nums;font-size:11px}
.aoq-track{position:relative;flex:1;height:6px;border-radius:999px;
  background:var(--dsw-alias-bg-base, #2c2c32);overflow:hidden}
.aoq-fill{position:absolute;inset:0 auto 0 0;height:100%;border-radius:999px;
  background:var(--dsw-alias-state-business-primary, #6ab0f3);transition:width .4s ease}
.aoq-fill.aoq-warn{background:var(--dsw-alias-state-warning, #e0a13a)}
.aoq-fill.aoq-hot{background:var(--dsw-alias-state-danger, #e05a5a)}
.aoq-pct{width:34px;flex:none;text-align:right;color:var(--dsw-alias-label-secondary, #b7b9c2);
  font-variant-numeric:tabular-nums;font-size:11px}
.aoq-reset{white-space:nowrap;color:var(--dsw-alias-label-tertiary, #a9abb5);
  font-variant-numeric:tabular-nums;font-size:12px}
.aoq-btn{flex:none;cursor:pointer;border:1px solid var(--dsw-alias-border-l2, #3a3a42);
  background:var(--dsw-alias-bg-base, transparent);color:var(--dsw-alias-label-secondary, inherit);
  border-radius:8px;padding:3px 10px;font:inherit;font-size:12px;line-height:18px}
.aoq-btn:hover:not(:disabled){background:var(--dsw-alias-interactive-bg-hover, #26262c)}
.aoq-btn:focus-visible{outline:2px solid var(--dsw-alias-label-tertiary, #7a7c86);outline-offset:-2px}
.aoq-btn:disabled{opacity:.5;cursor:default}
.aoq-err{color:var(--dsw-alias-state-danger, #e05a5a);font-size:12px}
.aoq-tier{color:var(--dsw-alias-label-tertiary, #8b8d98);font-size:11px;white-space:nowrap}

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

    function Bar(props) {
      const util = props.util
      const pct = util == null ? 0 : Math.max(0, Math.min(100, Math.round(util * 100)))
      const cls = pct >= 90 ? ' aoq-hot' : pct >= 70 ? ' aoq-warn' : ''
      return e('div', { className: 'aoq-row' },
        e('span', { className: 'aoq-lab' }, props.label),
        e('div', { className: 'aoq-track' }, e('div', { className: 'aoq-fill' + cls, style: { width: pct + '%' } })),
        e('span', { className: 'aoq-pct' }, util == null ? '—' : pct + '%'),
      )
    }

    function fmtReset(ts) {
      if (!ts) return 'resets —'
      let d = ts - Math.floor(Date.now() / 1000)
      if (d < 0) d = 0
      const h = Math.floor(d / 3600), m = Math.floor((d % 3600) / 60), s = d % 60
      return 'resets in ' + (h > 0 ? (h + 'h ' + m + 'm') : m > 0 ? (m + 'm ' + s + 's') : (s + 's'))
    }
    function primaryReset(d) {
      return (d.representative === 'seven_day' ? (d.sevenDay && d.sevenDay.reset) : (d.fiveHour && d.fiveHour.reset)) || d.reset
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

    function makePanel(timer, modelDirectories) {
      return function QuotaPanel(props) {
        const sessionId = props && props.sessionId
        const anthropicActive = useAnthropicActive(modelDirectories, sessionId)
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

        const completedTurns = props && props.session && props.session.turnEnds ? props.session.turnEnds.size : 0
        const completion = React.useRef({ sessionId, turns: completedTurns })

        React.useEffect(() => {
          const completed = completion.current.sessionId === sessionId && completedTurns > completion.current.turns
          completion.current = { sessionId, turns: completedTurns }
          if (anthropicActive && completed) load(true)
        }, [anthropicActive, completedTurns, load, sessionId])

        React.useEffect(() => {
          if (!anthropicActive) return undefined
          load(false)
          const disposeRefresh = timer.interval(() => load(false), 60000)
          const disposeTick = timer.interval(() => tickNow((n) => n + 1), 1000)
          return () => { disposeRefresh(); disposeTick() }
        }, [load, anthropicActive])

        if (!anthropicActive) return null

        const btn = e('button', {
          className: 'aoq-btn', disabled: loading,
          onClick: () => load(true), title: 'Force a fresh quota probe',
        }, loading ? '…' : 'Check quota')

        let inner
        if (!data) {
          inner = e('span', { className: 'aoq-tier' }, 'Quota: loading…')
        } else if (!data.ok) {
          inner = e('span', { className: 'aoq-err' }, 'Quota: ' + (data.error || 'unavailable'))
        } else {
          const tier = [data.sub, data.tier].filter(Boolean).join(' · ')
          inner = e(React.Fragment, null,
            e('div', { className: 'aoq-bars' },
              e(Bar, { label: '5h', util: data.fiveHour && data.fiveHour.utilization }),
              e(Bar, { label: '7d', util: data.sevenDay && data.sevenDay.utilization }),
            ),
            e('span', { className: 'aoq-reset' }, fmtReset(primaryReset(data))),
            tier ? e('span', { className: 'aoq-tier' }, tier) : null,
          )
        }

        return e('div', { className: 'aoq-dock' },
          e('div', { className: 'aoq-panel' }, inner, btn))
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

      const fetchStatus = React.useCallback(async () => {
        setLoading(true)
        try {
          const res = await fetch('/api/anthropic-oauth/status', { cache: 'no-store' })
          const data = await res.json()
          setStatus(data)
          return data
        } catch (e) {
          setStatus(prev => ({ ...prev, ok: false, message: e.message }))
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
          e('h3', { className: 'dshc-card-title' }, 'Subscription Quota & Usage'),
          q ? e('div', { style: { display: 'flex', flexDirection: 'column', gap: '8px' } },
            e(Bar, { label: '5h', util: q.fiveHour && q.fiveHour.utilization }),
            e(Bar, { label: '7d', util: q.sevenDay && q.sevenDay.utilization }),
            e('div', { style: { display: 'flex', justifyContent: 'space-between', fontSize: '12px', color: 'var(--dsw-alias-label-tertiary)' } },
              e('span', null, fmtReset(primaryReset(q))),
              e('span', null, `Rate limit status: ${q.status || 'active'}`)
            )
          ) : e('div', { style: { fontSize: '13px', color: 'var(--dsw-alias-label-secondary)' } },
            'Quota data will update after the first turn or click Refresh Quota.'
          )
        ) : null,

        e('section', { className: 'dshc-card' },
          e('h3', { className: 'dshc-card-title' }, 'Available Claude Models'),
          e('div', { className: 'dshc-models-grid' },
            e('div', { className: 'dshc-model-item' },
              e('span', { className: 'dshc-check' }, '✓'),
              e('span', null, 'Claude Sonnet 4.5')
            ),
            e('div', { className: 'dshc-model-item' },
              e('span', { className: 'dshc-check' }, '✓'),
              e('span', null, 'Claude Opus 4.5')
            ),
            e('div', { className: 'dshc-model-item' },
              e('span', { className: 'dshc-check' }, '✓'),
              e('span', null, 'Claude Haiku 4.5')
            ),
            e('div', { className: 'dshc-model-item' },
              e('span', { className: 'dshc-check' }, '✓'),
              e('span', null, 'Claude 3.7 Sonnet')
            )
          ),
          e('p', { className: 'dshc-desc', style: { margin: '4px 0 0', fontSize: '12px' } },
            'Select Claude in the composer model picker or configure default models in Settings → Models.'
          )
        )
      )
    }

    function apply(ctx) {
      ensureStyles()
      const Panel = makePanel(ctx.timer, ctx.get ? ctx.get('modelDirectories') : ctx.modelDirectories)
      ctx.slots.inject('conversation.composer.dock', () => ctx.slots.register(
        { name: 'conversation.composer.dock', id: 'anthropic-quota', order: 40 },
        Panel,
      ))

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
