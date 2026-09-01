import Link from 'next/link'
import Image from 'next/image'
import { COMPANY, BUILD_STEPS, INCLUSIONS, FAQS } from '@/data/content'
import { getDesigns, getProjects } from '@/lib/crm'
import { publicPrice } from '@/lib/crm'
import { Dim, StatRail, ProjectTile, Faq } from '@/components/ui'
import Reveal from '@/components/Reveal'
import EnquireButton from '@/components/enquiry/EnquireButton'
import DiveHero from '@/components/motion/DiveHero'
import FactoryLine from '@/components/motion/FactoryLine'
import InclusionsScene from '@/components/motion/InclusionsScene'
import Magnetic from '@/components/motion/Magnetic'
import CountUp from '@/components/motion/CountUp'
import type { Design } from '@/lib/crm'

export const revalidate = 3600

// The landing page is a film in six scenes: a camera dive into a home, the
// range as an editorial catalogue, the process as a horizontal production
// line, the specification read out over a home at dusk, the delivered work,
// and the questions. The motion grammar lives in src/lib/motion.ts; this file
// only choreographs content into it.
//
// Hero and set-piece imagery comes from the staged marketing renders
// (public/media/cine/) — chosen by hand, referenced by constant, because a
// scene is composed around its photograph.
const CINE = {
  hero: '/media/cine/dawson-three-quarter-front-view-among-misty.jpg',
  factory: '/media/cine/factory-interior-rows-of-finished-dark-modular.jpg',
  dusk: '/media/cine/dawson-ultrawide-twilight-shot-floating-skillion-roof.jpg',
  range: {
    Selina: '/media/cine/selina-dead-on-backyard-elevation-under-mature.jpg',
    Claremont: '/media/cine/claremont-l-shaped-charcoal-panel-home-wrapping.jpg',
    Avon: '/media/cine/avon-premium-cgi-dark-board-and-batten.jpg',
  } as Record<string, string>,
}

export default async function HomePage() {
  const [designs, projects] = await Promise.all([getDesigns(), getProjects()])

  const heroDesign = designs.find((d) => d.name === 'Dawson')
  const heroCaption = heroDesign
    ? [heroDesign.name, `${heroDesign.bedrooms} bed · ${heroDesign.bathrooms} bath`, heroDesign.areaSqm ? `${heroDesign.areaSqm} m²` : null]
        .filter(Boolean)
        .join(' · ')
    : 'Australian modular homes'

  // The three range scenes: one from each end of the catalogue, each with its
  // strongest render. A design missing from the CRM simply drops out.
  const featured = (['Avon', 'Selina', 'Claremont'] as const)
    .map((name) => designs.find((d) => d.name === name))
    .filter((d): d is Design => !!d)

  const areas = designs.map((d) => d.areaSqm ?? 0).filter(Boolean)
  const stats = [
    { value: String(designs.length), label: 'Designs in the range' },
    { value: areas.length ? `${Math.min(...areas)}–${Math.max(...areas)} m²` : '20–120 m²', label: 'Internal area' },
    { value: '~4 months', label: 'Design approval to delivery' },
    { value: 'Turnkey', label: 'Permits through handover' },
  ]

  return (
    <>
      {/* ── Scene 1 · The dive ──────────────────────────────────────────── */}
      <DiveHero
        image={CINE.hero}
        imageAlt="The Dawson — a three-bedroom 6Homes modular home among pines at golden hour"
        caption={<Dim tone="light">{heroCaption}</Dim>}
        title={
          <div className="px-6 pt-28 pb-14 md:px-10 lg:py-24 lg:pr-10 lg:pl-16" data-rv-w>
            <p className="spec text-mute" data-rv="a">
              Australian modular homes
            </p>
            <h1 className="display mt-5" data-rv="h">
              Homes for
              <br />
              everyone,
              <br />
              everywhere
            </h1>
            <p className="lead mt-8 max-w-md text-mute max-lg:hidden" data-rv="p">
              Built in a factory to the millimetre, delivered finished, and installed in days. Not a
              kit and not a caravan — a permanent home that simply was not assembled in the weather.
            </p>
            <div className="mt-10 flex flex-wrap gap-4" data-rv="ctn">
              <Magnetic>
                <Link href="/models" className="btn">
                  See the range
                </Link>
              </Magnetic>
              <EnquireButton intent="consultation" source="hero">
                Book a consultation
              </EnquireButton>
            </div>
          </div>
        }
        rail={
          <div className="container-page">
            <StatRail items={stats} />
          </div>
        }
      />

      {/* ── Scene 2 · The range ─────────────────────────────────────────── */}
      <section className="py-20 md:py-32">
        <div className="container-page">
          <div className="grid items-end gap-x-16 gap-y-4 md:grid-cols-[1.35fr_1fr]" data-rv-w>
            <div>
              <p className="eyebrow" data-rv="a">
                The range
              </p>
              <h2 className="display-sm mt-4" data-rv="h">
                {designs.length} homes, one bedroom to four
              </h2>
            </div>
            <p className="prose-body max-w-md md:pb-1" data-rv="p">
              Every home is a fixed specification with a fixed price — the same kitchen, the same
              double glazing, the same finish, whichever one you choose. What changes is the
              footprint.
            </p>
          </div>

          <div className="mt-14 md:mt-20">
            {featured.map((design, i) => (
              <RangeRow
                key={design.id}
                design={design}
                index={i}
                image={CINE.range[design.name] ?? design.heroImage ?? ''}
                flip={i % 2 === 1}
              />
            ))}
          </div>

          <div className="mt-14" data-rv="ctn">
            <Magnetic>
              <Link href="/models" className="btn">
                The full specification index
              </Link>
            </Magnetic>
          </div>
        </div>
      </section>

      {/* ── Scene 3 · The production line ───────────────────────────────── */}
      <FactoryLine steps={BUILD_STEPS} factoryImage={CINE.factory} />

      {/* ── Scene 4 · The specification, at dusk ────────────────────────── */}
      <InclusionsScene
        image={CINE.dusk}
        imageAlt="A 6Homes Dawson at twilight, interior lit, floating skillion roof"
        items={INCLUSIONS}
        heading={
          <h2 className="display-sm">
            Premium is the
            <br />
            specification
          </h2>
        }
        cta={
          <div className="flex flex-wrap items-center gap-6">
            <EnquireButton intent="pricelist" variant="outline-light" source="home-inclusions">
              Get the price list
            </EnquireButton>
            <EnquireButton intent="brochure" variant="rule-light" source="home-inclusions">
              Or the full brochure
            </EnquireButton>
          </div>
        }
      />

      {/* ── Scene 5 · Already standing ──────────────────────────────────── */}
      <section className="py-20 md:py-32">
        <div className="container-page">
          <div className="grid items-end gap-x-16 gap-y-4 md:grid-cols-[1.35fr_1fr]" data-rv-w>
            <div>
              <p className="eyebrow" data-rv="a">
                Delivered
              </p>
              <h2 className="display-sm mt-4" data-rv="h">
                Homes already standing
              </h2>
            </div>
            <p className="prose-body max-w-md md:pb-1" data-rv="p">
              Granny flats, off-grid retreats, hotel cabins and family homes — across Victoria,
              Queensland and Tasmania.
            </p>
          </div>

          <div className="mt-10 grid gap-10 md:mt-14 md:grid-cols-3 md:gap-8">
            {projects.slice(0, 3).map((p, i) => (
              <ProjectTile key={p.id} project={p} index={i} />
            ))}
          </div>

          <Reveal className="mt-14">
            <Link href="/projects" className="btn-rule">
              All {projects.length} projects
            </Link>
          </Reveal>
        </div>
      </section>

      {/* ── Scene 6 · Before you ask ────────────────────────────────────── */}
      <section className="bg-panel/50 py-20 md:py-28">
        <div className="container-page">
          <div data-rv-w>
            <p className="eyebrow" data-rv="a">
              Before you ask
            </p>
            <h2 className="display-sm mt-4" data-rv="h">
              The four we hear most
            </h2>
          </div>
          <div className="mt-10 md:mt-14">
            <Faq items={FAQS.slice(0, 4)} />
          </div>
          <Reveal className="mt-12 flex flex-wrap items-center gap-8">
            <Link href="/our-process#faq" className="btn-rule">
              Every question answered
            </Link>
            <a href={COMPANY.phoneHref} className="font-mono text-[13px] text-mute">
              Or just call — {COMPANY.phone}
            </a>
          </Reveal>
        </div>
      </section>
    </>
  )
}

