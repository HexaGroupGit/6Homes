// Verification for the pure logic the platform's correctness rests on:
// GST arithmetic, quote expiry, the nurture cadence, intent routing and the
// safe-mode email guard. None of it needs Supabase or Resend.
//
//   node --test test/
//
// The nurture cadence and the safe-mode guard are re-implementations of the
// rules in lead-nurture.js and _email.js rather than direct imports, because
// both are wrapped in handlers that require a live database. Where that is the
// case the test says so — if you change the rule, change it in both places.

import { test } from 'node:test'
import assert from 'node:assert/strict'

import { quoteTotals, quoteState, lineTotal, nextQuoteNumber, round2 } from '../src/lib/quoteMath.js'
import { BUILD_STAGES, stageIndex, isFinalStage, stageById } from '../src/lib/projectStages.js'
import { resolveIntent, INTENTS, daysBetween, notifyList, fillVars } from '../api/_leads.js'
import { renderPreview } from '../api/_preview.js'
import { ALL_EMAIL_TYPES } from '../src/lib/emailTypes.js'
import {
  canAccessProject, clientEmails, fileRejectionReason, projectPrefix, safeFileName,
  outstanding, byStage, DOC_LIBRARY, APPROVAL_LIBRARY, MAX_FILE_BYTES,
} from '../src/lib/portal.js'

// ── GST and totals ──────────────────────────────────────────────────────────
// Australian consumer pricing: line prices are GST-INCLUSIVE, so GST is backed
// out of the total (÷11), never added on top.

test('quoteTotals backs GST out of a GST-inclusive total', () => {
  const quote = { lineItems: [{ qty: 1, unitPrice: 220000 }], depositPercent: 10 }
  const t = quoteTotals(quote)
  assert.equal(t.total, 220000)
  assert.equal(t.gst, 20000, 'GST on $220,000 inc is $20,000, not $22,000')
  assert.equal(t.exGst, 200000)
  assert.equal(t.deposit, 22000)
  assert.equal(t.balance, 198000)
})

test('quoteTotals sums multiple lines and quantities', () => {
  const t = quoteTotals({
    lineItems: [
      { qty: 1, unitPrice: 180000 },
      { qty: 1, unitPrice: 22000 },
      { qty: 2, unitPrice: 5500 },
    ],
    depositPercent: 10,
  })
  assert.equal(t.total, 213000)
  assert.equal(round2(t.exGst + t.gst), t.total, 'ex-GST plus GST must reconcile to the total')
})

test('quoteTotals survives an empty or malformed quote', () => {
  assert.equal(quoteTotals({}).total, 0)
  assert.equal(quoteTotals({ lineItems: [{ qty: 'x', unitPrice: 'y' }] }).total, 0)
  assert.equal(lineTotal({ qty: 3, unitPrice: 10.005 }), 30.02)
})

test('deposit honours a non-default percentage', () => {
  assert.equal(quoteTotals({ lineItems: [{ qty: 1, unitPrice: 100000 }], depositPercent: 20 }).deposit, 20000)
})

// ── Quote state ─────────────────────────────────────────────────────────────

test('a sent quote stays actionable up to and including its valid-until date', () => {
  const quote = { status: 'sent', validUntil: '2026-06-15' }
  assert.equal(quoteState(quote, new Date('2026-06-14T23:00:00')), 'sent')
  assert.equal(quoteState(quote, new Date('2026-06-15T09:00:00')), 'sent', 'the last day is still a valid day')
  assert.equal(quoteState(quote, new Date('2026-06-16T00:01:00')), 'expired')
})

test('accepted and declined outrank expiry', () => {
  const past = { validUntil: '2020-01-01' }
  assert.equal(quoteState({ ...past, status: 'accepted' }), 'accepted')
  assert.equal(quoteState({ ...past, status: 'declined' }), 'declined')
  assert.equal(quoteState({ ...past, status: 'draft' }), 'draft')
})

test('a quote with no expiry never expires', () => {
  assert.equal(quoteState({ status: 'sent' }, new Date('2099-01-01')), 'sent')
})

test('quote numbers increment and survive gaps', () => {
  assert.equal(nextQuoteNumber([]), 'QUO-0001')
  assert.equal(nextQuoteNumber([{ number: 'QUO-0001' }, { number: 'QUO-0007' }]), 'QUO-0008')
  assert.equal(nextQuoteNumber([{ number: null }, { number: 'QUO-0003' }]), 'QUO-0004')
})

// ── Intent routing ──────────────────────────────────────────────────────────

test('every intent maps to a template the CRM can override', () => {
  for (const [key, intent] of Object.entries(INTENTS)) {
    assert.ok(intent.emailType, `${key} needs an emailType`)
    assert.equal(typeof intent.build, 'function', `${key} needs a default builder`)
    assert.ok(intent.label, `${key} needs a label`)
  }
})

