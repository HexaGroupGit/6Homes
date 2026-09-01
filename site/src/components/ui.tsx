import Link from 'next/link'
import type { ReactNode } from 'react'
import Reveal from './Reveal'
import { type Design, type Project, publicPrice } from '@/lib/crm'

/* ── The signature ─────────────────────────────────────────────────────────
   A dimension rule lifted straight off an architectural drawing:

       ├──────────────  60 m²  ──────────────┤

   It annotates the hero photograph, every design in the range, and the divider
   between sections. Everything else on the page is quiet so that this reads. */
export function Dim({
  children,
  tone = 'teal',
  className = '',
}: {
  children: ReactNode
  tone?: 'teal' | 'light'
  className?: string
}) {
  const line = tone === 'teal' ? 'bg-teal/70' : 'bg-white/60'
  const tick = tone === 'teal' ? 'bg-teal' : 'bg-white'
  const text = tone === 'teal' ? 'text-teal-deep' : 'text-white'

  // Fixed geometry, sized to its own label. A rule that stretches across empty
  // space reads as a stray hairline; a short, tight one reads as an annotation.
  const Tick = () => <span aria-hidden className={`h-2.5 w-px shrink-0 ${tick}`} />
  const Line = () => <span aria-hidden className={`h-px w-8 shrink-0 sm:w-12 ${line}`} />

  return (
    <div className={`flex w-fit items-center gap-2.5 ${className}`}>
      <Tick />
      <Line />
      <span className={`spec shrink-0 ${text}`}>{children}</span>
      <Line />
      <Tick />
    </div>
  )
}

/* A photograph slot that still looks deliberate with no photograph in it —
   which matters while the media library is being finished. The fallback is the
   drawing grid, not a grey box with an icon. */
export function Frame({
  src,
  alt,
  ratio = 'aspect-[4/3]',
  className = '',
}: {
  src?: string
  alt: string
  ratio?: string
  className?: string
}) {
  if (src) {
    return (
      // eslint-disable-next-line @next/next/no-img-element -- these are already
      // sized static assets; next/image adds cost without benefit here.
      <img src={src} alt={alt} loading="lazy" className={`${ratio} w-full object-cover ${className}`} />
    )
  }
  return (
    <div
      className={`${ratio} w-full bg-panel ${className}`}
      style={{
        backgroundImage:
          'linear-gradient(to right, #C9D4D6 1px, transparent 1px), linear-gradient(to bottom, #C9D4D6 1px, transparent 1px)',
        backgroundSize: '28px 28px',
      }}
      role="img"
      aria-label={alt}
    />
  )
}

/* ── Page furniture ────────────────────────────────────────────────────── */

export function PageHero({
  eyebrow,
  title,
  children,
  dim,
}: {
  eyebrow?: string
  title: string
  children?: ReactNode
  dim?: string
}) {
  return (
    <section className="border-b border-rule bg-paper">
      <div
        className="container-page grid items-end gap-x-16 gap-y-6 pt-28 pb-10 [&>*]:min-w-0 md:grid-cols-[1.35fr_1fr] md:pt-32 md:pb-12"
        data-rv-w
      >
        <div>
          {eyebrow && (
            <p className="eyebrow" data-rv="a">
              {eyebrow}
            </p>
          )}
          <h1 className="display mt-4" data-rv="h">
            {title}
          </h1>
        </div>
        {/* The lead sits beside the headline, not under it — it fills the space
            an all-caps expanded title leaves at the right and keeps the page
            from opening with a column of dead air. */}
        {(children || dim) && (
          <div className="md:pb-2">
            {children && (
              <div className="prose-body max-w-md" data-rv="p">
                {children}
              </div>
            )}
            {dim && (
              <div data-rv="ctn">
                <Dim className="mt-6">{dim}</Dim>
              </div>
            )}
          </div>
        )}
      </div>
    </section>
  )
}

