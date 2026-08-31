import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { FileText, Plus } from 'lucide-react'
import { useStore } from '../store/useStore.jsx'
import { PageHeader, EmptyState, Badge, Modal, Field } from './ui.jsx'
import { fmtDate, fmtMoney, newId } from '../lib/utils.js'
import { quoteTotals, quoteState, nextQuoteNumber, starterLineItems } from '../lib/quoteMath.js'

const TONE = { draft: 'neutral', sent: 'blue', accepted: 'green', declined: 'red', expired: 'amber' }

export default function Quotes() {
  const { quotes, leads, designs, create } = useStore()
  const navigate = useNavigate()
  const [open, setOpen] = useState(false)
  const [leadId, setLeadId] = useState('')
  const [designId, setDesignId] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  async function createQuote() {
    setBusy(true); setError('')
    try {
      const lead = leads.find((l) => l.id === leadId)
      const design = designs.find((d) => d.id === designId) ?? designs.find((d) => d.id === lead?.designId)

      // 30 days is the standard validity — long enough to think, short enough
      // that a price from six months ago can't be held to.
      const validUntil = new Date()
      validUntil.setDate(validUntil.getDate() + 30)

      const q = await create('quotes', {
        id: newId('quo'),
        number: nextQuoteNumber(quotes),
        status: 'draft',
        leadId: lead?.id ?? null,
        customerId: lead?.customerId ?? null,
        projectId: lead?.projectId ?? null,
        designId: design?.id ?? null,
        designName: design?.name ?? '',
        customerName: lead?.name ?? '',
        customerEmail: lead?.email ?? '',
        customerPhone: lead?.phone ?? '',
        siteAddress: lead?.suburb ?? '',
        lineItems: starterLineItems(design),
        depositPercent: 10,
        validUntil: validUntil.toISOString().slice(0, 10),
        notes: '',
        terms: '',
      }, 'quo')
      setOpen(false)
      navigate(`/quotes/${q.id}`)
    } catch (err) {
      setError(err.message)
    } finally {
      setBusy(false)
    }
  }

  const sorted = [...quotes].sort((a, b) => new Date(b.createdAt ?? 0) - new Date(a.createdAt ?? 0))

  return (
    <>
      <PageHeader title="Quotes" subtitle="Build a quote from a design, send it, and let the customer accept online.">
        <button className="btn-primary" onClick={() => setOpen(true)}><Plus size={15} /> New quote</button>
      </PageHeader>

      {error && <div className="bg-red-50 px-7 py-2 text-sm text-red-700">{error}</div>}

      <div className="p-7">
        {quotes.length === 0 ? (
          <EmptyState icon={FileText} title="No quotes yet">
            Create one from a lead. The customer gets a branded PDF and a link to accept — accepting generates their
            contract and sends it for signature automatically.
          </EmptyState>
        ) : (
          <div className="card overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-hair text-left text-xs tracking-wide text-mute uppercase">
                  <th className="px-5 py-3 font-medium">Number</th>
                  <th className="px-5 py-3 font-medium">Customer</th>
                  <th className="px-5 py-3 font-medium">Home</th>
                  <th className="px-5 py-3 font-medium text-right">Total</th>
                  <th className="px-5 py-3 font-medium">Valid until</th>
                  <th className="px-5 py-3 font-medium">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-hair">
                {sorted.map((q) => {
                  const state = quoteState(q)
                  return (
                    <tr key={q.id} className="cursor-pointer hover:bg-brand-50" onClick={() => navigate(`/quotes/${q.id}`)}>
                      <td className="px-5 py-3 font-medium">
                        <Link to={`/quotes/${q.id}`} className="text-brand-600 hover:underline">{q.number}</Link>
                      </td>
                      <td className="px-5 py-3">{q.customerName || '—'}</td>
                      <td className="px-5 py-3 text-mute">{q.designName || '—'}</td>
                      <td className="px-5 py-3 text-right font-medium">{fmtMoney(quoteTotals(q).total)}</td>
                      <td className="px-5 py-3 text-mute">{q.validUntil ? fmtDate(q.validUntil) : '—'}</td>
                      <td className="px-5 py-3"><Badge tone={TONE[state]}>{state}</Badge></td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <Modal open={open} onClose={() => setOpen(false)} title="New quote">
        <div className="space-y-4">
          <Field label="For which lead?" hint="Contact details and site are copied across; you can edit them after.">
            <select className="field" value={leadId} onChange={(e) => setLeadId(e.target.value)}>
              <option value="">— No lead (enter details manually) —</option>
              {leads.map((l) => (
                <option key={l.id} value={l.id}>{l.name || l.email || l.phone} · {l.intentLabel}</option>
              ))}
            </select>
          </Field>
          <Field label="Which home?" hint="Sets the first line item and its price.">
            <select className="field" value={designId} onChange={(e) => setDesignId(e.target.value)}>
              <option value="">— Use the lead's design, if any —</option>
              {designs.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
            </select>
          </Field>
        </div>
        <div className="mt-5 flex gap-2">
          <button className="btn-secondary flex-1" onClick={() => setOpen(false)}>Cancel</button>
          <button className="btn-primary flex-1" onClick={createQuote} disabled={busy}>
            {busy ? 'Creating…' : 'Create draft'}
          </button>
        </div>
      </Modal>
    </>
  )
}
