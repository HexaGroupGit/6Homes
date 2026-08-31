import type { MetadataRoute } from 'next'
import { getDesigns, getProjects } from '@/lib/crm'

const SITE = (process.env.NEXT_PUBLIC_SITE_URL || 'https://6homes.com').replace(/\/+$/, '')

export const revalidate = 3600

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [designs, projects] = await Promise.all([getDesigns(), getProjects()])
  const now = new Date()

  const stat = (path: string, priority: number): MetadataRoute.Sitemap[number] => ({
    url: `${SITE}${path}`,
    lastModified: now,
    changeFrequency: 'monthly',
    priority,
  })

  return [
    stat('', 1),
    stat('/models', 0.9),
    stat('/projects', 0.8),
    stat('/3d-virtual-tours', 0.6),
    stat('/services', 0.7),
    stat('/our-process', 0.7),
    stat('/about', 0.5),
    stat('/contact', 0.8),
    stat('/privacy', 0.2),
    ...designs.map((d) => stat(`/models/${d.slug}`, 0.8)),
    ...projects.map((p) => stat(`/projects/${p.slug}`, 0.6)),
  ]
}