export function Section({
  eyebrow,
  title,
  intro,
  children,
  dark = false,
  className = '',
  id,
}: {
  eyebrow?: string
  title?: string
  intro?: ReactNode
  children: ReactNode
  dark?: boolean
  className?: string
  id?: string
}) {
  return (
    <section
      id={id}
      className={`${dark ? 'bg-deep text-white' : ''} py-16 md:py-24 ${className}`}
      data-bg={dark ? 'dark' : undefined}
    >
      <div className="container-page">
        {(eyebrow || title) && (
          // Heading left, intro right — the same two-column head as PageHero, so
          // a section never opens with a lone line of type over empty space.
          <div className="grid items-end gap-x-16 gap-y-4 [&>*]:min-w-0 md:grid-cols-[1.35fr_1fr]" data-rv-w>
            <div>
              {eyebrow && (
                <p className={dark ? 'spec text-teal' : 'eyebrow'} data-rv="a">
                  {eyebrow}
                </p>
              )}
              {title && (
                <h2 className="display-sm mt-4" data-rv="h">
                  {title}
                </h2>
              )}
            </div>
            {intro && (
              <div className={`prose-body max-w-md md:pb-1 ${dark ? '!text-white/65' : ''}`} data-rv="p">
                {intro}
              </div>
            )}
          </div>
        )}
        <div className={eyebrow || title ? 'mt-10 md:mt-14' : ''}>{children}</div>
      </div>
    </section>
  )
}

/* A strip of hard numbers, set in the engineering face. Used under the hero and
   at the head of the range — it answers "how big, how long, how much" before
   anyone has to ask. */
export function StatRail({
  items,
  dark = false,
}: {
  items: readonly { value: string; label: string }[]
  dark?: boolean
}) {
  return (
    <dl className={`grid grid-cols-2 md:grid-cols-4 ${dark ? 'border-white/15' : 'border-rule'} border-t`}>
      {items.map((item, i) => (
        <div
          key={item.label}
          className={`px-5 py-6 md:px-8 md:py-8 ${dark ? 'border-white/15' : 'border-rule'} ${
            i > 0 ? 'md:border-l' : ''
          } ${i % 2 === 1 ? 'border-l md:border-l' : ''} ${i > 1 ? 'border-t md:border-t-0' : ''}`}
        >
          <dt className={`spec ${dark ? 'text-white/45' : 'text-mute'}`}>{item.label}</dt>
          <dd
            className={`mt-2.5 font-mono text-xl md:text-2xl ${dark ? 'text-white' : 'text-navy'}`}
            style={{ fontVariationSettings: 'normal' }}
          >
            {item.value}
          </dd>
        </div>
      ))}
    </dl>
  )
}

/* ── The range, as a specification index ───────────────────────────────────
   A card grid is the default for "browse our products". This is a catalogue of
   manufactured homes that buyers compare on four numbers, so it is set as an
   index: one row per home, aligned columns, hairline rules. Hovering lifts the
   photograph in at the right. */
export function SpecIndex({ designs }: { designs: Design[] }) {
  return (
    <div className="border-t border-rule">
      {designs.map((design, i) => {
        const price = publicPrice(design)
        return (
          <Reveal key={design.id} delay={Math.min(i * 40, 240)}>
            <Link
              href={`/models/${design.slug}`}
              className="group relative block border-b border-rule transition-colors duration-500 ease-drafting hover:bg-panel/60"
            >
              <div className="grid grid-cols-[1fr_auto] items-center gap-4 py-6 md:grid-cols-[1.6fr_1fr_1fr_0.9fr_auto] md:gap-8 md:py-7">
                <div className="flex items-baseline gap-4">
                  <span className="spec w-6 shrink-0 text-mute/60">{String(i + 1).padStart(2, '0')}</span>
                  <span className="display-xs transition-colors duration-500 ease-drafting group-hover:text-navy">
                    {design.name}
                  </span>
                </div>

                {/* On mobile the four spec columns collapse into one mono line —
                    a 4-column table on a phone is unreadable. */}
                <div className="col-start-1 row-start-2 flex gap-4 font-mono text-[11px] text-mute md:hidden">
                  <span>{design.bedrooms} bed</span>
                  <span>{design.bathrooms} bath</span>
                  <span>{design.areaSqm} m²</span>
                  {price && <span className="text-navy">{price}</span>}
                </div>

                <span className="hidden font-mono text-[13px] text-mute md:block">{design.bedrooms} bed</span>
                <span className="hidden font-mono text-[13px] text-mute md:block">{design.bathrooms} bath</span>
                <span className="hidden font-mono text-[13px] text-ink md:block">{design.areaSqm} m²</span>

                <span className="spec col-start-2 row-start-1 self-center text-right text-mute transition-colors duration-500 ease-drafting group-hover:text-teal-deep md:col-start-5">
                  {price ? price.replace('A$', 'from $') : 'View'}
                  <span aria-hidden className="ml-2 inline-block transition-transform duration-500 ease-drafting group-hover:translate-x-1">
                    →
                  </span>
                </span>
              </div>

              {/* The photograph, revealed on hover. Pointer-events off so it can
                  never intercept the click that opens the design. */}
              {design.heroImage && (
                <div className="pointer-events-none absolute top-1/2 right-24 hidden h-36 w-52 -translate-y-1/2 overflow-hidden opacity-0 transition-opacity duration-500 ease-drafting group-hover:opacity-100 xl:block">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={design.heroImage} alt="" className="h-full w-full object-cover" loading="lazy" />
                </div>
              )}
            </Link>
          </Reveal>
        )
      })}
    </div>
  )
}

