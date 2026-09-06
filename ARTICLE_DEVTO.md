*By **grloper** ([GitHub @grloper](https://github.com/grloper))*

---

## 1. Introduction: The Subscription Dilemma in Modern Agent Frameworks

[DeepSeek Harness (DSH)](https://github.com/deepseek-ai/deepseek-harness) has quickly established itself as one of the most capable, modular agent orchestration environments. Built on an extensible Cordis architecture where every feature — from persistence and sandboxing to tools and UI components — is a hot-pluggable plugin, DSH allows developers to assemble tailored autonomous coding environments.

However, many AI developers face a common friction point: **how do you use your existing Claude subscription in DSH?**

Millions of developers subscribe to **Claude Pro** or **Claude Max** directly through `claude.ai`. These subscriptions include substantial usage allowances, but they authenticate via browser OAuth rather than raw developer console API keys. Previously, attempting to use Claude in DSH meant:
1. Being forced to open a terminal, run `claude login`, and hope local files were parsed correctly.
2. Manually dumping tokens and editing YAML configuration files.
3. Dealing with silent token expiry without any visual feedback.
4. If you originally signed up with **"Continue with Google" (Gmail)**, there was no native UI in DSH Settings to authenticate.

To eliminate this friction once and for all, I built and open-sourced **[`dsh-claude-oauth`](https://github.com/grloper/dsh-claude-oauth)** — a complete, production-grade DSH plugin that provides a native **Claude Settings section** with **one-click Google / Gmail sign-in**, auto-refreshing tokens, live model discovery, and real-time subscription quota tracking.

---

## 2. Visual Walkthrough: How It Looks in DSH

Here is the native Settings interface that `dsh-claude-oauth` contributes to DeepSeek Harness:

![DSH Claude Settings UI](https://raw.githubusercontent.com/grloper/dsh-claude-oauth/master/assets/claude-settings-ui.png?v=2)

### What You See in Settings
* **Dedicated Navigation Entry**: Positioned at order `13` in the Settings sidebar, sitting cleanly alongside Antigravity (Google Gemini) and OpenAI Codex.
* **Account Status Card**: When authenticated, displays your linked Google/Gmail address, subscription tier pill (`CLAUDE MAX` or `CLAUDE PRO`), and active connection status.
* **Live Subscription Quota Bars**: Shows real-time utilization for both the **5-Hour** and **7-Day** subscription windows with live countdown timers until reset.
* **Active Model Catalog**: Displays available models (`Claude Sonnet 4.5`, `Claude Opus 4.5`, `Claude Haiku 4.5`, and `Claude 3.7 Sonnet`) verified live from Anthropic's API.

---

## 3. Architecture Deep-Dive: How It Works

Under the hood, `dsh-claude-oauth` is divided into two cooperative halves: a **Host plugin** running in Node.js and a **Web Client plugin** running in the browser.

![OAuth Architecture Flow](https://raw.githubusercontent.com/grloper/dsh-claude-oauth/master/assets/oauth-architecture.png)

### 3.1 The PKCE Loopback Flow & The Windows IPv6 Pitfall

When you click **"Sign in with Google / Gmail"**:
1. The client opens a tab pointing to `/api/anthropic-oauth/login`.
2. The host generates a cryptographically random 32-byte PKCE code verifier and computes its SHA-256 code challenge (`S256`), along with a random CSRF state token.
3. The host binds an ephemeral HTTP callback listener on `localhost:0`.

Here is a critical engineering detail: **Windows localhost resolution**.
On modern Windows systems, `localhost` often resolves to IPv6 `::1` before IPv4 `127.0.0.1`. A server that only binds to `127.0.0.1` will result in `ECONNREFUSED` when the browser redirects back to `http://localhost:<port>/callback`.

`dsh-claude-oauth` implements a dual-stack listener that binds both IPv4 and IPv6 on the identical ephemeral port:

```javascript
server4 = http.createServer(handler)
await new Promise((res) => server4.listen(0, '127.0.0.1', res))
resolvedPort = server4.address().port

try {
  server6 = http.createServer(handler)
  await new Promise((res) => server6.listen(resolvedPort, '::1', res))
} catch {}
```

4. The user is redirected to `https://claude.ai/oauth/authorize`.
5. On the Claude sign-in screen, the user chooses **"Continue with Google"** and selects their Gmail account.
6. Once authorized, Anthropic redirects back to `http://localhost:<port>/callback?code=...&state=...`.
7. The loopback server verifies the state, exchanges the authorization code for tokens via `https://claude.ai/v1/oauth/token`, and queries `https://api.anthropic.com/api/oauth/profile` to retrieve the user's Gmail address and subscription tier.

### 3.2 Multi-Store Credential Synchronization

To prevent isolated silos, `dsh-claude-oauth` synchronizes credentials across all relevant stores upon authentication:

1. **`~/.claude/.credentials.json`**: Writes the `claudeAiOauth` session (access token, refresh token, expiry, scopes, email). This ensures the official Claude Code CLI also recognizes the login!
2. **`~/.dsh/.credentials.yaml`**: Mounts `ANTHROPIC_OAUTH_TOKEN` and `CLAUDE_CODE_OAUTH_TOKEN` into the native DSH credential resolution seam.
3. **`~/.dsh/settings.yaml`**: Automatically declares `llm-pi-ai.providers.anthropic` with the live discovered model list.
4. **`~/.dsh/plugins/subscriptions/auth.json`**: Syncs with the multi-provider subscriptions store so other plugins stay updated.

### 3.3 Real-Time Unified Rate Limit Probing

Anthropic attaches its unified subscription rate-limit headers only to inference responses (`POST /v1/messages`), **never** to catalog endpoints (`/v1/models`).

To provide live 5-hour and 7-day usage readouts without burning quota, `dsh-claude-oauth` executes an ultra-cheap `max_tokens: 1` probe using Claude 3.5 Haiku:

```javascript
const res = await fetch('https://api.anthropic.com/v1/messages', {
  method: 'POST',
  headers: await claudeCodeHeaders(accessToken, OAUTH_DISCOVERY_BETAS),
  body: JSON.stringify({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 1,
    messages: [{ role: 'user', content: 'hi' }]
  })
})
```

From this single-token response, it extracts:
* `anthropic-ratelimit-unified-5h-utilization`
* `anthropic-ratelimit-unified-5h-reset`
* `anthropic-ratelimit-unified-7d-utilization`
* `anthropic-ratelimit-unified-7d-reset`

These values are cached with a 60-second TTL and rendered into smooth, color-coded progress bars (green below 70%, amber 70–89%, red 90%+).

---

## 4. How to Install and Use

### Step 1: Install the Plugin
Run this command from your terminal:

```bash
dsh plugin --profile web add github:grloper/dsh-claude-oauth
```

### Step 2: Open Settings & Sign In
1. Start DSH Web: `dsh web`
2. Click the gear icon in the lower-left corner to open **Settings**.
3. Click on **Claude (Anthropic)**.
4. Click **"Sign in with Google / Gmail"**.
5. Select your Google/Gmail account and click **Authorize**.
6. The browser confirms success; return to DSH and see your account and quota live!

### Step 3: Start Coding with Claude
Open any session and select **Claude Sonnet 4.5** or **Claude 3.7 Sonnet** from the composer model picker.

To make Claude your default agent model across all sessions, set it in `~/.dsh/settings.yaml`:

```yaml
agent-default-model:
  provider: anthropic
  model: claude-sonnet-4-5
```

---

## 5. Conclusion & Open Source Repository

DeepSeek Harness provides an outstanding foundation for autonomous AI coding. With `dsh-claude-oauth`, utilizing your existing Claude Pro or Max subscription with Google/Gmail login is now as frictionless as a single click.

* **GitHub Repository**: [https://github.com/grloper/dsh-claude-oauth](https://github.com/grloper/dsh-claude-oauth)
* **License**: MIT
* **Contributions**: Pull requests, feature suggestions, and bug reports are warmly welcomed!
