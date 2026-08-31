// The client portal's entire server surface.
//
// One endpoint, action-routed, because every action shares the same expensive
// preamble: load the project with the service role, then prove the caller is
// allowed to touch it. Splitting these into eight files would duplicate that
// check eight times, and an access check that exists in eight places is an
// access check that will eventually differ in one of them.
//
// Three tiers of caller:
//   request-link            public — deliberately unauthenticated
//   me / upload-url /       a signed-in customer whose email is on the
//   attach / download-url / project's clientEmails list
//   approve / message
//   invite / request-docs / a signed-in admin
//   reply / admin-*
//
// Nothing here trusts an id or a path from the request body without checking it
// against the project it claims to belong to.
import { serviceClient, verifiedUser, isAdminEmail } from './_auth.js'
import { applyCors, methodNotAllowed } from './_cors.js'
import { notifyList, newId } from './_leads.js'
import {
  magicLink, portalLink, sendPortal,
  renderPortalInvite, renderPortalLogin, renderDocsRequested, renderPortalReply,
  renderTeamUpload, renderTeamApproval, renderTeamMessage,
} from './_portal.js'
import {
  DOCS_BUCKET, MAX_FILES_PER_REQUEST, canAccessProject, clientEmails, normEmail,
  fileRejectionReason, projectPrefix, safeFileName,
} from '../src/lib/portal.js'
import { BUILD_STAGES, stageIndex } from '../src/lib/projectStages.js'

const ADMIN_URL = (process.env.ADMIN_URL || 'https://portal.6homes.com').replace(/\/+$/, '')

// A customer who mistypes their email and clicks "send link" four times should
// not generate four Supabase users' worth of mail. Recorded per address on the
// project, so it survives across serverless instances without a new table.
const LINK_COOLDOWN_MS = 60 * 1000

const MAX_MESSAGE_CHARS = 4000

/*
  The lists the CRM may add to and remove from, and the shape each entry takes.
  Building the record here rather than accepting whatever the browser sends is
  what stops a stray `status: 'accepted'` or a hand-written `files` array
  arriving with a new document request.
*/
const str = (v, max = 300) => String(v ?? '').trim().slice(0, max)

const LIST_FIELDS = {
  docRequests: {
    build: (raw) => ({
      id: newId('req'),
      label: str(raw.label) || 'Document',
      note: str(raw.note, 1000),
      stage: raw.stage ?? null,
      required: raw.required !== false,
      status: 'requested',
      files: [],
      createdAt: new Date().toISOString(),
    }),
  },
  approvals: {
    build: (raw) => ({
      id: newId('apr'),
      label: str(raw.label) || 'Approval',
      body: str(raw.body, 2000),
      stage: raw.stage ?? null,
      status: 'pending',
      createdAt: new Date().toISOString(),
    }),
  },
}

const REMOVABLE_LISTS = [...Object.keys(LIST_FIELDS), 'sharedDocs']

// ── Loading ─────────────────────────────────────────────────────────────────

const row = (r) => (r ? { id: r.id, ...(r.data ?? {}) } : null)

async function loadProject(sb, id) {
  if (!id) return null
  const { data } = await sb.from('projects').select('id, data').eq('id', id).maybeSingle()
  return row(data)
}

async function saveProject(sb, project) {
  const { id, ...data } = project
  const { error } = await sb.from('projects')
    .update({ data: { ...data, id }, updated_at: new Date().toISOString() })
    .eq('id', id)
  if (error) throw new Error(error.message)
}

async function loadSettings(sb) {
  const { data } = await sb.from('settings').select('data').eq('id', 'global').maybeSingle()
  return data?.data ?? {}
}

/** Every project this email is allowed into. */
async function projectsFor(sb, email) {
  const { data } = await sb.from('projects').select('id, data')
  return (data ?? []).map(row).filter((p) => canAccessProject(p, email))
}

