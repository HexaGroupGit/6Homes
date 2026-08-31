import type { Metadata } from 'next'
import { getProjects } from '@/lib/crm'
import { PageHero, ProjectTile, Dim } from '@/components/ui'
import Reveal from '@/components/Reveal'
import EnquireButton from '@/components/enquiry/EnquireButton'

export const revalidate = 3600

export const metadata: Metadata = {
  title: 'Projects',
  description:
    'Completed 6Homes modular builds across Victoria, Queensland and Tasmania — granny flats, off-grid homes, hotel cabins, Airbnb accommodation and family homes.',
  alternates: { canonical: '/projects' },
}

export default async function ProjectsPage() {
  const projects = await getProjects()

  // Grouping by what the home is FOR, not by state. A granny flat and a hotel
  // cabin are different problems even when they are the same design.
  const states = Array.from(
    new Set(projects.map((p) => p.location?.split(',').pop()?.trim()).filter(Boolean))
  ) as string[]

  return (
    <>
      <PageHero eyebrow="Delivered" title="Homes already standing" dim={`${projects.length} projects`}>
        <p>
          The same designs on real blocks: sloping sites, bushland, back gardens and tourism parks. What a floorplan
          cannot tell you is how one looks once it is in the ground.
        </p>
      </PageHero>

      {states.length > 0 && (
        <div className="border-b border-rule bg-panel/40">
          <div className="container-page flex flex-wrap items-center gap-x-8 gap-y-2 py-5">
            <span className="spec text-mute/60">Built in</span>
            {states.map((s) => (
              <span key={s} className="spec text-teal-deep">
                {s}
              </span>
            ))}
          </div>
        </div>
      )}

      <div className="container-page grid gap-12 py-16 md:grid-cols-2 md:gap-x-8 md:gap-y-16 md:py-24 lg:grid-cols-3">
        {projects.map((p, i) => (
          <ProjectTile key={p.id} project={p} index={i} />
        ))}
      </div>

      <section className="bg-deep py-20 text-white md:py-28">
        <div className="container-page">
          <Reveal className="max-w-2xl">
            <div className="max-w-xs">
              <Dim tone="light">
                Your block
              </Dim>
            </div>
            <h2 className="display-sm mt-8">Planning something like these?</h2>
            <p className="prose-body mt-6 max-w-lg !text-white/60">
              Tell us the address and what it is for. We will tell you what is achievable on that block and roughly what
              it costs, before anyone commits to anything.
            </p>
            <EnquireButton intent="domestic" variant="outline-light" source="projects-cta" className="mt-10">
              Start a project enquiry
            </EnquireButton>
          </Reveal>
        </div>
      </section>
    </>
  )
}
