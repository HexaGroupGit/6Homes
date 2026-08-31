import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { Check, X } from 'lucide-react'
import { PublicShell, PublicCard, PublicMessage } from './PublicShell.jsx'
import { fmtDate, fmtMoney, mediaUrl } from '../lib/utils.js'
import { lineTotal } from '../lib/quoteMath.js'

// The customer-facing quote page. Authenticates by the token in the URL — no
// account, no password. Everything comes from /api/quote, which returns an
// allow-listed projection.

export default function QuoteAccept() {
  const { token } = useParams()
  const [data, setData] = useState(null)
  const [loadError, setLoadError] = useState('')
  const [busy, setBusy] = useState('')
  const [error, setError] = useState('')
  const [declining, setDeclining] = useState(false)
  const [reason, setReason] = useState('')
  const [signerName, setSignerName] = useState('')
  const [done, setDone] = useState(null) // 'accepted' | 'declined'
  const [signToken, setSignToken] = useState(null)

  useEffect(() => {
    let active = true
    fetch(`/api/quote?token=${encodeURIComponent(token)}`)
      .then(async (r) => {
        const body = await r.json().catch(() => ({}))
        if (!active) return
        if (!r.ok) return setLoadError(body.error || 'This quote link is not valid.')
        setData(body)
        setSignToken(body.signToken ?? null)
        setSignerName(body.quote?.customerName ?? '')
      })
      .catch(() => active && setLoadError('Could not load this quote. Please check your connection and try again.'))
    return () => { active = false }
  }, [token])

  if (loadError) {
    return (
      <PublicMessage title="This link isn't valid">
        {loadError} If you think this is a mistake, call us on{' '}
        <a href="tel:1800646637" className="text-brand-600 hover:underline">1800 6HOMES</a> and we'll sort it out.
      </PublicMessage>
    )
  }
  if (!data) return <PublicMessage title="Loading your quote…">One moment.</PublicMessage>

  const q = data.quote
  const accepted = done === 'accepted' || q.status === 'accepted'
  const declined = done === 'declined' || q.status === 'declined'
  const expired = q.status === 'expired'

  async function accept() {
    if (!signerName.trim()) return setError('Please type your full name to accept.')
    setBusy('accept'); setError('')
    try {
      const r = await fetch('/api/quote-accept', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, acceptedBy: signerName.trim() }),
      })
      const body = await r.json().catch(() => ({}))
      if (!r.ok) throw new Error(body.error || 'Could not accept this quote.')
      setSignToken(body.signToken ?? null)
      setDone('accepted')
    } catch (err) {
      setError(err.message)
    } finally {
      setBusy('')
    }
  }

  async function decline() {
    setBusy('decline'); setError('')
    try {
      const r = await fetch('/api/quote-decline', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, reason: reason.trim() }),
      })
      const body = await r.json().catch(() => ({}))
      if (!r.ok) throw new Error(body.error || 'Could not record that.')
      setDone('declined')
    } catch (err) {
      setError(err.message)
    } finally {
      setBusy('')
    }
  }

  // ── Outcome states ────────────────────────────────────────────────────────
  if (accepted) {
    return (
      <PublicShell>
        <PublicCard>
          <div className="mb-4 grid size-11 place-items-center rounded-full bg-emerald-100">
            <Check size={22} className="text-emerald-700" />
          </div>
          <h1 className="text-xl font-semibold text-navy">Quote {q.number} accepted</h1>
          <p className="mt-2 text-sm leading-relaxed text-mute">
            Thank you. Your build contract has been prepared and emailed to you — the last step is reading and signing
            it, which takes a minute and doesn't need printing.
          </p>
          {signToken && (
            <a href={`/sign/${signToken}`} className="btn-primary mt-6 w-full sm:w-auto">Read and sign your contract</a>
          )}
        </PublicCard>
      </PublicShell>
    )
  }

  if (declined) {
    return (
      <PublicMessage title="Thanks for letting us know">
        We've recorded that quote {q.number} isn't going ahead, and you won't hear from us about it again. If anything
        changes, or you'd like a different home priced, just reply to our email — everything stays on file.
      </PublicMessage>
    )
  }

  // ── The quote ─────────────────────────────────────────────────────────────
  return (
    <PublicShell>
      <PublicCard>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <div className="text-[11px] font-semibold tracking-[0.2em] text-brand-600 uppercase">Your quote</div>
            <h1 className="mt-1.5 text-xl font-semibold text-navy">{q.number}</h1>
            {q.customerName && <p className="mt-1 text-sm text-mute">Prepared for {q.customerName}</p>}
          </div>
          {q.validUntil && (
            <div className="text-right text-xs text-mute">
              Valid until<br />
              <span className="text-sm font-medium text-ink">{fmtDate(q.validUntil)}</span>
            </div>
          )}
        </div>

        {q.design && (
          <div className="mt-6 overflow-hidden rounded-lg border border-hair">
            {q.design.heroImage && <img src={mediaUrl(q.design.heroImage)} alt={q.design.name} className="aspect-[16/9] w-full object-cover" />}
            <div className="px-5 py-4">
              <div className="font-medium text-navy">{q.design.name}</div>
              <div className="mt-0.5 text-xs tracking-wide text-mute uppercase">
                {[q.design.bedrooms && `${q.design.bedrooms} bed`, q.design.bathrooms && `${q.design.bathrooms} bath`, q.design.areaSqm && `${q.design.areaSqm} m²`]
                  .filter(Boolean).join('  ·  ')}
              </div>
            </div>
          </div>
        )}

        <div className="mt-7 overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-hair text-left text-xs tracking-wide text-mute uppercase">
                <th className="py-2.5 font-medium">Description</th>
                <th className="py-2.5 text-right font-medium">Qty</th>
                <th className="py-2.5 text-right font-medium">Amount</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-hair">
              {q.lineItems.map((i, idx) => (
                <tr key={idx}>
                  <td className="py-3 pr-4">{i.description}</td>
                  <td className="py-3 text-right text-mute">{i.qty}</td>
                  <td className="py-3 text-right">{fmtMoney(lineTotal(i))}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <dl className="mt-5 space-y-1.5 border-t border-hair pt-4 text-sm">
          <div className="flex justify-between"><dt className="text-mute">Subtotal (ex GST)</dt><dd>{fmtMoney(q.totals.exGst)}</dd></div>
          <div className="flex justify-between"><dt className="text-mute">GST</dt><dd>{fmtMoney(q.totals.gst)}</dd></div>
          <div className="flex justify-between border-t border-hair pt-2 text-lg font-semibold text-navy">
            <dt>Total</dt><dd>{fmtMoney(q.totals.total)}</dd>
          </div>
          <div className="flex justify-between pt-1"><dt className="text-mute">Deposit on signing ({q.depositPercent}%)</dt><dd>{fmtMoney(q.totals.deposit)}</dd></div>
        </dl>

        {q.notes && (
          <div className="mt-6 rounded-lg bg-brand-50 px-5 py-4">
            <div className="text-xs font-semibold tracking-wide text-navy uppercase">Notes</div>
            <p className="mt-1.5 text-sm leading-relaxed whitespace-pre-wrap text-mute">{q.notes}</p>
          </div>
        )}

        {q.terms && (
          <details className="mt-4">
            <summary className="cursor-pointer text-sm text-brand-600 hover:underline">Read the terms</summary>
            <p className="mt-2 text-xs leading-relaxed whitespace-pre-wrap text-mute">{q.terms}</p>
          </details>
        )}

        {expired ? (
          <div className="mt-7 rounded-lg bg-amber-50 px-5 py-4 text-sm text-amber-900">
            This quote passed its valid-until date. Get in touch and we'll send you an updated one — prices move, and we
            won't hold you to an old number either way.
          </div>
        ) : (
          <div className="mt-8 border-t border-hair pt-7">
            {error && <p className="mb-4 text-sm text-red-600">{error}</p>}

            {declining ? (
              <div>
                <label className="label" htmlFor="reason">Anything you'd like to tell us? (optional)</label>
                <textarea
                  id="reason"
                  className="field min-h-24 resize-y"
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  placeholder="Went with another builder, timing changed, over budget…"
                />
                <p className="mt-1.5 text-xs text-mute">
                  Genuinely useful to us, and it stops any further emails about this quote.
                </p>
                <div className="mt-4 flex flex-col gap-2 sm:flex-row">
                  <button className="btn-secondary sm:flex-1" onClick={() => setDeclining(false)}>Back</button>
                  <button className="btn-primary bg-red-600 hover:bg-red-700 sm:flex-1" onClick={decline} disabled={!!busy}>
                    {busy === 'decline' ? 'Sending…' : 'Confirm — not going ahead'}
                  </button>
                </div>
              </div>
            ) : (
              <div>
                <label className="label" htmlFor="signer">Type your full name to accept</label>
                <input
                  id="signer"
                  className="field max-w-sm"
                  value={signerName}
                  onChange={(e) => setSignerName(e.target.value)}
                  placeholder="Your full name"
                />
                <p className="mt-2 text-xs leading-relaxed text-mute">
                  Accepting generates your build contract for signature. It doesn't take payment, and you can still ask
                  us anything before you sign.
                </p>
                <div className="mt-5 flex flex-col gap-2 sm:flex-row">
                  <button className="btn-primary sm:flex-1" onClick={accept} disabled={!!busy}>
                    <Check size={16} /> {busy === 'accept' ? 'Accepting…' : 'Accept this quote'}
                  </button>
                  <button className="btn-secondary sm:w-auto" onClick={() => setDeclining(true)} disabled={!!busy}>
                    <X size={16} /> Not going ahead
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </PublicCard>
    </PublicShell>
  )
}