/* A full-width feature row: photograph on one side, the home's specification on
   the other, alternating down the page and separated by hairlines. */
export function DesignRow({ design, flip = false }: { design: Design; flip?: boolean }) {
  const price = publicPrice(design)
  return (
    <Reveal>
      <div className="hairline grid items-center gap-8 py-12 md:grid-cols-2 md:gap-16 md:py-16">
        <div className={flip ? 'md:order-2' : ''}>
          <Frame src={design.heroImage} alt={design.name} ratio="aspect-[4/3]" />
        </div>
        <div className={flip ? 'md:order-1 md:pr-8' : 'md:pl-8'}>
          <p className="spec text-mute">{design.bedrooms} bed · {design.bathrooms} bath</p>
          <h3 className="display-sm mt-4">{design.name}</h3>
          {design.tagline && <p className="prose-body mt-5 max-w-md">{design.tagline}</p>}
          <div className="mt-8 max-w-xs">
            <Dim>{design.areaSqm} m²</Dim>
          </div>
          <div className="mt-8 flex flex-wrap items-center gap-6">
            <Link href={`/models/${design.slug}`} className="btn-rule">
              See the {design.name}
            </Link>
            {price && <span className="font-mono text-[13px] text-mute">{price.replace('A$', 'from $')}</span>}
          </div>
        </div>
      </div>
    </Reveal>
  )
}

export function ProjectTile({ project, index }: { project: Project; index?: number }) {
  return (
    <Reveal delay={index ? Math.min(index * 60, 240) : 0}>
      <Link href={`/projects/${project.slug}`} className="group block">
        <div className="overflow-hidden">
          <Frame
            src={project.heroImage}
            alt={project.name}
            ratio="aspect-[3/2]"
            className="transition-transform duration-[1.1s] ease-drafting group-hover:scale-[1.04]"
          />
        </div>
        <div className="mt-5 flex items-start justify-between gap-4 border-t border-rule pt-4">
          <div>
            <p className="spec text-teal-deep">{project.location ?? project.name}</p>
            <h3 className="display-xs mt-2.5">{project.designName ?? project.name}</h3>
          </div>
          {project.category && <span className="spec mt-1 shrink-0 text-mute">{project.category}</span>}
        </div>
      </Link>
    </Reveal>
  )
}

/* The process. Numbering is used here because the content genuinely is an
   ordered sequence — you cannot manufacture before you have approvals. */
export function ProcessList({
  steps,
  dark = false,
}: {
  steps: readonly { n: string; title: string; body: string }[]
  dark?: boolean
}) {
  return (
    <ol className={`border-t ${dark ? 'border-white/15' : 'border-rule'}`}>
      {steps.map((step, i) => (
        <Reveal as="li" key={step.n} delay={Math.min(i * 50, 250)}>
          <div
            className={`grid gap-y-3 border-b py-8 md:grid-cols-[auto_1fr_1.4fr] md:gap-x-12 md:py-10 ${
              dark ? 'border-white/15' : 'border-rule'
            }`}
          >
            <span className={`font-mono text-[13px] ${dark ? 'text-teal' : 'text-teal-deep'} md:w-12`}>{step.n}</span>
            <h3 className="display-xs">{step.title}</h3>
            <p className={`prose-body max-w-xl ${dark ? '!text-white/60' : ''}`}>{step.body}</p>
          </div>
        </Reveal>
      ))}
    </ol>
  )
}

export function Faq({ items }: { items: readonly { q: string; a: string }[] }) {
  return (
    <div className="border-t border-rule">
      {items.map((item) => (
        <details key={item.q} className="group border-b border-rule py-6">
          <summary className="flex cursor-pointer list-none items-start justify-between gap-8 marker:content-['']">
            <span className="display-xs pr-4 transition-colors duration-500 ease-drafting group-hover:text-navy">
              {item.q}
            </span>
            <span
              aria-hidden
              className="mt-1 shrink-0 font-mono text-teal transition-transform duration-500 ease-drafting group-open:rotate-45"
            >
              +
            </span>
          </summary>
          <p className="prose-body mt-4 max-w-2xl">{item.a}</p>
        </details>
      ))}
    </div>
  )
}
