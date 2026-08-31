import Link from 'next/link'
import Image from 'next/image'
import { COMPANY, BUILD_STEPS, INCLUSIONS, FAQS } from '@/data/content'
import { getDesigns, getProjects } from '@/lib/crm'
import { Dim, Section, StatRail, DesignRow, ProjectTile, ProcessList, Faq } from '@/components/ui'
import Reveal from '@/components/Reveal'
import EnquireButton from '@/components/enquiry/EnquireButton'

export const revalidate = 3600

// The hero is the Boonah off-grid Selina — a finished home in bushland beside a
// dam, which carries the whole proposition in one frame.
//
// Taken from the project record rather than a hardcoded filename. The migration
// re-encodes the library and renames files as it goes (Offgrid-7.png became
// Offgrid-7.jpg), and a hardcoded path silently 404s: next/image returns 400,
// the page renders a blank column, and nothing complains. Reading it from the
// data means a rename can never break it.
const HERO_PROJECT = 'boonah-qld'

export default async function HomePage() {
  const [designs, projects] = await Promise.all([getDesigns(), getProjects()])

  const heroProject = projects.find((p) => p.slug === HERO_PROJECT)
  // Fall through the data rather than ever rendering an empty column.
  const hero =
    heroProject?.heroImage ??
    projects.find((p) => p.heroImage)?.heroImage ??
    designs.find((d) => d.heroImage)?.heroImage ??
    null

  const heroDesign = designs.find((d) => d.name === heroProject?.designName)
  const heroCaption =
    [heroProject?.location, heroProject?.designName, heroDesign?.areaSqm ? `${heroDesign.areaSqm} m²` : null]
      .filter(Boolean)
      .join(' · ') || 'Australian modular homes'

  // One home from each end of the range rather than the first three, so the
  // page shows the spread from studio to family home.
  const featured = [
    designs.find((d) => d.bedrooms === 1 && d.areaSqm && d.areaSqm >= 40),
    designs.find((d) => d.bedrooms === 2 && d.bathrooms === 2),
    designs.find((d) => d.bedrooms === 4) ?? designs.find((d) => d.bedrooms === 3),
  ].filter((d): d is NonNullable<typeof d> => !!d)
  const showcase = featured.length === 3 ? featured : designs.slice(0, 3)

  const areas = designs.map((d) => d.areaSqm ?? 0).filter(Boolean)
  const stats = [
    { value: String(designs.length), label: 'Designs in the range' },
    { value: areas.length ? `${Math.min(...areas)}–${Math.max(...areas)} m²` : '20–120 m²', label: 'Internal area' },
    { value: '~4 months', label: 'Design approval to delivery' },
    { value: 'Turnkey', label: 'Permits through handover' },
  ]

  return (
    <>
      {/* ── Hero ───────────────────────────────────────────────────────────
          A split plate: the title block set on paper at the left, the
          photograph running to the right edge. Laying the headline over the
          photograph would need a scrim heavy enough to drown it — and the
          photograph is the argument. This way both get to be themselves. */}
      <section className="border-b border-rule bg-paper">
        <div className="mx-auto max-w-page">
          <div className="grid lg:min-h-[88svh] lg:grid-cols-[1.1fr_0.9fr]">
            <div className="flex min-w-0 flex-col justify-center px-6 pt-28 pb-14 md:px-10 lg:py-24 lg:pr-10 lg:pl-16">
              <p className="spec animate-rise text-mute">Australian modular homes</p>

              <h1 className="display mt-5 animate-rise" style={{ animationDelay: '90ms' }}>
                Homes for
                <br />
                everyone,
                <br />
                everywhere
              </h1>

              <p className="lead mt-8 max-w-md animate-rise text-mute" style={{ animationDelay: '150ms' }}>
                Built in a factory to the millimetre, delivered finished, and installed in days. Not a kit and not a
                caravan — a permanent home that simply was not assembled in the weather.
              </p>

              <div className="mt-10 flex flex-wrap gap-4 animate-rise" style={{ animationDelay: '230ms' }}>
                <Link href="/models" className="btn">
                  See the range
                </Link>
                <EnquireButton intent="consultation" source="hero">
                  Book a consultation
                </EnquireButton>
              </div>
            </div>

            <div className="relative min-w-0 min-h-[58svh] bg-panel lg:min-h-full">
              {hero && (
                <Image
                  src={hero}
                  alt="A completed 6Homes modular home installed in bushland beside a dam"
                  fill
                  priority
                  sizes="(max-width: 1024px) 100vw, 52vw"
                  className="object-cover"
                />
              )}
              {/* The annotation belongs on the plate, not on the title block. */}
              <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-ink/70 to-transparent p-6 pt-20 md:p-8 md:pt-24">
                <Dim tone="light">{heroCaption}</Dim>
              </div>
            </div>
          </div>
        </div>

        {/* Hard numbers, immediately. Most people arrive wanting to know how big,
            how long and how much before they will read a sentence. */}
        <div className="container-page">
          <StatRail items={stats} />
        </div>
      </section>

      {/* ── The range ─────────────────────────────────────────────────────── */}
      <Section
        eyebrow="The range"
        title={`${designs.length} homes, one bedroom to four`}
        intro={
          <>
            Every home is a fixed specification with a fixed price — the same kitchen, the same double glazing, the same
            finish, whichever one you choose. What changes is the footprint.
          </>
        }
      >
        <div>
          {showcase.map((design, i) => (
            <DesignRow key={design.id} design={design} flip={i % 2 === 1} />
          ))}
        </div>
        <Reveal className="mt-14">
          <Link href="/models" className="btn">
            The full specification index
          </Link>
        </Reveal>
      </Section>

      {/* ── Process ───────────────────────────────────────────────────────── */}
      <Section
        eyebrow="How a build runs"
        title="Six steps, in this order"
        intro="Your home is manufactured while your site is prepared. Running the two in parallel is where the months come off."
        className="bg-panel/50"
        id="process"
      >
        <ProcessList steps={BUILD_STEPS} />
        <Reveal className="mt-12">
          <Link href="/our-process" className="btn-rule">
            The process in full, with the permits
          </Link>
        </Reveal>
      </Section>

      {/* ── Inclusions — the dark field ───────────────────────────────────── */}
      <section className="bg-deep py-20 text-white md:py-32">
        <div className="container-page grid gap-14 md:grid-cols-[1fr_1.15fr] md:gap-24">
          <Reveal>
            <p className="spec text-teal">Standard, always</p>
            <h2 className="display-sm mt-5">
              Premium is the
              <br />
              specification
            </h2>
            <p className="prose-body mt-6 max-w-sm !text-white/60">
              There is no cheaper version of a 6Homes home with the budget tapware in it. This list is what arrives,
              every time, on every design.
            </p>
          </Reveal>

          <Reveal delay={120}>
            <ol className="border-t border-white/15">
              {INCLUSIONS.map((item, i) => (
                <li key={item} className="flex items-baseline gap-6 border-b border-white/15 py-5">
                  <span className="spec shrink-0 text-teal">{String(i + 1).padStart(2, '0')}</span>
                  <span className="text-[15px] leading-relaxed">{item}</span>
                </li>
              ))}
            </ol>
            <div className="mt-10 flex flex-wrap items-center gap-6">
              <EnquireButton intent="pricelist" variant="outline-light" source="home-inclusions">
                Get the price list
              </EnquireButton>
              <EnquireButton intent="brochure" variant="rule-light" source="home-inclusions">
                Or the full brochure
              </EnquireButton>
            </div>
          </Reveal>
        </div>
      </section>

      {/* ── Projects ──────────────────────────────────────────────────────── */}
      <Section
        eyebrow="Delivered"
        title="Homes already standing"
        intro="Granny flats, off-grid retreats, hotel cabins and family homes — across Victoria, Queensland and Tasmania."
      >
        <div className="grid gap-10 md:grid-cols-3 md:gap-8">
          {projects.slice(0, 3).map((p, i) => (
            <ProjectTile key={p.id} project={p} index={i} />
          ))}
        </div>
        <Reveal className="mt-14">
          <Link href="/projects" className="btn-rule">
            All {projects.length} projects
          </Link>
        </Reveal>
      </Section>

      {/* ── FAQ ───────────────────────────────────────────────────────────── */}
      <Section eyebrow="Before you ask" title="The four we hear most" className="bg-panel/50">
        <Faq items={FAQS.slice(0, 4)} />
        <Reveal className="mt-12 flex flex-wrap items-center gap-8">
          <Link href="/our-process#faq" className="btn-rule">
            Every question answered
          </Link>
          <a href={COMPANY.phoneHref} className="font-mono text-[13px] text-mute">
            Or just call — {COMPANY.phone}
          </a>
        </Reveal>
      </Section>
    </>
  )
}
