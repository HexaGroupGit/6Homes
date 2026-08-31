/** @type {import('next').NextConfig} */

// 301s from the WordPress site this replaces. Every URL that had traffic or a
// backlink keeps working — losing those would undo years of ranking for the
// sake of a tidier URL scheme.
const designSlugs = [
  'elsey', 'alton', 'avon', 'belford', 'murray', 'selina', 'norfolk', 'miranda', 'dawson', 'claremont',
]
const projectSlugs = [
  'lockyer-valley', 'ipswich', 'ballarat', 'woodside-beach', 'brisbane', 'boonah-qld',
  'redbank-valley', 'brisbane-2', 'tasmania',
]

const nextConfig = {
  // This repo has a lockfile at the root and one here; without this Next picks
  // the root and warns on every start.
  turbopack: { root: import.meta.dirname },

  images: {
    remotePatterns: [
      // Design galleries served from Supabase Storage.
      { protocol: 'https', hostname: '*.supabase.co', pathname: '/storage/v1/object/public/**' },
    ],
  },
  async redirects() {
    return [
      // WordPress kept every model at the root — they now live under /models.
      ...designSlugs.map((slug) => ({ source: `/${slug}`, destination: `/models/${slug}`, permanent: true })),
      // …and every project at the root too.
      ...projectSlugs.map((slug) => ({ source: `/${slug}`, destination: `/projects/${slug}`, permanent: true })),

      // WooCommerce scaffolding that never had products in it.
      { source: '/shop', destination: '/models', permanent: true },
      { source: '/cart', destination: '/models', permanent: true },
      { source: '/checkout', destination: '/models', permanent: true },
      { source: '/my-account', destination: '/contact', permanent: true },
      { source: '/sample-page', destination: '/', permanent: true },
      // The blog was published but never had a post in it.
      { source: '/blog', destination: '/projects', permanent: true },
    ]
  },
}

export default nextConfig
