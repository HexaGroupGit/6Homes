// The contact details every enquiry has to carry.
//
// Deliberately a copy of site/src/lib/contact.ts rather than a shared import:
// the website and the CRM are separate deployments with no build-time link
// between them. Keep the two in step, INCLUDING THE WORDING — a visitor who
// gets one message from the browser and a different one from the server will
// assume something is broken.
//
// Both fields are required on every form. That will turn away some people who
// would only leave one, in exchange for every lead being reachable both ways.

const EMAIL = /^[^@\s]+@[^@\s]+\.[^@\s]+$/

export function emailError(value) {
  const email = String(value ?? '').trim()
  if (!email) return 'We need your email address.'
  if (!EMAIL.test(email)) return 'That email address doesn’t look right.'
  return null
}

// Count digits rather than police the format: Australian numbers arrive as
// 0400 000 000, (03) 9123 4567 and +61 3 9123 4567, and all three are fine.
// This rejects "n/a" and a half-typed number without rejecting real people.
export function phoneError(value) {
  const phone = String(value ?? '').trim()
  if (!phone) return 'We need a phone number too.'
  const digits = phone.replace(/\D/g, '')
  if (digits.length < 8) return 'That phone number looks too short — please include the area code.'
  if (digits.length > 15) return 'That phone number looks too long.'
  return null
}

export function contactError(values = {}) {
  return emailError(values.email) ?? phoneError(values.phone)
}