test('resolveIntent accepts exact keys', () => {
  for (const key of Object.keys(INTENTS)) assert.equal(resolveIntent(key), key)
})

test('resolveIntent tolerates the labels a form might send instead', () => {
  assert.equal(resolveIntent('Price List'), 'pricelist')
  assert.equal(resolveIntent('pricing'), 'pricelist')
  assert.equal(resolveIntent('Brochure'), 'brochure')
  assert.equal(resolveIntent('Book a consultation'), 'consultation')
  assert.equal(resolveIntent('showroom visit'), 'tour')
  assert.equal(resolveIntent('Commercial / multi-unit'), 'commercial')
})

test('resolveIntent falls back rather than throwing on junk', () => {
  assert.equal(resolveIntent(undefined), 'domestic')
  assert.equal(resolveIntent(''), 'domestic')
  assert.equal(resolveIntent('¯\\_(ツ)_/¯'), 'domestic')
})

test('only the two download intents attach a PDF', () => {
  assert.equal(INTENTS.brochure.attach, 'brochure')
  assert.equal(INTENTS.pricelist.attach, 'pricelist')
  assert.equal(INTENTS.commercial.attach, 'commercial')
  assert.equal(INTENTS.consultation.attach, null)
  assert.equal(INTENTS.tour.attach, null)
})

// ── Template variables ──────────────────────────────────────────────────────

test('fillVars substitutes known keys and leaves unknown ones alone', () => {
  assert.equal(fillVars('Hi {{firstName}}, about the {{design}}', { firstName: 'Jo', design: 'Selina' }), 'Hi Jo, about the Selina')
  assert.equal(fillVars('{{nope}}', {}), '{{nope}}', 'an unknown placeholder stays visible rather than becoming "undefined"')
  assert.equal(fillVars('{{blank}}', { blank: '' }), '', 'a known-but-empty variable resolves to empty')
})

test('notifyList always yields at least one recipient', () => {
  assert.deepEqual(notifyList({ emails: { notify: ['a@x.com', 'b@x.com'] } }), ['a@x.com', 'b@x.com'])
  assert.deepEqual(notifyList({ emails: { notify: [] } }), ['melissa@6homes.com'])
  assert.deepEqual(notifyList({}), ['melissa@6homes.com'])
  assert.deepEqual(notifyList({ emails: { notify: 'solo@x.com' } }), ['solo@x.com'], 'a bare string is tolerated')
})

// ── Nurture cadence ─────────────────────────────────────────────────────────
// Mirrors the rule in api/lead-nurture.js.

const STEPS = [
  { id: 'd2', afterDays: 2 },
  { id: 'd5', afterDays: 5 },
  { id: 'd9', afterDays: 9 },
]
const dueStep = (age, sent) => STEPS.filter((s) => age >= s.afterDays && !sent.includes(s.id)).pop() ?? null

test('the follow-up sequence fires on days 2, 5 and 9', () => {
  assert.equal(dueStep(2, [])?.id, 'd2')
  assert.equal(dueStep(5, ['d2'])?.id, 'd5')
  assert.equal(dueStep(9, ['d2', 'd5'])?.id, 'd9')
})

test('nothing is sent before day 2, or on a day with no step', () => {
  assert.equal(dueStep(0, []), null)
  assert.equal(dueStep(1, []), null)
  assert.equal(dueStep(3, ['d2']), null)
  assert.equal(dueStep(8, ['d2', 'd5']), null)
})

test('re-running the cron the same day sends nothing', () => {
  assert.equal(dueStep(5, ['d2', 'd5']), null)
  assert.equal(dueStep(9, ['d2', 'd5', 'd9']), null)
})

test('a lead the cron missed gets the step it is due, not a backlog', () => {
  // Nine days old with nothing sent: one final email, not three at once.
  const step = dueStep(9, [])
  assert.equal(step?.id, 'd9')
})

test('daysBetween counts whole days regardless of the time of day', () => {
  assert.equal(daysBetween('2026-03-01T23:50:00', '2026-03-03T00:10:00'), 2)
  assert.equal(daysBetween('2026-03-01T00:00:00', '2026-03-01T23:59:00'), 0)
})

// ── Safe mode ───────────────────────────────────────────────────────────────
// Mirrors the guard in api/_email.js. Safe mode is ON unless explicitly false —
// this is what stops a customer receiving anything before launch.

const safeModeOn = (emails) => (emails?.safeMode ?? true) !== false

