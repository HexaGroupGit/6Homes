// One definition per website form. The modal renders from this, and `intent` is
// what the CRM routes on — so adding a form here is the whole job, provided the
// CRM knows the same intent key (admin/api/_leads.js INTENTS).

export type Intent = 'consultation' | 'brochure' | 'pricelist' | 'domestic' | 'commercial' | 'tour'

export type FormField = 'name' | 'email' | 'phone' | 'suburb' | 'message' | 'budget' | 'timeframe'

export type EnquiryConfig = {
  title: string
  blurb: string
  fields: FormField[]
  required: FormField[]
  submitLabel: string
  successTitle: string
  successBody: string
  messageLabel?: string
  messagePlaceholder?: string
}

export const ENQUIRY_FORMS: Record<Intent, EnquiryConfig> = {
  consultation: {
    title: 'Book a free consultation',
    blurb:
      'A no-obligation conversation about your block, your budget and which home actually fits. We will tell you honestly if something will not work.',
    fields: ['name', 'email', 'phone', 'suburb', 'budget', 'timeframe', 'message'],
    required: ['name'],
    submitLabel: 'Request a consultation',
    successTitle: 'Thanks — we will be in touch',
    successBody:
      'One of our design consultants will contact you within one business day to book a time that suits. Check your inbox for a confirmation.',
    messageLabel: 'Anything you would like us to know? (optional)',
    messagePlaceholder: 'Tell us about your block, or what you are trying to achieve…',
  },
  brochure: {
    title: 'Download our brochure',
    blurb:
      'Every model we build, what comes standard, and how the process works from first conversation to handover. Sent to your inbox straight away.',
    fields: ['name', 'email', 'phone'],
    required: ['name', 'email'],
    submitLabel: 'Send me the brochure',
    successTitle: 'On its way',
    successBody: 'Check your inbox — the brochure is attached. If it has not arrived in a few minutes, look in your spam folder.',
  },
  pricelist: {
    title: 'Download our price list',
    blurb:
      'Base pricing for every model and a full breakdown of what is included, so you can see where your budget lands before you talk to anyone.',
    fields: ['name', 'email', 'phone', 'suburb'],
    required: ['name', 'email'],
    submitLabel: 'Send me the price list',
    successTitle: 'On its way',
    successBody: 'Check your inbox — the price list is attached. Site works are quoted separately after a site assessment.',
  },
  domestic: {
    title: 'Project enquiry',
    blurb: 'Tell us about the home you are planning and we will come back to you within one business day.',
    fields: ['name', 'email', 'phone', 'suburb', 'budget', 'timeframe', 'message'],
    required: ['name'],
    submitLabel: 'Send enquiry',
    successTitle: 'Thanks — we have got it',
    successBody: 'One of our team will review your enquiry and get back to you within one business day.',
    messageLabel: 'About your project',
    messagePlaceholder: 'Block size, slope, services, what you have in mind…',
  },
  commercial: {
    title: 'Commercial enquiry',
    blurb:
      'Accommodation villages, tourism cabins, worker housing, multi-dwelling developments. Modular suits these well — the units are built under cover while your site works run in parallel.',
    fields: ['name', 'email', 'phone', 'suburb', 'timeframe', 'message'],
    required: ['name'],
    submitLabel: 'Send enquiry',
    successTitle: 'Thanks — we have got it',
    successBody: 'One of our project team will call you directly to understand the scope.',
    messageLabel: 'About your project',
    messagePlaceholder: 'Number of units, location, intended use, target timeline…',
  },
  tour: {
    title: 'Book a showroom tour',
    blurb:
      'Photos only get you so far. Standing inside one tells you in five minutes what a brochure cannot. Our display showroom is at 878 Whitehorse Road, Box Hill.',
    fields: ['name', 'email', 'phone', 'message'],
    required: ['name'],
    submitLabel: 'Request a tour',
    successTitle: 'Thanks — we will confirm a time',
    successBody:
      'We will be in touch shortly to lock in a time. Our showroom is at 878 Whitehorse Road, Box Hill, with parking on site.',
    messageLabel: 'When suits you? (optional)',
    messagePlaceholder: 'Weekends, weekday mornings, a particular date…',
  },
}

export const FIELD_LABELS: Record<FormField, string> = {
  name: 'Your name',
  email: 'Email',
  phone: 'Phone',
  suburb: 'Suburb or postcode',
  message: 'Message',
  budget: 'Budget range',
  timeframe: 'Timeframe',
}

export const BUDGET_OPTIONS = [
  'Under $150k',
  '$150k – $250k',
  '$250k – $350k',
  '$350k – $500k',
  'Over $500k',
  'Not sure yet',
]

export const TIMEFRAME_OPTIONS = [
  'As soon as possible',
  'Next 6 months',
  '6 – 12 months',
  'Over 12 months',
  'Just researching',
]
