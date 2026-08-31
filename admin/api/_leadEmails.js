// Default copy for every lead-facing email.
//
// These are the fallbacks. If a matching row exists in `templates`
// (category:'email', emailType:'<key>') the CRM's editable version wins — see
// findEmailTemplate() / renderLead() in _leads.js. Keeping real defaults here
// means the funnel works on day one, before anyone has written a template.
//
// Every builder returns { subject, html } and takes the same `vars` bag so the
// caller doesn't need to know which flow it's rendering.
import {
  brandFrame, bKicker, bH1, bP, bBtn, bPanel, bTable, bSmall, bDivider, bDesignCard,
  esc, escLines, COMPANY,
} from './_brand.js'

const SITE = (process.env.PUBLIC_SITE_URL || 'https://6homes.com').replace(/\/+$/, '')

// A greeting that doesn't read badly when we only captured a phone number.
const hi = (name) => `Hi ${name ? esc(name.split(' ')[0]) : 'there'},`

// Shown at the end of every customer-facing lead email.
const signoff = () =>
  bP(`If you'd rather talk it through, call us on <a href="${COMPANY.phoneHref}" style="color:#0D7982">${COMPANY.phone}</a> — we're happy to answer anything.<br /><br />— The 6Homes team`)

// The design the lead was looking at, if the form carried one through.
const designBlock = (design) => (design?.name ? bDesignCard(design) : '')

// ── The six website auto-replies ────────────────────────────────────────────

export function consultationEmail(v = {}) {
  return {
    subject: `Your 6Homes consultation — let's find your fit`,
    html: brandFrame(
      bKicker('Consultation requested') +
      bH1(`Thanks for reaching out, ${v.name ? esc(v.name.split(' ')[0]) : 'there'}`) +
      bP(`We've got your request and one of our design consultants will be in touch within one business day to book a time that suits you.`) +
      bP(`A consultation is a no-obligation conversation about your block, your budget and which of our homes actually fits — we'll tell you honestly if something won't work.`) +
      designBlock(v.design) +
      bBtn('Browse our designs', `${SITE}/models`) +
      bDivider() +
      bP(`<strong>Prefer to see one in person?</strong> Our display showroom is at ${COMPANY.showroom}, open weekdays. Just reply to this email and we'll set aside a time.`) +
      signoff(),
      { footerLabel: 'Design Consultations', preheader: 'We\'ll be in touch within one business day to book your consultation.' }
    ),
  }
}

export function brochureEmail(v = {}) {
  return {
    subject: `Your 6Homes brochure`,
    html: brandFrame(
      bKicker('Your brochure') +
      bH1('Here\'s the full 6Homes range') +
      bP(`${hi(v.name)}<br /><br />Your brochure is attached. It walks through every model we build, what comes standard, and how the process works from first conversation to handover.`) +
      designBlock(v.design) +
      bPanel(
        `<div style="font-family:Helvetica,Arial,sans-serif;font-size:13px;line-height:1.7;color:#39474F">
          <strong style="color:#0E5476">Standard in every home</strong><br />
          Double-glazed windows and doors · designer kitchen and bathrooms · choice of tapware finishes · energy-efficient insulation · turnkey service from permits to handover
        </div>`
      ) +
      bBtn('View the designs', `${SITE}/models`) +
      bP(`Once you've had a look, we're glad to talk through which model suits your site. No pressure — most people take a few weeks over this.`) +
      signoff(),
      { footerLabel: 'The 6Homes Range', preheader: 'Your brochure is attached — every model, inclusions and process.' }
    ),
  }
}

