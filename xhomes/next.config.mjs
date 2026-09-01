import path from 'node:path'
import { fileURLToPath } from 'node:url'

const here = path.dirname(fileURLToPath(import.meta.url))

/** @type {import('next').NextConfig} */
const nextConfig = {
  // Two lockfiles live in this repo (the 6Homes site at the root, this app
  // here). Without an explicit root, Turbopack guesses the repo root and then
  // resolves postcss/tailwind config from the wrong directory — the entire
  // design system silently fails to load.
  turbopack: { root: here },
  images: {
    formats: ['image/avif', 'image/webp'],
  },
}

export default nextConfig
