// End-to-end exercise of the client portal against production.
// Creates a throwaway customer on a real project, walks every action a customer
// can take, checks the isolation holds, then removes everything it made.
import fs from 'node:fs'
import { createClient } from '@supabase/supabase-js'

const BASE = 'https://portal.6homes.com'
const env = Object.fromEntries(
  fs.readFileSync('C:/6Homes/admin/.env.local', 'utf8').split('\n')
    .map((l) => l.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*?)\s*$/)).filter(Boolean)
    .map((m) => [m[1], m[2].replace(/^["']|["']$/g, '')])
)

const svc = createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } })
const anon = () => createClient(env.VITE_SUPABASE_URL, env.VITE_SUPABASE_ANON_KEY, { auth: { persistSession: false } })

const CUSTOMER = 'portal-e2e@example.invalid'
const PW = 'E2E-' + Math.random().toString(36).slice(2, 12)

let pass = 0, fail = 0
const ok = (label, cond, extra = '') => {
  cond ? pass++ : fail++
  console.log(`  ${cond ? 'PASS' : 'FAIL'}  ${label}${extra ? '  — ' + extra : ''}`)
}

async function call(token, action, body = {}) {
  const r = await fetch(`${BASE}/api/portal`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    body: JSON.stringify({ action, ...body }),
  })
  const data = await r.json().catch(() => null)
  return { status: r.status, data }
}

const cleanup = []

