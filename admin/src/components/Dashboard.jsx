import { Link } from 'react-router-dom'
import { ArrowRight, Inbox } from 'lucide-react'
import { useStore } from '../store/useStore.jsx'
import { PageHeader, Stat, Badge, EmptyState } from './ui.jsx'
import { fmtAgo } from '../lib/utils.js'

const DAY = 86400000

export default function Dashboard() {
  const { leads, projects, designs, emailLog, orderedStages } = useStore()

  const now = Date.now()
  const since = (days) => leads.filter((l) => now - new Date(l.createdAt).getTime() < days * DAY)

  const open = leads.filter((l) => {
    const stage = orderedStages.find((s) => s.id === l.stageId)
    return stage && stage.category !== 'closed' && stage.category !== 'lost'
  })
  const activeProjects = projects.filter((p) => p.stage !== 'complete')
  const emailsThisWeek = emailLog.filter(
    (e) => now - new Date(e.sentAt ?? 0).getTime() < 7 * DAY && e.status === 'sent'
  )

  // Newest first — the whole point of this screen is "what came in".
  const recent = [...leads]
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
    .slice(0, 8)

  const byStage = orderedStages.map((s) => ({
    ...s,
    count: leads.filter((l) => l.stageId === s.id).length,
  }))

  return (
    <>
      <PageHeader title="Dashboard" subtitle="Where things stand today" />

      <div className="space-y-7 p-7">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Stat label="Open leads" value={open.length} hint={`${since(7).length} new this week`} />
          <Stat label="New today" value={since(1).length} />
          <Stat label="Active builds" value={activeProjects.length} hint={`${projects.length} total`} />
          <Stat label="Emails sent (7d)" value={emailsThisWeek.length} />
        </div>

        <section>
          <h2 className="mb-3 text-sm font-semibold tracking-wide text-mute uppercase">Pipeline</h2>
          <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-6">
            {byStage.map((s) => (
              <Link key={s.id} to="/leads" className="card p-4 transition-colors hover:border-brand-400">
                <div className="flex items-center gap-2">
                  <span className="size-2 rounded-full" style={{ background: s.color || '#94a3b8' }} />
                  <span className="truncate text-xs text-mute">{s.name}</span>
                </div>
                <div className="mt-1.5 text-xl font-semibold text-navy">{s.count}</div>
              </Link>
            ))}
          </div>
        </section>

        <section>
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-sm font-semibold tracking-wide text-mute uppercase">Latest enquiries</h2>
            <Link to="/leads" className="inline-flex items-center gap-1 text-xs text-brand-600 hover:underline">
              All leads <ArrowRight size={13} />
            </Link>
          </div>

          {recent.length === 0 ? (
            <EmptyState icon={Inbox} title="No enquiries yet">
              As soon as a form on 6homes.com is submitted it will land here.
            </EmptyState>
          ) : (
            <div className="card divide-y divide-hair">
              {recent.map((l) => {
                const stage = orderedStages.find((s) => s.id === l.stageId)
                return (
                  <Link
                    key={l.id}
                    to={`/leads/${l.id}`}
                    className="flex items-center gap-4 px-5 py-3 transition-colors hover:bg-brand-50"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-sm font-medium">{l.name || l.email || l.phone}</div>
                      <div className="truncate text-xs text-mute">
                        {l.intentLabel}
                        {l.designName && ` · ${l.designName}`}
                        {l.suburb && ` · ${l.suburb}`}
                      </div>
                    </div>
                    {stage && <Badge>{stage.name}</Badge>}
                    <div className="w-24 shrink-0 text-right text-xs text-mute">{fmtAgo(l.createdAt)}</div>
                  </Link>
                )
              })}
            </div>
          )}
        </section>

        {designs.length === 0 && (
          <EmptyState title="No designs yet">
            Add your home models under <Link to="/designs" className="text-brand-600 hover:underline">Designs</Link> — the
            website reads them directly, and quotes use them as line items.
          </EmptyState>
        )}
      </div>
    </>
  )
}
