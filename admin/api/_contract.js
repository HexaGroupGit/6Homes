// Contract generation + the signing emails.
//
// The contract body is rendered once at creation time and stored on the record,
// not re-rendered on each view. What someone signed has to stay exactly what
// they signed, even if a price, a template or this code changes afterwards.
import { randomBytes } from 'node:crypto'
import { quoteTotals } from '../src/lib/quoteMath.js'
import {
  brandFrame, bKicker, bH1, bP, bBtn, bTable, bSmall, esc, escLines, COMPANY,
} from './_brand.js'

const ADMIN = (process.env.ADMIN_URL || 'https://admin.6homes.com').replace(/\/+$/, '')

export const newContractToken = () => randomBytes(16).toString('hex')
export const signUrl = (token) => `${ADMIN}/sign/${token}`

export function nextContractNumber(existing = []) {
  const max = existing.reduce((m, c) => {
    const n = Number(String(c?.number ?? '').replace(/\D/g, ''))
    return Number.isFinite(n) ? Math.max(m, n) : m
  }, 0)
  return `CON-${String(max + 1).padStart(4, '0')}`
}

const money = (n) => Number(n).toLocaleString('en-AU', { style: 'currency', currency: 'AUD', maximumFractionDigits: 0 })
const auDate = (d) => new Date(d).toLocaleDateString('en-AU')

/**
 * The contract document, as HTML. Rendered from the accepted quote so the
 * numbers can't drift from what the customer agreed to.
 */
export function renderContractBody({ quote, settings }) {
  const totals = quoteTotals(quote)
  const company = settings?.company ?? {}
  const legalName = company.legalName || '6Homes Pty Ltd'
  const items = (quote.lineItems ?? [])
    .map((i) => `<tr>
      <td style="padding:8px 0;border-bottom:1px solid #DFE6E9">${esc(i.description)}</td>
      <td style="padding:8px 0;border-bottom:1px solid #DFE6E9;text-align:right;white-space:nowrap">${money(Number(i.qty ?? 1) * Number(i.unitPrice ?? 0))}</td>
    </tr>`)
    .join('')

  const clause = (n, heading, body) =>
    `<h3 style="margin:26px 0 8px;font-size:14px;color:#0E5476">${n}. ${heading}</h3>
     <p style="margin:0;font-size:13px;line-height:1.75;color:#39474F">${body}</p>`

  return `<div style="font-family:Helvetica,Arial,sans-serif;color:#16242C">
  <h1 style="margin:0 0 4px;font-size:20px;color:#0E5476">Modular Home Supply and Installation Contract</h1>
  <p style="margin:0 0 24px;font-size:12px;color:#64757E">Contract reference: ${esc(quote.contractNumber || '')} · Based on quotation ${esc(quote.number || '')}</p>

  <table style="width:100%;border-collapse:collapse;margin:0 0 24px;font-size:13px">
    <tr><td style="padding:8px 0;color:#64757E;width:170px;border-bottom:1px solid #DFE6E9">Builder</td><td style="padding:8px 0;border-bottom:1px solid #DFE6E9">${esc(legalName)}, ${esc(company.headOffice || COMPANY.headOffice)}</td></tr>
    <tr><td style="padding:8px 0;color:#64757E;border-bottom:1px solid #DFE6E9">Customer</td><td style="padding:8px 0;border-bottom:1px solid #DFE6E9">${esc(quote.customerName || '')}${quote.customerEmail ? ` (${esc(quote.customerEmail)})` : ''}</td></tr>
    <tr><td style="padding:8px 0;color:#64757E;border-bottom:1px solid #DFE6E9">Site</td><td style="padding:8px 0;border-bottom:1px solid #DFE6E9">${esc(quote.siteAddress || 'To be confirmed')}</td></tr>
    <tr><td style="padding:8px 0;color:#64757E;border-bottom:1px solid #DFE6E9">Home</td><td style="padding:8px 0;border-bottom:1px solid #DFE6E9">${esc(quote.designName || '')}</td></tr>
    <tr><td style="padding:8px 0;color:#64757E;border-bottom:1px solid #DFE6E9">Date</td><td style="padding:8px 0;border-bottom:1px solid #DFE6E9">${auDate(new Date())}</td></tr>
  </table>

  <h2 style="margin:0 0 10px;font-size:15px;color:#0E5476">Scope and price</h2>
  <table style="width:100%;border-collapse:collapse;font-size:13px">
    ${items}
    <tr><td style="padding:10px 0;font-weight:700">Total (inc GST)</td><td style="padding:10px 0;text-align:right;font-weight:700">${money(totals.total)}</td></tr>
    <tr><td style="padding:4px 0;color:#64757E">GST included</td><td style="padding:4px 0;text-align:right;color:#64757E">${money(totals.gst)}</td></tr>
  </table>

  ${clause(1, 'Payment', `A deposit of ${money(totals.deposit)} (${quote.depositPercent ?? 10}% of the contract price) is payable on signing and secures the production slot. The balance of ${money(totals.balance)} is payable in accordance with the payment schedule provided, with final payment due prior to handover.`)}
  ${clause(2, 'Site works', 'Site works are quoted on the basis of the site assessment. Where ground conditions, access, services or authority requirements differ from those assessed, a written variation will be issued and must be approved by the Customer in writing before the affected work proceeds.')}
  ${clause(3, 'Variations', 'Any change to the design, specification or finishes requested after design approval will be quoted as a written variation. Work on a variation does not commence until it is approved in writing and any associated payment is received.')}
  ${clause(4, 'Program', 'Delivery is approximately four months from design approval and receipt of the deposit. The Builder will notify the Customer of any material change to the program. Delays caused by weather, authority approvals, site access or Customer-requested changes extend the program accordingly.')}
  ${clause(5, 'Approvals', 'Unless expressly stated in the scope above, obtaining planning and building approvals is the responsibility of the party identified in the quotation. The Builder will provide the documentation reasonably required to support an application.')}
  ${clause(6, 'Title and risk', 'Title in the modules passes to the Customer on receipt of final payment. Risk passes on installation at the site.')}
  ${clause(7, 'Warranty', 'The Builder warrants the structure and workmanship in accordance with the statutory warranties implied by the Domestic Building Contracts Act 1995 (Vic) and applicable Australian Consumer Law. Appliance and product warranties are as provided by their manufacturers.')}
  ${clause(8, 'Cooling off', 'The Customer may have a statutory cooling-off period under applicable domestic building legislation. Nothing in this contract limits any right the Customer has under the Australian Consumer Law.')}
  ${clause(9, 'Termination', 'Either party may terminate for a material breach that remains unremedied 14 days after written notice. On termination the Customer is liable for work properly performed and materials procured up to the date of termination.')}
  ${clause(10, 'Entire agreement', 'This contract, together with the accepted quotation and any approved variations, is the entire agreement between the parties and replaces any prior discussion or representation.')}

  ${quote.notes ? `<h3 style="margin:26px 0 8px;font-size:14px;color:#0E5476">Special conditions</h3><p style="margin:0;font-size:13px;line-height:1.75;color:#39474F">${escLines(quote.notes)}</p>` : ''}

  <p style="margin:32px 0 0;font-size:12px;line-height:1.7;color:#64757E">By signing below, the Customer confirms they have read this contract, had the opportunity to obtain independent advice, and agree to be bound by it.</p>
</div>`
}