/* One home, presented editorially: the photograph sweeps open and drifts, the
   spec column reads like the drawing's title block, and the area measures
   itself in. */
function RangeRow({
  design,
  image,
  index,
  flip,
}: {
  design: Design
  image: string
  index: number
  flip: boolean
}) {
  const price = publicPrice(design)
  return (
    <div
      className="hairline grid items-center gap-8 py-12 md:grid-cols-2 md:gap-16 md:py-20"
      data-rv-w
    >
      <div className={flip ? 'md:order-2' : ''}>
        <div className="plx-frame relative aspect-[4/3]" data-rv="img" data-plx="img">
          {image ? (
            <Image
              src={image}
              alt={`The ${design.name}`}
              fill
              sizes="(max-width: 768px) 100vw, 50vw"
              className="object-cover"
            />
          ) : null}
        </div>
      </div>
      <div className={flip ? 'md:order-1 md:pr-8' : 'md:pl-8'}>
        <p className="spec text-mute" data-rv="a">
          {String(index + 1).padStart(2, '0')} · {design.bedrooms} bed · {design.bathrooms} bath
        </p>
        <h3 className="display-sm mt-4" data-rv="h">
          {design.name}
        </h3>
        {design.tagline && (
          <p className="prose-body mt-5 max-w-md" data-rv="p">
            {design.tagline}
          </p>
        )}
        {design.areaSqm ? (
          <div className="mt-8 max-w-xs" data-rv="ctn">
            <Dim>
              <CountUp value={design.areaSqm} suffix=" m²" />
            </Dim>
          </div>
        ) : null}
        <div className="mt-8 flex flex-wrap items-center gap-6" data-rv="ctn">
          <Link href={`/models/${design.slug}`} className="btn-rule">
            See the {design.name}
          </Link>
          {price && (
            <span className="font-mono text-[13px] text-mute">{price.replace('A$', 'from $')}</span>
          )}
        </div>
      </div>
    </div>
  )
}
