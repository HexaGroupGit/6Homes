// What each kind of staff account can reach.
//
// IMPORTANT: this file describes the rules; it does not enforce them. The real
// boundary is RLS in the database (sql/6homes-roles.sql) plus requireFullAdmin
// in api/_auth.js. Everything here exists so the interface stops offering
// people doors that are locked — hiding a nav item is courtesy, not security.
//
// Keep it import-free: the serverless functions pull it in too.

export const ROLES = {
  owner: {
    label: 'Owner',
    blurb: 'Everything, including adding and removing staff.',
    full: true,
  },
  admin: {
    label: 'Admin',
    blurb: 'Everything: leads, designs, builds, quotes, templates and settings.',
    full: true,
  },
  projects: {
    label: 'Projects only',
    blurb:
      'Builds and the client portal, plus the design range to refer to. No leads, ' +
      'no quotes or contracts, no email templates, no settings.',
    full: false,
  },
}

export const DEFAULT_ROLE = 'admin'

export const roleMeta = (role) => ROLES[role] ?? ROLES[DEFAULT_ROLE]

/** Full access — the two roles that may touch the pipeline and the settings. */
export const isFullAdmin = (admin) => roleMeta(admin?.role).full === true

/** Only an owner may change who else has access. */
export const canManageStaff = (admin) => admin?.role === 'owner'

// The routes each role may open, as path prefixes. `projects` deliberately
// keeps the dashboard out: it aggregates lead counts and pipeline value.
const PROJECTS_ROUTES = ['/projects', '/designs']

export function canOpen(admin, path) {
  if (isFullAdmin(admin)) return true
  return PROJECTS_ROUTES.some((p) => path === p || path.startsWith(`${p}/`))
}

/** Where a role lands when it signs in, and where it is sent if it wanders. */
export const homePath = (admin) => (isFullAdmin(admin) ? '/' : '/projects')

/**
 * Filter the sidebar to what this role can actually use.
 * Items are `{ to, label, ... }` — the shape Layout already has.
 */
export const visibleNav = (admin, nav) => nav.filter((item) => canOpen(admin, item.to))
