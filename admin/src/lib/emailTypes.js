import { BUILD_STAGES } from './projectStages.js'

// The email types a template can override. The key must match the `emailType`
// the server looks up (api/_leads.js INTENTS, api/_projects.js), or the template
// is written but never used — so this list is the contract between the two.
//
// `vars` is what the editor offers as insertable placeholders.
//
// The client portal's emails are deliberately absent. Each one is assembled
// from live state — a one-time sign-in link, the exact documents outstanding —
// so a free-text override would drop the thing the email exists to carry. They
// are still recorded in the email log like every other send.
const LEAD_VARS = ['firstName', 'name', 'email', 'phone', 'design', 'company', 'website', 'consultLink', 'showroom']
const PROJECT_VARS = ['firstName', 'name', 'project', 'design', 'stage', 'company', 'website']

export const EMAIL_TYPES = [
  {
    group: 'Website enquiries',
    items: [
      { type: 'lead_consultation', label: 'Consultation request', hint: 'Sent when someone asks for a free consultation.', vars: LEAD_VARS },
      { type: 'lead_brochure', label: 'Brochure download', hint: 'Sent with the brochure PDF attached.', vars: LEAD_VARS },
      { type: 'lead_pricelist', label: 'Price list download', hint: 'Sent with the price list PDF attached.', vars: LEAD_VARS },
      { type: 'lead_domestic', label: 'Domestic enquiry', hint: 'General "build me a home" enquiry acknowledgement.', vars: LEAD_VARS },
      { type: 'lead_commercial', label: 'Commercial enquiry', hint: 'Multi-unit and commercial project acknowledgement.', vars: LEAD_VARS },
      { type: 'lead_tour', label: 'Showroom tour request', hint: 'Sent when someone asks to visit the display showroom.', vars: LEAD_VARS },
    ],
  },
  {
    group: 'Follow-up sequence',
    items: [
      { type: 'lead_followup', label: 'Follow-up (day 2 and 5)', hint: 'Sent twice while a lead sits unattended in a New stage.', vars: LEAD_VARS },
      { type: 'lead_final', label: 'Final follow-up (day 9)', hint: 'The last automated email before the lead is marked lost.', vars: LEAD_VARS },
    ],
  },
  {
    group: 'Build updates',
    items: BUILD_STAGES.map((s) => ({
      type: `project_stage_${s.id}`,
      label: s.name,
      hint: `Sent once when a build reaches "${s.name}".`,
      vars: PROJECT_VARS,
    })),
  },
]

export const ALL_EMAIL_TYPES = EMAIL_TYPES.flatMap((g) => g.items)

export const emailTypeMeta = (type) => ALL_EMAIL_TYPES.find((t) => t.type === type) ?? null
