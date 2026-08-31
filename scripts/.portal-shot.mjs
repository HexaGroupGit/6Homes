// Screenshots the client portal as a real customer sees it, by seeding a
// throwaway build with realistic content and injecting a genuine session.
import fs from 'node:fs'
import path from 'node:path'
import puppeteer from 'puppeteer-core'
import { createClient } from '@supabase/supabase-js'

const BASE = process.env.PORTAL_BASE || 'https://portal.6homes.com'
const OUT = path.resolve('scripts/out/portal')
fs.mkdirSync(OUT, { recursive: true })

const env = Object.fromEntries(
  fs.readFileSync('admin/.env.local', 'utf8').split('\n')
    .map((l) => l.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*?)\s*$/)).filter(Boolean)
    .map((m) => [m[1], m[2].replace(/^["']|["']$/g, '')])
)
const REF = env.SUPABASE_URL.match(/https:\/\/([^.]+)\./)[1]
const svc = createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } })
const anon = createClient(env.VITE_SUPABASE_URL, env.VITE_SUPABASE_ANON_KEY, { auth: { persistSession: false } })

const CHROME = [
  'C:/Program Files/Google/Chrome/Application/chrome.exe',
  'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
  'C:/Program Files/Microsoft/Edge/Application/msedge.exe',
].find((p) => fs.existsSync(p))

const EMAIL = 'portal-shot@example.invalid'
const PW = 'Shot-' + Math.random().toString(36).slice(2, 12)
const undo = []

const now = Date.now()
const day = (n) => new Date(now + n * 86400000).toISOString().slice(0, 10)

