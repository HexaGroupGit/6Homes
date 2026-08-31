import type { MetadataRoute } from 'next'

const SITE = (process.env.NEXT_PUBLIC_SITE_URL || 'https://6homes.com').replace(/\/+$/, '')

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: '*',
      allow: '/',
      // Nothing to gain from crawling the enquiry endpoint.
      disallow: '/api/',
    },
    sitemap: `${SITE}/sitemap.xml`,
  }
}
