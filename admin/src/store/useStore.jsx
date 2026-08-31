import { createContext, useContext, useCallback, useEffect, useMemo, useState } from 'react'
import { supabase } from '../lib/supabase.js'
import { newId } from '../lib/utils.js'

// One store for the whole CRM.
//
// Every table follows the same `{ id, data jsonb, updated_at }` shape, so a
// single generic loader/writer covers all of them and screens never touch
// Supabase directly. Writes are optimistic — the UI updates immediately and
// rolls back if the round-trip fails — because a lead board that stutters on
// every drag is unusable.
//
// Modelled on Hexa Space RND src/store/useStore.js, minus the billing,
// access-control and accounting machinery 6Homes doesn't need.

// name → table. `settings` is a single row, handled separately.
const COLLECTIONS = {
  leads: 'leads',
  stages: 'lead_pipeline_stages',
  customers: 'customers',
  designs: 'designs',
  projects: 'projects',
  quotes: 'quotes',
  contracts: 'contracts',
  templates: 'templates',
  emailLog: 'email_log',
}

const EMPTY = Object.fromEntries(Object.keys(COLLECTIONS).map((k) => [k, []]))

const StoreContext = createContext(null)

export function StoreProvider({ children }) {
  const [data, setData] = useState(EMPTY)
  const [settings, setSettings] = useState({})
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const names = Object.keys(COLLECTIONS)
      const results = await Promise.all([
        ...names.map((n) => supabase.from(COLLECTIONS[n]).select('id, data')),
        supabase.from('settings').select('data').eq('id', 'global').maybeSingle(),
      ])

      const next = {}
      names.forEach((n, i) => {
        const { data: rows, error: err } = results[i]
        // One failing table shouldn't blank the whole app — surface it and carry
        // on with what did load.
        if (err) console.error(`load ${COLLECTIONS[n]} failed:`, err.message)
        next[n] = (rows ?? []).map((r) => ({ ...r.data, id: r.id }))
      })
      setData(next)

      const settingsRes = results[results.length - 1]
      if (settingsRes?.error) console.error('load settings failed:', settingsRes.error.message)
      setSettings(settingsRes?.data?.data ?? {})
    } catch (err) {
      console.error('store load failed:', err)
      setError(err.message ?? String(err))
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load() }, [load])

  // ── Generic writers ───────────────────────────────────────────────────────
  const create = useCallback(async (collection, values, idPrefix) => {
    const table = COLLECTIONS[collection]
    if (!table) throw new Error(`Unknown collection: ${collection}`)
    const now = new Date().toISOString()
    const record = {
      id: values.id ?? newId(idPrefix ?? collection.slice(0, 4)),
      createdAt: now,
      updatedAt: now,
      ...values,
    }
    record.id = values.id ?? record.id

    setData((d) => ({ ...d, [collection]: [...d[collection], record] }))
    const { error: err } = await supabase.from(table).insert({ id: record.id, data: record })
    if (err) {
      setData((d) => ({ ...d, [collection]: d[collection].filter((r) => r.id !== record.id) }))
      throw new Error(err.message)
    }
    return record
  }, [])

  const update = useCallback(async (collection, id, patch) => {
    const table = COLLECTIONS[collection]
    if (!table) throw new Error(`Unknown collection: ${collection}`)

    let previous = null
    let merged = null
    setData((d) => {
      const list = d[collection]
      previous = list.find((r) => r.id === id) ?? null
      if (!previous) return d
      merged = { ...previous, ...patch, id, updatedAt: new Date().toISOString() }
      return { ...d, [collection]: list.map((r) => (r.id === id ? merged : r)) }
    })
    if (!merged) throw new Error(`${collection} ${id} not found`)

    const { error: err } = await supabase
      .from(table)
      .update({ data: merged, updated_at: merged.updatedAt })
      .eq('id', id)
    if (err) {
      setData((d) => ({ ...d, [collection]: d[collection].map((r) => (r.id === id ? previous : r)) }))
      throw new Error(err.message)
    }
    return merged
  }, [])

  const remove = useCallback(async (collection, id) => {
    const table = COLLECTIONS[collection]
    if (!table) throw new Error(`Unknown collection: ${collection}`)

    let previous = null
    setData((d) => {
      previous = d[collection].find((r) => r.id === id) ?? null
      return { ...d, [collection]: d[collection].filter((r) => r.id !== id) }
    })

    const { error: err } = await supabase.from(table).delete().eq('id', id)
    if (err) {
      if (previous) setData((d) => ({ ...d, [collection]: [...d[collection], previous] }))
      throw new Error(err.message)
    }
  }, [])

  const saveSettings = useCallback(async (patch) => {
    const previous = settings
    const merged = { ...settings, ...patch }
    setSettings(merged)
    const { error: err } = await supabase
      .from('settings')
      .upsert({ id: 'global', data: merged, updated_at: new Date().toISOString() })
    if (err) {
      setSettings(previous)
      throw new Error(err.message)
    }
    return merged
  }, [settings])

  // ── Lead helpers used across several screens ──────────────────────────────
  // Appending to `activity` needs the current array, so it lives here rather
  // than being re-derived in every caller.
  const addActivity = useCallback(async (leadId, entry) => {
    const lead = data.leads.find((l) => l.id === leadId)
    if (!lead) return
    return update('leads', leadId, {
      activity: [...(lead.activity ?? []), { at: new Date().toISOString(), ...entry }],
    })
  }, [data.leads, update])

  const moveLead = useCallback(async (leadId, stageId) => {
    const lead = data.leads.find((l) => l.id === leadId)
    if (!lead || lead.stageId === stageId) return
    const stage = data.stages.find((s) => s.id === stageId)
    return update('leads', leadId, {
      stageId,
      activity: [...(lead.activity ?? []), {
        at: new Date().toISOString(),
        type: 'stage',
        note: `Moved to ${stage?.name ?? stageId}`,
      }],
      // Leaving a "new" stage means a human has it now — stop the nurture cron.
      ...(stage && stage.category !== 'new' && lead.nurture && !lead.nurture.done
        ? { nurture: { ...lead.nurture, done: true, stoppedReason: 'stage advanced' } }
        : {}),
    })
  }, [data.leads, data.stages, update])

  const value = useMemo(() => ({
    ...data,
    settings,
    loading,
    error,
    reload: load,
    create,
    update,
    remove,
    saveSettings,
    addActivity,
    moveLead,
    // Sorted once here so every board and list agrees on column order.
    orderedStages: [...data.stages].sort((a, b) => (a.order ?? 0) - (b.order ?? 0)),
  }), [data, settings, loading, error, load, create, update, remove, saveSettings, addActivity, moveLead])

  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>
}

export function useStore() {
  const ctx = useContext(StoreContext)
  if (!ctx) throw new Error('useStore must be used inside <StoreProvider>')
  return ctx
}
