import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { DndContext, DragOverlay, PointerSensor, useSensor, useSensors, useDraggable, useDroppable } from '@dnd-kit/core'
import { Inbox, Search } from 'lucide-react'
import { useStore } from '../store/useStore.jsx'
import { PageHeader, EmptyState, Badge } from './ui.jsx'
import { cn, fmtAgo } from '../lib/utils.js'

function LeadCard({ lead, dragging }) {
  return (
    <div
      className={cn(
        'card cursor-grab p-3 active:cursor-grabbing',
        dragging && 'rotate-1 shadow-lg'
      )}
    >
      <div className="truncate text-sm font-medium">{lead.name || lead.email || lead.phone}</div>
      <div className="mt-0.5 truncate text-xs text-mute">{lead.intentLabel}</div>
      {(lead.designName || lead.suburb) && (
        <div className="mt-1.5 flex flex-wrap gap-1">
          {lead.designName && <Badge tone="blue">{lead.designName}</Badge>}
          {lead.suburb && <Badge>{lead.suburb}</Badge>}
        </div>
      )}
      <div className="mt-2 flex items-center justify-between text-[11px] text-mute">
        <span>{fmtAgo(lead.createdAt)}</span>
        {lead.nurture && !lead.nurture.done && (
          <span title="Automated follow-up is still running">
            ↻ {(lead.nurture.sent ?? []).length}/3
          </span>
        )}
      </div>
    </div>
  )
}

function DraggableLead({ lead }) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({ id: lead.id })
  return (
    <div ref={setNodeRef} {...listeners} {...attributes} className={cn(isDragging && 'opacity-30')}>
      {/* The link sits inside the draggable so a click still opens the lead, but
          a drag doesn't navigate — dnd-kit swallows the click once it starts. */}
      <Link to={`/leads/${lead.id}`} onClick={(e) => isDragging && e.preventDefault()}>
        <LeadCard lead={lead} />
      </Link>
    </div>
  )
}

function Column({ stage, leads }) {
  const { setNodeRef, isOver } = useDroppable({ id: stage.id })
  return (
    <div className="flex w-64 shrink-0 flex-col">
      <div className="mb-2 flex items-center gap-2 px-1">
        <span className="size-2 rounded-full" style={{ background: stage.color || '#94a3b8' }} />
        <span className="text-sm font-medium">{stage.name}</span>
        <span className="text-xs text-mute">{leads.length}</span>
      </div>
      <div
        ref={setNodeRef}
        className={cn(
          'flex-1 space-y-2 rounded-lg p-2 transition-colors',
          isOver ? 'bg-brand-100 ring-2 ring-brand-400' : 'bg-black/[0.03]'
        )}
      >
        {leads.map((l) => <DraggableLead key={l.id} lead={l} />)}
        {leads.length === 0 && (
          <div className="px-2 py-6 text-center text-xs text-mute/70">Nothing here</div>
        )}
      </div>
    </div>
  )
}

export default function LeadsBoard() {
  const { leads, orderedStages, moveLead } = useStore()
  const [query, setQuery] = useState('')
  const [activeId, setActiveId] = useState(null)
  const [error, setError] = useState('')

  // A small activation distance so a click to open a lead isn't read as a drag.
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }))

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return leads
    return leads.filter((l) =>
      [l.name, l.email, l.phone, l.suburb, l.designName, l.intentLabel, l.message]
        .filter(Boolean)
        .some((v) => String(v).toLowerCase().includes(q))
    )
  }, [leads, query])

  const byStage = useMemo(() => {
    const map = Object.fromEntries(orderedStages.map((s) => [s.id, []]))
    for (const l of filtered) (map[l.stageId] ??= []).push(l)
    for (const k of Object.keys(map)) {
      map[k].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
    }
    return map
  }, [filtered, orderedStages])

  async function onDragEnd({ active, over }) {
    setActiveId(null)
    if (!over || active.id === over.id) return
    try {
      await moveLead(active.id, over.id)
      setError('')
    } catch (err) {
      setError(err.message)
    }
  }

  const activeLead = leads.find((l) => l.id === activeId)

  return (
    <>
      <PageHeader title="Leads" subtitle={`${leads.length} total · drag a card to move it through the pipeline`}>
        <div className="relative">
          <Search size={15} className="absolute top-2.5 left-2.5 text-mute" />
          <input
            className="field w-60 pl-8"
            placeholder="Search leads…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>
      </PageHeader>

      {error && <div className="bg-red-50 px-7 py-2 text-sm text-red-700">{error}</div>}

      <div className="p-7">
        {leads.length === 0 ? (
          <EmptyState icon={Inbox} title="No leads yet">
            Every form on 6homes.com posts to <code className="rounded bg-brand-100 px-1">/api/form-submit</code>, which
            drops the enquiry into this board and sends the acknowledgement automatically.
          </EmptyState>
        ) : (
          <DndContext
            sensors={sensors}
            onDragStart={({ active }) => setActiveId(active.id)}
            onDragCancel={() => setActiveId(null)}
            onDragEnd={onDragEnd}
          >
            <div className="flex gap-4 overflow-x-auto pb-4">
              {orderedStages.map((s) => (
                <Column key={s.id} stage={s} leads={byStage[s.id] ?? []} />
              ))}
            </div>
            <DragOverlay>{activeLead && <LeadCard lead={activeLead} dragging />}</DragOverlay>
          </DndContext>
        )}
      </div>
    </>
  )
}
