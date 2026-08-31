#!/usr/bin/env node
// Launch readiness check. Run this before turning safe mode off.
//
//   node scripts/preflight.mjs
//
// Verifies the things that silently break email: an unverified sending domain,
// missing SPF/DKIM/DMARC, a from-address on a domain Resend does not own, and
// collateral the brochure emails cannot reach. Every failure says what to do
// about it rather than just reporting itself.
//
// Reads admin/.env.local and site/.env.local, or the ambient environment in CI.

import fs from 'node:fs'
import path from 'node:path'
import dns from 'node:dns/promises'

const ROOT = path.resolve(import.meta.dirname, '..')

// ── Env ─────────────────────────────────────────────────────────────────────
for (const file of ['admin/.env.local', 'site/.env.local']) {
  const p = path.join(ROOT, file)
  if (!fs.existsSync(p)) continue
  for (const line of fs.readFileSync(p, 'utf8').split('\n')) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*?)\s*$/)
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^["']|["']$/g, '')
  }
}

const SITE = (process.env.PUBLIC_SITE_URL || process.env.NEXT_PUBLIC_SITE_URL || 'https://6homes.com').replace(/\/+$/, '')

let pass = 0
let warn = 0
let fail = 0
const ok = (m, d) => { pass++; console.log(`  \x1b[32mPASS\x1b[0m  ${m}${d ? `\n        ${d}` : ''}`) }
const wr = (m, d) => { warn++; console.log(`  \x1b[33mWARN\x1b[0m  ${m}${d ? `\n        ${d}` : ''}`) }
const no = (m, d) => { fail++; console.log(`  \x1b[31mFAIL\x1b[0m  ${m}${d ? `\n        ${d}` : ''}`) }
const head = (t) => console.log(`\n\x1b[1m${t}\x1b[0m`)

// ── Resend ──────────────────────────────────────────────────────────────────
head('Resend')
const verifiedDomains = []
const key = process.env.RESEND_API_KEY

if (!key) {
  no('RESEND_API_KEY is not set', 'Create a key at resend.com/api-keys, then put it in admin/.env.local and the Vercel project env.')
} else {
  try {
    const r = await fetch('https://api.resend.com/domains', { headers: { Authorization: `Bearer ${key}` } })
    if (r.status === 401) {
      no('RESEND_API_KEY was rejected', 'The key is wrong or revoked. Issue a new one at resend.com/api-keys.')
    } else if (!r.ok) {
      no(`Resend API returned ${r.status}`, (await r.text()).slice(0, 200))
    } else {
      const domains = (await r.json()).data ?? []
      ok('API key is valid')
      if (!domains.length) {
        no('No domains added to Resend', 'Add 6homes.com at resend.com/domains, then create the DNS records it lists.')
      }
      for (const d of domains) {
        if (d.status === 'verified') {
          verifiedDomains.push(d.name)
          ok(`Domain verified: ${d.name}`)
        } else {
          no(`Domain not verified: ${d.name} (${d.status})`, 'Add the DNS records Resend lists, then press Verify. Propagation can take an hour.')
        }
      }
    }
  } catch (err) {
    no('Could not reach the Resend API', String(err).slice(0, 160))
  }
}

// ── Sending identity ────────────────────────────────────────────────────────
head('Sending identity')
let fromEmail = ''
let safeMode = null

const sbUrl = process.env.SUPABASE_URL
const sbKey = process.env.SUPABASE_SERVICE_ROLE_KEY
if (sbUrl && sbKey) {
  try {
    const { createClient } = await import('@supabase/supabase-js')
    const sb = createClient(sbUrl, sbKey, { auth: { persistSession: false } })
    const { data, error } = await sb.from('settings').select('data').eq('id', 'global').maybeSingle()
    if (error) no('Could not read the settings row', error.message)
    else if (!data) no('No settings row', 'Run sql/6homes-setup.sql in the Supabase SQL editor.')
    else {
      const e = data.data?.emails ?? {}
      fromEmail = e.fromEmail || ''
      safeMode = e.safeMode !== false
      const notify = (Array.isArray(e.notify) ? e.notify : [e.notify]).filter(Boolean)
      ok('Settings row found')
      if (notify.length) ok(`New-lead notifications go to: ${notify.join(', ')}`)
      else no('No notification recipients', 'Settings → Emails → "Notify these addresses of new leads".')
      if (e.replyTo) ok(`Customer replies go to: ${e.replyTo}`)
      else wr('No reply-to set', 'A customer hitting reply lands on the from-address instead.')
    }
  } catch (err) {
    wr('Could not read settings from Supabase', String(err).slice(0, 160))
  }
} else {
  wr('SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY not set', 'Skipping the settings checks.')
}

