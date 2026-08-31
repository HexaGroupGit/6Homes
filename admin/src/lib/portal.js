// The client portal's shared vocabulary — what a customer can see, what we ask
// them to send us, and what they have to sign off before a build moves on.
//
// IMPORTANT: imported by the serverless api/ functions AND the browser, exactly
// like projectStages.js. Keep it import-free and never touch import.meta.env or
// the Supabase client here.

import { STAGE_IDS } from './projectStages.js'

// Where client uploads and issued documents live. Private bucket — nothing in
// it is reachable without a signed URL minted by api/portal.js.
export const DOCS_BUCKET = '6homes-docs'

// Per-file and per-request ceilings. Generous enough for a scanned title or a
// survey plan, small enough that a stray video doesn't fill the bucket.
export const MAX_FILE_BYTES = 25 * 1024 * 1024
export const MAX_FILES_PER_REQUEST = 10

// Extensions we accept. Anything else is refused server-side, so the portal
// can never become a way to host arbitrary content on our domain.
export const ALLOWED_EXTENSIONS = [
  'pdf', 'jpg', 'jpeg', 'png', 'heic', 'webp', 'gif',
  'doc', 'docx', 'xls', 'xlsx', 'csv', 'txt', 'rtf', 'zip',
]

export const extensionOf = (name = '') => (name.split('.').pop() || '').toLowerCase()

export function fileRejectionReason(file = {}) {
  const ext = extensionOf(file.name)
  if (!ALLOWED_EXTENSIONS.includes(ext)) {
    return `We can't accept .${ext || 'that'} files. Send a PDF, photo or Word document.`
  }
  if (Number(file.size) > MAX_FILE_BYTES) {
    return `That file is ${(file.size / 1048576).toFixed(1)} MB. The limit is ${MAX_FILE_BYTES / 1048576} MB — email it to us instead.`
  }
  return null
}

// ── Document requests ───────────────────────────────────────────────────────

export const DOC_STATUSES = {
  requested: { label: 'Waiting on you', tone: 'amber', client: 'We still need this' },
  uploaded: { label: 'With us', tone: 'blue', client: 'Received — we’re checking it' },
  accepted: { label: 'Accepted', tone: 'green', client: 'Done' },
  rejected: { label: 'Needs redoing', tone: 'red', client: 'Please send this again' },
}

export const docStatusMeta = (status) => DOC_STATUSES[status] ?? DOC_STATUSES.requested

// The documents 6Homes actually asks a customer for, in the order the build
// needs them. The admin pulls from this list rather than retyping it on every
// project, which is what keeps the wording consistent across customers.
export const DOC_LIBRARY = [
  {
    stage: 'site-assessment',
    items: [
      { label: 'Certificate of Title', note: 'Or your contract of sale if settlement hasn’t happened yet. We need to confirm who owns the block before we assess it.', required: true },
      { label: 'Plan of subdivision or survey plan', note: 'Shows boundaries, easements and setbacks. Your conveyancer will have it.', required: true },
      { label: 'Photos of the site and its access', note: 'A few phone photos: the block itself, the driveway or entry, and anything a truck would have to get past.', required: true },
      { label: 'Soil test or geotechnical report', note: 'Only if you already have one — we can arrange it if not.', required: false },
      { label: 'Bushfire attack level (BAL) assessment', note: 'Only if your block is in a designated bushfire-prone area.', required: false },
    ],
  },
  {
    stage: 'design',
    items: [
      { label: 'Council property information', note: 'Planning overlays and zoning for your address. We’ll tell you what to request if you’re not sure.', required: true },
      { label: 'Covenant or owners corporation rules', note: 'Only if your title carries one. These can restrict cladding, roof pitch or siting.', required: false },
      { label: 'Location of existing services', note: 'Where power, water, sewer or septic already run on the block.', required: false },
    ],
  },
  {
    stage: 'order',
    items: [
      { label: 'Finance approval or proof of funds', note: 'Your lender’s approval letter, or a bank statement if you’re funding it yourself.', required: true },
      { label: 'Photo identification', note: 'Driver licence or passport for whoever is signing the contract.', required: true },
    ],
  },
  {
    stage: 'install',
    items: [
      { label: 'Site readiness photos', note: 'Taken once your slab or footings are finished and the site is clear.', required: true },
      { label: 'Crane and truck access confirmation', note: 'Confirmation that the access route is clear on delivery day, including any permits for road closures.', required: true },
      { label: 'Service connection approvals', note: 'Your power, water and sewer connection authorities.', required: false },
    ],
  },
]

// ── Milestone approvals ─────────────────────────────────────────────────────
// What a customer signs off in the portal. Recorded with a name and timestamp,
// which is what makes it a defensible record of what was agreed and when.
export const APPROVAL_LIBRARY = [
  {
    stage: 'design',
    items: [
      { label: 'Floor plan sign-off', body: 'Confirm the floor plan, room sizes and window positions are what you want. Nothing goes to engineering until this is approved.' },
      { label: 'Colours and finishes', body: 'Confirm your external cladding, roof, internal paint, flooring, benchtops and tapware selections.' },
    ],
  },
  {
    stage: 'order',
    items: [
      { label: 'Final specification and price', body: 'Confirm the specification and price, including any variations, before your production slot is booked.' },
    ],
  },
  {
    stage: 'install',
    items: [
      { label: 'Pre-delivery inspection', body: 'Confirm you’re happy with the home as inspected before it leaves the factory.' },
      { label: 'Handover acceptance', body: 'Confirm the home has been delivered, connected and handed over to your satisfaction.' },
    ],
  },
]

// ── Access ──────────────────────────────────────────────────────────────────

export const normEmail = (e) => String(e ?? '').trim().toLowerCase()

/** Every address allowed into this project's portal, deduped and normalised. */
export function clientEmails(project) {
  const list = Array.isArray(project?.clientEmails) ? project.clientEmails : []
  return [...new Set(list.map(normEmail).filter(Boolean))]
}

export const canAccessProject = (project, email) => clientEmails(project).includes(normEmail(email))

// ── Derived state ───────────────────────────────────────────────────────────

/** What's outstanding on a build, for the "here's where you are" summary. */
export function outstanding(project) {
  const docs = (project?.docRequests ?? []).filter((d) => d.status === 'requested' || d.status === 'rejected')
  const approvals = (project?.approvals ?? []).filter((a) => a.status !== 'approved')
  return { docs, approvals, total: docs.length + approvals.length }
}

/** Group anything stage-tagged into build order, with untagged items first. */
export function byStage(items = []) {
  const order = (id) => {
    const i = STAGE_IDS.indexOf(id)
    return i === -1 ? -1 : i
  }
  return [...items].sort((a, b) => order(a.stage) - order(b.stage))
}

export function fmtBytes(n) {
  const b = Number(n) || 0
  if (b < 1024) return `${b} B`
  if (b < 1048576) return `${Math.round(b / 1024)} KB`
  return `${(b / 1048576).toFixed(1)} MB`
}

/**
 * A storage path only ever belongs to one project. Both the sign and the
 * download endpoints check this, so a customer can't hand us a path from
 * someone else's build and have us sign it.
 */
export const projectPrefix = (projectId) => `projects/${projectId}/`

export function safeFileName(name = 'file') {
  return String(name).replace(/[^a-zA-Z0-9._-]+/g, '-').replace(/^-+|-+$/g, '').slice(-90) || 'file'
}
