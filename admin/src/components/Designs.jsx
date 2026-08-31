import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Home, Plus } from 'lucide-react'
import { useStore } from '../store/useStore.jsx'
import { PageHeader, EmptyState, Badge } from './ui.jsx'
import { fmtMoney, newId, slugify, mediaUrl } from '../lib/utils.js'

export default function Designs() {
  const { designs, create } = useStore()
  const navigate = useNavigate()
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  async function addDesign() {
    setBusy(true); setError('')
    try {
      const d = await create('designs', {
        id: newId('dsn'),
        name: 'New design',
        slug: `new-design-${Math.random().toString(36).slice(2, 6)}`,
        published: false,
        bedrooms: 1,
        bathrooms: 1,
        gallery: [],
        inclusions: [],
      }, 'dsn')
      navigate(`/designs/${d.id}`)
    } catch (err) {
      setError(err.message)
    } finally {
      setBusy(false)
    }
  }

  const sorted = [...designs].sort((a, b) => (a.name ?? '').localeCompare(b.name ?? ''))

  return (
    <>
      <PageHeader
        title="Designs"
        subtitle="Your home models. Published designs appear on 6homes.com and can be quoted."
      >
        <button className="btn-primary" onClick={addDesign} disabled={busy}>
          <Plus size={15} /> Add design
        </button>
      </PageHeader>

      {error && <div className="bg-red-50 px-7 py-2 text-sm text-red-700">{error}</div>}

      <div className="p-7">
        {designs.length === 0 ? (
          <EmptyState icon={Home} title="No designs yet">
            Add each model you build — Selina, Norfolk, Murray and the rest. The website reads this list directly, so a
            design only goes live once you tick Published.
          </EmptyState>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {sorted.map((d) => (
              <Link key={d.id} to={`/designs/${d.id}`} className="card overflow-hidden transition-colors hover:border-brand-400">
                <div className="aspect-[4/3] bg-brand-100">
                  {d.heroImage ? (
                    <img src={mediaUrl(d.heroImage)} alt={d.name} className="size-full object-cover" loading="lazy" />
                  ) : (
                    <div className="grid size-full place-items-center text-xs text-mute">No image</div>
                  )}
                </div>
                <div className="p-4">
                  <div className="flex items-start justify-between gap-2">
                    <span className="font-medium text-navy">{d.name}</span>
                    <Badge tone={d.published ? 'green' : 'amber'}>{d.published ? 'Live' : 'Draft'}</Badge>
                  </div>
                  <div className="mt-1 text-xs text-mute">
                    {[
                      d.bedrooms && `${d.bedrooms} bed`,
                      d.bathrooms && `${d.bathrooms} bath`,
                      d.areaSqm && `${d.areaSqm} m²`,
                    ].filter(Boolean).join(' · ') || '—'}
                  </div>
                  <div className="mt-2 text-sm font-medium">
                    {d.priceFrom ? `From ${fmtMoney(d.priceFrom)}` : <span className="text-mute">No price set</span>}
                  </div>
                  <div className="mt-1 text-[11px] text-mute">/models/{d.slug || slugify(d.name)}</div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </>
  )
}
