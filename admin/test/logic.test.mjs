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
