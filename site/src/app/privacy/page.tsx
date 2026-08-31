import type { Metadata } from 'next'
import { COMPANY } from '@/data/content'
import { PageHero } from '@/components/ui'
import Reveal from '@/components/Reveal'

// Plain-language, and specific rather than boilerplate — everything here is
// something the platform genuinely does.
//
// NOTE FOR THE 6HOMES TEAM: have your legal adviser review this before launch,
// and add your ABN and a named privacy contact.

export const metadata: Metadata = {
  title: 'Privacy',
  description: `How ${COMPANY.name} collects, uses and stores the personal information you give us through this website.`,
  alternates: { canonical: '/privacy' },
}

const SECTIONS = [
  {
    n: '01',
    title: 'What we collect',
    body: 'When you submit a form on this site we collect what you give us: your name, email address, phone number, suburb or postcode, and anything you write in the message field. Some forms also ask for a budget range and timeframe — those are optional and you can leave them blank.',
  },
  {
    n: '02',
    title: 'Why we collect it',
    body: 'To respond to your enquiry: to send the brochure or price list you asked for, to arrange a consultation or showroom visit, to prepare a quote, and to keep you updated on your build if you go ahead. We also record which design you were looking at when you enquired, so whoever calls you knows what you are interested in.',
  },
  {
    n: '03',
    title: 'Follow-up emails',
    body: 'If you enquire and we do not hear back, we may send up to three follow-up emails over the following two weeks. They stop as soon as you reply, book a time, or ask us to stop. You can be removed at any time by replying to any email from us, and we will not contact you again.',
  },
  {
    n: '04',
    title: 'Who can see it',
    body: 'The 6Homes team who need it to respond to you. We do not sell your information, and we do not pass it to third parties for their own marketing.',
  },
  {
    n: '05',
    title: 'Where it is stored',
    body: 'Enquiries are stored in our own customer system, hosted on Supabase. Email is sent through Resend. Both are reputable providers and both may store data outside Australia. We do not store payment card details on this website.',
  },
  {
    n: '06',
    title: 'How long we keep it',
    body: 'While there is a reasonable prospect you may want to build with us, and — for records relating to an actual build — for as long as we are required to for contractual, warranty and tax purposes.',
  },
  {
    n: '07',
    title: 'Access and correction',
    body: 'You can ask what we hold about you, ask us to correct it, or ask us to delete it. Email us and we will action it. If something we hold is wrong, tell us — it is in both our interests that it is right.',
  },
  {
    n: '08',
    title: 'Cookies',
    body: 'This site sets no advertising or tracking cookies. Anything stored in your browser is there to make the site work.',
  },
]

export default function PrivacyPage() {
  return (
    <>
      <PageHero eyebrow="Privacy" title="What we do with your details">
        <p>
          The short version: we use what you give us to answer your enquiry and, if you go ahead, to build your home. We
          do not sell it, and you can ask us to stop emailing at any time.
        </p>
      </PageHero>

      <div className="container-page py-16 md:py-24">
        <div className="border-t border-rule">
          {SECTIONS.map((section, i) => (
            <Reveal key={section.n} delay={Math.min(i * 40, 200)}>
              <section className="grid gap-y-3 border-b border-rule py-8 md:grid-cols-[auto_1fr_1.6fr] md:gap-x-12">
                <span className="font-mono text-[13px] text-teal-deep md:w-12">{section.n}</span>
                <h2 className="display-xs">{section.title}</h2>
                <p className="prose-body max-w-2xl">{section.body}</p>
              </section>
            </Reveal>
          ))}

          <Reveal>
            <section className="grid gap-y-3 border-b border-rule py-8 md:grid-cols-[auto_1fr_1.6fr] md:gap-x-12">
              <span className="font-mono text-[13px] text-teal-deep md:w-12">09</span>
              <h2 className="display-xs">Contact us about privacy</h2>
              <p className="prose-body max-w-2xl">
                Email{' '}
                <a href={`mailto:${COMPANY.email}`} className="text-teal-deep hover:underline">
                  {COMPANY.email}
                </a>{' '}
                or call{' '}
                <a href={COMPANY.phoneHref} className="text-teal-deep hover:underline">
                  {COMPANY.phone}
                </a>
                . Our registered office is {COMPANY.headOffice}.
              </p>
            </section>
          </Reveal>
        </div>
      </div>
    </>
  )
}