export function pricelistEmail(v = {}) {
  return {
    subject: `Your 6Homes price list`,
    html: brandFrame(
      bKicker('Your price list') +
      bH1('6Homes pricing, in full') +
      bP(`${hi(v.name)}<br /><br />The Information and Price Guide is attached. It carries the installed price of every model, the standard inclusions, the payment schedule and how permits work — so you can see where your budget lands before you speak to anyone.`) +
      designBlock(v.design) +
      bPanel(
        `<div style="font-family:Helvetica,Arial,sans-serif;font-size:13px;line-height:1.7;color:#39474F">
          <strong style="color:#0E5476">What the installed price does not cover</strong><br />
          Site works move with your block — access, slope, services and council requirements all change the number. Third-party reports (soil test, bushfire management plan, land capability) are invoiced as they arise. We quote all of it properly after a site assessment rather than guess at it here.
        </div>`
      ) +
      bBtn('Book a free consultation', `${SITE}/contact`) +
      signoff(),
      { footerLabel: 'Pricing', preheader: 'Your price guide is attached — installed pricing for every model.' }
    ),
  }
}

export function domesticEmail(v = {}) {
  return {
    subject: `Your 6Homes enquiry — we've got it`,
    html: brandFrame(
      bKicker('Enquiry received') +
      bH1('Thanks — we\'ll come back to you shortly') +
      bP(`${hi(v.name)}<br /><br />Thanks for your enquiry about building with 6Homes. One of our team will review what you've sent and get back to you within one business day.`) +
      (v.message ? bPanel(`<div style="font-family:Helvetica,Arial,sans-serif;font-size:13px;line-height:1.7;color:#39474F"><strong style="color:#0E5476">What you told us</strong><br />${escLines(v.message)}</div>`) : '') +
      designBlock(v.design) +
      bP(`In the meantime, the attached brochure covers the full range and our six-step build process.`) +
      bBtn('See our completed projects', `${SITE}/projects`) +
      signoff(),
      { footerLabel: 'New Enquiry', preheader: 'We\'ve received your enquiry and will reply within one business day.' }
    ),
  }
}

export function commercialEmail(v = {}) {
  return {
    subject: `Your 6Homes commercial enquiry`,
    html: brandFrame(
      bKicker('Commercial enquiry') +
      bH1('Thanks — let\'s talk about your project') +
      bP(`${hi(v.name)}<br /><br />Thanks for getting in touch about a commercial or multi-unit project. These need a different conversation to a single home, so one of our project team will call you directly to understand the scope.`) +
      (v.message ? bPanel(`<div style="font-family:Helvetica,Arial,sans-serif;font-size:13px;line-height:1.7;color:#39474F"><strong style="color:#0E5476">What you told us</strong><br />${escLines(v.message)}</div>`) : '') +
      bP(`We've handled accommodation villages, tourism cabins, worker housing and multi-dwelling developments. Modular suits these well: the units are built under cover while your site works run in parallel, which usually pulls months out of the program.`) +
      bBtn('See our completed projects', `${SITE}/projects`) +
      signoff(),
      { footerLabel: 'Commercial Projects', preheader: 'Our project team will be in touch to scope your commercial project.' }
    ),
  }
}

export function tourEmail(v = {}) {
  return {
    subject: `Your 6Homes showroom visit`,
    html: brandFrame(
      bKicker('Showroom visit') +
      bH1('Come and walk through one') +
      bP(`${hi(v.name)}<br /><br />Thanks for asking about a showroom visit. We'll confirm a time with you shortly — just reply with what suits and we'll work around it.`) +
      bTable([
        ['Display showroom', COMPANY.showroom],
        ['Phone', `<a href="${COMPANY.phoneHref}" style="color:#0D7982;text-decoration:none">${COMPANY.phone}</a>`],
        ['Parking', 'On-site parking available'],
      ]) +
      bP(`Photos only get you so far. Standing inside one — the ceiling height, the joinery, how the light works — tells you in five minutes what a brochure can't.`) +
      bBtn('Get directions', 'https://maps.google.com/?q=878+Whitehorse+Road+Box+Hill+VIC+3128') +
      signoff(),
      { footerLabel: 'Showroom Tours', preheader: 'We\'ll confirm a showroom time with you shortly.' }
    ),
  }
}

// ── Nurture sequence ────────────────────────────────────────────────────────