test('safe mode is on by default and stays on unless explicitly disabled', () => {
  assert.equal(safeModeOn(undefined), true, 'no settings at all must fail safe')
  assert.equal(safeModeOn({}), true)
  assert.equal(safeModeOn({ safeMode: true }), true)
  assert.equal(safeModeOn({ safeMode: 'false' }), true, 'a string is not the boolean false')
  assert.equal(safeModeOn({ safeMode: 0 }), true, 'a falsy non-false value must not open the gate')
  assert.equal(safeModeOn({ safeMode: null }), true)
  assert.equal(safeModeOn({ safeMode: false }), false, 'only an explicit false turns it off')
})

const suppressed = (list, addr) =>
  list.map((a) => String(a).toLowerCase().trim()).includes(String(addr ?? '').toLowerCase().trim())

test('the suppression list is case- and whitespace-insensitive', () => {
  const list = [' Gone@Example.COM ', 'other@example.com']
  assert.equal(suppressed(list, 'gone@example.com'), true)
  assert.equal(suppressed(list, 'GONE@EXAMPLE.COM'), true)
  assert.equal(suppressed(list, '  gone@example.com  '), true)
  assert.equal(suppressed(list, 'someone@example.com'), false)
  assert.equal(suppressed(list, undefined), false)
})

// ── Build stages ────────────────────────────────────────────────────────────

test('the build stages match the six the website publishes', () => {
  assert.equal(BUILD_STAGES.length, 6)
  assert.deepEqual(
    BUILD_STAGES.map((s) => s.id),
    ['showroom', 'site-assessment', 'design', 'order', 'manufacture', 'install']
  )
})

test('every stage carries the copy its customer email needs', () => {
  for (const s of BUILD_STAGES) {
    assert.ok(s.email?.subject, `${s.id} needs an email subject`)
    assert.ok(s.email?.heading, `${s.id} needs an email heading`)
    assert.ok(s.email?.body, `${s.id} needs an email body`)
  }
})

test('stage lookups behave at the edges', () => {
  assert.equal(stageIndex('showroom'), 0)
  assert.equal(stageIndex('nonsense'), -1)
  assert.equal(isFinalStage('install'), true)
  assert.equal(isFinalStage('manufacture'), false)
  assert.equal(stageById('nonsense'), null)
})

// ── Template preview ────────────────────────────────────────────────────────
// The Templates screen renders through api/_preview.js. These lock down the
// contract that makes the preview trustworthy: every type the editor offers has
// a builder behind it, and a draft is resolved the same way a real send would
// resolve a saved template.

test('every email type the editor offers can actually be rendered', () => {
  for (const t of ALL_EMAIL_TYPES) {
    const r = renderPreview({ emailType: t.type, settings: {} })
    assert.ok(r, `${t.type} is offered in the editor but has no builder behind it`)
    assert.ok(r.subject, `${t.type} rendered without a subject`)
    assert.ok(r.html.includes('<html'), `${t.type} rendered without the branded frame`)
  }
})

test('an empty draft previews the built-in, a filled one previews the override', () => {
  const builtIn = renderPreview({ emailType: 'lead_consultation', content: '   ', settings: {} })
  assert.equal(builtIn.usingDraft, false)
  assert.match(builtIn.subject, /consultation/i)

  const draft = renderPreview({
    emailType: 'lead_consultation',
    subject: 'A word, {{firstName}}',
    content: '<p>About the {{design}}.</p>',
    settings: {},
  })
  assert.equal(draft.usingDraft, true)
  assert.equal(draft.subject, 'A word, Sarah', 'placeholders must fill in the subject too')
  assert.match(draft.html, /About the The Yarra 3B\./)
})

test('preview placeholders resolve for build-stage emails as well as leads', () => {
  const r = renderPreview({
    emailType: 'project_stage_manufacture',
    subject: '{{project}} — {{stage}}',
    content: '<p>Hi {{firstName}}, {{company}} here.</p>',
    settings: { company: { name: '6Homes' } },
  })
  assert.equal(r.subject, 'Whitfield residence — Manufacture')
  assert.match(r.html, /Hi Sarah, 6Homes here\./)
})

test('an unrecognised template type previews as nothing rather than throwing', () => {
  assert.equal(renderPreview({ emailType: 'project_stage_nonsense', settings: {} }), null)
  assert.equal(renderPreview({ emailType: 'not_an_email', settings: {} }), null)
})

// ── Client portal ───────────────────────────────────────────────────────────
// The access check and the upload guard are the two places where a mistake is
// a disclosure rather than a bug, so they get pinned here.

test('portal access is by exact address, case and whitespace insensitive', () => {
  const project = { clientEmails: ['  Jane.Doe@Example.COM ', 'partner@example.com'] }

  assert.equal(canAccessProject(project, 'jane.doe@example.com'), true)
  assert.equal(canAccessProject(project, 'JANE.DOE@EXAMPLE.COM'), true)
  assert.equal(canAccessProject(project, '  jane.doe@example.com  '), true)
  assert.equal(canAccessProject(project, 'partner@example.com'), true)

  assert.equal(canAccessProject(project, 'jane.doe@example.com.attacker.net'), false)
  assert.equal(canAccessProject(project, 'example.com'), false)
  assert.equal(canAccessProject(project, ''), false)
  assert.equal(canAccessProject(project, null), false)
})

