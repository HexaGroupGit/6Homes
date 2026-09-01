import type { Metadata } from 'next'
import Link from 'next/link'
import { getTours, specLine } from '@/lib/crm'
import { PageHero, Dim } from '@/components/ui'
import Reveal from '@/components/Reveal'
import EnquireButton from '@/components/enquiry/EnquireButton'
import { COMPANY, EXTRA_TOURS } from '@/data/content'

export const revalidate = 3600

export const metadata: Metadata = {
  title: '3D Tours',
  description:
    'Walk through the 6Homes modular designs in an immersive 3D tour — the Murray, the Selina and the Darling — and experience the space before you build.',
  alternates: { canonical: '/3d-virtual-tours' },
}

type Tour = { key: string; name: string; url: string; spec?: string; slug?: string; note?: string }

export default async function ToursPage() {
  const designs = await getTours()

  // Tours attached to a design, then any that have no design to hang from.
  const tours: Tour[] = [
    ...designs.map((d) => ({ key: d.id, name: d.name, url: d.tourUrl as string, spec: specLine(d), slug: d.slug })),
    ...EXTRA_TOURS.map((t) => ({ key: t.name, name: t.name, url: t.tourUrl, note: t.note })),
  ]

  return (
    <>
      <PageHero eyebrow="Virtual tours" title="Walk it before you build it" dim={`${tours.length} tours`}>
        <p>
          The closest thing to standing inside one without driving to Box Hill — though we would still recommend the
          drive.
        </p>
      </PageHero>

      <div className="container-page py-16 md:py-24">
        {tours.length === 0 ? (
          <Reveal className="border-t border-rule pt-14">
            <div className="max-w-xl">
              <Dim>In progress</Dim>
              <h2 className="display-sm mt-8">Tours are being rebuilt</h2>
              <p className="prose-body mt-6">
                Until they land, the floorplans and photography are on every design page — or come and see the real
                thing at {COMPANY.showroom}.
              </p>
              <div className="mt-10 flex flex-wrap gap-4">
                <EnquireButton intent="tour" source="tours-empty">
                  Book a showroom tour
                </EnquireButton>
                <Link href="/models" className="btn">
                  Browse the range
                </Link>
              </div>
            </div>
          </Reveal>
        ) : (
          <div className="space-y-16 md:space-y-24">
            {tours.map((tour, i) => (
              <Reveal key={tour.key} delay={Math.min(i * 80, 240)}>
                <article className="border-t border-rule pt-8">
                  <div className="flex flex-wrap items-baseline justify-between gap-4">
                    <div>
                      <p className="spec text-mute">{tour.spec ?? tour.note ?? 'Virtual tour'}</p>
                      <h2 className="display-sm mt-3">{tour.name}</h2>
                    </div>
                    <div className="flex flex-wrap items-center gap-6">
                      {tour.slug && (
                        <Link href={`/models/${tour.slug}`} className="btn-rule">
                          Specification
                        </Link>
                      )}
                      <a href={tour.url} target="_blank" rel="noreferrer noopener" className="btn-rule">
                        Open full screen
                      </a>
                    </div>
                  </div>

                  {/*
                    Matterport is a heavy third-party embed. Lazy-loading keeps
                    the page from pulling three of them on first paint, and
                    allow-fullscreen is what lets the walkthrough go full screen.
                  */}
                  <div className="mt-8 aspect-[16/10] w-full bg-panel">
                    <iframe
                      src={tour.url}
                      title={`${tour.name} — 3D virtual tour`}
                      loading="lazy"
                      allowFullScreen
                      allow="xr-spatial-tracking; fullscreen"
                      referrerPolicy="no-referrer-when-downgrade"
                      className="size-full border-0"
                    />
                  </div>

                  {tour.note && <p className="prose-body mt-4 !text-[13px]">{tour.note}</p>}
                </article>
              </Reveal>
            ))}
          </div>
        )}
      </div>

      
    </>
  )
}
