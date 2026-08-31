import type { Metadata } from 'next'
import Link from 'next/link'
import Image from 'next/image'
import { notFound } from 'next/navigation'
import { getDesign, getDesigns, specLine, publicPrice } from '@/lib/crm'
import { Dim, Frame, Section, SpecIndex } from '@/components/ui'
import Reveal from '@/components/Reveal'
import EnquireButton from '@/components/enquiry/EnquireButton'
import { INCLUSIONS, COMPANY } from '@/data/content'

export const revalidate = 3600

export async function generateStaticParams() {
  return (await getDesigns()).map((d) => ({ slug: d.slug }))
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params
  const design = await getDesign(slug)
  if (!design) return { title: 'Design not found' }
  return {
    title: design.name,
    description:
      design.tagline ?? design.description?.slice(0, 155) ?? `${design.name} — ${specLine(design)}. A 6Homes modular home.`,
    alternates: { canonical: `/models/${design.slug}` },
    openGraph: design.heroImage ? { images: [design.heroImage] } : undefined,
  }
}

export default async function DesignPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const design = await getDesign(slug)
  if (!design) notFound()

  const all = await getDesigns()
  const related = all.filter((d) => d.slug !== design.slug && d.bedrooms === design.bedrooms)
  const price = publicPrice(design)
  const inclusions = design.inclusions?.length ? design.inclusions : INCLUSIONS

  // The specification, as a drawing's title block: label left, value right.
  const specs: [string, string][] = [
    design.bedrooms ? ['Bedrooms', String(design.bedrooms)] : null,
    design.bathrooms ? ['Bathrooms', String(design.bathrooms)] : null,
    design.areaSqm ? ['Internal area', `${design.areaSqm} m²`] : null,
    design.dimensions ? ['Modules', design.dimensions] : null,
    price ? ['Price from', price] : null,
  ].filter((r): r is [string, string] => !!r)

  return (
    <>
      {/* ── Plate ──────────────────────────────────────────────────────────
          The photograph runs the full width beneath a title block, the way a
          drawing sheet carries its subject. */}
      <section className="border-b border-rule bg-paper pt-28 md:pt-36">
        <div className="container-page">
          <Link href="/models" className="spec text-mute transition-colors hover:text-ink">
            ← The range
          </Link>

          <div className="mt-8 grid items-end gap-8 border-b border-rule pb-10 md:grid-cols-[1.4fr_1fr] md:gap-16">
            <div>
              <p className="eyebrow animate-rise">{specLine(design)}</p>
              <h1 className="display mt-5 animate-rise" style={{ animationDelay: '90ms' }}>
                {design.name}
              </h1>
            </div>
            {design.tagline && (
              <p className="lead animate-rise text-mute md:pb-3" style={{ animationDelay: '180ms' }}>
                {design.tagline}
              </p>
            )}
          </div>
        </div>

        <div className="relative mt-10 aspect-[16/9] w-full md:aspect-[21/9]">
          {design.heroImage ? (
            <Image
              src={design.heroImage}
              alt={design.name}
              fill
              priority
              sizes="100vw"
              className="animate-fade object-cover"
            />
          ) : (
            <Frame alt={design.name} ratio="h-full" />
          )}
          {design.areaSqm && (
            <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-ink/70 to-transparent pt-24 pb-6 md:pb-10">
              <div className="container-page">
                <Dim tone="light">{design.areaSqm} m²</Dim>
              </div>
            </div>
          )}
        </div>
      </section>

      {/* ── Title block + description ─────────────────────────────────────── */}
      <div className="container-page grid gap-12 py-16 md:grid-cols-[1.4fr_1fr] md:gap-20 md:py-24">
        <Reveal>
          {design.description && <p className="lead max-w-xl">{design.description}</p>}

          <h2 className="spec-lg mt-14 text-teal-deep">Included as standard</h2>
          <ul className="mt-6 border-t border-rule">
            {inclusions.map((item, i) => (
              <li key={item} className="flex items-baseline gap-6 border-b border-rule py-4">
                <span className="spec shrink-0 text-mute/50">{String(i + 1).padStart(2, '0')}</span>
                <span className="text-[15px]">{item}</span>
              </li>
            ))}
          </ul>
        </Reveal>

        <Reveal delay={120} className="md:sticky md:top-28 md:self-start">
          <h2 className="spec text-mute">Specification</h2>
          <dl className="mt-5 border-t border-rule">
            {specs.map(([label, value]) => (
              <div key={label} className="flex items-baseline justify-between gap-6 border-b border-rule py-3.5">
                <dt className="spec text-mute">{label}</dt>
                <dd className="font-mono text-[13px] text-ink">{value}</dd>
              </div>
            ))}
          </dl>

          {price && (
            <p className="prose-body mt-5 !text-[12px]">
              Base price only. Site works move with the block — access, slope, services and council. We quote those after
              a site assessment rather than guessing here.
            </p>
          )}

          <div className="mt-9 flex flex-col gap-4">
            <EnquireButton intent="pricelist" designSlug={design.slug} source={`design-${design.slug}`}>
              Get the price list
            </EnquireButton>
            <EnquireButton
              intent="consultation"
              variant="rule"
              designSlug={design.slug}
              source={`design-${design.slug}`}
            >
              Book a consultation
            </EnquireButton>
            {design.tourUrl && (
              <a href={design.tourUrl} target="_blank" rel="noreferrer noopener" className="btn-rule">
                Take the 3D tour
              </a>
            )}
          </div>
        </Reveal>
      </div>

      {/* ── Floorplan ─────────────────────────────────────────────────────── */}
      {design.floorplanImage && (
        <section className="border-y border-rule bg-panel/60 py-16 md:py-24">
          <div className="container-page">
            <Reveal>
              <div className="flex items-baseline justify-between gap-6">
                <h2 className="spec-lg text-teal-deep">Floorplan</h2>
                {design.dimensions && <span className="font-mono text-[12px] text-mute">{design.dimensions}</span>}
              </div>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={design.floorplanImage}
                alt={`${design.name} floorplan`}
                className="mt-8 w-full bg-white object-contain p-6 md:p-12"
              />
            </Reveal>
          </div>
        </section>
      )}

      {/* ── Gallery ───────────────────────────────────────────────────────── */}
      {design.gallery && design.gallery.length > 0 && (
        <Section eyebrow="Inside" title={`The ${design.name}, built`}>
          <div className="grid gap-6 md:grid-cols-2">
            {design.gallery.map((src, i) => (
              <Reveal key={src} delay={i * 80}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={src} alt={`${design.name} — ${i + 1}`} loading="lazy" className="aspect-[4/3] w-full object-cover" />
              </Reveal>
            ))}
          </div>
        </Section>
      )}

      {/* ── Related ───────────────────────────────────────────────────────── */}
      {related.length > 0 && (
        <Section eyebrow="Same bedroom count" title="Worth comparing" className="border-t border-rule">
          <SpecIndex designs={related} />
        </Section>
      )}

      <section className="bg-deep py-20 text-white md:py-28">
        <div className="container-page">
          <Reveal className="max-w-2xl">
            <p className="spec text-teal">Display showroom</p>
            <h2 className="display-sm mt-6">See the {design.name} in person</h2>
            <p className="prose-body mt-6 max-w-lg !text-white/60">
              {COMPANY.showroom}. Parking on site, and no appointment pressure — come and stand in one.
            </p>
            <EnquireButton
              intent="tour"
              variant="outline-light"
              designSlug={design.slug}
              source={`design-${design.slug}`}
              className="mt-10"
            >
              Book a showroom tour
            </EnquireButton>
          </Reveal>
        </div>
      </section>
    </>
  )
}