if (fromEmail) {
  const d = fromEmail.split('@')[1]
  if (!verifiedDomains.length) wr(`From-address is ${fromEmail}`, 'Cannot confirm its domain is verified — see Resend above.')
  else if (verifiedDomains.some((v) => d === v || d.endsWith(`.${v}`))) ok(`From-address ${fromEmail} is on a verified domain`)
  else no(`From-address ${fromEmail} is NOT on a verified domain`, `Resend has: ${verifiedDomains.join(', ')}. Every send will be rejected.`)
}

// ── DNS ─────────────────────────────────────────────────────────────────────
const domain = fromEmail.split('@')[1] || '6homes.com'
head(`DNS on ${domain}`)

try {
  const txt = (await dns.resolveTxt(domain)).map((r) => r.join(''))
  const spf = txt.find((t) => t.startsWith('v=spf1'))
  if (!spf) no('No SPF record', `Add a TXT record on ${domain}: "v=spf1 include:amazonses.com ~all" — Resend sends via SES.`)
  else if (/amazonses\.com|resend/i.test(spf)) ok('SPF includes Resend', spf.slice(0, 120))
  else wr('SPF exists but does not include Resend', `${spf.slice(0, 120)}\n        Add include:amazonses.com to it.`)
} catch {
  no(`No TXT records resolve on ${domain}`, 'Check the domain is live and its nameservers are correct.')
}

try {
  const dmarc = (await dns.resolveTxt(`_dmarc.${domain}`)).map((r) => r.join(''))
  ok('DMARC record present', dmarc[0]?.slice(0, 120))
} catch {
  wr('No DMARC record', `Add TXT at _dmarc.${domain}: "v=DMARC1; p=none; rua=mailto:dmarc@${domain}" — start at p=none, tighten later.`)
}

// Resend issues a per-domain DKIM selector; resend._domainkey is the usual one.
try {
  await dns.resolveTxt(`resend._domainkey.${domain}`)
  ok('DKIM record present (resend._domainkey)')
} catch {
  wr('DKIM not found at resend._domainkey', 'Resend shows the exact selector on its domain page — add whichever records it lists.')
}

// ── Collateral ──────────────────────────────────────────────────────────────
head(`Email attachments (served from ${SITE})`)
const MAX = 8 * 1024 * 1024
for (const f of ['6homes-brochure.pdf', '6homes-price-list.pdf']) {
  const local = path.join(ROOT, 'site/public/downloads', f)
  if (!fs.existsSync(local)) {
    no(`${f} is missing locally`, 'It cannot be attached until it exists in site/public/downloads/.')
    continue
  }
  const size = fs.statSync(local).size
  if (size > MAX) {
    no(`${f} is ${(size / 1048576).toFixed(1)} MB`, 'Over the 8 MB limit — it will be skipped and the email sent without it.')
    continue
  }
  try {
    const r = await fetch(`${SITE}/downloads/${f}`, { method: 'HEAD' })
    if (r.ok) ok(`${f} reachable`, `${(size / 1048576).toFixed(2)} MB`)
    else no(`${f} returns ${r.status} at ${SITE}`, 'Attachments are fetched by URL — deploy the site, or point PUBLIC_SITE_URL at the deployment.')
  } catch {
    no(`${f} unreachable at ${SITE}`, 'Attachments are fetched by URL. Set PUBLIC_SITE_URL to a deployed origin.')
  }
}

// ── Verdict ─────────────────────────────────────────────────────────────────
head('Safe mode')
if (safeMode === true) console.log('  Safe mode is ON — every email is redirected. Correct until launch.')
else if (safeMode === false) console.log('  \x1b[31mSafe mode is OFF — real customers are receiving email.\x1b[0m')
else console.log('  Unknown (settings could not be read).')

console.log(`\n${pass} passed · ${warn} warnings · ${fail} failures`)
if (fail) {
  console.log('\nFix the failures before turning safe mode off.')
  process.exitCode = 1
} else if (warn) {
  console.log('\nNo blockers. The warnings affect deliverability, not delivery.')
} else {
  console.log('\nReady. Turn safe mode off in Settings when you are.')
}
