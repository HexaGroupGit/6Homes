import type { Metadata, Viewport } from 'next'
import { Archivo, IBM_Plex_Mono } from 'next/font/google'
import './globals.css'
import { COMPANY } from '@/data/content'
import { EnquiryProvider } from '@/components/enquiry/EnquiryProvider'
import Header from '@/components/Header'
import Footer from '@/components/Footer'
import MotionRoot from '@/components/motion/MotionRoot'
import Preloader from '@/components/motion/Preloader'
import Ruler from '@/components/motion/Ruler'

// Archivo carries the whole voice. Loading the width axis is the point — the
// headings are set expanded (wdth 118), which is what makes them read as
// architectural signage rather than as another default grotesque.
const archivo = Archivo({
  subsets: ['latin'],
  axes: ['wdth'],
  variable: '--font-archivo',
  display: 'swap',
})

// Plex Mono is an engineering typeface. It is used only where the content is
// genuinely data — dimensions, areas, step numbers, phone numbers.
const mono = IBM_Plex_Mono({
  subsets: ['latin'],
  weight: ['400', '500'],
  variable: '--font-mono',
  display: 'swap',
})

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://6homes.com'

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: `${COMPANY.name} — ${COMPANY.tagline}`,
    template: `%s · ${COMPANY.name}`,
  },
  description: COMPANY.intro,
  openGraph: { type: 'website', siteName: COMPANY.name, locale: 'en_AU' },
  alternates: { canonical: '/' },
}

// Tints the browser chrome on mobile to the deep end of the brand gradient, so
// the address bar matches the tile the favicon sits on.
export const viewport: Viewport = {
  themeColor: '#00515A',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  // LocalBusiness structured data, so a search for "modular homes Box Hill"
  // surfaces the showroom address and phone rather than just the domain.
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'HomeAndConstructionBusiness',
    name: COMPANY.name,
    legalName: COMPANY.legalName,
    description: COMPANY.intro,
    url: SITE_URL,
    telephone: '1800646637',
    email: COMPANY.email,
    address: {
      '@type': 'PostalAddress',
      streetAddress: '4/830 Whitehorse Road',
      addressLocality: 'Box Hill',
      addressRegion: 'VIC',
      postalCode: '3128',
      addressCountry: 'AU',
    },
    sameAs: Object.values(COMPANY.social),
  }

  return (
    <html lang="en-AU" className={`${archivo.variable} ${mono.variable}`}>
      <body className="flex min-h-screen flex-col">
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
        <EnquiryProvider>
          <MotionRoot />
          <Preloader />
          <Header />
          <main className="flex-1">{children}</main>
          <div data-bg="dark">
            <Footer />
          </div>
          <Ruler />
        </EnquiryProvider>
      </body>
    </html>
  )
}
