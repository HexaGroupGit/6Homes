import type { MetadataRoute } from 'next'
import { COMPANY } from '@/data/content'

// Lets the site be saved to a phone home screen with the real mark rather than a
// screenshot of the page. The maskable icon matters on Android, where the
// launcher crops to its own shape — a non-maskable icon gets its corners cut off.
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: `${COMPANY.name} — ${COMPANY.tagline}`,
    short_name: COMPANY.name,
    description: COMPANY.intro,
    start_url: '/',
    display: 'standalone',
    background_color: '#F2F4F4',
    theme_color: '#00515A',
    icons: [
      { src: '/brand/icon-192.png', sizes: '192x192', type: 'image/png' },
      { src: '/brand/icon-512.png', sizes: '512x512', type: 'image/png' },
      { src: '/brand/icon-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
    ],
  }
}
