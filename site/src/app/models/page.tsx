import type { Metadata } from 'next'
import { getDesigns } from '@/lib/crm'
import { PageHero, Section, SpecIndex, Dim } from '@/components/ui'
import Reveal from '@/components/Reveal'
import EnquireButton from '@/components/enquiry/EnquireButton'
import { COMPANY } from '@/data/content'

export const revalidate = 3600

export const metadata: Metadata = {
  title: 'The Range',
  description:
    'Ten modular home designs, from a 20m² studio to a 120m² four-bedroom home. Compare bedrooms, bathrooms, internal area and price in one index.',
  alternates: { canonical: '/models' },
}

// Buyers compare these homes on four numbers, so the range is set as an index
// rather than a card grid — aligned columns you can read down, the way a
// manufacturer's catalogue actually works. Grouping is by bedroom count because
// that is the first filter anyone applies.
const GROUPS = [
  { beds: 1, label: 'One bedroom' },
  { beds: 2, label: 'Two bedrooms' },
  { beds: 3, label: 'Three bedrooms' },
  { beds: 4, label: 'Four bedrooms' },
]

export default async function ModelsPage() {
  const designs = await getDesigns()

  const grouped = GROUPS.map((g) => ({ ...g, designs: designs.filter((d) => d.bedrooms === g.beds) })).filter(
    (g) => g.designs.length
  )
  const ungrouped = designs.filter((d) => !GROUPS.some((g) => g.beds === d.bedrooms))
  const areas = designs.map((d) => d.areaSqm ?? 0).filter(Boolean)

  return (
    <>
      <PageHero
        eyebrow="Specification index"
        title="The range"
        dim={areas.length ? `${Math.min(...areas)} — ${Math.max(...areas)} m²` : undefined}
      >
        <p>
          Ten designs, each a fixed specification. The kitchen, the glazing and the finish do not change between them —
          only the footprint does.
        </p>
      </PageHero>

      <div className="container-page space-y-16 py-16 md:space-y-20 md:py-24">
        {grouped.map((group) => (
          <section key={group.beds}>
            <div className="mb-6 flex items-baseline justify-between gap-6">
              <h2 className="spec-lg text-teal-deep">{group.label}</h2>
              <span className="spec text-mute">
                {group.designs.length} {group.designs.length === 1 ? 'design' : 'designs'}
              </span>
            </div>
            <SpecIndex designs={group.designs} />
          </section>
        ))}

        {ungrouped.length > 0 && (
          <section>
            <h2 className="spec-lg mb-6 text-teal-deep">Also in the range</h2>
            <SpecIndex designs={ungrouped} />
          </section>
        )}
      </div>

      {/* The two documents and the showroom. Most people want the numbers before
          they want a conversation, so the downloads come before the CTA. */}
      <Section className="bg-panel/50" eyebrow="Take it away with you" title="Three ways to go deeper">
        <div className="grid gap-px border-t border-rule md:grid-cols-3">
          {[
            {
              n: '01',
              title: 'The brochure',
              body: 'Every design, every floorplan, and a plain guide to how modular building and buying actually works.',
              action: (
                <EnquireButton intent="brochure" variant="rule" source="models-trio">
                  Download
                </EnquireButton>
              ),
            },
            {
              n: '02',
              title: 'The price list',
              body: 'Base pricing across the range, with the full breakdown of what is and is not included.',
              action: (
                <EnquireButton intent="pricelist" variant="rule" source="models-trio">
                  Download
                </EnquireButton>
              ),
            },
            {
              n: '03',
              title: 'The showroom',
              body: `See the build quality in person. ${COMPANY.showroom}, parking on site.`,
              action: (
                <EnquireButton intent="tour" variant="rule" source="models-trio">
                  Book a tour
                </EnquireButton>
              ),
            },
          ].map((item, i) => (
            <Reveal key={item.n} delay={i * 80}>
              <div className="flex h-full flex-col border-b border-rule py-8 md:border-b-0 md:pr-10">
                <span className="spec text-mute/60">{item.n}</span>
                <h3 className="display-xs mt-4">{item.title}</h3>
                <p className="prose-body mt-4 flex-1">{item.body}</p>
                <div className="mt-7">{item.action}</div>
              </div>
            </Reveal>
          ))}
        </div>
      </Section>

      <section className="bg-deep py-20 text-white md:py-28">
        <div className="container-page">
          <Reveal className="max-w-2xl">
            <div className="max-w-xs">
              <Dim tone="light">
                Which one fits
              </Dim>
            </div>
            <h2 className="display-sm mt-8">Not sure which suits your block?</h2>
            <p className="prose-body mt-6 max-w-lg !text-white/60">
              Send us the address. We will tell you what fits, what the site work is likely to involve, and plainly if
              modular is the wrong answer for that piece of land.
            </p>
            <EnquireButton intent="consultation" variant="outline-light" source="models-cta" className="mt-10">
              Book a consultation
            </EnquireButton>
          </Reveal>
        </div>
      </section>
    </>
  )
}
