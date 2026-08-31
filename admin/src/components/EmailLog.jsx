import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { Search, Send } from 'lucide-react'
import { useStore } from '../store/useStore.jsx'
import { PageHeader, EmptyState, Badge } from './ui.jsx'
import { fmtDateTime } from '../lib/utils.js'

const STATUS_TONE = { sent: 'green', failed: 'red', suppressed: 'amber', skipped: 'amber' }
const FILTERS = ['all', 'sent', 'failed', 'skipped', 'suppressed']

export default function EmailLog() {
  const { emailLog, leads } = useStore()
  const [query, setQuery] = useState('')
  const [status, setStatus] = useState('all')

  const rows = useMemo(() => {
    const q = query.trim().toLowerCase()
    return emailLog
      .filter((e) => status === 'all' || e.status === status)
      .filter((e) => !q || [e.subject, e.emailType, ...(Array.isArray(e.to) ? e.to : [e.to])]
        .filter(Boolean).some((v) => String(v).toLowerCase().includes(q)))
      .sort((a, b) => new Date(b.sentAt) - new Date(a.sentAt))
      .slice(0, 500)
  }, [emailLog, query, status])

  return (
    <>
      <PageHeader title="Email log" subtitle="Every send the platform has attempted — delivered, skipped or failed.">
        <div className="flex items-center gap-2">
          {FILTERS.map((f) => (
            <button
              key={f}
              onClick={() => setStatus(f)}
              className={status === f ? 'btn-primary text-xs' : 'btn-secondary text-xs'}
            >
              {f}
            </button>
          ))}
          <div className="relative">
            <Search size={15} className="absolute top-2.5 left-2.5 text-mute" />
            <input className="field w-52 pl-8" placeholder="Search…" value={query} onChange={(e) => setQuery(e.target.value)} />
          </div>
        </div>
      </PageHeader>

      <div className="p-7">
        {rows.length === 0 ? (
          <EmptyState icon={Send} title="Nothing here">
            {emailLog.length === 0
              ? 'No email has been sent yet. Submit a form on the website and it will show up here.'
              : 'No entries match that filter.'}
          </EmptyState>
        ) : (
          <div className="card overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-hair text-left text-xs tracking-wide text-mute uppercase">
                  <th className="px-5 py-3 font-medium">When</th>
                  <th className="px-5 py-3 font-medium">To</th>
                  <th className="px-5 py-3 font-medium">Subject</th>
                  <th className="px-5 py-3 font-medium">Type</th>
                  <th className="px-5 py-3 font-medium">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-hair">
                {rows.map((e) => {
                  const lead = leads.find((l) => l.id === e.leadId)
                  return (
                    <tr key={e.id} className="hover:bg-brand-50">
                      <td className="px-5 py-3 whitespace-nowrap text-mute">{fmtDateTime(e.sentAt)}</td>
                      <td className="px-5 py-3">
                        <div className="max-w-56 truncate">{(Array.isArray(e.to) ? e.to : [e.to]).filter(Boolean).join(', ') || '—'}</div>
                        {lead && (
                          <Link to={`/leads/${lead.id}`} className="text-[11px] text-brand-600 hover:underline">
                            {lead.name || 'view lead'}
                          </Link>
                        )}
                      </td>
                      <td className="max-w-72 px-5 py-3">
                        <div className="truncate">{e.subject}</div>
                        {e.error && <div className="mt-0.5 truncate text-[11px] text-red-600">{e.error}</div>}
                      </td>
                      <td className="px-5 py-3 font-mono text-[11px] text-mute">{e.emailType ?? '—'}</td>
                      <td className="px-5 py-3">
                        <Badge tone={STATUS_TONE[e.status] ?? 'neutral'}>{e.status}</Badge>
                        {e.safeMode && <div className="mt-0.5 text-[11px] text-amber-700">redirected</div>}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </>
  )
}