export function contractSignEmail({ contract, quote, settings }) {
  const firstName = (quote.customerName || '').split(' ')[0] || 'there'
  const totals = quoteTotals(quote)
  return {
    subject: `Your 6Homes contract ${contract.number} — ready to sign`,
    html: brandFrame(
      bKicker('Your contract') +
      bH1('Ready for your signature') +
      bP(`Hi ${esc(firstName)},<br /><br />Your build contract is ready. Read it in full, then sign at the bottom of the page — it takes a minute and doesn't need printing.`) +
      bTable([
        ['Contract', esc(contract.number)],
        ['Home', esc(quote.designName || '—')],
        ['Total (inc GST)', money(totals.total), true],
        ['Deposit on signing', money(totals.deposit)],
      ]) +
      bBtn('Read and sign', signUrl(contract.token)) +
      bP(`Take your time with it. If anything reads oddly or you want a clause explained, call us on <a href="${COMPANY.phoneHref}" style="color:#0D7982">${COMPANY.phone}</a> before you sign — we'd much rather answer it now.`) +
      bSmall('— The 6Homes team'),
      { footerLabel: 'Contract', preheader: `Contract ${contract.number} is ready to read and sign.` }
    ),
  }
}

export function contractSignedEmail({ contract, quote, settings, forCustomer }) {
  const totals = quoteTotals(quote)
  const firstName = (quote.customerName || '').split(' ')[0] || 'there'

  if (!forCustomer) {
    return {
      subject: `Contract ${contract.number} signed — ${quote.customerName || 'customer'}`,
      html: brandFrame(
        bKicker('Signed') +
        bH1(`${esc(quote.customerName || 'A customer')} signed ${esc(contract.number)}`) +
        bTable([
          ['Signed by', esc(contract.customerSignerName || '—')],
          ['Home', esc(quote.designName || '—')],
          ['Total', money(totals.total), true],
          ['Deposit to invoice', money(totals.deposit)],
        ]) +
        bBtn('Open the contract', `${ADMIN}/quotes/${quote.id}`) +
        bSmall('Countersign it in the CRM, then raise the deposit invoice to release the production slot.'),
        { footerLabel: 'Internal' }
      ),
    }
  }

  return {
    subject: `Your 6Homes contract is signed`,
    html: brandFrame(
      bKicker('All signed') +
      bH1('Your build is booked') +
      bP(`Hi ${esc(firstName)},<br /><br />Your contract is signed by both parties — thank you. A copy is attached for your records.`) +
      bTable([
        ['Contract', esc(contract.number)],
        ['Home', esc(quote.designName || '—')],
        ['Deposit', money(totals.deposit)],
      ]) +
      bP(`Next: we'll send the deposit invoice. Once that's received your production slot is locked in, and we'll email you as your build reaches each stage — site assessment, design, manufacture and delivery.`) +
      bBtn('See what happens next', `${(process.env.PUBLIC_SITE_URL || 'https://6homes.com').replace(/\/+$/, '')}/our-process`) +
      bSmall('— The 6Homes team'),
      { footerLabel: 'Your Build', preheader: 'Your contract is signed by both parties.' }
    ),
  }
}
