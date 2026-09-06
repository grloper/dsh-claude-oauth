/**
 * @file dsh-claude-oauth - Host plugin for DeepSeek Harness (DSH)
 * @author grloper <https://github.com/grloper>
 * @license MIT
 *
 * Bridges Claude (Anthropic) Pro/Max OAuth into DeepSeek Harness:
 * - Dual-stack loopback OAuth PKCE server with Google/Gmail sign-in
 * - Auto-refreshes access tokens and syncs credentials across DSH and Claude Code
 * - Live model catalog discovery (/v1/models)
 * - Live subscription rate limit & quota tracking (/v1/messages)
 */

export const name = 'dsh-claude-oauth'
export const inject = ['credentials', 'settings', 'fs', 'timer']

const CLIENT_ID_B64 = 'OWQxYzI1MGEtZTYxYi00NGQ5LTg4ZWQtNTk0NGQxOTYyZjVl'
const TOKEN_URL = 'https://claude.ai/v1/oauth/token'
const API_BASE = 'https://api.anthropic.com'
const MODELS_URL = API_BASE + '/v1/models?limit=1000'
const MESSAGES_URL = API_BASE + '/v1/messages'
const ANTHROPIC_VERSION = '2023-06-01'
const CREDS_REF = 'ANTHROPIC_OAUTH_TOKEN'
const CREDS_REF_ALIAS = 'CLAUDE_CODE_OAUTH_TOKEN'
const PROVIDER_KEY = 'anthropic'
const REFRESH_SKEW_MS = 5 * 60 * 1000 // refresh if < 5m remaining
const MODELS_TTL_MS = 6 * 60 * 60 * 1000 // re-pull models at most every 6h
const QUOTA_TTL_MS = 60 * 1000 // cache quota probes for 60s
const CLAUDE_SCOPE = 'org:create_api_key user:profile user:inference user:sessions:claude_code user:mcp_servers user:file_upload'
const CLAUDE_CODE_VERSION_FALLBACK = '2.1.260'

const OAUTH_DISCOVERY_BETAS = ['oauth-2025-04-20', 'claude-code-20250219']

let _clientId = null
export function getClientId() {
  if (_clientId) return _clientId
  try {
    _clientId = (typeof atob === 'function')
      ? atob(CLIENT_ID_B64)
      : Buffer.from(CLIENT_ID_B64, 'base64').toString('utf8')
  } catch {
    _clientId = '9d1c250a-e61b-44d9-88ed-5944d1962f5e'
  }
  return _clientId
}

let _ccVersion = null
export async function getClaudeCodeVersion() {
  if (_ccVersion) return _ccVersion
  for (const cmd of ['claude', 'claude-code']) {
    try {
      const cp = await import('node:child_process')
      const out = cp.execFileSync(cmd, ['--version'], { timeout: 4000, encoding: 'utf8' })
      const v = String(out).trim().split(/\s+/)[0]
      if (v && /^\d/.test(v)) { _ccVersion = v; return _ccVersion }
    } catch {}
  }
  _ccVersion = CLAUDE_CODE_VERSION_FALLBACK
  return _ccVersion
}

export async function claudeCodeHeaders(accessToken, betas) {
  const v = await getClaudeCodeVersion()
  return {
    authorization: `Bearer ${accessToken}`,
    'anthropic-version': ANTHROPIC_VERSION,
    'anthropic-beta': betas.join(','),
    'anthropic-dangerous-direct-browser-access': 'true',
    'user-agent': `claude-cli/${v} (external, sdk-cli)`,
    'x-app': 'cli',
    'x-stainless-lang': 'js',
    'x-stainless-runtime': 'node',
    'x-stainless-runtime-version': (typeof process !== 'undefined' && process.version) || 'v22.0.0',
    'x-stainless-package-version': '0.94.0',
    'x-stainless-timeout': '600',
    'x-stainless-async': 'false',
    'x-anthropic-billing-header': `cc_version=${v}; cc_entrypoint=sdk-cli; cch=00000;`,
  }
}

