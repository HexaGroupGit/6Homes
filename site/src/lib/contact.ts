// How we check the two things every enquiry has to carry.
//
// Both an email address and a phone number are required on every form. That is
// a deliberate trade: it will turn away some people who would only leave one,
// in exchange for every lead being reachable both ways. The same rule is
// enforced again server-side in the CRM (admin/api/form-submit.js) — keep the
// two in step, including the wording, so a visitor never sees one message from
// the browser and a different one from the server.

// Deliberately loose. A stricter pattern rejects valid addresses far more often
// than it catches typos, and the confirmation email is the real test anyway.
const EMAIL = /^[^@\s]+@[^@\s]+\.[^@\s]+$/

export function emailError(value: string): string | null {
  const email = value.trim()
  if (!email) return 'We need your email address.'
  if (!EMAIL.test(email)) return 'That email address doesn’t look right.'
  return null
}

/**
 * Australian numbers arrive in every shape: 0400 000 000, (03) 9123 4567,
 * +61 3 9123 4567. Rather than police the format, count the digits — enough to
 * reject "n/a" and a half-typed number, loose enough to accept anything a real
 * person writes, including an international number.
 */
export function phoneError(value: string): string | null {
  const phone = value.trim()
  if (!phone) return 'We need a phone number too.'
  const digits = phone.replace(/\D/g, '')
  if (digits.length < 8) return 'That phone number looks too short — please include the area code.'
  if (digits.length > 15) return 'That phone number looks too long.'
  return null
}

/** The first problem with the contact details, or null if there isn't one. */
export function contactError(values: { email?: string; phone?: string }): string | null {
  return emailError(values.email ?? '') ?? phoneError(values.phone ?? '')
}
