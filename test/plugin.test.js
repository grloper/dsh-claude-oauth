import { test } from 'node:test'
import assert from 'node:assert'
import crypto from 'node:crypto'
import { getClientId, getClaudeCodeVersion, claudeCodeHeaders, name, inject } from '../lib/index.js'

test('plugin metadata', () => {
  assert.strictEqual(name, 'dsh-claude-oauth')
  assert.ok(Array.isArray(inject))
  assert.ok(inject.includes('credentials'))
  assert.ok(inject.includes('settings'))
})

test('client id resolution', () => {
  const id = getClientId()
  assert.strictEqual(id, '9d1c250a-e61b-44d9-88ed-5944d1962f5e')
})

test('claude code version discovery', async () => {
  const v = await getClaudeCodeVersion()
  assert.ok(typeof v === 'string')
  assert.ok(/^\d+\.\d+/.test(v))
})

test('claude code request headers', async () => {
  const token = 'sk-ant-test-token-12345'
  const betas = ['oauth-2025-04-20', 'claude-code-20250219']
  const headers = await claudeCodeHeaders(token, betas)

  assert.strictEqual(headers.authorization, `Bearer ${token}`)
  assert.strictEqual(headers['anthropic-version'], '2023-06-01')
  assert.strictEqual(headers['anthropic-beta'], 'oauth-2025-04-20,claude-code-20250219')
  assert.strictEqual(headers['anthropic-dangerous-direct-browser-access'], 'true')
  assert.ok(headers['user-agent'].startsWith('claude-cli/'))
})

test('pkce verifier and challenge generation', () => {
  const verifier = crypto.randomBytes(32).toString('base64url')
  const challenge = crypto.createHash('sha256').update(verifier).digest('base64url')

  assert.strictEqual(verifier.length, 43)
  assert.strictEqual(challenge.length, 43)
  assert.ok(!verifier.includes('+') && !verifier.includes('/') && !verifier.includes('='))
  assert.ok(!challenge.includes('+') && !challenge.includes('/') && !challenge.includes('='))
})