try {
  // ── Seed a build that looks like a real one mid-flight ────────────────────
  const { data: rows } = await svc.from('projects').select('id, data').limit(1)
  const projectId = rows[0].id
  const original = rows[0].data
  undo.push(async () => { await svc.from('projects').update({ data: original }).eq('id', projectId) })

  const seeded = {
    ...original,
    name: original.name ?? 'Your build',
    stage: 'design',
    stageHistory: [
      { stage: 'showroom', at: new Date(now - 62 * 86400000).toISOString() },
      { stage: 'site-assessment', at: new Date(now - 34 * 86400000).toISOString() },
      { stage: 'design', at: new Date(now - 9 * 86400000).toISOString() },
    ],
    stageDetail: {
      'showroom': { actualDate: day(-62) },
      'site-assessment': { actualDate: day(-34), notes: 'Access is tight at the driveway entrance — we\'ll bring the smaller crane. Slope is manageable; no retaining needed.' },
      'design': { targetDate: day(11), notes: 'Working drawings are with the engineer. We\'ll have the floor plan back to you for sign-off this week.' },
    },
    clientEmails: [EMAIL],
    docRequests: [
      { id: 'req_a', label: 'Certificate of Title', note: 'Or your contract of sale if settlement hasn\'t happened yet. We need to confirm who owns the block before we assess it.', stage: 'site-assessment', required: true, status: 'accepted', files: [{ id: 'f1', name: 'title-vol-11482.pdf', size: 284000, path: `projects/${projectId}/req_a/f1-title.pdf`, uploadedAt: new Date(now - 40 * 86400000).toISOString() }] },
      { id: 'req_b', label: 'Plan of subdivision or survey plan', note: 'Shows boundaries, easements and setbacks. Your conveyancer will have it.', stage: 'site-assessment', required: true, status: 'rejected', reviewNote: 'This came through as a photo of a screen and we can\'t read the easement dimensions. Could you send the PDF your conveyancer gave you?', files: [{ id: 'f2', name: 'IMG_4821.jpg', size: 3120000, path: `projects/${projectId}/req_b/f2-plan.jpg`, uploadedAt: new Date(now - 6 * 86400000).toISOString() }] },
      { id: 'req_c', label: 'Council property information', note: 'Planning overlays and zoning for your address. We\'ll tell you what to request if you\'re not sure.', stage: 'design', required: true, status: 'requested', files: [] },
      { id: 'req_d', label: 'Covenant or owners corporation rules', note: 'Only if your title carries one. These can restrict cladding, roof pitch or siting.', stage: 'design', required: false, status: 'requested', files: [] },
    ],
    approvals: [
      { id: 'apr_a', label: 'Floor plan sign-off', body: 'Confirm the floor plan, room sizes and window positions are what you want. Nothing goes to engineering until this is approved.', stage: 'design', status: 'pending' },
      { id: 'apr_b', label: 'Colours and finishes', body: 'Confirm your external cladding, roof, internal paint, flooring, benchtops and tapware selections.', stage: 'design', status: 'approved', approvedBy: 'Sarah Whitton', approvedAt: new Date(now - 3 * 86400000).toISOString() },
    ],
    sharedDocs: [
      { id: 'sd_a', label: 'Site assessment report', name: 'site-assessment.pdf', stage: 'site-assessment', size: 1840000, path: `projects/${projectId}/issued/sd_a.pdf`, addedAt: new Date(now - 30 * 86400000).toISOString() },
      { id: 'sd_b', label: 'Preliminary floor plan — rev C', name: 'floorplan-revC.pdf', stage: 'design', size: 920000, path: `projects/${projectId}/issued/sd_b.pdf`, addedAt: new Date(now - 4 * 86400000).toISOString() },
      { id: 'sd_c', label: 'Energy rating certificate', name: 'nathers.pdf', stage: 'design', size: 410000, path: `projects/${projectId}/issued/sd_c.pdf`, addedAt: new Date(now - 2 * 86400000).toISOString() },
    ],
    messages: [
      { id: 'm1', from: 'client', authorName: EMAIL, body: 'Is there any way to widen the deck by half a metre? Happy to pay the variation.', at: new Date(now - 5 * 86400000).toISOString() },
      { id: 'm2', from: 'team', authorName: 'Melissa', body: 'Yes — 500mm is within the module envelope so it doesn\'t affect transport. I\'ll price it and put it in front of you with the floor plan for sign-off.', at: new Date(now - 5 * 86400000 + 7200000).toISOString() },
    ],
  }
  await svc.from('projects').update({ data: seeded }).eq('id', projectId)

  // ── A signed-in customer ─────────────────────────────────────────────────
  const { data: mk } = await svc.auth.admin.createUser({ email: EMAIL, password: PW, email_confirm: true })
  undo.push(async () => { await svc.auth.admin.deleteUser(mk.user.id) })
  const { data: s } = await anon.auth.signInWithPassword({ email: EMAIL, password: PW })

  const browser = await puppeteer.launch({ executablePath: CHROME, headless: 'new', args: ['--no-sandbox'] })
  const shots = []

  for (const [name, width, height, url, seed] of [
    ['login-desktop', 1440, 900, `${BASE}/portal`, false],
    ['login-mobile', 420, 900, `${BASE}/portal`, false],
    ['build-desktop', 1440, 1000, `${BASE}/portal/${projectId}`, true],
    ['build-mobile', 420, 1000, `${BASE}/portal/${projectId}`, true],
  ]) {
    const page = await browser.newPage()
    await page.setViewport({ width, height, deviceScaleFactor: 2 })
    if (seed) {
      await page.goto(`${BASE}/portal`, { waitUntil: 'domcontentloaded' })
      await page.evaluate((k, v) => localStorage.setItem(k, v), `sb-${REF}-auth-token`, JSON.stringify(s.session))
    }
    await page.goto(url, { waitUntil: 'networkidle0', timeout: 60000 })
    await new Promise((r) => setTimeout(r, 1400))
    const file = path.join(OUT, `${name}.png`)
    await page.screenshot({ path: file, fullPage: seed })
    shots.push(file)
    // Anything running off the side of the page shows up here rather than in
    // a customer's browser.
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)
    console.log(`  ${name.padEnd(16)} ${overflow > 2 ? `!! ${overflow}px of horizontal overflow` : 'no horizontal overflow'}`)
    await page.close()
  }

  await browser.close()
  console.log('\n' + shots.join('\n'))
} finally {
  for (const fn of undo.reverse()) await fn().catch((e) => console.log('cleanup:', e.message))
  console.log('\ncleaned up')
}
