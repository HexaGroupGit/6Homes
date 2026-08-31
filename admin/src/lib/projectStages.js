// The six steps a 6Homes build moves through — the same six the website
// publishes as "our process", so the customer's mental model and ours match.
//
// IMPORTANT: this module is imported by the serverless api/ functions as well
// as the browser (api/project-updates.js). Keep it free of imports, and never
// touch import.meta.env or the Supabase client here — that is exactly what
// breaks a file in the Vercel runtime.

export const BUILD_STAGES = [
  {
    id: 'showroom',
    name: 'Showroom visit',
    blurb: 'Seeing a home in person and settling on a direction.',
    // Copy for the customer-facing "you've reached this stage" email. Overridable
    // from Templates → project_stage_<id>.
    email: {
      subject: 'Welcome to 6Homes — your build is underway',
      heading: 'Your build has started',
      body: 'Thanks for choosing 6Homes. Your project is now on our board, and your consultant will walk you through what happens next.',
    },
  },
  {
    id: 'site-assessment',
    name: 'Site assessment',
    blurb: 'Access, slope, services and council requirements checked on your block.',
    email: {
      subject: 'Your site assessment is booked',
      heading: 'We\'re coming out to your block',
      body: 'Our team will assess access, slope, services and any council requirements. This is what lets us quote your site works honestly rather than guessing at them.',
    },
  },
  {
    id: 'design',
    name: 'Design',
    blurb: 'Layout, finishes and any variations locked in.',
    email: {
      subject: 'Your design is in progress',
      heading: 'Designing your home',
      body: 'We\'re working through your layout, finishes and any variations. Nothing goes to manufacture until you\'ve approved every detail.',
    },
  },
  {
    id: 'order',
    name: 'Order & purchase',
    blurb: 'Contract signed, deposit received, production slot booked.',
    email: {
      subject: 'Your order is confirmed',
      heading: 'You\'re booked into production',
      body: 'Your contract is signed and your production slot is locked in. From here it\'s roughly four months to delivery.',
    },
  },
  {
    id: 'manufacture',
    name: 'Manufacture',
    blurb: 'Modules built under cover, fitted out and quality-checked.',
    email: {
      subject: 'Your home is being built',
      heading: 'Your home has entered manufacture',
      body: 'Your modules are now on the factory floor — built under cover, fitted out and quality-checked before they ever see weather. We\'ll send photos as it progresses.',
    },
  },
  {
    id: 'install',
    name: 'Shipping & installation',
    blurb: 'Delivered, craned into place, connected and handed over.',
    email: {
      subject: 'Your home is on its way',
      heading: 'Delivery and installation',
      body: 'Your home is heading to site. We\'ll crane the modules into place, connect services, and walk you through the finished home at handover.',
    },
  },
]

export const STAGE_IDS = BUILD_STAGES.map((s) => s.id)

export const stageById = (id) => BUILD_STAGES.find((s) => s.id === id) ?? null

export const stageIndex = (id) => BUILD_STAGES.findIndex((s) => s.id === id)

// A build is only complete once it has cleared the final stage; `completedAt`
// on the project marks that, rather than a seventh pseudo-stage.
export const isFinalStage = (id) => stageIndex(id) === BUILD_STAGES.length - 1