export function apply(ctx) {
  let stopped = false
  let timerHandle = null
  let fsWatcher = null
  let lastAuthState = {
    ok: false,
    message: 'initializing',
    expiresAt: null,
    tier: null,
    sub: null,
    email: null,
    rateLimit: null
  }
  let lastSyncOk = false
  let modelsCache = null
  let quotaCache = null
  let activeLoginFlow = null

  async function readClaudeCreds() {
    const fs = await import('node:fs')
    const os = await import('node:os')
    const path = await import('node:path')
    const file = path.join(os.homedir(), '.claude', '.credentials.json')
    if (!fs.existsSync(file)) return null
    try {
      const raw = fs.readFileSync(file, 'utf8')
      const j = JSON.parse(raw)
      if (!j || !j.claudeAiOauth) return null
      return { file, json: j, oauth: j.claudeAiOauth }
    } catch {
      return null
    }
  }

  async function writeClaudeCreds(file, json) {
    const fs = await import('node:fs')
    fs.writeFileSync(file, JSON.stringify(json, null, 2))
    try { fs.chmodSync(file, 0o600) } catch {}
  }

  async function postJson(url, body) {
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
        'User-Agent': `claude-cli/${await getClaudeCodeVersion()} (external, cli)`
      },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(15000),
    })
    const txt = await res.text()
    if (!res.ok) throw new Error(`HTTP ${res.status} ${txt.slice(0, 600)} url=${url}`)
    return txt
  }

  async function refreshIfNeeded() {
    const creds = await readClaudeCreds()
    if (!creds || !creds.oauth || !creds.oauth.accessToken || !creds.oauth.refreshToken) {
      throw new Error('Not logged in to Claude. Please sign in.')
    }
    const { file, json, oauth } = creds
    const now = Date.now()
    const exp = typeof oauth.expiresAt === 'number' ? oauth.expiresAt : 0
    if (exp && exp - now > REFRESH_SKEW_MS) return { file, json, oauth }

    console.log(`[claude-oauth] token expires in ${exp ? ((exp - now) / 60000).toFixed(1) : 'unknown'}m — refreshing`)
    const body = await postJson(TOKEN_URL, {
      grant_type: 'refresh_token',
      client_id: getClientId(),
      refresh_token: oauth.refreshToken,
    })
    const data = JSON.parse(body)
    const newExpiresAt = Date.now() + (typeof data.expires_in === 'number' ? data.expires_in * 1000 : 3600 * 1000)
    json.claudeAiOauth.accessToken = data.access_token
    json.claudeAiOauth.refreshToken = data.refresh_token || oauth.refreshToken
    json.claudeAiOauth.expiresAt = newExpiresAt
    await writeClaudeCreds(file, json)
    console.log(`[claude-oauth] refreshed, new expiry ${new Date(newExpiresAt).toISOString()}`)
    return { file, json, oauth: json.claudeAiOauth }
  }

  async function fetchAnthropicModels(accessToken) {
    if (modelsCache && Date.now() - modelsCache.at < MODELS_TTL_MS) return modelsCache.models
    const headers = await claudeCodeHeaders(accessToken, OAUTH_DISCOVERY_BETAS)
    const res = await fetch(MODELS_URL, { method: 'GET', headers, signal: AbortSignal.timeout(15000) })
    const txt = await res.text()
    if (!res.ok) throw new Error(`HTTP ${res.status} ${txt.slice(0, 400)} url=${MODELS_URL}`)
    const data = JSON.parse(txt)
    const rows = Array.isArray(data && data.data) ? data.data : []
    const models = rows
      .filter((m) => m && typeof m.id === 'string')
      .map((m) => {
        const ctxWin = Number(m.max_input_tokens) || 200000
        const out = Number(m.max_tokens) || 64000
        const model = {
          id: m.id,
          name: m.display_name || m.id,
          contextWindow: ctxWin,
          maxTokens: out,
        }
        const caps = m.capabilities || {}
        if (caps.thinking && caps.thinking.supported) model.reasoning = true
        if (caps.effort && caps.effort.supported) {
          model.effortLevels = ['low', 'medium', 'high', 'xhigh', 'max']
            .filter((lvl) => caps.effort[lvl] && caps.effort[lvl].supported)
        }
        return model
      })
    if (!models.length) throw new Error('models list empty')
    modelsCache = { at: Date.now(), models }
    return models
  }

  function pickProbeModel() {
    const ids = modelsCache && Array.isArray(modelsCache.models)
      ? modelsCache.models.map((m) => m.id)
      : []
    return ids.find((i) => /haiku/i.test(i)) || ids[ids.length - 1] || 'claude-haiku-4-5-20251001'
  }

  async function fetchQuota(accessToken, opts) {
    const force = opts && opts.force === true
    if (!force && quotaCache && Date.now() - quotaCache.at < QUOTA_TTL_MS) return quotaCache.data
    const model = pickProbeModel()
    const headers = await claudeCodeHeaders(accessToken, OAUTH_DISCOVERY_BETAS)
    const res = await fetch(MESSAGES_URL, {
      method: 'POST',
      headers,
      signal: AbortSignal.timeout(20000),
      body: JSON.stringify({
        model,
        max_tokens: 1,
        messages: [{ role: 'user', content: 'hi' }],
        system: "You are Claude Code, Anthropic's official CLI for Claude.",
      }),
    })
    if (res.status === 401 || res.status === 403) {
      const t = await res.text().catch(() => '')
      throw new Error(`OAuth token rejected (${res.status}) ${t.slice(0, 200)}`)
    }
    const H = res.headers
    await res.text().catch(() => {})
    const num = (k) => { const v = H.get(k); return v == null ? null : Number(v) }
    const s = (k) => H.get(k)
    const data = {
      model,
      status: s('anthropic-ratelimit-unified-status') || (res.status === 429 ? 'rejected' : 'unknown'),
      representative: s('anthropic-ratelimit-unified-representative-claim') || 'five_hour',
      reset: num('anthropic-ratelimit-unified-reset'),
      fiveHour: {
        status: s('anthropic-ratelimit-unified-5h-status'),
        utilization: num('anthropic-ratelimit-unified-5h-utilization'),
        reset: num('anthropic-ratelimit-unified-5h-reset'),
      },
      sevenDay: {
        status: s('anthropic-ratelimit-unified-7d-status'),
        utilization: num('anthropic-ratelimit-unified-7d-utilization'),
        reset: num('anthropic-ratelimit-unified-7d-reset'),
      },
      overageStatus: s('anthropic-ratelimit-unified-overage-status'),
      fetchedAt: Math.floor(Date.now() / 1000),
      httpStatus: res.status,
    }
    quotaCache = { at: Date.now(), data }
    return data
  }

  async function syncToDshCredentials(accessToken) {
    const creds = ctx.get('credentials')
    if (!creds) return false
    try {
      let ref = CREDS_REF
      try {
        const m = await import('@deepseek-ai/dsh-credentials')
        if (m && typeof m.credentialRef === 'function') ref = m.credentialRef(CREDS_REF)
      } catch {}
      await creds.set(ref, accessToken)
      lastSyncOk = true
    } catch (e) {
      const msg = e && e.message ? e.message : String(e)
      if (String(msg).includes('shadowed') || String(msg).includes('read-only')) {
        console.warn('[claude-oauth] credentials.set shadowed by env:', msg)
        return true
      }
      console.error('[claude-oauth] credentials.set failed:', msg)
      return false
    }
    try {
      let aliasRef = CREDS_REF_ALIAS
      try {
        const m = await import('@deepseek-ai/dsh-credentials')
        if (m && typeof m.credentialRef === 'function') aliasRef = m.credentialRef(CREDS_REF_ALIAS)
      } catch {}
      await creds.set(aliasRef, accessToken)
    } catch {}
    return true
  }

  async function ensureAnthropicProvider(accessToken) {
    const settings = ctx.get('settings')
    let models
    try {
      models = await fetchAnthropicModels(accessToken)
      console.log(`[claude-oauth] pulled ${models.length} models from /v1/models`)
    } catch (e) {
      console.warn('[claude-oauth] model discovery failed, seeding default set:', e && e.message ? e.message : e)
      models = [
        { id: 'claude-sonnet-4-5', name: 'Claude Sonnet 4.5', contextWindow: 200000, maxTokens: 64000 },
        { id: 'claude-opus-4-5', name: 'Claude Opus 4.5', contextWindow: 200000, maxTokens: 64000 },
        { id: 'claude-haiku-4-5', name: 'Claude Haiku 4.5', contextWindow: 200000, maxTokens: 64000 },
        { id: 'claude-3-7-sonnet-latest', name: 'Claude 3.7 Sonnet', contextWindow: 200000, maxTokens: 64000, reasoning: true },
      ]
    }

    const provider = {
      displayName: 'Anthropic (Claude OAuth)',
      apiKeyEnv: CREDS_REF,
      api: 'anthropic-messages',
      baseURL: API_BASE,
      models,
    }

    try {
      const cur = settings.get('llm-pi-ai')
      const existing = cur && cur.providers && cur.providers[PROVIDER_KEY]
      if (existing && JSON.stringify(existing.models) === JSON.stringify(models)) {
        return false
      }
    } catch {}

    const patch = { providers: { [PROVIDER_KEY]: provider } }
    try {
      if (typeof settings.update === 'function') {
        await settings.update('llm-pi-ai', patch)
      } else if (typeof settings.mutate === 'function') {
        await settings.mutate('llm-pi-ai', [{ op: 'add', path: ['providers', PROVIDER_KEY], value: provider }])
      } else {
        const fs = await import('node:fs')
        const os = await import('node:os')
        const path = await import('node:path')
        const file = path.join(os.homedir(), '.dsh', 'settings.yaml')
        let yaml = fs.readFileSync(file, 'utf8')
        const modelLines = models.map((m) =>
          [
            `        - id: ${m.id}`,
            `          name: ${JSON.stringify(m.name)}`,
            `          contextWindow: ${m.contextWindow}`,
            `          maxTokens: ${m.maxTokens}`,
          ].join('\n')).join('\n')
        const block = [
          `    ${PROVIDER_KEY}:`,
          `      displayName: Anthropic (Claude OAuth)`,
          `      apiKeyEnv: ${CREDS_REF}`,
          `      api: anthropic-messages`,
          `      baseURL: ${API_BASE}`,
          `      models:`,
          modelLines,
        ].join('\n') + '\n'
        if (/^\s+anthropic:\s*$/m.test(yaml)) {
          // already exists
        } else {
          yaml = yaml.replace(/(providers:\n)/, `$1${block}`)
          fs.writeFileSync(file, yaml)
        }
      }
      console.log('[claude-oauth] ensured llm-pi-ai.providers.anthropic in settings')
      return true
    } catch (e) {
      console.error('[claude-oauth] ensure provider failed:', e)
      return false
    }
  }

  async function saveClaudeTokens(data) {
    const fs = await import('node:fs')
    const os = await import('node:os')
    const path = await import('node:path')
    const crypto = await import('node:crypto')

    // 1. ~/.claude/.credentials.json
    const file = path.join(os.homedir(), '.claude', '.credentials.json')
    let existing = {}
    try {
      if (fs.existsSync(file)) {
        existing = JSON.parse(fs.readFileSync(file, 'utf8'))
      }
    } catch {}
    existing.claudeAiOauth = {
      accessToken: data.accessToken,
      refreshToken: data.refreshToken,
      expiresAt: data.expiresAt,
      scopes: [
        'user:file_upload',
        'user:inference',
        'user:mcp_servers',
        'user:profile',
        'user:sessions:claude_code'
      ],
      subscriptionType: data.sub || 'pro',
      rateLimitTier: data.tier || 'default'
    }
    if (data.email) existing.claudeAiOauth.emailAddress = data.email
    fs.mkdirSync(path.dirname(file), { recursive: true })
    fs.writeFileSync(file, JSON.stringify(existing, null, 2))
    try { fs.chmodSync(file, 0o600) } catch {}

    // 2. Sync to DSH credentials
    await syncToDshCredentials(data.accessToken)

    // 3. Sync to subscriptions auth.json
    try {
      const subFile = path.join(os.homedir(), '.dsh', 'plugins', 'subscriptions', 'auth.json')
      let subData = {}
      if (fs.existsSync(subFile)) {
        try { subData = JSON.parse(fs.readFileSync(subFile, 'utf8')) } catch {}
      }
      const accKey = 'token-' + crypto.createHash('sha256').update(data.accessToken).digest('hex').slice(0, 16)
      subData.claude = {
        default: accKey,
        accounts: {
          [accKey]: {
            accessToken: data.accessToken,
            refreshToken: data.refreshToken,
            expiresAt: data.expiresAt,
            scopes: 'user:file_upload user:inference user:mcp_servers user:profile user:sessions:claude_code',
            subscriptionType: data.sub || 'pro',
            emailAddress: data.email || undefined,
            keychainBound: true
          }
        }
      }
      fs.mkdirSync(path.dirname(subFile), { recursive: true })
      fs.writeFileSync(subFile, JSON.stringify(subData, null, 2))
    } catch (e) {
      console.warn('[claude-oauth] failed to sync subscriptions auth.json:', e)
    }

    // 4. Ensure provider in settings
    await ensureAnthropicProvider(data.accessToken)
  }

  async function startOAuthFlow() {
    if (activeLoginFlow && Date.now() - activeLoginFlow.startedAt < 300000) {
      return activeLoginFlow
    }
    if (activeLoginFlow) {
      try { activeLoginFlow.cleanup() } catch {}
    }

    const crypto = await import('node:crypto')
    const http = await import('node:http')

    const verifier = crypto.randomBytes(32).toString('base64url')
    const challenge = crypto.createHash('sha256').update(verifier).digest('base64url')
    const state = crypto.randomBytes(16).toString('hex')

    let server4 = null
    let server6 = null
    let resolvedPort = 0

    const cleanup = () => {
      try { if (server4) server4.close() } catch {}
      try { if (server6) server6.close() } catch {}
      activeLoginFlow = null
    }

    const handler = async (cReq, cRes) => {
      const u = new URL(cReq.url || '/', `http://${cReq.headers.host || 'localhost'}`)
      if (u.pathname === '/callback') {
        const code = u.searchParams.get('code')
        const returnedState = u.searchParams.get('state')
        const error = u.searchParams.get('error')
        if (error) {
          cRes.statusCode = 400
          cRes.setHeader('content-type', 'text/html; charset=utf-8')
          cRes.end(`<h1>Login failed: ${error}</h1><p>You can close this tab.</p>`)
          cleanup()
          return
        }
        if (returnedState !== state) {
          cRes.statusCode = 400
          cRes.setHeader('content-type', 'text/html; charset=utf-8')
          cRes.end('<h1>State mismatch. Please try again.</h1>')
          cleanup()
          return
        }
        if (!code) {
          cRes.statusCode = 400
          cRes.setHeader('content-type', 'text/html; charset=utf-8')
          cRes.end('<h1>Missing authorization code.</h1>')
          cleanup()
          return
        }

        try {
          const tokenRes = await fetch(TOKEN_URL, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'User-Agent': `claude-cli/${await getClaudeCodeVersion()} (external, cli)`
            },
            body: JSON.stringify({
              grant_type: 'authorization_code',
              client_id: getClientId(),
              code,
              redirect_uri: `http://localhost:${resolvedPort}/callback`,
              code_verifier: verifier,
              state
            })
          })
          const tokens = await tokenRes.json()
          if (!tokenRes.ok || !tokens.access_token) {
            throw new Error(tokens.error_description || tokens.error || JSON.stringify(tokens))
          }

          let profile = {}
          try {
            const profRes = await fetch('https://api.anthropic.com/api/oauth/profile', {
              headers: { authorization: `Bearer ${tokens.access_token}` },
              signal: AbortSignal.timeout(10000)
            })
            if (profRes.ok) profile = await profRes.json()
          } catch {}

          const account = profile.account || {}
          const email = profile.emailAddress || profile.email || account.email_address || account.email || null
          const sub = profile.subscriptionType || profile.subscription_type || account.subscription_type || 'pro'
          const tier = account.rate_limit_tier || profile.rateLimitTier || 'default'

          await saveClaudeTokens({
            accessToken: tokens.access_token,
            refreshToken: tokens.refresh_token,
            expiresAt: Date.now() + (tokens.expires_in || 3600) * 1000,
            email,
            sub,
            tier
          })

          lastAuthState = {
            ok: true,
            message: 'bridged',
            expiresAt: Date.now() + (tokens.expires_in || 3600) * 1000,
            tier,
            sub,
            email
          }
          lastSyncOk = true

          cRes.statusCode = 200
          cRes.setHeader('content-type', 'text/html; charset=utf-8')
          cRes.end(`<!doctype html><html><head><title>Claude Login Successful</title><meta charset="utf-8">
<style>
body{font-family:system-ui,-apple-system,sans-serif;display:flex;align-items:center;justify-content:center;height:100vh;margin:0;background:#18181b;color:#f4f4f5}
.box{background:#27272a;border:1px solid #3f3f46;border-radius:16px;padding:36px;text-align:center;max-width:440px;box-shadow:0 10px 30px rgba(0,0,0,0.5)}
h1{font-size:20px;margin:0 0 10px;color:#d97706}
p{font-size:14px;color:#a1a1aa;line-height:1.5;margin:0 0 20px}
.pill{display:inline-block;background:#22c55e20;color:#22c55e;border:1px solid #22c55e40;padding:6px 16px;border-radius:999px;font-size:13px;font-weight:600;margin-bottom:16px}
.email{color:#f4f4f5;font-weight:600}
</style>
</head><body>
<div class="box">
  <div class="pill">&#10003; Logged in successfully</div>
  <h1>Claude Connected</h1>
  <p>Logged in as <span class="email">${email || 'your account'}</span> (${String(sub).toUpperCase()}).<br>You can close this tab and return to DeepSeek Harness.</p>
</div>
</body></html>`)

          try {
            lastAuthState.rateLimit = await fetchQuota(tokens.access_token)
          } catch {}
        } catch (err) {
          cRes.statusCode = 500
          cRes.setHeader('content-type', 'text/html; charset=utf-8')
          cRes.end(`<h1>Token exchange failed: ${err.message}</h1>`)
        } finally {
          cleanup()
        }
      } else {
        cRes.statusCode = 404
        cRes.end('Not found')
      }
    }

    server4 = http.createServer(handler)
    await new Promise((res) => server4.listen(0, '127.0.0.1', res))
    resolvedPort = server4.address().port

    try {
      server6 = http.createServer(handler)
      await new Promise((res) => server6.listen(resolvedPort, '::1', res))
    } catch {}

    const redirectUri = `http://localhost:${resolvedPort}/callback`
    const authUrl = `https://claude.ai/oauth/authorize?code=true&client_id=${getClientId()}&response_type=code&redirect_uri=${encodeURIComponent(redirectUri)}&scope=${encodeURIComponent(CLAUDE_SCOPE)}&code_challenge=${challenge}&code_challenge_method=S256&state=${state}`

    const timeoutHandle = setTimeout(cleanup, 300000)

    activeLoginFlow = {
      authUrl,
      startedAt: Date.now(),
      cleanup: () => {
        clearTimeout(timeoutHandle)
        cleanup()
      }
    }
    return activeLoginFlow
  }

  async function oneShot() {
    if (stopped) return
    try {
      const creds = await readClaudeCreds()
      if (!creds || !creds.oauth || !creds.oauth.accessToken || !creds.oauth.refreshToken) {
        lastAuthState = {
          ok: false,
          message: 'Not logged in to Claude. Click "Sign in with Google / Gmail" to connect.',
          expiresAt: null,
          tier: null,
          sub: null,
          email: null
        }
        return
      }
      const { oauth } = await refreshIfNeeded()
      const ok = await syncToDshCredentials(oauth.accessToken)
      if (!ok) {
        lastAuthState = { ok: false, message: 'sync shadowed or failed', expiresAt: oauth.expiresAt, tier: oauth.rateLimitTier || null, sub: oauth.subscriptionType || null, email: oauth.emailAddress || null }
      } else {
        await ensureAnthropicProvider(oauth.accessToken)
        lastAuthState = { ok: true, message: 'bridged', expiresAt: oauth.expiresAt, tier: oauth.rateLimitTier || null, sub: oauth.subscriptionType || null, email: oauth.emailAddress || null }
        try {
          lastAuthState.rateLimit = await fetchQuota(oauth.accessToken)
        } catch (qe) {
          console.warn('[claude-oauth] quota probe failed:', qe && qe.message ? qe.message : qe)
        }
      }
    } catch (e) {
      const msg = e && e.message ? e.message : String(e)
      lastAuthState = { ok: false, message: msg.slice(0, 500), expiresAt: null, tier: null, sub: null, email: null }
      if (msg.includes('No claudeAiOauth') || msg.includes('ENOENT') || msg.includes('Not logged in')) {
        lastAuthState.message = 'Not logged in to Claude. Click "Sign in with Google / Gmail" to connect.'
      }
    }
  }

  void oneShot()

  const schedule = () => {
    if (stopped) return
    timerHandle = setTimeout(async () => {
      await oneShot()
      schedule()
    }, 60_000)
  }
  schedule()

  void (async () => {
    try {
      const fs = await import('node:fs')
      const os = await import('node:os')
      const path = await import('node:path')
      const file = path.join(os.homedir(), '.claude', '.credentials.json')
      let debounce = null
      fsWatcher = fs.watch(file, () => {
        if (debounce) clearTimeout(debounce)
        debounce = setTimeout(() => { void oneShot() }, 400)
      })
      fsWatcher.on('error', () => {})
    } catch {}
  })()

  try {
    const webServer = ctx.get('webServer')
    if (webServer) {
      ctx.effect(() => webServer.register({
        kind: 'exact',
        path: '/api/anthropic-oauth/status',
        handler: (req, res) => {
          res.statusCode = 200
          res.setHeader('content-type', 'application/json; charset=utf-8')
          res.setHeader('cache-control', 'no-store')
          const authenticated = !!(lastAuthState.ok && lastAuthState.expiresAt)
          res.end(JSON.stringify({
            ...lastAuthState,
            authenticated,
            now: Date.now(),
            synced: lastSyncOk,
            models: modelsCache ? modelsCache.models.map((m) => m.id) : [],
            modelsAt: modelsCache ? modelsCache.at : null,
          }))
        },
      }))

      ctx.effect(() => webServer.register({
        kind: 'exact',
        path: '/api/anthropic-oauth/login',
        handler: async (req, res) => {
          try {
            const flow = await startOAuthFlow()
            const accept = req.headers.accept || ''
            if (req.method === 'GET' && (accept.includes('text/html') || !accept.includes('application/json'))) {
              res.writeHead(302, { Location: flow.authUrl })
              res.end()
              return
            }
            res.statusCode = 200
            res.setHeader('content-type', 'application/json; charset=utf-8')
            res.end(JSON.stringify({ ok: true, authUrl: flow.authUrl }))
          } catch (err) {
            res.statusCode = 500
            res.setHeader('content-type', 'application/json; charset=utf-8')
            res.end(JSON.stringify({ ok: false, error: err.message }))
          }
        },
      }))

      ctx.effect(() => webServer.register({
        kind: 'exact',
        path: '/api/anthropic-oauth/logout',
        handler: async (req, res) => {
          try {
            const fs = await import('node:fs')
            const os = await import('node:os')
            const path = await import('node:path')
            const file = path.join(os.homedir(), '.claude', '.credentials.json')
            if (fs.existsSync(file)) {
              try {
                const j = JSON.parse(fs.readFileSync(file, 'utf8'))
                delete j.claudeAiOauth
                fs.writeFileSync(file, JSON.stringify(j, null, 2))
              } catch {}
            }
            try {
              const creds = ctx.get('credentials')
              if (creds) {
                await creds.delete(CREDS_REF).catch(() => {})
                await creds.delete(CREDS_REF_ALIAS).catch(() => {})
              }
            } catch {}
            try {
              const subFile = path.join(os.homedir(), '.dsh', 'plugins', 'subscriptions', 'auth.json')
              if (fs.existsSync(subFile)) {
                const s = JSON.parse(fs.readFileSync(subFile, 'utf8'))
                delete s.claude
                fs.writeFileSync(subFile, JSON.stringify(s, null, 2))
              }
            } catch {}

            lastAuthState = {
              ok: false,
              message: 'Not logged in to Claude. Click "Sign in with Google / Gmail" to connect.',
              expiresAt: null,
              tier: null,
              sub: null,
              email: null
            }
            lastSyncOk = false
            quotaCache = null

            res.statusCode = 200
            res.setHeader('content-type', 'application/json; charset=utf-8')
            res.end(JSON.stringify({ ok: true }))
          } catch (err) {
            res.statusCode = 500
            res.setHeader('content-type', 'application/json; charset=utf-8')
            res.end(JSON.stringify({ ok: false, error: err.message }))
          }
        },
      }))

      ctx.effect(() => webServer.register({
        kind: 'exact',
        path: '/api/anthropic-oauth/sync',
        handler: async (req, res) => {
          if (req.method !== 'POST') { res.statusCode = 405; res.end(); return }
          modelsCache = null
          await oneShot()
          res.statusCode = 200
          res.setHeader('content-type', 'application/json; charset=utf-8')
          res.end(JSON.stringify({ ...lastAuthState }))
        },
      }))

      ctx.effect(() => webServer.register({
        kind: 'exact',
        path: '/api/anthropic-oauth/quota',
        handler: async (req, res) => {
          res.setHeader('content-type', 'application/json; charset=utf-8')
          res.setHeader('cache-control', 'no-store')
          const force = req.method === 'POST' || /[?&]force=1\b/.test(req.url || '')
          try {
            const { oauth } = await refreshIfNeeded()
            const data = await fetchQuota(oauth.accessToken, { force })
            lastAuthState.rateLimit = data
            res.statusCode = 200
            res.end(JSON.stringify({ ok: true, ...data, sub: lastAuthState.sub, tier: lastAuthState.tier }))
          } catch (e) {
            const msg = e && e.message ? e.message : String(e)
            res.statusCode = 200
            res.end(JSON.stringify({ ok: false, error: msg.slice(0, 300) }))
          }
        },
      }))
    }
  } catch {}

  ctx.effect(() => () => {
    stopped = true
    if (timerHandle) clearTimeout(timerHandle)
    if (fsWatcher) try { fsWatcher.close() } catch {}
  })
}

export default { name, inject, apply }
