#!/usr/bin/env node
/**
 * @file CLI helper to sign in to Claude Pro/Max via Google/Gmail OAuth
 * @author grloper <https://github.com/grloper>
 * @license MIT
 */

import http from 'node:http'
import crypto from 'node:crypto'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { exec } from 'node:child_process'

const CLIENT_ID = '9d1c250a-e61b-44d9-88ed-5944d1962f5e'
const TOKEN_URL = 'https://claude.ai/v1/oauth/token'
const SCOPES = 'org:create_api_key user:profile user:inference user:sessions:claude_code user:mcp_servers user:file_upload'

function openUrl(url) {
  const start = process.platform === 'darwin' ? 'open' : process.platform === 'win32' ? 'start ""' : 'xdg-open'
  exec(`${start} "${url}"`, (err) => {
    if (err) console.log(`Please open this URL in your browser:\n${url}`)
  })
}

async function main() {
  console.log('\n=== Claude OAuth Login for DeepSeek Harness (DSH) ===\n')

  const verifier = crypto.randomBytes(32).toString('base64url')
  const challenge = crypto.createHash('sha256').update(verifier).digest('base64url')
  const state = crypto.randomBytes(16).toString('hex')

  let server4 = null
  let server6 = null
  let port = 0

  const cleanup = () => {
    try { if (server4) server4.close() } catch {}
    try { if (server6) server6.close() } catch {}
  }

  const codePromise = new Promise((resolve, reject) => {
    const handler = async (req, res) => {
      const u = new URL(req.url || '/', `http://${req.headers.host || 'localhost'}`)
      if (u.pathname === '/callback') {
        const code = u.searchParams.get('code')
        const returnedState = u.searchParams.get('state')
        const error = u.searchParams.get('error')

        if (error) {
          res.statusCode = 400
          res.setHeader('content-type', 'text/html; charset=utf-8')
          res.end(`<h1>Login failed: ${error}</h1>`)
          reject(new Error(error))
          cleanup()
          return
        }
        if (returnedState !== state) {
          res.statusCode = 400
          res.setHeader('content-type', 'text/html; charset=utf-8')
          res.end('<h1>State mismatch error</h1>')
          reject(new Error('State mismatch'))
          cleanup()
          return
        }

        res.statusCode = 200
        res.setHeader('content-type', 'text/html; charset=utf-8')
        res.end(`<!doctype html><html><head><title>Claude Login Successful</title><meta charset="utf-8">
<body style="font-family:system-ui;display:flex;align-items:center;justify-content:center;height:100vh;margin:0;background:#18181b;color:#f4f4f5">
<div style="background:#27272a;padding:32px;border-radius:12px;text-align:center;border:1px solid #3f3f46">
  <h1 style="color:#22c55e;font-size:22px;margin:0 0 10px">&#10003; Login Successful</h1>
  <p style="color:#a1a1aa;margin:0">You can close this window and return to your terminal.</p>
</div>
</body></html>`)
        cleanup()
        resolve(code)
      } else {
        res.statusCode = 404
        res.end('Not found')
      }
    }

    server4 = http.createServer(handler)
    server4.listen(0, '127.0.0.1', () => {
      port = server4.address().port
      try {
        server6 = http.createServer(handler)
        server6.listen(port, '::1', () => {})
      } catch {}

      const redirectUri = `http://localhost:${port}/callback`
      const authUrl = `https://claude.ai/oauth/authorize?code=true&client_id=${CLIENT_ID}&response_type=code&redirect_uri=${encodeURIComponent(redirectUri)}&scope=${encodeURIComponent(SCOPES)}&code_challenge=${challenge}&code_challenge_method=S256&state=${state}`

      console.log('Opening browser for Claude authentication...')
      console.log('Select "Continue with Google" to log in with your Gmail account.\n')
      openUrl(authUrl)
    })
  })

  try {
    const code = await codePromise
    console.log('Authorization code received, exchanging for tokens...')

    const res = await fetch(TOKEN_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        grant_type: 'authorization_code',
        client_id: CLIENT_ID,
        code,
        redirect_uri: `http://localhost:${port}/callback`,
        code_verifier: verifier,
        state
      })
    })

    const tokens = await res.json()
    if (!res.ok || !tokens.access_token) {
      throw new Error(tokens.error_description || tokens.error || JSON.stringify(tokens))
    }

    let profile = {}
    try {
      const profRes = await fetch('https://api.anthropic.com/api/oauth/profile', {
        headers: { authorization: `Bearer ${tokens.access_token}` }
      })
      if (profRes.ok) profile = await profRes.json()
    } catch {}

    const account = profile.account || {}
    const email = profile.emailAddress || profile.email || account.email_address || account.email || 'unknown'
    const sub = profile.subscriptionType || profile.subscription_type || account.subscription_type || 'pro'

    // Write to ~/.claude/.credentials.json
    const credFile = path.join(os.homedir(), '.claude', '.credentials.json')
    let creds = {}
    try { if (fs.existsSync(credFile)) creds = JSON.parse(fs.readFileSync(credFile, 'utf8')) } catch {}
    creds.claudeAiOauth = {
      accessToken: tokens.access_token,
      refreshToken: tokens.refresh_token,
      expiresAt: Date.now() + (tokens.expires_in || 3600) * 1000,
      scopes: [
        'user:file_upload',
        'user:inference',
        'user:mcp_servers',
        'user:profile',
        'user:sessions:claude_code'
      ],
      subscriptionType: sub,
      emailAddress: email
    }
    fs.mkdirSync(path.dirname(credFile), { recursive: true })
    fs.writeFileSync(credFile, JSON.stringify(creds, null, 2))

    // Write to ~/.dsh/.credentials.yaml
    const dshCredFile = path.join(os.homedir(), '.dsh', '.credentials.yaml')
    if (fs.existsSync(dshCredFile)) {
      let yaml = fs.readFileSync(dshCredFile, 'utf8')
      const token = tokens.access_token
      if (yaml.includes('ANTHROPIC_OAUTH_TOKEN:')) {
        yaml = yaml.replace(/ANTHROPIC_OAUTH_TOKEN:.*/, `ANTHROPIC_OAUTH_TOKEN: ${token}`)
      } else if (yaml.includes('refs:')) {
        yaml = yaml.replace(/(refs:\n)/, `$1  ANTHROPIC_OAUTH_TOKEN: ${token}\n`)
      }
      if (yaml.includes('CLAUDE_CODE_OAUTH_TOKEN:')) {
        yaml = yaml.replace(/CLAUDE_CODE_OAUTH_TOKEN:.*/, `CLAUDE_CODE_OAUTH_TOKEN: ${token}`)
      } else if (yaml.includes('refs:')) {
        yaml = yaml.replace(/(refs:\n)/, `$1  CLAUDE_CODE_OAUTH_TOKEN: ${token}\n`)
      }
      fs.writeFileSync(dshCredFile, yaml)
    }

    console.log(`\n[SUCCESS] Connected to Claude as: ${email} (${sub.toUpperCase()})`)
    console.log('Tokens successfully saved to ~/.claude/.credentials.json and DSH credentials.')
    console.log('You can now use Claude models (Sonnet 4.5, 3.7, Opus) in DeepSeek Harness!\n')
  } catch (err) {
    console.error('\n[ERROR] Login failed:', err.message)
    process.exit(1)
  }
}

main()
