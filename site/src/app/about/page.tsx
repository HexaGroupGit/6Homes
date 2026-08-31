import type { Metadata } from 'next'
import Link from 'next/link'
import { COMPANY, INCLUSIONS } from '@/data/content'
import { PageHero, Section, Dim, StatRail } from '@/components/ui'
import Reveal from '@/components/Reveal'
import EnquireButton from '@/components/enquiry/EnquireButton'

// NOTE FOR THE 6HOMES TEAM
// The WordPress About page was never written — it still carries the theme's
// placeholder text ("Just a short sentence. This is just a demo text you should
// overwrite") and two stock founder profiles. None of that has been carried over.
//
// What is below says only what is demonstrably true: the locations, the range,
// the method and the inclusions. The founding story, the team and the factory
// are yours to tell — send them through and they go straight in here.

export const metadata: Metadata = {
  title: 'About',
  description: `${COMPANY.name} designs and delivers Australian modular homes at affordable prices, from a display showroom in Box Hill, Melbourne.`,
  alternates: { canonical: '/about' },
}

const STATS = [
  { value: '2', label: 'Box Hill addresses' },
  { value: '3', label: 'States delivered into' },
  { value: '10', label: 'Designs in the range' },
  { value: 'Turnkey', label: 'Permits through handover' },
]

export default function AboutPage() {
  return (
    <>
      <PageHero eyebrow="About" title="Homes for everyone, everywhere" dim="Australian made">
        <p>{COMPANY.intro}</p>
      </PageHero>

      <div className="container-page">
        <StatRail items={STATS} />
      </div>

      <Section eyebrow="The method" title="A better order of operations">
        <div className="grid gap-12 md:grid-cols-[1.3fr_1fr] md:gap-24">
          <Reveal>
            <div className="max-w-prose space-y-6">
              <p className="lead">
                Building a home on site means a year of trades, weather and waiting — and a price that moves the whole
                way through it.
              </p>
              <p className="prose-body">
                Modular takes most of that out. Your home is built inside our facility, under cover, by the same team
                working to the same checks every time, while your block is being prepared in parallel. Nothing gets wet
                before it is closed in, and nothing waits on a trade who did not turn up.
              </p>
              <p className="prose-body">
                What arrives is essentially finished: kitchen in, bathroom tiled, appliances fitted. Installation takes
                days rather than months. From the point your design and finishes are signed off, the usual timeline is
                around four months.
              </p>
              <p className="prose-body">
                We handle the whole of it — design, permits and approvals, manufacture, delivery, installation and
                handover — so there is one company answerable for the outcome rather than six pointing at each other.
              </p>
            </div>
            <Link href="/our-process" className="btn-rule mt-10">
              The process, stage by stage
            </Link>
          </Reveal>

          <Reveal delay={120}>
            <h2 className="spec text-mute">What we stand behind</h2>
            <ol className="mt-5 border-t border-rule">
              {INCLUSIONS.map((item, i) => (
                <li key={item} className="flex items-baseline gap-5 border-b border-rule py-4">
                  <span className="spec shrink-0 text-teal-deep">{String(i + 1).padStart(2, '0')}</span>
                  <span className="text-[14px] leading-relaxed">{item}</span>
                </li>
              ))}
            </ol>
            <p className="prose-body mt-5 !text-[13px]">
              Standard on every home. There is no cheaper version with the budget tapware in it.
            </p>
          </Reveal>
        </div>
      </Section>

      <Section eyebrow="Where to find us" title="Two addresses in Box Hill" className="bg-panel/50">
        <div className="grid gap-12 border-t border-rule pt-10 md:grid-cols-2 md:gap-20">
          <Reveal>
            <span className="spec text-mute/60">01</span>
            <h3 className="display-xs mt-4">Display showroom</h3>
            <p className="prose-body mt-4">
              <a href={COMPANY.showroomMapUrl} target="_blank" rel="noreferrer noopener" className="hover:text-teal-deep">
                {COMPANY.showroom}
              </a>
              <br />
              Walk through a completed home and see the finishes in person. Parking on site.
            </p>
            <EnquireButton intent="tour" variant="rule" source="about" className="mt-7">
              Book a tour
            </EnquireButton>
          </Reveal>

          <Reveal delay={100}>
            <span className="spec text-mute/60">02</span>
            <h3 className="display-xs mt-4">Head office</h3>
            <p className="prose-body mt-4">
              {COMPANY.headOffice}
              <br />
              <a href={COMPANY.phoneHref} className="font-mono text-[13px] text-ink hover:text-teal-deep">
                {COMPANY.phone} · {COMPANY.phoneDigits}
              </a>
            </p>
            <Link href="/contact" className="btn-rule mt-7">
              Every way to reach us
            </Link>
          </Reveal>
        </div>
      </Section>

      <section className="bg-deep py-20 text-white md:py-28">
        <div className="container-page">
          <Reveal className="max-w-2xl">
            <div className="max-w-[220px]">
              <Dim tone="light">
                Start here
              </Dim>
            </div>
            <h2 className="display-sm mt-8">Tell us about your block</h2>
            <p className="prose-body mt-6 max-w-lg !text-white/60">
              We will tell you what is realistic on it — including when the honest answer is that modular is not the
              right fit for that piece of land.
            </p>
            <EnquireButton intent="consultation" variant="outline-light" source="about-cta" className="mt-10">
              Book a free consultation
            </EnquireButton>
          </Reveal>
        </div>
      </section>
    </>
  )
}
