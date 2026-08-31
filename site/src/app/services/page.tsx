import type { Metadata } from 'next'
import Link from 'next/link'
import Image from 'next/image'
import { SERVICES, INCLUSIONS } from '@/data/content'
import { PageHero, Section, Dim } from '@/components/ui'
import Reveal from '@/components/Reveal'
import EnquireButton from '@/components/enquiry/EnquireButton'

export const metadata: Metadata = {
  title: 'Services',
  description:
    'Modular homes and buildings for residential and commercial projects — backyard studios, family homes, display suites, Airbnb accommodation and multi-unit developments.',
  alternates: { canonical: '/services' },
}

// Why modular actually wins. Three mechanisms, not three adjectives.
const WHY = [
  {
    n: '01',
    title: 'Weather stops mattering',
    body: 'Your home is built inside a factory. Rain does not stop work, nothing sits exposed waiting for a trade to come back, and no framing gets wet before it is closed in.',
  },
  {
    n: '02',
    title: 'Two jobs run at once',
    body: 'Foundations and services go in while the modules are being built. Running them in parallel rather than in sequence is where the months come off — not from cutting corners.',
  },
  {
    n: '03',
    title: 'Quality becomes repeatable',
    body: 'The same team, the same jigs, the same checks on every home. Factory conditions make a good result reproducible instead of dependent on who turned up that week.',
  },
]

export default function ServicesPage() {
  return (
    <>
      <PageHero eyebrow="What we build" title="Residential and commercial" dim="Studios to villages">
        <p>
          Premium modular homes and buildings for both, built faster and to the same specification whichever end of the
          scale you are at.
        </p>
      </PageHero>

      <div className="container-page grid border-b border-rule md:grid-cols-2">
        {SERVICES.map((service, i) => (
          <Reveal key={service.slug} delay={i * 100}>
            <div className={`flex h-full flex-col py-14 md:py-20 ${i === 0 ? 'md:border-r md:border-rule md:pr-16' : 'md:pl-16'}`}>
              <span className="spec text-mute/60">{String(i + 1).padStart(2, '0')}</span>
              <h2 className="display-sm mt-5">{service.title}</h2>
              <p className="prose-body mt-6 max-w-md flex-1">{service.body}</p>
              <EnquireButton intent={service.intent} source={`services-${service.slug}`} className="mt-10 self-start">
                {service.cta}
              </EnquireButton>
            </div>
          </Reveal>
        ))}
      </div>

      <Section eyebrow="Why modular" title="Three mechanisms, not a slogan">
        <div className="grid gap-12 lg:grid-cols-[1fr_1.15fr] lg:gap-16">
          {/* The factory floor. Steel frames on the line under a gantry crane is
              the argument for every claim in the list beside it. */}
          <Reveal className="lg:sticky lg:top-28 lg:self-start">
            <Image
              src="/media/Factory-5.jpg"
              alt="6Homes modules under construction on the factory floor"
              width={800}
              height={600}
              className="aspect-[4/3] w-full object-cover"
            />
            <Dim className="mt-5">Built under cover</Dim>
          </Reveal>

          <ol className="border-t border-rule">
            {WHY.map((item, i) => (
              <Reveal as="li" key={item.n} delay={i * 70}>
                <div className="border-b border-rule py-8">
                  <div className="flex items-baseline gap-5">
                    <span className="font-mono text-[13px] text-teal-deep">{item.n}</span>
                    <h3 className="display-xs">{item.title}</h3>
                  </div>
                  <p className="prose-body mt-3 max-w-xl">{item.body}</p>
                </div>
              </Reveal>
            ))}
          </ol>
        </div>
      </Section>

      <section className="border-t border-rule bg-panel/50 py-20 md:py-28">
        <div className="container-page grid gap-14 md:grid-cols-[1fr_1.15fr] md:gap-24">
          <Reveal>
            <p className="eyebrow">Standard, always</p>
            <h2 className="display-sm mt-5">
              Same specification,
              <br />
              every build
            </h2>
            <div className="mt-8 max-w-[220px]">
              <Dim>No upgrades</Dim>
            </div>
          </Reveal>
          <Reveal delay={120}>
            <ol className="border-t border-rule">
              {INCLUSIONS.map((item, i) => (
                <li key={item} className="flex items-baseline gap-6 border-b border-rule py-5">
                  <span className="spec shrink-0 text-teal-deep">{String(i + 1).padStart(2, '0')}</span>
                  <span className="text-[15px] leading-relaxed">{item}</span>
                </li>
              ))}
            </ol>
            <Link href="/our-process" className="btn-rule mt-10">
              How a build actually runs
            </Link>
          </Reveal>
        </div>
      </section>
    </>
  )
}