// ── The customer's view ─────────────────────────────────────────────────────

/**
 * Reduce a project record to what its customer may see.
 *
 * Allow-list, not deny-list: a field added to the CRM tomorrow stays private
 * until someone deliberately adds it here. The opposite default leaks by
 * accident the first time anyone stores a margin or a supplier note.
 */
function clientView(project, { design, customer } = {}) {
  const current = stageIndex(project.stage)

  return {
    id: project.id,
    name: project.name ?? 'Your build',
    suburb: project.suburb ?? project.location ?? '',
    designName: design?.name ?? project.designName ?? '',
    designSlug: design?.slug ?? '',
    heroImage: design?.heroImage ?? project.heroImage ?? null,
    floorplanImage: design?.floorplanImage ?? null,
    designSummary: [
      design?.bedrooms && `${design.bedrooms} bed`,
      design?.bathrooms && `${design.bathrooms} bath`,
      design?.areaSqm && `${design.areaSqm} m²`,
    ].filter(Boolean).join(' · '),
    customerName: customer?.name ?? '',
    stage: project.stage ?? BUILD_STAGES[0].id,
    stageIndex: current,
    completedAt: project.completedAt ?? null,
    stageHistory: project.stageHistory ?? [],
    // Dates and the note we write for the customer. `notes` is already sent to
    // them in the stage-update email, so the portal showing it is the two
    // surfaces agreeing rather than a new disclosure.
    stages: BUILD_STAGES.map((s, i) => {
      const d = project.stageDetail?.[s.id] ?? {}
      return {
        id: s.id,
        name: s.name,
        blurb: s.blurb,
        state: i < current ? 'done' : i === current ? 'current' : 'todo',
        // A date on a stage they haven't reached is a plan, not a promise —
        // and a slipped plan in a customer's inbox is a complaint. Only show
        // dates once the stage is live.
        targetDate: i <= current ? (d.targetDate ?? null) : null,
        actualDate: i <= current ? (d.actualDate ?? null) : null,
        note: i <= current ? (d.notes ?? '') : '',
        reachedAt: project.stageHistory?.find((h) => h.stage === s.id)?.at ?? null,
      }
    }),
    docRequests: (project.docRequests ?? []).map((d) => ({
      id: d.id, label: d.label, note: d.note ?? '', stage: d.stage ?? null,
      required: d.required !== false, status: d.status ?? 'requested',
      reviewNote: d.reviewNote ?? '',
      files: (d.files ?? []).map((f) => ({ id: f.id, name: f.name, size: f.size, path: f.path, uploadedAt: f.uploadedAt })),
    })),
    sharedDocs: (project.sharedDocs ?? []).map((f) => ({
      id: f.id, label: f.label, name: f.name, size: f.size, path: f.path, stage: f.stage ?? null, addedAt: f.addedAt,
    })),
    approvals: (project.approvals ?? []).map((a) => ({
      id: a.id, label: a.label, body: a.body ?? '', stage: a.stage ?? null,
      status: a.status ?? 'pending', approvedBy: a.approvedBy ?? '', approvedAt: a.approvedAt ?? null,
    })),
    messages: (project.messages ?? []).map((m) => ({
      id: m.id, from: m.from, authorName: m.authorName ?? '', body: m.body, at: m.at,
    })).sort((a, b) => new Date(a.at) - new Date(b.at)),
  }
}

