import { clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'
import { format, formatDistanceToNowStrict, parseISO, isValid } from 'date-fns'

export const cn = (...inputs) => twMerge(clsx(inputs))

// Australian format everywhere — DD/MM/YYYY. A US-format date on an invoice or
// a lease is the kind of small wrong thing that costs real trust.
export function fmtDate(value, pattern = 'dd/MM/yyyy') {
  if (!value) return '—'
  const d = typeof value === 'string' ? parseISO(value) : value
  return isValid(d) ? format(d, pattern) : '—'
}

export const fmtDateTime = (v) => fmtDate(v, 'dd/MM/yyyy h:mma')

export function fmtAgo(value) {
  if (!value) return '—'
  const d = typeof value === 'string' ? parseISO(value) : value
  return isValid(d) ? `${formatDistanceToNowStrict(d)} ago` : '—'
}

const AUD = new Intl.NumberFormat('en-AU', { style: 'currency', currency: 'AUD', maximumFractionDigits: 0 })
export const fmtMoney = (n) => (n == null || n === '' || Number.isNaN(Number(n)) ? '—' : AUD.format(Number(n)))

export function newId(prefix) {
  return `${prefix}_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`
}

// "Selina Two Bedroom" → "selina-two-bedroom". Used for design/project URLs,
// which the website reads directly, so it must stay stable once published.
export function slugify(s) {
  return String(s ?? '')
    .toLowerCase()
    .trim()
    .replace(/['']/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

export const initials = (name) =>
  String(name ?? '')
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase())
    .join('') || '?'
