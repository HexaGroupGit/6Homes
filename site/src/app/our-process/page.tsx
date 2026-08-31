import type { Metadata } from 'next'
import Image from 'next/image'
import { PROCESS_STEPS, FAQS, COMPANY } from '@/data/content'
import { PageHero, Section, ProcessList, Faq, StatRail, Dim } from '@/components/ui'
import Reveal from '@/components/Reveal'
import EnquireButton from '@/components/enquiry/EnquireButton'

export const metadata: Metadata = {
  title: 'Process',
  description:
    'How a 6Homes build runs — consultation, design, site assessment, permits, factory construction, delivery and handover — and the questions people ask along the way.',
  alternates: { canonical: '/our-process' },
}

const STATS = [
  { value: '08', label: 'Stages, first call to keys' },
  { value: '~4 months', label: 'Design approval to delivery' },
  { value: 'Days', label: 'On-site installation' },
  { value: 'One', label: 'Company answerable' },
]

export default function ProcessPage() {
  // These are the exact questions people type into a search box, so they are
  // worth being eligible for a rich result.
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: FAQS.map((f) => ({
      '@type': 'Question',
      name: f.q,
      acceptedAnswer: { '@type': 'Answer', text: f.a },
    })),
  }

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />

      <PageHero eyebrow="How a build runs" title="First call to keys">
        <p>
          Building on site means a year of trades, weather and waiting. Modular takes most of that out — your home is
          manufactured while your block is prepared, and the two happen at once.
        </p>
      </PageHero>

      <div className="container-page">
        <StatRail items={STATS} />
      </div>

      {/* The single frame that proves the whole proposition: a finished home,
          glazed and fitted out, being craned onto its footings. It sat unused in
          the old media library. */}
      <section className="relative mt-16 aspect-[16/9] w-full md:mt-24 md:aspect-[21/9]">
        <Image
          src="/media/Install-4.jpg"
          alt="A completed 6Homes module being craned onto its footings on site"
          fill
          sizes="100vw"
          className="object-cover"
        />
        <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-ink/70 to-transparent pt-24 pb-6 md:pb-10">
          <div className="container-page">
            <Dim tone="light">Installation · days, not months</Dim>
          </div>
        </div>
      </section>

      <Section>
        <ProcessList steps={PROCESS_STEPS} />
        <Reveal className="mt-14 max-w-2xl">
          <div className="max-w-xs">
            <Dim>Roughly 4 months</Dim>
          </div>
          <p className="prose-body mt-6">
            That is measured from the point your layouts, finishes and fixtures are signed off and the deposit is paid —
            not from the first phone call. Approvals and site conditions sit in front of it, and they vary by council.
          </p>
        </Reveal>
      </Section>

      <Section id="faq" eyebrow="Questions" title="Answered plainly" className="bg-panel/50 scroll-mt-24">
        <Faq items={FAQS} />
      </Section>

      <section className="bg-deep py-20 text-white md:py-28">
        <div className="container-page">
          <Reveal className="max-w-2xl">
            <p className="spec text-teal">Still unanswered</p>
            <h2 className="display-sm mt-6">Ask us the awkward one</h2>
            <p className="prose-body mt-6 max-w-lg !text-white/60">
              Cost, permits, what happens when a site assessment comes back badly. A consultation is free and there is
              nothing to sign at the end of it.
            </p>
            <div className="mt-10 flex flex-wrap items-center gap-6">
              <EnquireButton intent="consultation" variant="outline-light" source="process-cta">
                Book a consultation
              </EnquireButton>
              <a href={COMPANY.phoneHref} className="btn-rule btn-rule-light">
                Or call {COMPANY.phone}
              </a>
            </div>
          </Reveal>
        </div>
      </section>
    </>
  )
}
