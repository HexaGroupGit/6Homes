import { cn } from '../../lib/utils.js'

/**
 * The 6Homes lockup, laid out horizontally.
 *
 * FullLogo.svg is the stacked version — 357 wide by 422 tall — so setting it to
 * a header height renders a 27px-wide smudge. The mark and the wordmark are
 * shipped as separate files precisely so a horizontal lockup can be composed,
 * which is what a header bar wants.
 */
export function Wordmark({ tone = 'dark', className }) {
  const light = tone === 'light'
  return (
    <span className={cn('inline-flex items-center gap-2.5', className)} aria-label="6Homes" role="img">
      <img src={light ? '/brand/mark-white.svg' : '/brand/mark.svg'} alt="" className="h-full w-auto" />
      <img src={light ? '/brand/wordmark-white.svg' : '/brand/wordmark.svg'} alt="" className="h-[45%] w-auto" />
    </span>
  )
}

/**
 * The build rail — the one thing this portal is remembered by.
 *
 * It is the same six-segment device the stage-update emails draw, deliberately:
 * a customer who saw "your home has entered manufacture" in their inbox should
 * recognise the identical rail here, filled to the identical point. Two surfaces
 * describing one build ought to look like one thing.
 */
export function BuildRail({ stages, tone = 'dark', className }) {
  const light = tone === 'light'
  return (
    <div className={cn('w-full', className)}>
      <ol className="flex w-full gap-1.5">
        {stages.map((s) => (
          <li key={s.id} className="min-w-0 flex-1">
            <div
              className={cn(
                'h-1.5 rounded-full transition-colors',
                s.state === 'todo'
                  ? light ? 'bg-white/20' : 'bg-hair'
                  : light ? 'bg-brand-400' : 'bg-brand-600'
              )}
            />
            <div
              className={cn(
                // Six labels across a phone is 60px each — unreadable, and the
                // stage is named directly above and below the rail anyway.
                'mt-2.5 hidden font-mono text-[9.5px] leading-tight tracking-[0.08em] uppercase sm:block sm:text-[10px]',
                s.state === 'current'
                  ? light ? 'font-semibold text-white' : 'font-semibold text-navy'
                  : s.state === 'done'
                    ? light ? 'text-white/55' : 'text-mute'
                    : light ? 'text-white/30' : 'text-hair'
              )}
            >
              {s.name}
            </div>
          </li>
        ))}
      </ol>
    </div>
  )
}

const TONES = {
  amber: 'bg-amber-50 text-amber-800 ring-amber-200',
  blue: 'bg-brand-100 text-brand-700 ring-brand-200',
  green: 'bg-emerald-50 text-emerald-800 ring-emerald-200',
  red: 'bg-red-50 text-red-800 ring-red-200',
  neutral: 'bg-brand-50 text-mute ring-hair',
}

export function Pill({ children, tone = 'neutral', className }) {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-medium tracking-wide ring-1 ring-inset',
        TONES[tone] ?? TONES.neutral,
        className
      )}
    >
      {children}
    </span>
  )
}

/** A section heading in the portal's voice: quiet label, plain-spoken title. */
export function Block({ id, label, title, intro, children, className }) {
  return (
    <section id={id} className={cn('scroll-mt-24', className)}>
      <p className="font-mono text-[11px] tracking-[0.16em] text-mute uppercase">{label}</p>
      <h2 className="mt-2 text-xl font-semibold tracking-tight text-navy sm:text-2xl">{title}</h2>
      {intro && <p className="mt-2 max-w-2xl text-sm leading-relaxed text-mute">{intro}</p>}
      <div className="mt-6">{children}</div>
    </section>
  )
}

export function Empty({ children }) {
  return (
    <div className="rounded-lg border border-dashed border-hair px-5 py-8 text-center text-sm text-mute">
      {children}
    </div>
  )
}