export function followupEmail(v = {}) {
  return {
    subject: `Still thinking it over, ${v.name ? esc(v.name.split(' ')[0]) : 'there'}?`,
    html: brandFrame(
      bKicker('Following up') +
      bH1('Anything we can answer?') +
      bP(`${hi(v.name)}<br /><br />You got in touch with us about a 6Homes build a few days ago, and I wanted to check whether anything's still unclear.`) +
      bP(`The questions we get most:`) +
      bPanel(
        `<div style="font-family:Helvetica,Arial,sans-serif;font-size:13px;line-height:1.8;color:#39474F">
          <strong style="color:#0E5476">Will it fit my block?</strong> Send us the address and we'll tell you.<br />
          <strong style="color:#0E5476">What does site work cost?</strong> It varies — we quote it after a site assessment, not before.<br />
          <strong style="color:#0E5476">How long does it take?</strong> Around four months from design approval and payment.<br />
          <strong style="color:#0E5476">Can I change the layout?</strong> Yes, within the module structure. We'll show you what's possible.
        </div>`
      ) +
      designBlock(v.design) +
      bBtn('Book a free consultation', `${SITE}/contact`) +
      signoff(),
      { footerLabel: 'Following Up', preheader: 'A few of the questions we get asked most.' }
    ),
  }
}

export function finalEmail(v = {}) {
  return {
    subject: `Last note from 6Homes`,
    html: brandFrame(
      bKicker('Closing the loop') +
      bH1('We\'ll leave you to it') +
      bP(`${hi(v.name)}<br /><br />We haven't heard back, so we'll stop emailing — no one needs another company chasing them.`) +
      bP(`If your plans change, we're here. Everything stays on file, so you won't have to start from scratch: just reply to this email and we'll pick up where we left off.`) +
      bBtn('Browse the range any time', `${SITE}/models`) +
      bSmall(`All the best with the build, whoever you end up going with.<br /><br />— The 6Homes team`),
      { footerLabel: 'Homes For Everyone, Everywhere', preheader: 'We\'ll stop emailing — but we\'re here if your plans change.' }
    ),
  }
}

// ── Internal team notification ──────────────────────────────────────────────

export function teamNotifyEmail({ lead, intentLabel, adminUrl }) {
  const rows = [
    ['Enquiry type', esc(intentLabel)],
    ['Name', esc(lead.name) || '—'],
    ['Email', lead.email ? `<a href="mailto:${esc(lead.email)}" style="color:#0D7982;text-decoration:none">${esc(lead.email)}</a>` : '—'],
    ['Phone', lead.phone ? `<a href="tel:${esc(lead.phone)}" style="color:#0D7982;text-decoration:none">${esc(lead.phone)}</a>` : '—'],
  ]
  if (lead.suburb) rows.push(['Location', esc(lead.suburb)])
  if (lead.designName) rows.push(['Interested in', esc(lead.designName)])
  if (lead.budget) rows.push(['Budget', esc(lead.budget)])
  if (lead.timeframe) rows.push(['Timeframe', esc(lead.timeframe)])
  rows.push(['Source', esc(lead.source || '6homes.com')])

  return {
    subject: `New ${intentLabel.toLowerCase()} — ${lead.name || lead.email || lead.phone || 'unknown'}`,
    html: brandFrame(
      bKicker('New lead') +
      bH1(esc(lead.name) || 'New website enquiry') +
      bTable(rows) +
      (lead.message ? bPanel(`<div style="font-family:Helvetica,Arial,sans-serif;font-size:13px;line-height:1.7;color:#39474F"><strong style="color:#0E5476">Message</strong><br />${escLines(lead.message)}</div>`) : '') +
      bBtn('Open in the CRM', `${adminUrl}/leads/${lead.id}`) +
      bSmall('The customer has already had an automatic acknowledgement. This is the internal copy.'),
      { footerLabel: 'Internal', preheader: `${intentLabel} from ${lead.name || lead.email || 'a website visitor'}` }
    ),
  }
}
