import type { Metadata, Viewport } from 'next'
import { Marcellus, Cormorant, Kumbh_Sans } from 'next/font/google'
import './globals.css'
import { COMPANY } from '@/data/content'
import MotionRoot from '@/components/motion/MotionRoot'
import Preloader from '@/components/Preloader'
import Header from '@/components/Header'

// Marcellus is the display voice X-Homes already speaks (their current site
// sets its hero in it) — Trajan-blooded caps that read carved rather than
// typeset. Cormorant italic leans across it as the accent; Kumbh Sans, their
// body face, does the quiet work.
const display = Marcellus({
  weight: '400',
  subsets: ['latin'],
  variable: '--font-display',
  display: 'swap',
})

const script = Cormorant({
  style: 'italic',
  weight: ['400', '500'],
  subsets: ['latin'],
  variable: '--font-script',
  display: 'swap',
})

const sans = Kumbh_Sans({
  subsets: ['latin'],
  variable: '--font-sans',
  display: 'swap',
})

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://x-homes.com.au'

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: `${COMPANY.name} — ${COMPANY.tagline}`,
    template: `%s · ${COMPANY.name}`,
  },
  description: COMPANY.blurb,
  openGraph: { type: 'website', siteName: COMPANY.name, locale: 'en_AU' },
  alternates: { canonical: '/' },
}

export const viewport: Viewport = {
  themeColor: '#0A0A0B',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'HomeAndConstructionBusiness',
    name: COMPANY.name,
    description: COMPANY.blurb,
    url: SITE_URL,
    telephone: '0370182130',
    email: COMPANY.email,
    address: {
      '@type': 'PostalAddress',
      streetAddress: 'L2, 10 Queen Street',
      addressLocality: 'Melbourne',
      addressRegion: 'VIC',
      postalCode: '3000',
      addressCountry: 'AU',
    },
  }

  return (
    <html lang="en-AU" className={`${display.variable} ${script.variable} ${sans.variable}`}>
      <body>
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
        <MotionRoot />
        <Preloader />
        <Header />
        <main>{children}</main>
      </body>
    </html>
  )
}
