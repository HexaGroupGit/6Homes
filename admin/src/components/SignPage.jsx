import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { Check } from 'lucide-react'
import { PublicShell, PublicCard, PublicMessage } from './PublicShell.jsx'
import SignatureCanvas from './SignatureCanvas.jsx'
import { fmtDate } from '../lib/utils.js'

// The customer's contract signing page. Token-addressed, no account.
//
// The contract body is rendered from the HTML frozen at acceptance time — we
// inject it as-is because we generated it ourselves in api/_contract.js, and it
// is the exact document the signature will attest to.

export default function SignPage() {
  const { token } = useParams()
  const [data, setData] = useState(null)
  const [loadError, setLoadError] = useState('')
  const [name, setName] = useState('')
  const [signature, setSignature] = useState(null)
  const [agreed, setAgreed] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [signed, setSigned] = useState(false)

  useEffect(() => {
    let active = true
    fetch(`/api/sign/load?token=${encodeURIComponent(token)}`)
      .then(async (r) => {
        const body = await r.json().catch(() => ({}))
        if (!active) return
        if (!r.ok) return setLoadError(body.error || 'This signing link is not valid.')
        setData(body)
        setName(body.contract?.customerName ?? '')
        if (body.signature?.customerSignedAt) setSigned(true)
      })
      .catch(() => active && setLoadError('Could not load this contract. Please check your connection and try again.'))
    return () => { active = false }
  }, [token])

  if (loadError) {
    return (
      <PublicMessage title="This link isn't valid">
        {loadError} Call us on <a href="tel:1800646637" className="text-brand-600 hover:underline">1800 6HOMES</a> and
        we'll send you a fresh one.
      </PublicMessage>
    )
  }
  if (!data) return <PublicMessage title="Loading your contract…">One moment.</PublicMessage>

  async function submit() {
    setBusy(true); setError('')
    try {
      const r = await fetch('/api/sign/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, signerName: name.trim(), signatureData: signature }),
      })
      const body = await r.json().catch(() => ({}))
      if (!r.ok) throw new Error(body.error || 'Could not record your signature.')
      setSigned(true)
      window.scrollTo({ top: 0, behavior: 'smooth' })
    } catch (err) {
      setError(err.message)
    } finally {
      setBusy(false)
    }
  }

  const fullySigned = !!data.signature?.companySignedAt

  if (signed) {
    return (
      <PublicShell>
        <PublicCard>
          <div className="mb-4 grid size-11 place-items-center rounded-full bg-emerald-100">
            <Check size={22} className="text-emerald-700" />
          </div>
          <h1 className="text-xl font-semibold text-navy">
            {fullySigned ? 'Signed by both parties' : 'Thank you — your contract is signed'}
          </h1>
          <p className="mt-2 text-sm leading-relaxed text-mute">
            {fullySigned
              ? `Contract ${data.contract.number} is fully executed. A copy has been emailed to you.`
              : `We've recorded your signature on contract ${data.contract.number}. Our team will countersign it shortly and email you a copy.`}
          </p>
          <p className="mt-4 text-sm leading-relaxed text-mute">
            Next: we'll send your deposit invoice. Once that's received your production slot is booked, and we'll email
            you as your build reaches each stage.
          </p>
        </PublicCard>
      </PublicShell>
    )
  }

  return (
    <PublicShell footerNote={
      <>Not sure about something in here? Call{' '}
        <a href="tel:1800646637" className="text-brand-600 hover:underline">1800 6HOMES (646 637)</a>{' '}
        before you sign — we'd much rather explain it now.</>
    }>
      <PublicCard>
        <div className="text-[11px] font-semibold tracking-[0.2em] text-brand-600 uppercase">Your contract</div>
        <h1 className="mt-1.5 text-xl font-semibold text-navy">{data.contract.number}</h1>
        <p className="mt-1 text-sm text-mute">Prepared {fmtDate(data.contract.createdAt)}</p>

        <div
          className="prose-sm mt-7 max-h-[28rem] overflow-y-auto rounded-lg border border-hair bg-brand-50/40 p-6"
          // Trusted: this HTML was generated server-side by api/_contract.js from
          // our own template, never from customer input.
          dangerouslySetInnerHTML={{ __html: data.contract.body }}
        />

        <div className="mt-8 border-t border-hair pt-7">
          {error && <p className="mb-4 text-sm text-red-600">{error}</p>}

          <div className="max-w-sm">
            <label className="label" htmlFor="name">Your full name</label>
            <input id="name" className="field" value={name} onChange={(e) => setName(e.target.value)} />
          </div>

          <div className="mt-5 max-w-md">
            <span className="label">Signature</span>
            <SignatureCanvas onChange={setSignature} />
          </div>

          <label className="mt-5 flex max-w-xl cursor-pointer items-start gap-2.5 text-sm">
            <input type="checkbox" className="mt-0.5" checked={agreed} onChange={(e) => setAgreed(e.target.checked)} />
            <span className="leading-relaxed text-mute">
              I have read this contract, I've had the chance to get independent advice, and I agree to be bound by it.
            </span>
          </label>

          <button
            className="btn-primary mt-6 w-full sm:w-auto"
            onClick={submit}
            disabled={busy || !name.trim() || !signature || !agreed}
          >
            {busy ? 'Signing…' : 'Sign the contract'}
          </button>
        </div>
      </PublicCard>
    </PublicShell>
  )
}