async function hydrate(sb, projects) {
  const customerIds = [...new Set(projects.map((p) => p.customerId).filter(Boolean))]

  // Projects link to a design two ways. Ones created from a won lead carry a
  // `designId`; the migrated showcase projects only ever had a `designName`.
  // Matching on id alone silently loses the bedroom count, the area and the
  // floorplan on every migrated build, so try the name as well.
  const [designs, customers] = await Promise.all([
    sb.from('designs').select('id, data'),
    customerIds.length ? sb.from('customers').select('id, data').in('id', customerIds) : { data: [] },
  ])
  const all = (designs.data ?? []).map(row)
  const byId = new Map(all.map((d) => [d.id, d]))
  const byName = new Map(all.map((d) => [String(d.name ?? '').toLowerCase(), d]))
  const cMap = new Map((customers.data ?? []).map((c) => [c.id, row(c)]))

  const designFor = (p) =>
    byId.get(p.designId) ?? byName.get(String(p.designName ?? '').toLowerCase()) ?? null

  return projects.map((p) => clientView(p, { design: designFor(p), customer: cMap.get(p.customerId) }))
}

// ── Handler ─────────────────────────────────────────────────────────────────

export default async function handler(req, res) {
  if (applyCors(req, res, 'POST, OPTIONS')) return
  if (req.method !== 'POST') return methodNotAllowed(res, 'POST')

  const body = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : (req.body ?? {})
  const { action } = body
  const sb = serviceClient()

  try {
    // ── Public ──────────────────────────────────────────────────────────────
    if (action === 'request-link') return await requestLink({ sb, res, body })

    const user = await verifiedUser(req, sb)
    if (!user) return res.status(401).json({ error: 'Sign in to continue.' })

    const admin = await isAdminEmail(sb, user.email)

    // ── Admin ───────────────────────────────────────────────────────────────
    if ([
      'invite', 'revoke', 'request-docs', 'reply', 'review-doc', 'admin-download-url',
      'add-items', 'remove-item', 'shared-upload-url', 'attach-shared',
    ].includes(action)) {
      if (!admin) return res.status(403).json({ error: 'Admin access required.' })
      return await adminAction({ sb, res, body, action, user })
    }

    // ── Customer ────────────────────────────────────────────────────────────
    return await clientAction({ sb, req, res, body, action, user, admin })
  } catch (err) {
    console.error(`portal ${action} failed:`, err)
    return res.status(500).json({ error: err.message || 'Something went wrong.' })
  }
}

// ── Public: send a sign-in link ─────────────────────────────────────────────

/**
 * Always answers the same way, whether or not the address is a customer.
 * Telling an anonymous caller "no build found for that email" turns this into
 * a way to ask whether someone is building a house with us.
 */
async function requestLink({ sb, res, body }) {
  const email = normEmail(body.email)
  const generic = { ok: true }
  if (!email || !email.includes('@')) return res.status(400).json({ error: 'Enter your email address.' })

  const projects = await projectsFor(sb, email)
  if (!projects.length) return res.status(200).json(generic)

  const project = projects[0]
  const last = project.portalLinkSentAt?.[email]
  if (last && Date.now() - new Date(last).getTime() < LINK_COOLDOWN_MS) return res.status(200).json(generic)

  const settings = await loadSettings(sb)
  const link = await magicLink(sb, email)
  const { subject, html } = renderPortalLogin({ link, email })
  await sendPortal({ to: email, subject, html, projectId: project.id, emailType: 'portal_login', settings })

  await saveProject(sb, {
    ...project,
    portalLinkSentAt: { ...(project.portalLinkSentAt ?? {}), [email]: new Date().toISOString() },
  })

  return res.status(200).json(generic)
}

// ── Customer actions ────────────────────────────────────────────────────────

