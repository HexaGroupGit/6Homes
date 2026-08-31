import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, Trash2, ExternalLink } from 'lucide-react'
import { useStore } from '../store/useStore.jsx'
import { PageHeader, Field, Badge, Modal } from './ui.jsx'
import { slugify } from '../lib/utils.js'

const SITE = import.meta.env.VITE_PUBLIC_SITE_URL || 'https://6homes.com'

// One list per line is the least annoying way to edit a string array.
const linesToArray = (s) => s.split('\n').map((l) => l.trim()).filter(Boolean)
const arrayToLines = (a) => (a ?? []).join('\n')

export default function DesignDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { designs, update, remove } = useStore()
  const design = designs.find((d) => d.id === id)

  const [form, setForm] = useState(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [saved, setSaved] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)

  // Seed the form once the record is available, and re-seed if the id changes.
  useEffect(() => {
    if (design) {
      setForm({
        ...design,
        inclusionsText: arrayToLines(design.inclusions),
        galleryText: arrayToLines(design.gallery),
      })
    }
  }, [design?.id]) // eslint-disable-line react-hooks/exhaustive-deps

  if (!design) {
    return (
      <div className="p-8">
        <p className="text-sm text-mute">That design no longer exists.</p>
        <Link to="/designs" className="mt-2 inline-block text-sm text-brand-600 hover:underline">Back to designs</Link>
      </div>
    )
  }
  if (!form) return <div className="p-8 text-sm text-mute">Loading…</div>

  const set = (patch) => { setForm((f) => ({ ...f, ...patch })); setSaved(false) }

  const num = (v) => (v === '' || v == null ? null : Number(v))

  async function save() {
    setBusy(true); setError('')
    try {
      const { inclusionsText, galleryText, ...rest } = form
      await update('designs', id, {
        ...rest,
        slug: slugify(form.slug || form.name),
        bedrooms: num(form.bedrooms),
        bathrooms: num(form.bathrooms),
        areaSqm: num(form.areaSqm),
        priceFrom: num(form.priceFrom),
        inclusions: linesToArray(inclusionsText),
        gallery: linesToArray(galleryText),
      })
      setSaved(true)
    } catch (err) {
      setError(err.message)
    } finally {
      setBusy(false)
    }
  }

  async function destroy() {
    setBusy(true); setError('')
    try {
      await remove('designs', id)
      navigate('/designs')
    } catch (err) {
      setError(err.message); setBusy(false)
    }
  }

  const slug = slugify(form.slug || form.name)

  return (
    <>
      <PageHeader title={design.name || 'Design'} subtitle={`/models/${slug}`}>
        <Link to="/designs" className="btn-secondary"><ArrowLeft size={15} /> Back</Link>
        {design.published && (
          <a href={`${SITE}/models/${slug}`} target="_blank" rel="noreferrer" className="btn-secondary">
            <ExternalLink size={15} /> View live
          </a>
        )}
        <button className="btn-primary" onClick={save} disabled={busy}>
          {busy ? 'Saving…' : saved ? 'Saved' : 'Save changes'}
        </button>
      </PageHeader>

      {error && <div className="bg-red-50 px-7 py-2 text-sm text-red-700">{error}</div>}

      <div className="grid gap-6 p-7 lg:grid-cols-3">
        <div className="space-y-5 lg:col-span-2">
          <div className="card space-y-4 p-5">
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Name">
                <input className="field" value={form.name ?? ''} onChange={(e) => set({ name: e.target.value })} />
              </Field>
              <Field label="URL slug" hint="Changing this breaks existing links — only edit before publishing.">
                <input className="field" value={form.slug ?? ''} onChange={(e) => set({ slug: e.target.value })} placeholder={slugify(form.name)} />
              </Field>
            </div>

            <Field label="Tagline" hint="The one line that sits under the name on the website.">
              <input className="field" value={form.tagline ?? ''} onChange={(e) => set({ tagline: e.target.value })} placeholder="Double the comfort, perfectly balanced" />
            </Field>

            <Field label="Description">
              <textarea className="field min-h-32 resize-y" value={form.description ?? ''} onChange={(e) => set({ description: e.target.value })} />
            </Field>
          </div>

          <div className="card space-y-4 p-5">
            <h3 className="text-xs tracking-wide text-mute uppercase">Specifications</h3>
            <div className="grid gap-4 sm:grid-cols-4">
              <Field label="Bedrooms">
                <input type="number" min="0" className="field" value={form.bedrooms ?? ''} onChange={(e) => set({ bedrooms: e.target.value })} />
              </Field>
              <Field label="Bathrooms">
                <input type="number" min="0" step="0.5" className="field" value={form.bathrooms ?? ''} onChange={(e) => set({ bathrooms: e.target.value })} />
              </Field>
              <Field label="Area (m²)">
                <input type="number" min="0" className="field" value={form.areaSqm ?? ''} onChange={(e) => set({ areaSqm: e.target.value })} />
              </Field>
              <Field label="Price from (AUD)" hint="Base only — site works quoted separately.">
                <input type="number" min="0" className="field" value={form.priceFrom ?? ''} onChange={(e) => set({ priceFrom: e.target.value })} />
              </Field>
            </div>
            <Field label="Dimensions" hint="As shown on the floorplan, e.g. 2.0m x 4.8m.">
              <input className="field" value={form.dimensions ?? ''} onChange={(e) => set({ dimensions: e.target.value })} />
            </Field>
            <Field label="Standard inclusions" hint="One per line.">
              <textarea
                className="field min-h-28 resize-y font-mono text-xs"
                value={form.inclusionsText}
                onChange={(e) => set({ inclusionsText: e.target.value })}
                placeholder={'Double-glazed windows and doors\nDesigner kitchen\nOven, stove and dishwasher'}
              />
            </Field>
          </div>

          <div className="card space-y-4 p-5">
            <h3 className="text-xs tracking-wide text-mute uppercase">Media</h3>
            <Field label="Hero image URL">
              <input className="field" value={form.heroImage ?? ''} onChange={(e) => set({ heroImage: e.target.value })} />
            </Field>
            <Field label="Floorplan image URL">
              <input className="field" value={form.floorplanImage ?? ''} onChange={(e) => set({ floorplanImage: e.target.value })} />
            </Field>
            <Field label="Gallery image URLs" hint="One per line.">
              <textarea className="field min-h-24 resize-y font-mono text-xs" value={form.galleryText} onChange={(e) => set({ galleryText: e.target.value })} />
            </Field>
            <Field label="3D virtual tour URL">
              <input className="field" value={form.tourUrl ?? ''} onChange={(e) => set({ tourUrl: e.target.value })} />
            </Field>
          </div>
        </div>

        <div className="space-y-5">
          <div className="card p-5">
            <div className="mb-3 flex items-center justify-between">
              <h3 className="text-xs tracking-wide text-mute uppercase">Visibility</h3>
              <Badge tone={form.published ? 'green' : 'amber'}>{form.published ? 'Live' : 'Draft'}</Badge>
            </div>
            <label className="flex cursor-pointer items-start gap-2.5 text-sm">
              <input
                type="checkbox"
                className="mt-0.5"
                checked={!!form.published}
                onChange={(e) => set({ published: e.target.checked })}
              />
              <span>
                Published
                <span className="mt-0.5 block text-xs text-mute">
                  Publishing makes this design readable by 6homes.com. Unpublished designs stay internal and can still be
                  quoted.
                </span>
              </span>
            </label>
          </div>

          {form.heroImage && (
            <div className="card overflow-hidden">
              <img src={form.heroImage} alt="" className="aspect-[4/3] w-full object-cover" />
              <div className="px-4 py-2 text-[11px] text-mute">Hero preview</div>
            </div>
          )}

          <div className="card p-5">
            <h3 className="mb-2 text-xs tracking-wide text-mute uppercase">Danger zone</h3>
            <button className="btn-secondary w-full text-red-600 hover:bg-red-50" onClick={() => setConfirmDelete(true)} disabled={busy}>
              <Trash2 size={15} /> Delete this design
            </button>
          </div>
        </div>
      </div>

      <Modal open={confirmDelete} onClose={() => setConfirmDelete(false)} title={`Delete ${design.name}?`}>
        <p className="text-sm leading-relaxed text-mute">
          This removes the design permanently. Any lead or project already linked to it keeps the name on record, but the
          page will disappear from the website.
        </p>
        <div className="mt-5 flex gap-2">
          <button className="btn-secondary flex-1" onClick={() => setConfirmDelete(false)}>Cancel</button>
          <button className="btn-primary flex-1 bg-red-600 hover:bg-red-700" onClick={destroy} disabled={busy}>
            {busy ? 'Deleting…' : 'Delete'}
          </button>
        </div>
      </Modal>
    </>
  )
}
