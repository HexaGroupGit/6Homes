// Renders any email template exactly as it will send, for the Templates screen.
// Underscore prefix = not an API route; the handler is template-preview.js.
//
// The whole point of this module is that it does NOT re-implement rendering. It
// feeds the editor's unsaved draft through the same resolution path a real send
// uses — renderLeadEmail() / renderStageEmail(), which look the draft up with
// findEmailTemplate() and interpolate it with fillVars() — so a preview that
// looks right cannot be a preview of different code to the one that sends.
//
// Unknown types return null rather than throwing: a template key that no longer
// exists should show "nothing to preview", not a 500.
import { INTENTS, NURTURE_BUILDERS, renderLeadEmail } from './_leads.js'
import { renderStageEmail } from './_projects.js'
import { stageById } from '../src/lib/projectStages.js'

// Sample details, used only to fill the placeholders. Deliberately complete —
// a preview against an empty lead hides exactly the layout problems (a missing
// design card, an empty message panel) that the editor needs to see.
export const SAMPLE = {
  lead: {
    id: 'lead_preview',
    name: 'Sarah Whitfield',
    email: 'sarah.whitfield@example.com',
    phone: '0412 345 678',
    suburb: 'Healesville VIC 3777',
    message: 'We have a 1.2 acre block with a gentle slope and power already to the boundary.\nLooking at a 3-bedroom for my parents to move into.',
    budget: '$250k – $350k',
    timeframe: 'Next 6 months',
    source: '6homes.com',
  },
  design: {
    id: 'design_preview',
    name: 'The Yarra 3B',
    slug: 'yarra-3b',
    bedrooms: 3,
    bathrooms: 2,
    areaSqm: 118,
  },
  customer: {
    id: 'cust_preview',
    name: 'Sarah Whitfield',
    email: 'sarah.whitfield@example.com',
  },
  project: {
    id: 'proj_preview',
    name: 'Whitfield residence',
    suburb: 'Healesville VIC',
    stageDetail: {
      // Keyed by stage id at render time — see stageDetailFor() below.
    },
  },
}

// The built-in builder behind each lead emailType, derived from the same two
// registries the live sends read. Adding an intent to _leads.js therefore adds
// it here automatically rather than needing a second edit.
const LEAD_BUILDERS = {
  ...Object.fromEntries(Object.values(INTENTS).map((i) => [i.emailType, i.build])),
  ...NURTURE_BUILDERS,
}

// Sample per-stage detail, so the "From your project team" panel and the
// expected-date row are visible in the preview rather than silently absent.
const stageDetailFor = (stageId) => ({
  [stageId]: {
    targetDate: 'Mid-October 2026',
    notes: 'Frames are up and the kitchen joinery is scheduled for next week.',
  },
})

/**
 * Render one template.
 * `content` is the editor's unsaved draft: pass it and the preview shows the
 * override; leave it empty and the preview shows the built-in default, which is
 * what would send if the template were reverted.
 *
 * Returns { subject, html, usingDraft } or null for an unrecognised emailType.
 */
export function renderPreview({ emailType, subject, content, settings = {}, design }) {
  const draft = String(content ?? '').trim()
  // findEmailTemplate() requires a truthy `content`, so an empty draft falls
  // through to the built-in exactly as it does on a real send.
  const templates = draft
    ? [{ category: 'email', emailType, subject: subject ?? '', content: draft }]
    : []

  const lead = { ...SAMPLE.lead, designName: design?.name ?? SAMPLE.design.name }
  const d = design ?? SAMPLE.design

  const builder = LEAD_BUILDERS[emailType]
  if (builder) {
    const r = renderLeadEmail({ emailType, templates, lead, design: d, settings, builder })
    return { ...r, usingDraft: !!draft }
  }

  if (emailType.startsWith('project_stage_')) {
    const stageId = emailType.slice('project_stage_'.length)
    if (!stageById(stageId)) return null
    const r = renderStageEmail({
      project: { ...SAMPLE.project, stage: stageId, stageDetail: stageDetailFor(stageId) },
      customer: SAMPLE.customer,
      design: d,
      stageId,
      templates,
      settings,
    })
    return r ? { ...r, usingDraft: !!draft } : null
  }

  return null
}
