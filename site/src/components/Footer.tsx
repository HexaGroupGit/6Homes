import Link from 'next/link'
import { COMPANY, NAV } from '@/data/content'
import Wordmark from './Wordmark'
import EnquireButton from './enquiry/EnquireButton'
import { Dim } from './ui'

const SOCIAL = [
  ['Instagram', COMPANY.social.instagram],
  ['LinkedIn', COMPANY.social.linkedin],
  ['Facebook', COMPANY.social.facebook],
  ['X', COMPANY.social.x],
] as const

export default function Footer() {
  return (
    <footer className="bg-deep-2 text-white">
      {/* The closing address — the last thing on every page is an invitation to
          come and stand inside one. */}
      <div className="container-page border-b border-white/12 py-20 md:py-28">
        <div className="max-w-3xl">
          <p className="spec text-teal">Display showroom</p>
          <h2 className="display-sm mt-5 max-w-xl">Walk through one before you commit</h2>
          <p className="prose-body mt-7 max-w-lg !text-white/60">
            Photographs only go so far. Five minutes inside a finished home tells you what a floorplan cannot — the
            ceiling height, the joinery, the way the light lands.
          </p>
          <div className="mt-10 flex flex-wrap items-center gap-6">
            <EnquireButton intent="tour" variant="outline-light" source="footer">
              Book a showroom tour
            </EnquireButton>
            <a
              href={COMPANY.showroomMapUrl}
              target="_blank"
              rel="noreferrer noopener"
              className="btn-rule btn-rule-light"
            >
              {COMPANY.showroom}
            </a>
          </div>
        </div>
      </div>

      <div className="container-page grid gap-12 py-16 md:grid-cols-[1.3fr_1fr_1fr] md:gap-16">
        <div>
          <Wordmark size="lg" tone="white" />
          <p className="prose-body mt-5 max-w-xs !text-white/50">{COMPANY.intro}</p>
          <div className="mt-8 max-w-[240px]">
            <Dim tone="light">
              20—120 m²
            </Dim>
          </div>
        </div>

        <nav aria-label="Footer">
          <h2 className="spec text-white/40">Index</h2>
          <ul className="mt-5 space-y-3">
            {NAV.map((item) => (
              <li key={item.href}>
                <Link
                  href={item.href}
                  className="spec-lg text-white/75 transition-colors duration-500 ease-drafting hover:text-teal"
                >
                  {item.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>

        <div>
          <h2 className="spec text-white/40">Contact</h2>
          <address className="mt-5 space-y-4 text-sm not-italic">
            <div>
              <a href={COMPANY.phoneHref} className="font-mono text-base text-white hover:text-teal">
                {COMPANY.phone}
              </a>
              <div className="spec mt-1 text-white/35">{COMPANY.phoneDigits}</div>
            </div>
            <div>
              <a href={`mailto:${COMPANY.email}`} className="font-mono text-[13px] text-white/70 hover:text-teal">
                {COMPANY.email}
              </a>
            </div>
            <div className="prose-body !text-[13px] !text-white/50">
              <span className="spec block text-white/35">Head office</span>
              {COMPANY.headOffice}
            </div>
          </address>

          <div className="mt-7 flex flex-wrap gap-x-5 gap-y-2">
            {SOCIAL.map(([label, href]) => (
              <a
                key={label}
                href={href}
                target="_blank"
                rel="noreferrer noopener"
                className="spec text-white/40 transition-colors duration-500 ease-drafting hover:text-teal"
              >
                {label}
              </a>
            ))}
          </div>
        </div>
      </div>

      <div className="container-page flex flex-col gap-3 border-t border-white/12 py-7 sm:flex-row sm:items-center sm:justify-between">
        <p className="spec text-white/35">
          © {new Date().getFullYear()} {COMPANY.legalName}
        </p>
        <Link href="/privacy" className="spec text-white/35 transition-colors hover:text-white/70">
          Privacy
        </Link>
      </div>
    </footer>
  )
}
