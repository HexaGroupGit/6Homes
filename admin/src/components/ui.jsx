import { cn } from '../lib/utils.js'

// The handful of shells every screen needs. Kept deliberately small — anything
// used once belongs in the screen that uses it.

export function PageHeader({ title, subtitle, children }) {
  return (
    <div className="flex flex-wrap items-start justify-between gap-4 border-b border-hair bg-white px-7 py-5">
      <div>
        <h1 className="text-xl font-semibold text-navy">{title}</h1>
        {subtitle && <p className="mt-0.5 text-sm text-mute">{subtitle}</p>}
      </div>
      {children && <div className="flex items-center gap-2">{children}</div>}
    </div>
  )
}

export function EmptyState({ icon: Icon, title, children }) {
  return (
    <div className="grid place-items-center rounded-lg border border-dashed border-hair bg-white/60 px-6 py-16 text-center">
      {Icon && <Icon size={26} className="mb-3 text-mute/60" />}
      <p className="text-sm font-medium text-ink">{title}</p>
      {children && <p className="mt-1 max-w-sm text-sm text-mute">{children}</p>}
    </div>
  )
}

export function Stat({ label, value, hint }) {
  return (
    <div className="card p-5">
      <div className="text-xs tracking-wide text-mute uppercase">{label}</div>
      <div className="mt-1.5 text-2xl font-semibold text-navy">{value}</div>
      {hint && <div className="mt-0.5 text-xs text-mute">{hint}</div>}
    </div>
  )
}

const TONES = {
  neutral: 'bg-brand-100 text-navy',
  green: 'bg-emerald-100 text-emerald-800',
  amber: 'bg-amber-100 text-amber-800',
  red: 'bg-red-100 text-red-700',
  blue: 'bg-sky-100 text-sky-800',
}

export function Badge({ children, tone = 'neutral', className }) {
  return (
    <span className={cn('inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium', TONES[tone], className)}>
      {children}
    </span>
  )
}

export function Field({ label, hint, children, className }) {
  return (
    <label className={cn('block', className)}>
      <span className="label">{label}</span>
      {children}
      {hint && <span className="mt-1 block text-xs text-mute">{hint}</span>}
    </label>
  )
}

// A dead-simple centred modal. No focus trap library — Escape and a backdrop
// click are enough for an internal tool.
export function Modal({ open, onClose, title, children, width = 'max-w-lg' }) {
  if (!open) return null
  return (
    <div
      className="fixed inset-0 z-50 grid place-items-center bg-ink/40 p-4"
      onClick={onClose}
      onKeyDown={(e) => e.key === 'Escape' && onClose()}
      role="presentation"
    >
      <div
        className={cn('w-full rounded-lg bg-white shadow-xl', width)}
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label={title}
      >
        <div className="border-b border-hair px-6 py-4">
          <h2 className="font-semibold text-navy">{title}</h2>
        </div>
        <div className="px-6 py-5">{children}</div>
      </div>
    </div>
  )
}
