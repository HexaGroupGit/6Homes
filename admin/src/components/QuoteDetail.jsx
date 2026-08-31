import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { ArrowLeft, Download, Send, Plus, Trash2, Copy, PenLine } from 'lucide-react'
import { useStore } from '../store/useStore.jsx'
import { apiPost } from '../lib/apiFetch.js'
import { PageHeader, Field, Badge, Modal } from './ui.jsx'
import { fmtDate, fmtDateTime, fmtMoney, newId } from '../lib/utils.js'
import { quoteTotals, quoteState, lineTotal } from '../lib/quoteMath.js'
import SignatureCanvas from './SignatureCanvas.jsx'

const TONE = { draft: 'neutral', sent: 'blue', accepted: 'green', declined: 'red', expired: 'amber' }

export default function QuoteDetail() {
  const { id } = useParams()
  const { quotes, contracts, designs, settings, update } = useStore()

  const quote = quotes.find((q) => q.id === id)
  const contract = contracts.find((c) => c.quoteId === id)

  const [form, setForm] = useState(null)
  const [busy, setBusy] = useState('')
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [sendOpen, setSendOpen] = useState(false)
  const [signOpen, setSignOpen] = useState(false)
  const [signerName, setSignerName] = useState('')
  const [signature, setSignature] = useState(null)

  useEffect(() => { if (quote) setForm({ ...quote }) }, [quote?.id]) // eslint-disable-line react-hooks/exhaustive-deps

  if (!quote) {
    return (
      <div className="p-8">
        <p className="text-sm text-mute">That quote no longer exists.</p>
        <Link to="/quotes" className="mt-2 inline-block text-sm text-brand-600 hover:underline">Back to quotes</Link>
      </div>
    )
  }
  if (!form) return <div className="p-8 text-sm text-mute">Loading…</div>

  const state = quoteState(quote)
  const locked = state === 'accepted' || state === 'declined'
  const totals = quoteTotals(form)
  const design = designs.find((d) => d.id === form.designId)

  const set = (patch) => { setForm((f) => ({ ...f, ...patch })); setNotice('') }
  const run = async (key, fn) => {
    setBusy(key); setError(''); setNotice('')
    try { await fn() } catch (err) { setError(err.message) } finally { setBusy('') }
  }

  const setItem = (itemId, patch) =>
    set({ lineItems: form.lineItems.map((i) => (i.id === itemId ? { ...i, ...patch } : i)) })

  const addItem = () =>
    set({ lineItems: [...form.lineItems, { id: newId('li'), description: '', qty: 1, unitPrice: 0 }] })

  const removeItem = (itemId) => set({ lineItems: form.lineItems.filter((i) => i.id !== itemId) })

  const save = () => run('save', async () => {
    await update('quotes', id, {
      ...form,
      lineItems: form.lineItems.map((i) => ({ ...i, qty: Number(i.qty) || 0, unitPrice: Number(i.unitPrice) || 0 })),
      depositPercent: Number(form.depositPercent) || 0,
    })
    setNotice('Saved.')
  })

  // Save first, then send — otherwise the PDF the customer receives is built
  // from unsaved edits that nobody else can see.
  const send = () => run('send', async () => {
    await save()
    const { quotePdfBase64 } = await import('../lib/quotePdf.js')
    const pdfBase64 = quotePdfBase64({ quote: form, settings })
    const r = await apiPost('/api/quote-send', { quoteId: id, pdfBase64 })
    setSendOpen(false)
    setNotice(`Sent to ${form.customerEmail}. Accept link: ${r.url}`)
  })

  const countersign = () => run('countersign', async () => {
    await apiPost('/api/contract-countersign', { contractId: contract.id, signerName, signatureData: signature })
    setSignOpen(false)
    setSignerName('')
    setSignature(null)
    setNotice('Countersigned. The customer has been emailed a confirmation.')
  })

  const copyLink = () => {
    navigator.clipboard.writeText(`${window.location.origin}/quote/${quote.token}`)
    setNotice('Accept link copied.')
  }

  return (
    <>
      <PageHeader title={quote.number} subtitle={[form.customerName, form.designName].filter(Boolean).join(' · ')}>
        <Link to="/quotes" className="btn-secondary"><ArrowLeft size={15} /> Back</Link>
        <button className="btn-secondary" onClick={() => run('pdf', async () => {
          const { downloadQuotePdf } = await import('../lib/quotePdf.js')
          downloadQuotePdf({ quote: form, settings })
        })} disabled={busy === 'pdf'}>
          <Download size={15} /> PDF
        </button>
        {quote.token && (
          <button className="btn-secondary" onClick={copyLink}><Copy size={15} /> Copy link</button>
        )}
        {!locked && (
          <>
            <button className="btn-secondary" onClick={save} disabled={!!busy}>
              {busy === 'save' ? 'Saving…' : 'Save'}
            </button>
            <button className="btn-primary" onClick={() => setSendOpen(true)} disabled={!!busy || !form.customerEmail}>
              <Send size={15} /> {state === 'sent' ? 'Resend' : 'Send'}
            </button>
          </>
        )}
      </PageHeader>

      {error && <div className="bg-red-50 px-7 py-2 text-sm text-red-700">{error}</div>}
      {notice && <div className="bg-emerald-50 px-7 py-2 text-sm break-all text-emerald-800">{notice}</div>}

      <div className="grid gap-6 p-7 lg:grid-cols-3">
        <div className="space-y-5 lg:col-span-2">
          <div className="card space-y-4 p-5">
            <div className="flex items-center justify-between">
              <h2 className="text-xs tracking-wide text-mute uppercase">Customer</h2>
              <Badge tone={TONE[state]}>{state}</Badge>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Name"><input className="field" disabled={locked} value={form.customerName ?? ''} onChange={(e) => set({ customerName: e.target.value })} /></Field>
              <Field label="Email"><input className="field" disabled={locked} value={form.customerEmail ?? ''} onChange={(e) => set({ customerEmail: e.target.value })} /></Field>
              <Field label="Phone"><input className="field" disabled={locked} value={form.customerPhone ?? ''} onChange={(e) => set({ customerPhone: e.target.value })} /></Field>
              <Field label="Site address"><input className="field" disabled={locked} value={form.siteAddress ?? ''} onChange={(e) => set({ siteAddress: e.target.value })} /></Field>
            </div>
          </div>

          <div className="card p-5">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-xs tracking-wide text-mute uppercase">Line items</h2>
              <span className="text-xs text-mute">Prices include GST</span>
            </div>

            <div className="space-y-2">
              {form.lineItems.map((i) => (
                <div key={i.id} className="grid grid-cols-[1fr_60px_110px_100px_32px] items-center gap-2">
                  <input
                    className="field" disabled={locked} placeholder="Description"
                    value={i.description ?? ''} onChange={(e) => setItem(i.id, { description: e.target.value })}
                  />
                  <input
                    type="number" min="0" className="field text-right" disabled={locked}
                    value={i.qty ?? 1} onChange={(e) => setItem(i.id, { qty: e.target.value })}
                  />
                  <input
                    type="number" min="0" className="field text-right" disabled={locked}
                    value={i.unitPrice ?? 0} onChange={(e) => setItem(i.id, { unitPrice: e.target.value })}
                  />
                  <div className="text-right text-sm">{fmtMoney(lineTotal(i))}</div>
                  {!locked && (
                    <button className="btn-ghost px-1" onClick={() => removeItem(i.id)} aria-label="Remove line">
                      <Trash2 size={14} />
                    </button>
                  )}
                </div>
              ))}
            </div>

            {!locked && (
              <button className="btn-secondary mt-3 text-xs" onClick={addItem}><Plus size={14} /> Add a line</button>
            )}

            <dl className="mt-5 space-y-1.5 border-t border-hair pt-4 text-sm">
              <div className="flex justify-between"><dt className="text-mute">Subtotal (ex GST)</dt><dd>{fmtMoney(totals.exGst)}</dd></div>
              <div className="flex justify-between"><dt className="text-mute">GST</dt><dd>{fmtMoney(totals.gst)}</dd></div>
              <div className="flex justify-between border-t border-hair pt-1.5 text-base font-semibold text-navy">
                <dt>Total (inc GST)</dt><dd>{fmtMoney(totals.total)}</dd>
              </div>
              <div className="flex justify-between"><dt className="text-mute">Deposit ({form.depositPercent ?? 10}%)</dt><dd>{fmtMoney(totals.deposit)}</dd></div>
              <div className="flex justify-between"><dt className="text-mute">Balance</dt><dd>{fmtMoney(totals.balance)}</dd></div>
            </dl>
          </div>

          <div className="card space-y-4 p-5">
            <h2 className="text-xs tracking-wide text-mute uppercase">Notes and terms</h2>
            <Field label="Notes for the customer" hint="Appears on the PDF, in the email and on the accept page.">
              <textarea className="field min-h-24 resize-y" disabled={locked} value={form.notes ?? ''} onChange={(e) => set({ notes: e.target.value })} />
            </Field>
            <Field label="Terms" hint="Leave blank to use the standard terms.">
              <textarea className="field min-h-28 resize-y" disabled={locked} value={form.terms ?? ''} onChange={(e) => set({ terms: e.target.value })} />
            </Field>
          </div>
        </div>

        <div className="space-y-5">
          <div className="card space-y-4 p-5">
            <h2 className="text-xs tracking-wide text-mute uppercase">Quote settings</h2>
            <Field label="Home">
              <select className="field" disabled={locked} value={form.designId ?? ''} onChange={(e) => {
                const d = designs.find((x) => x.id === e.target.value)
                set({ designId: e.target.value || null, designName: d?.name ?? '' })
              }}>
                <option value="">— None —</option>
                {designs.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
              </select>
            </Field>
            <Field label="Deposit %">
              <input type="number" min="0" max="100" className="field" disabled={locked}
                value={form.depositPercent ?? 10} onChange={(e) => set({ depositPercent: e.target.value })} />
            </Field>
            <Field label="Valid until">
              <input type="date" className="field" disabled={locked}
                value={form.validUntil ?? ''} onChange={(e) => set({ validUntil: e.target.value })} />
            </Field>
            {design?.heroImage && <img src={design.heroImage} alt={design.name} className="w-full rounded-md object-cover" />}
          </div>

          <div className="card p-5">
            <h2 className="mb-3 text-xs tracking-wide text-mute uppercase">History</h2>
            <dl className="space-y-2 text-sm">
              <div className="flex justify-between gap-3"><dt className="text-mute">Created</dt><dd>{fmtDate(quote.createdAt)}</dd></div>
              <div className="flex justify-between gap-3"><dt className="text-mute">Sent</dt><dd>{quote.sentAt ? fmtDateTime(quote.sentAt) : '—'}</dd></div>
              <div className="flex justify-between gap-3"><dt className="text-mute">Accepted</dt><dd>{quote.acceptedAt ? fmtDateTime(quote.acceptedAt) : '—'}</dd></div>
              {quote.acceptedBy && <div className="flex justify-between gap-3"><dt className="text-mute">Accepted by</dt><dd>{quote.acceptedBy}</dd></div>}
              {quote.declinedAt && <div className="flex justify-between gap-3"><dt className="text-mute">Declined</dt><dd>{fmtDateTime(quote.declinedAt)}</dd></div>}
            </dl>
            {quote.declineReason && (
              <p className="mt-3 border-t border-hair pt-3 text-sm whitespace-pre-wrap text-mute">
                <span className="block text-xs text-mute uppercase">Reason given</span>
                {quote.declineReason}
              </p>
            )}
            {quote.leadId && (
              <Link to={`/leads/${quote.leadId}`} className="mt-3 inline-block text-xs text-brand-600 hover:underline">
                View the lead
              </Link>
            )}
          </div>

          {contract && (
            <div className="card p-5">
              <h2 className="mb-3 text-xs tracking-wide text-mute uppercase">Contract</h2>
              <dl className="space-y-2 text-sm">
                <div className="flex justify-between gap-3"><dt className="text-mute">Number</dt><dd>{contract.number}</dd></div>
                <div className="flex justify-between gap-3"><dt className="text-mute">Status</dt><dd><Badge tone={contract.status === 'signed' ? 'green' : 'blue'}>{contract.status}</Badge></dd></div>
                <div className="flex justify-between gap-3"><dt className="text-mute">Customer signed</dt><dd>{contract.customerSignedAt ? fmtDate(contract.customerSignedAt) : '—'}</dd></div>
                <div className="flex justify-between gap-3"><dt className="text-mute">Countersigned</dt><dd>{contract.signedAt ? fmtDate(contract.signedAt) : '—'}</dd></div>
              </dl>
              <a
                href={`/sign/${contract.token}`} target="_blank" rel="noreferrer"
                className="mt-3 inline-block text-xs text-brand-600 hover:underline"
              >
                Open the signing page
              </a>
              {contract.customerSignedAt && !contract.signedAt && (
                <button className="btn-primary mt-3 w-full" onClick={() => setSignOpen(true)} disabled={!!busy}>
                  <PenLine size={15} /> Countersign
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      <Modal open={sendOpen} onClose={() => setSendOpen(false)} title={`Send ${quote.number}?`}>
        <p className="text-sm leading-relaxed text-mute">
          <strong className="text-ink">{form.customerEmail}</strong> gets the quote PDF and a link to accept online.
          Accepting generates their contract and sends it for signature automatically.
        </p>
        {settings?.emails?.safeMode !== false && (
          <p className="mt-3 rounded-md bg-amber-50 px-3 py-2 text-sm text-amber-900">
            Safe mode is on, so this will go to the test inbox rather than the customer.
          </p>
        )}
        <div className="mt-5 flex gap-2">
          <button className="btn-secondary flex-1" onClick={() => setSendOpen(false)}>Cancel</button>
          <button className="btn-primary flex-1" onClick={send} disabled={!!busy}>
            {busy === 'send' ? 'Sending…' : 'Send it'}
          </button>
        </div>
      </Modal>

      <Modal open={signOpen} onClose={() => setSignOpen(false)} title="Countersign the contract">
        <Field label="Signing on behalf of 6Homes">
          <input className="field" value={signerName} onChange={(e) => setSignerName(e.target.value)} placeholder="Full name" />
        </Field>
        <div className="mt-4">
          <span className="label">Signature</span>
          <SignatureCanvas onChange={setSignature} />
        </div>
        <div className="mt-5 flex gap-2">
          <button className="btn-secondary flex-1" onClick={() => setSignOpen(false)}>Cancel</button>
          <button className="btn-primary flex-1" onClick={countersign} disabled={!!busy || !signerName.trim() || !signature}>
            {busy === 'countersign' ? 'Signing…' : 'Countersign'}
          </button>
        </div>
      </Modal>
    </>
  )
}