async function clientAction({ sb, req, res, body, action, user, admin }) {
  if (action === 'me') {
    const projects = await projectsFor(sb, user.email)
    return res.status(200).json({
      email: user.email,
      isAdmin: admin,
      projects: await hydrate(sb, projects),
    })
  }

  const project = await loadProject(sb, body.projectId)
  if (!project) return res.status(404).json({ error: 'That build no longer exists.' })
  // An admin can act on any build; a customer only on their own. Same check for
  // every action below, done once.
  if (!admin && !canAccessProject(project, user.email)) {
    return res.status(403).json({ error: 'You don\'t have access to that build.' })
  }

  const settings = await loadSettings(sb)

  switch (action) {
    case 'upload-url': {
      const request = (project.docRequests ?? []).find((d) => d.id === body.requestId)
      if (!request) return res.status(404).json({ error: 'That document request no longer exists.' })
      if ((request.files ?? []).length >= MAX_FILES_PER_REQUEST) {
        return res.status(400).json({ error: `That's already ${MAX_FILES_PER_REQUEST} files. Remove one before adding another.` })
      }
      const reject = fileRejectionReason({ name: body.fileName, size: body.size })
      if (reject) return res.status(400).json({ error: reject })

      // We choose the path, never the caller — which is what makes the prefix
      // check on the way back in meaningful.
      const path = `${projectPrefix(project.id)}${request.id}/${newId('f')}-${safeFileName(body.fileName)}`
      const { data, error } = await sb.storage.from(DOCS_BUCKET).createSignedUploadUrl(path)
      if (error) throw new Error(error.message)
      return res.status(200).json({ path: data.path, token: data.token })
    }

    case 'attach': {
      const requests = project.docRequests ?? []
      const request = requests.find((d) => d.id === body.requestId)
      if (!request) return res.status(404).json({ error: 'That document request no longer exists.' })

      const path = String(body.path ?? '')
      if (!path.startsWith(`${projectPrefix(project.id)}${request.id}/`)) {
        return res.status(400).json({ error: 'That file doesn\'t belong to this request.' })
      }

      // Confirm the object is really there and take its size from storage
      // rather than the request body — otherwise "uploaded" can be claimed for
      // a file that was never sent.
      const dir = path.slice(0, path.lastIndexOf('/'))
      const base = path.slice(path.lastIndexOf('/') + 1)
      const { data: listed } = await sb.storage.from(DOCS_BUCKET).list(dir, { search: base, limit: 1 })
      const found = (listed ?? []).find((o) => o.name === base)
      if (!found) return res.status(400).json({ error: 'That upload didn\'t finish. Try again.' })

      const file = {
        id: newId('file'),
        name: String(body.name ?? base).slice(0, 200),
        path,
        size: found.metadata?.size ?? 0,
        type: found.metadata?.mimetype ?? '',
        uploadedAt: new Date().toISOString(),
        uploadedBy: user.email,
      }
      const files = [...(request.files ?? []), file]
      const updated = { ...request, files, status: 'uploaded', reviewNote: '', updatedAt: file.uploadedAt }

      await saveProject(sb, { ...project, docRequests: requests.map((d) => (d.id === request.id ? updated : d)) })

      const mail = renderTeamUpload({ project, email: user.email, request: updated, files: [file], adminUrl: ADMIN_URL })
      await sendPortal({ to: notifyList(settings), ...mail, projectId: project.id, emailType: 'portal_upload_notify', settings })

      return res.status(200).json({ ok: true, request: updated })
    }

    case 'remove-file': {
      const requests = project.docRequests ?? []
      const request = requests.find((d) => d.id === body.requestId)
      if (!request) return res.status(404).json({ error: 'That document request no longer exists.' })
      // Once we've accepted a document, removing it is our call, not theirs.
      if (!admin && request.status === 'accepted') {
        return res.status(400).json({ error: 'We\'ve already accepted this one. Message us if it needs replacing.' })
      }
      const file = (request.files ?? []).find((f) => f.id === body.fileId)
      if (!file) return res.status(404).json({ error: 'That file is already gone.' })

      await sb.storage.from(DOCS_BUCKET).remove([file.path])
      const files = (request.files ?? []).filter((f) => f.id !== body.fileId)
      const updated = { ...request, files, status: files.length ? request.status : 'requested', updatedAt: new Date().toISOString() }
      await saveProject(sb, { ...project, docRequests: requests.map((d) => (d.id === request.id ? updated : d)) })
      return res.status(200).json({ ok: true, request: updated })
    }

    case 'download-url': {
      const path = String(body.path ?? '')
      // Membership, not just prefix: the path has to be one we actually put on
      // this project, so a guessed filename inside their own folder is no good.
      const known = [
        ...(project.docRequests ?? []).flatMap((d) => d.files ?? []),
        ...(project.sharedDocs ?? []),
      ].some((f) => f.path === path)
      if (!known) return res.status(404).json({ error: 'That file isn\'t on this build.' })

      const { data, error } = await sb.storage.from(DOCS_BUCKET).createSignedUrl(path, 300, { download: true })
      if (error) throw new Error(error.message)
      return res.status(200).json({ url: data.signedUrl })
    }

    case 'approve': {
      const approvals = project.approvals ?? []
      const approval = approvals.find((a) => a.id === body.approvalId)
      if (!approval) return res.status(404).json({ error: 'That approval no longer exists.' })
      if (approval.status === 'approved') return res.status(200).json({ ok: true, approval })

      const name = String(body.name ?? '').trim()
      if (name.length < 2) return res.status(400).json({ error: 'Type your full name to approve.' })

      const updated = {
        ...approval,
        status: 'approved',
        approvedBy: name.slice(0, 120),
        approvedByEmail: user.email,
        approvedAt: new Date().toISOString(),
        // Kept for the same reason the e-sign flow keeps it: a signed-off
        // milestone that is later disputed needs more than a name in a box.
        approvedIp: callerIp(req),
      }
      await saveProject(sb, { ...project, approvals: approvals.map((a) => (a.id === approval.id ? updated : a)) })

      const mail = renderTeamApproval({ project, email: user.email, approval: updated, adminUrl: ADMIN_URL })
      await sendPortal({ to: notifyList(settings), ...mail, projectId: project.id, emailType: 'portal_approval_notify', settings })

      return res.status(200).json({ ok: true, approval: updated })
    }

    case 'message': {
      const text = String(body.body ?? '').trim()
      if (!text) return res.status(400).json({ error: 'Write something first.' })
      if (text.length > MAX_MESSAGE_CHARS) return res.status(400).json({ error: 'That message is too long — send it in a couple of parts.' })

      const message = { id: newId('msg'), from: 'client', authorName: user.email, body: text, at: new Date().toISOString() }
      await saveProject(sb, { ...project, messages: [...(project.messages ?? []), message] })

      const mail = renderTeamMessage({ project, email: user.email, body: text, adminUrl: ADMIN_URL })
      await sendPortal({ to: notifyList(settings), ...mail, projectId: project.id, emailType: 'portal_message_notify', settings })

      return res.status(200).json({ ok: true, message })
    }

    default:
      return res.status(400).json({ error: `Unknown action "${action}".` })
  }
}

