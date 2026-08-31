import { Link } from 'react-router-dom'
import { HardHat } from 'lucide-react'
import { useStore } from '../store/useStore.jsx'
import { PageHeader, EmptyState, Badge } from './ui.jsx'
import { fmtDate } from '../lib/utils.js'
import { BUILD_STAGES, stageIndex } from '../lib/projectStages.js'

// A compact six-dot progress rail — reads faster than a percentage.
function StageRail({ stage }) {
  const at = stageIndex(stage)
  return (
    <div className="flex items-center gap-1" title={BUILD_STAGES[at]?.name ?? stage}>
      {BUILD_STAGES.map((s, i) => (
        <span
          key={s.id}
          className={`h-1.5 w-6 rounded-full ${i < at ? 'bg-brand-600' : i === at ? 'bg-brand-400' : 'bg-hair'}`}
        />
      ))}
    </div>
  )
}

export default function Projects() {
  const { projects, customers } = useStore()

  const sorted = [...projects].sort((a, b) => {
    // Live builds first, then most recently updated.
    const done = (p) => (p.completedAt ? 1 : 0)
    return done(a) - done(b) || new Date(b.updatedAt ?? 0) - new Date(a.updatedAt ?? 0)
  })

  return (
    <>
      <PageHeader title="Projects" subtitle="Every build, and where it has got to" />

      <div className="p-7">
        {projects.length === 0 ? (
          <EmptyState icon={HardHat} title="No projects yet">
            Convert a won lead into a project from its detail page and it will appear here, starting at the showroom
            visit.
          </EmptyState>
        ) : (
          <div className="card divide-y divide-hair">
            {sorted.map((p) => {
              const customer = customers.find((c) => c.id === p.customerId)
              const stage = BUILD_STAGES[stageIndex(p.stage)] ?? null
              return (
                <Link key={p.id} to={`/projects/${p.id}`} className="flex flex-wrap items-center gap-4 px-5 py-4 transition-colors hover:bg-brand-50">
                  <div className="min-w-48 flex-1">
                    <div className="text-sm font-medium">{p.name}</div>
                    <div className="mt-0.5 text-xs text-mute">
                      {[customer?.name, p.designName, p.suburb].filter(Boolean).join(' · ') || '—'}
                    </div>
                  </div>
                  <StageRail stage={p.stage} />
                  <div className="w-40 text-xs text-mute">{stage?.name ?? p.stage}</div>
                  <div className="w-28 text-right text-xs text-mute">
                    {p.completedAt ? <Badge tone="green">Complete</Badge> : fmtDate(p.updatedAt)}
                  </div>
                </Link>
              )
            })}
          </div>
        )}
      </div>
    </>
  )
}
