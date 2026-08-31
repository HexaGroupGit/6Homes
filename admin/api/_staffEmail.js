// The invitation a new staff member receives. Underscore prefix = not a route.
import { brandFrame, bKicker, bH1, bP, bBtn, bPanel, bSmall, bDivider, esc, COMPANY } from './_brand.js'
import { ROLES, DEFAULT_ROLE } from '../src/lib/roles.js'

// What each role will actually find when they sign in. Written as plain
// sentences rather than a permissions matrix, because the person reading this
// wants to know what they can do, not how it is implemented.
const TOUR = {
  full: [
    ['Leads', 'Every website enquiry on a pipeline from new through to won, with a record of every email sent to each one.'],
    ['Designs', 'The model range and its specifications — what the website, the brochures and the quotes all read from.'],
    ['Projects', 'Customer builds moving through the six stages, each with its own client portal.'],
    ['Quotes', 'Quotes, contracts and e-signature, with a tokenised page the customer accepts from.'],
    ['Settings', 'Company details, who the team notifications go to, and the safe-mode switch.'],
  ],
  projects: [
    ['Projects', 'The builds you run, moving through the six stages, each with its own client portal.'],
    ['Client portal', 'For each build: invite the customer, ask them for documents, review what they send, issue plans and certificates, and answer their questions.'],
    ['Designs', 'The model range, to refer to. Read-only.'],
  ],
}

export function renderStaffInvite({ name, role, link, portal }) {
  const meta = ROLES[role] ?? ROLES[DEFAULT_ROLE]
  const items = TOUR[meta.full ? 'full' : 'projects']

  const rows = items.map(([title, blurb]) => `
    <tr><td style="padding:9px 0;border-bottom:1px solid #DFE6E9;font-family:Helvetica,Arial,sans-serif;font-size:13px;line-height:1.6;color:#39474F">
      <strong style="color:#0E5476">${esc(title)}</strong><br />
      <span style="color:#64757E;font-size:12px">${esc(blurb)}</span>
    </td></tr>`).join('')

  const inner =
    bKicker('You\'ve been given access') +
    bH1('Your 6Homes admin login') +
    bP(`Hi ${esc(name)},`) +
    bP(
      `You now have a <strong style="color:#0E5476">${esc(meta.label)}</strong> account on ` +
      `<strong style="color:#0E5476">${esc(portal.replace(/^https?:\/\//, ''))}</strong> — the 6Homes CRM and client portal. ` +
      'Set your password below and you\'re in.'
    ) +
    bBtn('Choose your password', link) +
    bSmall(
      'This link works once and lasts an hour. If it has expired by the time you get to it, go to ' +
      `<a href="${portal}" style="color:#0D7982">${esc(portal.replace(/^https?:\/\//, ''))}</a> and use ` +
      '<em>Forgot your password?</em> — that sends a fresh one.'
    ) +
    bDivider() +
    bKicker('What you\'ll find there') +
    `<table style="width:100%;border-collapse:collapse;margin:14px 0 0">${rows}</table>` +
    (meta.full
      ? bPanel(
          '<div style="font-family:Helvetica,Arial,sans-serif;font-size:13px;line-height:1.7;color:#5B4A16">' +
          '<strong>One thing before you send anything.</strong> The system is in safe mode: every email it produces ' +
          'is redirected to a single test inbox instead of the customer, with a <code>[TEST &rarr; ]</code> subject ' +
          'prefix. That is deliberate — you can click through the whole thing without a real customer hearing from ' +
          'us. Settings has the switch when you\'re ready to go live.</div>'
        )
      : '') +
    bSmall(`Any trouble getting in, call us on <a href="${COMPANY.phoneHref}" style="color:#64757E">${COMPANY.phone}</a>.`)

  return {
    subject: `Your 6Homes admin login — ${portal.replace(/^https?:\/\//, '')}`,
    html: brandFrame(inner, {
      footerLabel: 'Admin',
      preheader: 'Set your password and sign in to the 6Homes CRM.',
    }),
  }
}