/**
 * The caller's address, as the platform saw it — never as the body claimed it.
 * Vercel appends the real client IP to x-forwarded-for, so the first entry is
 * the one that matters.
 */
function callerIp(req) {
  const fwd = req?.headers?.['x-forwarded-for']
  const first = (Array.isArray(fwd) ? fwd[0] : String(fwd ?? '')).split(',')[0].trim()
  return (first || req?.socket?.remoteAddress || '').slice(0, 60)
}

// ── Admin actions ───────────────────────────────────────────────────────────

async function adminAction({ sb, res, body, action, user }) {
  const project = await loadProject(sb, body.projectId)
  if (!project) return res.status(404).json({ error: 'That project no longer exists.' })
  const settings = await loadSettings(sb)

  switch (action) {
    case 'invite': {
      const email = normEmail(body.email)
      if (!email.includes('@')) return res.status(400).json({ error: 'Enter a valid email address.' })

      const emails = [...new Set([...clientEmails(project), email])]
      const customer = project.customerId
        ? row((await sb.from('customers').select('id, data').eq('id', project.customerId).maybeSingle()).data)
        : null

      const link = await magicLink(sb, email)
      const pending = (project.docRequests ?? []).filter((d) => d.status === 'requested' || d.status === 'rejected')
      const mail = renderPortalInvite({ project, customer: customer ?? { name: body.name }, link, pending, settings })
      const sent = await sendPortal({ to: email, ...mail, projectId: project.id, customerId: project.customerId, emailType: 'portal_invite', settings })

      await saveProject(sb, {
        ...project,
        clientEmails: emails,
        portalInvitedAt: { ...(project.portalInvitedAt ?? {}), [email]: new Date().toISOString() },
      })
      return res.status(200).json({ ok: true, clientEmails: emails, sent: sent.ok, skipped: sent.skipped, reason: sent.reason })
    }

    case 'revoke': {
      const email = normEmail(body.email)
      const emails = clientEmails(project).filter((e) => e !== email)
      await saveProject(sb, { ...project, clientEmails: emails })
      return res.status(200).json({ ok: true, clientEmails: emails })
    }

    case 'request-docs': {
      const ids = Array.isArray(body.requestIds) ? body.requestIds : []
      const items = (project.docRequests ?? []).filter((d) => ids.includes(d.id))
      if (!items.length) return res.status(400).json({ error: 'Nothing selected to ask for.' })

      const to = clientEmails(project)
      if (!to.length) return res.status(400).json({ error: 'Invite the customer to the portal first — nobody can sign in yet.' })

      const customer = project.customerId
        ? row((await sb.from('customers').select('id, data').eq('id', project.customerId).maybeSingle()).data)
        : null

      const mail = renderDocsRequested({ project, customer, items, link: portalLink(`/portal/${project.id}`) })
      const sent = await sendPortal({ to, ...mail, projectId: project.id, customerId: project.customerId, emailType: 'portal_docs_requested', settings })

      const at = new Date().toISOString()
      await saveProject(sb, {
        ...project,
        docRequests: (project.docRequests ?? []).map((d) => (ids.includes(d.id) ? { ...d, requestedAt: at } : d)),
      })
      return res.status(200).json({ ok: true, sent: sent.ok, skipped: sent.skipped, reason: sent.reason, count: items.length })
    }

    case 'reply': {
      const text = String(body.body ?? '').trim()
      if (!text) return res.status(400).json({ error: 'Write something first.' })

      const to = clientEmails(project)
      const message = {
        id: newId('msg'), from: 'team', authorName: body.authorName || user.email, body: text, at: new Date().toISOString(),
      }
      await saveProject(sb, { ...project, messages: [...(project.messages ?? []), message] })

      let sent = { ok: true, skipped: true, reason: 'no portal client' }
      if (to.length) {
        const customer = project.customerId
          ? row((await sb.from('customers').select('id, data').eq('id', project.customerId).maybeSingle()).data)
          : null
        const mail = renderPortalReply({
          project, customer, body: text, author: body.authorName || 'your project team', link: portalLink(`/portal/${project.id}`),
        })
        sent = await sendPortal({ to, ...mail, projectId: project.id, customerId: project.customerId, emailType: 'portal_reply', settings })
      }
      return res.status(200).json({ ok: true, message, sent: sent.ok, skipped: sent.skipped, reason: sent.reason })
    }

    case 'review-doc': {
      const requests = project.docRequests ?? []
      const request = requests.find((d) => d.id === body.requestId)
      if (!request) return res.status(404).json({ error: 'That document request no longer exists.' })
      const status = body.status === 'accepted' ? 'accepted' : 'rejected'
      const updated = {
        ...request, status,
        reviewNote: String(body.reviewNote ?? '').slice(0, 1000),
        reviewedBy: user.email, reviewedAt: new Date().toISOString(),
      }
      await saveProject(sb, { ...project, docRequests: requests.map((d) => (d.id === request.id ? updated : d)) })
      return res.status(200).json({ ok: true, request: updated })
    }

    case 'admin-download-url': {
      const path = String(body.path ?? '')
      if (!path.startsWith(projectPrefix(project.id))) return res.status(400).json({ error: 'That file isn\'t on this build.' })
      const { data, error } = await sb.storage.from(DOCS_BUCKET).createSignedUrl(path, 300, { download: true })
      if (error) throw new Error(error.message)
      return res.status(200).json({ url: data.signedUrl })
    }

    /*
      The four cases below exist so the CRM never edits these lists through the
      store. The store writes the whole project record from whatever it loaded
      at page open — fine when staff were the only writers, wrong now that a
      customer can upload a file at the same moment. Read-modify-write happens
      here, against the row as it is this second.
    */
    case 'add-items': {
      const list = LIST_FIELDS[body.list]
      if (!list) return res.status(400).json({ error: `Unknown list "${body.list}".` })
      const incoming = Array.isArray(body.items) ? body.items : []
      if (!incoming.length) return res.status(400).json({ error: 'Nothing to add.' })

      const added = incoming.map((raw) => list.build(raw))
      const next = [...(project[body.list] ?? []), ...added]
      await saveProject(sb, { ...project, [body.list]: next })
      return res.status(200).json({ ok: true, items: next, added })
    }

    case 'remove-item': {
      // sharedDocs is removable but not addable this way — it gets its own
      // upload path above, so it isn't in LIST_FIELDS.
      if (!REMOVABLE_LISTS.includes(body.list)) return res.status(400).json({ error: `Unknown list "${body.list}".` })
      const current = project[body.list] ?? []
      const item = current.find((x) => x.id === body.itemId)
      if (!item) return res.status(200).json({ ok: true, items: current })

      // Take the stored files with it, or the bucket fills up with orphans
      // nothing can ever reach again.
      const paths = [item.path, ...(item.files ?? []).map((f) => f.path)].filter(Boolean)
      if (paths.length) await sb.storage.from(DOCS_BUCKET).remove(paths)

      const next = current.filter((x) => x.id !== body.itemId)
      await saveProject(sb, { ...project, [body.list]: next })
      return res.status(200).json({ ok: true, items: next })
    }

    case 'shared-upload-url': {
      const reject = fileRejectionReason({ name: body.fileName, size: body.size })
      if (reject) return res.status(400).json({ error: reject })
      const path = `${projectPrefix(project.id)}issued/${newId('f')}-${safeFileName(body.fileName)}`
      const { data, error } = await sb.storage.from(DOCS_BUCKET).createSignedUploadUrl(path)
      if (error) throw new Error(error.message)
      return res.status(200).json({ path: data.path, token: data.token })
    }

    case 'attach-shared': {
      const path = String(body.path ?? '')
      if (!path.startsWith(`${projectPrefix(project.id)}issued/`)) {
        return res.status(400).json({ error: 'That file doesn\'t belong to this build.' })
      }
      const dir = path.slice(0, path.lastIndexOf('/'))
      const base = path.slice(path.lastIndexOf('/') + 1)
      const { data: listed } = await sb.storage.from(DOCS_BUCKET).list(dir, { search: base, limit: 1 })
      const found = (listed ?? []).find((o) => o.name === base)
      if (!found) return res.status(400).json({ error: 'That upload didn\'t finish. Try again.' })

      const doc = {
        id: newId('doc'),
        label: String(body.label ?? body.name ?? base).slice(0, 200),
        name: String(body.name ?? base).slice(0, 200),
        stage: body.stage ?? null,
        path,
        size: found.metadata?.size ?? 0,
        type: found.metadata?.mimetype ?? '',
        addedAt: new Date().toISOString(),
        addedBy: user.email,
      }
      const next = [...(project.sharedDocs ?? []), doc]
      await saveProject(sb, { ...project, sharedDocs: next })
      return res.status(200).json({ ok: true, items: next, doc })
    }

    default:
      return res.status(400).json({ error: `Unknown action "${action}".` })
  }
}
