import type { Metadata } from 'next'
import { COMPANY } from '@/data/content'
import { PageHero, Section } from '@/components/ui'
import Reveal from '@/components/Reveal'
import EnquireButton from '@/components/enquiry/EnquireButton'

export const metadata: Metadata = {
  title: 'Contact',
  description: `Talk to 6Homes about your modular home. Call ${COMPANY.phone}, visit the Box Hill display showroom, or book a free consultation.`,
  alternates: { canonical: '/contact' },
}

const WAYS = [
  {
    n: '01',
    title: 'Book a consultation',
    body: 'Thirty to forty-five minutes on your block, your budget and which home fits. No obligation, nothing to sign.',
    intent: 'consultation' as const,
    cta: 'Book a time',
  },
  {
    n: '02',
    title: 'Visit the showroom',
    body: `Stand inside a finished home. ${COMPANY.showroom}, parking on site.`,
    intent: 'tour' as const,
    cta: 'Book a tour',
  },
  {
    n: '03',
    title: 'Start a project enquiry',
    body: 'Tell us what you are planning and we will come back to you within one business day.',
    intent: 'domestic' as const,
    cta: 'Send an enquiry',
  },
  {
    n: '04',
    title: 'Commercial and multi-unit',
    body: 'Accommodation villages, tourism cabins, worker housing, developments. Our project team calls you directly.',
    intent: 'commercial' as const,
    cta: 'Commercial enquiry',
  },
]

export default function ContactPage() {
  return (
    <>
      <PageHero eyebrow="Contact" title="Start the conversation" dim={COMPANY.phone}>
        <p>However you would rather begin — a call, a showroom visit, or just the price list in your inbox.</p>
      </PageHero>

      <div className="container-page grid gap-16 py-16 md:grid-cols-[1.5fr_1fr] md:gap-24 md:py-24">
        <div className="border-t border-rule">
          {WAYS.map((way, i) => (
            <Reveal key={way.n} delay={i * 70}>
              <div className="flex flex-col gap-4 border-b border-rule py-8 md:flex-row md:items-baseline md:gap-12">
                <span className="spec shrink-0 text-mute/60 md:w-10">{way.n}</span>
                <div className="flex-1">
                  <h2 className="display-xs">{way.title}</h2>
                  <p className="prose-body mt-3 max-w-md">{way.body}</p>
                </div>
                <EnquireButton intent={way.intent} variant="rule" source="contact" className="shrink-0 self-start">
                  {way.cta}
                </EnquireButton>
              </div>
            </Reveal>
          ))}
        </div>

        <Reveal delay={120} className="md:sticky md:top-28 md:self-start">
          <h2 className="spec text-mute">Direct</h2>
          <dl className="mt-5 border-t border-rule">
            <div className="border-b border-rule py-5">
              <dt className="spec text-mute">Phone</dt>
              <dd className="mt-2">
                <a href={COMPANY.phoneHref} className="font-mono text-xl text-navy hover:text-teal-deep">
                  {COMPANY.phone}
                </a>
                <span className="spec mt-1 block text-mute/60">{COMPANY.phoneDigits}</span>
              </dd>
            </div>
            <div className="border-b border-rule py-5">
              <dt className="spec text-mute">Email</dt>
              <dd className="mt-2">
                <a href={`mailto:${COMPANY.email}`} className="font-mono text-[13px] text-ink hover:text-teal-deep">
                  {COMPANY.email}
                </a>
              </dd>
            </div>
            <div className="border-b border-rule py-5">
              <dt className="spec text-mute">Display showroom</dt>
              <dd className="prose-body mt-2 !text-[13px] !text-ink">
                <a href={COMPANY.showroomMapUrl} target="_blank" rel="noreferrer noopener" className="hover:text-teal-deep">
                  {COMPANY.showroom}
                </a>
              </dd>
            </div>
            <div className="border-b border-rule py-5">
              <dt className="spec text-mute">Head office</dt>
              <dd className="prose-body mt-2 !text-[13px] !text-ink">{COMPANY.headOffice}</dd>
            </div>
          </dl>

          <h2 className="spec mt-12 text-mute">Just the documents</h2>
          <div className="mt-5 flex flex-col items-start gap-4">
            <EnquireButton intent="brochure" variant="rule" source="contact-downloads">
              The brochure
            </EnquireButton>
            <EnquireButton intent="pricelist" variant="rule" source="contact-downloads">
              The price list
            </EnquireButton>
          </div>
        </Reveal>
      </div>
    </>
  )
}