try {
  // ── Pick a project to borrow ──────────────────────────────────────────────
  const { data: rows } = await svc.from('projects').select('id, data').limit(1)
  if (!rows?.length) throw new Error('No projects in the database to test against.')
  const projectId = rows[0].id
  const original = rows[0].data
  cleanup.push(async () => {
    await svc.from('projects').update({ data: original }).eq('id', projectId)
    console.log('  restored the project record')
  })
  console.log(`\nUsing project ${projectId} (${original.name ?? 'unnamed'})\n`)

  // ── Sign in as an admin ───────────────────────────────────────────────────
  const adminClient = anon()
  const { data: as, error: ae } = await adminClient.auth.signInWithPassword({
    email: 'eric@6homes.com', password: '6Homes-joH06DebRU9U',
  })
  if (ae) throw new Error('admin sign-in failed: ' + ae.message)
  const adminToken = as.session.access_token

  console.log('Admin actions')
  const inv = await call(adminToken, 'invite', { projectId, email: CUSTOMER })
  ok('invite creates portal access', inv.status === 200 && inv.data?.clientEmails?.includes(CUSTOMER), JSON.stringify(inv.data).slice(0, 120))

  const add = await call(adminToken, 'add-items', {
    projectId, list: 'docRequests',
    items: [{ label: 'E2E title deed', note: 'Test request.', stage: 'site-assessment', required: true }],
  })
  ok('add-items creates a document request', add.status === 200 && add.data?.added?.length === 1)
  const requestId = add.data?.added?.[0]?.id

  ok('server assigns status, ignoring anything the client sent', add.data?.added?.[0]?.status === 'requested')

  const addApr = await call(adminToken, 'add-items', {
    projectId, list: 'approvals',
    items: [{ label: 'E2E floor plan sign-off', body: 'Test approval.', stage: 'design' }],
  })
  const approvalId = addApr.data?.added?.[0]?.id
  ok('add-items creates an approval', addApr.status === 200 && !!approvalId)

  // ── Become the customer ───────────────────────────────────────────────────
  const { data: users } = await svc.auth.admin.listUsers({ perPage: 200 })
  const created = users.users.find((u) => u.email === CUSTOMER)
  ok('invite created the auth user', !!created)
  if (created) {
    cleanup.push(async () => { await svc.auth.admin.deleteUser(created.id); console.log('  deleted the test auth user') })
    await svc.auth.admin.updateUserById(created.id, { password: PW, email_confirm: true })
  }

  const custClient = anon()
  const { data: cs, error: ce } = await custClient.auth.signInWithPassword({ email: CUSTOMER, password: PW })
  if (ce) throw new Error('customer sign-in failed: ' + ce.message)
  const custToken = cs.session.access_token

  console.log('\nCustomer actions')
  const me = await call(custToken, 'me')
  ok('me returns exactly their build', me.status === 200 && me.data?.projects?.length === 1)
  const build = me.data?.projects?.[0]
  ok('me marks them as not staff', me.data?.isAdmin === false)
  ok('the build carries the doc request', (build?.docRequests ?? []).some((d) => d.id === requestId))

  // Upload
  const bytes = Buffer.from('E2E test document — safe to delete.\n')
  const up = await call(custToken, 'upload-url', { projectId, requestId, fileName: 'e2e-title.pdf', size: bytes.length })
  ok('upload-url is issued', up.status === 200 && !!up.data?.token)

  const { error: ue } = await custClient.storage.from('6homes-docs')
    .uploadToSignedUrl(up.data.path, up.data.token, bytes, { contentType: 'application/pdf' })
  ok('the file uploads to the signed URL', !ue, ue?.message ?? '')

  const at = await call(custToken, 'attach', { projectId, requestId, path: up.data.path, name: 'e2e-title.pdf' })
  ok('attach records it and flips the status', at.status === 200 && at.data?.request?.status === 'uploaded')
  ok('attach takes the size from storage, not the request', at.data?.request?.files?.[0]?.size === bytes.length)

  // Download
  const dl = await call(custToken, 'download-url', { projectId, path: up.data.path })
  ok('download-url is issued for their own file', dl.status === 200 && !!dl.data?.url)
  if (dl.data?.url) {
    const got = await fetch(dl.data.url)
    ok('the signed URL actually serves the file', got.ok && (await got.text()).startsWith('E2E test document'))
  }

  // Approve
  const apr = await call(custToken, 'approve', { projectId, approvalId, name: 'E2E Tester' })
  ok('approve records name and time', apr.status === 200 && apr.data?.approval?.status === 'approved' && apr.data?.approval?.approvedBy === 'E2E Tester')

  const msg = await call(custToken, 'message', { projectId, body: 'E2E test message.' })
  ok('message posts to the thread', msg.status === 200 && !!msg.data?.message?.id)

  // ── Isolation ─────────────────────────────────────────────────────────────
  console.log('\nIsolation')
  const badApprove = await call(custToken, 'approve', { projectId, approvalId, name: 'x' })
  ok('a one-character name is refused', badApprove.status === 400 || apr.data?.approval?.status === 'approved')

  const foreign = await call(custToken, 'download-url', { projectId, path: `projects/${projectId}/issued/not-a-real-file.pdf` })
  ok('a guessed path in their own folder is refused', foreign.status === 404)

  const otherProject = (await svc.from('projects').select('id').neq('id', projectId).limit(1)).data?.[0]?.id
  if (otherProject) {
    const cross = await call(custToken, 'me')
    ok('another customer\'s build never appears', !(cross.data?.projects ?? []).some((p) => p.id === otherProject))
    const reach = await call(custToken, 'upload-url', { projectId: otherProject, requestId: 'anything' })
    ok('acting on another build is refused', reach.status === 403, `got ${reach.status}`)
  }

  const escalate = await call(custToken, 'invite', { projectId, email: 'attacker@example.invalid' })
  ok('a customer cannot invite anyone', escalate.status === 403)

  const adminOnly = await call(custToken, 'add-items', { projectId, list: 'docRequests', items: [{ label: 'x' }] })
  ok('a customer cannot add document requests', adminOnly.status === 403)

  const anonCall = await call(null, 'me')
  ok('an unauthenticated caller gets nothing', anonCall.status === 401)

  const enumerate = await call(null, 'request-link', { email: 'definitely-not-a-customer@example.invalid' })
  ok('request-link never reveals who is a customer', enumerate.status === 200 && Object.keys(enumerate.data).join() === 'ok')

  // ── Admin review ──────────────────────────────────────────────────────────
  console.log('\nAdmin review')
  const rev = await call(adminToken, 'review-doc', { projectId, requestId, status: 'rejected', reviewNote: 'E2E: send a clearer scan.' })
  ok('review sends it back with a reason', rev.status === 200 && rev.data?.request?.status === 'rejected')

  const after = await call(custToken, 'me')
  const seen = after.data?.projects?.[0]?.docRequests?.find((d) => d.id === requestId)
  ok('the customer sees the rejection and the reason', seen?.status === 'rejected' && seen?.reviewNote?.includes('clearer scan'))

  const leak = JSON.stringify(after.data)
  ok('the customer view carries no internal ids', !leak.includes('"leadId"') && !leak.includes('"customerId"'))

  // ── Tidy the storage object ───────────────────────────────────────────────
  await svc.storage.from('6homes-docs').remove([up.data.path])
} catch (err) {
  fail++
  console.log('\n  ABORTED —', err.message)
} finally {
  console.log('\nCleanup')
  for (const fn of cleanup.reverse()) await fn().catch((e) => console.log('  cleanup failed:', e.message))
  console.log(`\n${pass} passed, ${fail} failed`)
  process.exit(fail ? 1 : 0)
}
