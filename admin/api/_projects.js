// Shared server-side project helpers — used by project-notify.js (admin action)
// and project-updates.js (daily cron). Underscore prefix = not an API route.
//
// The stage list is imported from ../src/lib/projectStages.js so the CRM and the
// emails can never drift apart. That module is deliberately import-free, which
// is what makes it safe to pull into the serverless runtime.
import { BUILD_STAGES, stageById } from '../src/lib/projectStages.js'
import {
  brandFrame, bKicker, bH1, bP, bBtn, bPanel, bTable, bSmall, bDesignCard, esc, escLines, COMPANY,
} from './_brand.js'
import { fillVars, findEmailTemplate } from './_leads.js'
import { sendEmail } from './_email.js'

const SITE = (process.env.PUBLIC_SITE_URL || 'https://6homes.com').replace(/\/+$/, '')

// A six-step rail, rendered as a table so Outlook doesn't mangle it. The
// customer sees exactly where their build is, which cuts "any update?" emails
// more than any amount of prose.
function progressRail(currentIndex) {
  const cells = BUILD_STAGES.map((s, i) => {
    const done = i <= currentIndex
    return `<td style="padding:0 2px;width:${Math.floor(100 / BUILD_STAGES.length)}%">
      <div style="height:5px;border-radius:3px;background:${done ? '#0D7982' : '#DFE6E9'}"></div>
      <div style="margin-top:7px;font-family:Helvetica,Arial,sans-serif;font-size:9px;line-height:1.3;letter-spacing:.04em;color:${i === currentIndex ? '#0E5476' : '#64757E'};${i === currentIndex ? 'font-weight:600;' : ''}text-transform:uppercase">${s.name}</div>
    </td>`
  }).join('')
  return `<table style="width:100%;border-collapse:collapse;margin:0 0 26px"><tr>${cells}</tr></table>`
}

/**
 * Build the customer-facing stage-update email.
 * An editable template (`project_stage_<id>`) wins over the default copy in
 * projectStages.js, same resolution order as the lead emails.
 */
export function renderStageEmail({ project, customer, design, stageId, templates, settings }) {
  const stage = stageById(stageId)
  if (!stage) return null

  const index = BUILD_STAGES.findIndex((s) => s.id === stageId)
  const firstName = (customer?.name || '').split(' ')[0]
  const detail = project?.stageDetail?.[stageId] ?? {}

  const vars = {
    name: customer?.name || 'there',
    firstName: firstName || 'there',
    project: project?.name || '',
    design: design?.name || project?.designName || '',
    stage: stage.name,
    company: settings?.company?.name || COMPANY.name,
    website: SITE,
  }

  const tpl = findEmailTemplate(templates, `project_stage_${stageId}`)
  if (tpl) {
    return { subject: fillVars(tpl.subject || stage.email.subject, vars), html: fillVars(tpl.content, vars) }
  }

  const rows = [['Your home', esc(design?.name || project?.designName || '—')]]
  if (project?.suburb) rows.push(['Site', esc(project.suburb)])
  rows.push(['Current stage', esc(stage.name)])
  if (detail.targetDate) rows.push(['Expected', esc(detail.targetDate)])

  const inner =
    bKicker(`Stage ${index + 1} of ${BUILD_STAGES.length}`) +
    bH1(esc(stage.email.heading)) +
    bP(`Hi ${esc(firstName || 'there')},`) +
    bP(esc(stage.email.body)) +
    progressRail(index) +
    bTable(rows) +
    (detail.notes
      ? bPanel(`<div style="font-family:Helvetica,Arial,sans-serif;font-size:13px;line-height:1.7;color:#39474F"><strong style="color:#0E5476">From your project team</strong><br />${escLines(detail.notes)}</div>`)
      : '') +
    (design ? bDesignCard(design) : '') +
    bBtn('Talk to your consultant', `${SITE}/contact`) +
    bSmall(`Questions at any point? Call us on <a href="${COMPANY.phoneHref}" style="color:#64757E">${COMPANY.phone}</a> and ask for your project consultant.`)

  return {
    subject: fillVars(stage.email.subject, vars),
    html: brandFrame(inner, { footerLabel: 'Your Build', preheader: stage.email.body.slice(0, 120) }),
  }
}

/**
 * Send the stage-update email for one project and record it on the project so
 * the same stage is never announced twice.
 * Returns { ok, skipped?, reason? }.
 */
export async function sendStageUpdate({ sb, project, customer, design, stageId, templates, settings }) {
  if (!customer?.email) return { ok: true, skipped: true, reason: 'no customer email' }

  const rendered = renderStageEmail({ project, customer, design, stageId, templates, settings })
  if (!rendered) return { ok: false, skipped: true, reason: `unknown stage ${stageId}` }

  const r = await sendEmail({
    to: customer.email,
    subject: rendered.subject,
    html: rendered.html,
    replyTo: settings?.emails?.replyTo,
    projectId: project.id,
    customerId: customer.id,
    emailType: `project_stage_${stageId}`,
  })
  if (!r.ok) return { ok: false, reason: r.reason ?? 'send failed' }

  const notified = Array.from(new Set([...(project.notifiedStages ?? []), stageId]))
  await sb.from('projects').update({
    data: { ...project, notifiedStages: notified, lastNotifiedAt: new Date().toISOString() },
    updated_at: new Date().toISOString(),
  }).eq('id', project.id)

  return { ok: true }
}
