import type { Metadata } from 'next'
import Link from 'next/link'
import Image from 'next/image'
import { notFound } from 'next/navigation'
import { getProject, getProjects, getDesigns } from '@/lib/crm'
import { Dim, Frame, Section, ProjectTile } from '@/components/ui'
import Reveal from '@/components/Reveal'
import EnquireButton from '@/components/enquiry/EnquireButton'

export const revalidate = 3600

export async function generateStaticParams() {
  return (await getProjects()).map((p) => ({ slug: p.slug }))
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params
  const project = await getProject(slug)
  if (!project) return { title: 'Project not found' }
  const summary = [project.designName, project.category, project.location].filter(Boolean).join(' · ')
  return {
    title: `${project.name} — ${project.category ?? 'Project'}`,
    description: project.description?.slice(0, 155) ?? `A completed 6Homes modular project. ${summary}.`,
    alternates: { canonical: `/projects/${project.slug}` },
    openGraph: project.heroImage ? { images: [project.heroImage] } : undefined,
  }
}

export default async function ProjectPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const project = await getProject(slug)
  if (!project) notFound()

  const [projects, designs] = await Promise.all([getProjects(), getDesigns()])
  const related = projects.filter((p) => p.slug !== project.slug).slice(0, 3)
  const design = designs.find((d) => d.name.toLowerCase() === (project.designName ?? '').toLowerCase())

  const facts: [string, string][] = [
    project.location ? ['Location', project.location] : null,
    project.designName ? ['Design', project.designName] : null,
    project.category ? ['Built as', project.category] : null,
    design?.areaSqm ? ['Internal area', `${design.areaSqm} m²`] : null,
    design?.bedrooms ? ['Bedrooms', String(design.bedrooms)] : null,
  ].filter((r): r is [string, string] => !!r)

  return (
    <>
      <section className="border-b border-rule bg-paper pt-28 md:pt-36">
        <div className="container-page">
          <Link href="/projects" className="spec text-mute transition-colors hover:text-ink">
            ← All projects
          </Link>

          <div className="mt-8 border-b border-rule pb-10">
            <p className="eyebrow animate-rise">{project.location ?? 'Project'}</p>
            <h1 className="display mt-5 max-w-4xl animate-rise" style={{ animationDelay: '90ms' }}>
              {project.designName ? `${project.designName}` : project.name}
            </h1>
            {project.category && (
              <p className="lead mt-6 animate-rise text-mute" style={{ animationDelay: '180ms' }}>
                Built as {project.category.toLowerCase()}
              </p>
            )}
          </div>
        </div>

        <div className="relative mt-10 aspect-[16/9] w-full md:aspect-[21/9]">
          {project.heroImage ? (
            <Image src={project.heroImage} alt={project.name} fill priority sizes="100vw" className="animate-fade object-cover" />
          ) : (
            <Frame alt={project.name} ratio="h-full" />
          )}
          {project.location && (
            <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-ink/70 to-transparent pt-24 pb-6 md:pb-10">
              <div className="container-page">
                <Dim tone="light">{project.location}</Dim>
              </div>
            </div>
          )}
        </div>
      </section>

      <div className="container-page grid gap-12 py-16 md:grid-cols-[1.4fr_1fr] md:gap-20 md:py-24">
        <Reveal>
          <p className="lead max-w-xl">
            {project.description ??
              `A completed 6Homes build${project.location ? ` in ${project.location}` : ''}${
                project.designName ? `, using the ${project.designName}` : ''
              }. Manufactured under cover, delivered to site, craned into place and connected — with the site works running in parallel rather than after.`}
          </p>

          {design && (
            <Link href={`/models/${design.slug}`} className="btn-rule mt-10">
              See the {design.name} specification
            </Link>
          )}
        </Reveal>

        <Reveal delay={120}>
          <h2 className="spec text-mute">Project</h2>
          <dl className="mt-5 border-t border-rule">
            {facts.map(([label, value]) => (
              <div key={label} className="flex items-baseline justify-between gap-6 border-b border-rule py-3.5">
                <dt className="spec text-mute">{label}</dt>
                <dd className="font-mono text-[13px] text-ink">{value}</dd>
              </div>
            ))}
          </dl>
          <EnquireButton intent="domestic" source={`project-${project.slug}`} className="mt-9 w-full">
            Enquire about a build like this
          </EnquireButton>
        </Reveal>
      </div>

      {project.gallery && project.gallery.length > 0 && (
        <Section eyebrow="On site" title="The build" className="border-t border-rule">
          <div className="grid gap-6 md:grid-cols-2">
            {project.gallery.map((src, i) => (
              <Reveal key={src} delay={i * 70}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={src} alt={`${project.name} — ${i + 1}`} loading="lazy" className="aspect-[4/3] w-full object-cover" />
              </Reveal>
            ))}
          </div>
        </Section>
      )}

      {related.length > 0 && (
        <Section eyebrow="Elsewhere" title="More projects" className="bg-panel/50">
          <div className="grid gap-10 md:grid-cols-3 md:gap-8">
            {related.map((p, i) => (
              <ProjectTile key={p.id} project={p} index={i} />
            ))}
          </div>
        </Section>
      )}
    </>
  )
}