test('a project with nobody invited lets nobody in', () => {
  for (const project of [{}, { clientEmails: [] }, { clientEmails: null }, { clientEmails: [''] }]) {
    assert.equal(canAccessProject(project, 'anyone@example.com'), false)
    assert.deepEqual(clientEmails(project), [])
  }
})

test('clientEmails dedupes and normalises so one person is one entry', () => {
  const project = { clientEmails: ['Jane@Example.com', 'jane@example.com', ' JANE@EXAMPLE.COM'] }
  assert.deepEqual(clientEmails(project), ['jane@example.com'])
})

test('uploads are refused by extension, not by what the browser claims', () => {
  const ok = (name, size = 1000) => fileRejectionReason({ name, size })

  assert.equal(ok('title.pdf'), null)
  assert.equal(ok('site.JPG'), null, 'extension matching is case-insensitive')
  assert.equal(ok('survey.docx'), null)

  // The things that make a private bucket into someone else's problem.
  for (const bad of ['payload.html', 'run.exe', 'shell.sh', 'index.svg', 'noextension']) {
    assert.match(ok(bad) ?? '', /can't accept/, `${bad} should be refused`)
  }
})

test('an oversized file is refused with a size the customer can act on', () => {
  const reason = fileRejectionReason({ name: 'plans.pdf', size: 40 * 1024 * 1024 })
  assert.match(reason, /40\.0 MB/)
  assert.match(reason, /limit is 25 MB/)
  // Exactly at the limit is allowed; a byte over is not.
  assert.equal(fileRejectionReason({ name: 'plans.pdf', size: MAX_FILE_BYTES }), null)
  assert.notEqual(fileRejectionReason({ name: 'plans.pdf', size: MAX_FILE_BYTES + 1 }), null)
})

test('a storage prefix belongs to exactly one project', () => {
  const a = projectPrefix('proj_alpha')
  // The guard the attach and download paths rely on. `proj_alpha2` must not
  // pass a startsWith check against `proj_alpha`.
  assert.equal(`${a}req_1/file.pdf`.startsWith(a), true)
  assert.equal(projectPrefix('proj_alpha2').startsWith(a), false, 'a longer id must not match a shorter one')
  assert.equal('projects/proj_beta/req_1/file.pdf'.startsWith(a), false)
  assert.equal('../projects/proj_alpha/x.pdf'.startsWith(a), false)
})

test('a filename cannot escape its folder or carry anything but a name', () => {
  assert.equal(safeFileName('../../etc/passwd').includes('/'), false)
  // Written with a char code because a raw template cannot end in a backslash.
  const bs = String.fromCharCode(92)
  assert.equal(safeFileName(`..${bs}..${bs}windows${bs}system32`).includes(bs), false)
  assert.equal(safeFileName('my title deed (final).pdf'), 'my-title-deed-final-.pdf')
  assert.equal(safeFileName(''), 'file')
  assert.equal(safeFileName('x'.repeat(400)).length <= 90, true)
})

test('outstanding counts what the customer owes us, and nothing else', () => {
  const project = {
    docRequests: [
      { id: 'a', status: 'requested' },
      { id: 'b', status: 'rejected' },   // sent back — still theirs to do
      { id: 'c', status: 'uploaded' },   // with us
      { id: 'd', status: 'accepted' },   // done
    ],
    approvals: [{ id: 'e', status: 'pending' }, { id: 'f', status: 'approved' }],
  }
  const o = outstanding(project)
  assert.deepEqual(o.docs.map((d) => d.id), ['a', 'b'])
  assert.deepEqual(o.approvals.map((a) => a.id), ['e'])
  assert.equal(o.total, 3)

  assert.equal(outstanding({}).total, 0, 'a build with nothing set up owes nothing')
})

test('portal lists sort into build order, not insertion order', () => {
  const items = [
    { id: '1', stage: 'install' },
    { id: '2', stage: 'site-assessment' },
    { id: '3', stage: null },
    { id: '4', stage: 'design' },
  ]
  assert.deepEqual(byStage(items).map((i) => i.id), ['3', '2', '4', '1'])
})

test('every document and approval in the library names a real build stage', () => {
  for (const group of [...DOC_LIBRARY, ...APPROVAL_LIBRARY]) {
    assert.ok(stageById(group.stage), `${group.stage} is not a build stage`)
    for (const item of group.items) {
      assert.ok(item.label?.trim(), 'every item needs a label')
      assert.ok((item.note ?? item.body ?? '').trim(), `"${item.label}" needs to explain itself to the customer`)
    }
  }
})
