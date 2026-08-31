'use client'

import type { ReactNode } from 'react'
import { useEnquiry } from './EnquiryProvider'
import type { Intent } from './config'

// Every call to action on the site routes through here, so a CTA is never a
// dead link and the CRM always knows which form the lead came from.
//
// There is no filled-teal variant on purpose. The teal is the annotation colour
// — it marks dimension rules and labels. A page of teal buttons is what made
// the first pass of this site read as generic SaaS.

type Variant = 'outline' | 'outline-light' | 'rule' | 'rule-light'

const VARIANTS: Record<Variant, string> = {
  outline: 'btn',
  'outline-light': 'btn btn-light',
  rule: 'btn-rule',
  'rule-light': 'btn-rule btn-rule-light',
}

export default function EnquireButton({
  intent,
  children,
  variant = 'outline',
  designSlug,
  source,
  className = '',
}: {
  intent: Intent
  children: ReactNode
  variant?: Variant
  designSlug?: string
  source?: string
  className?: string
}) {
  const { open } = useEnquiry()
  return (
    <button type="button" onClick={() => open(intent, { designSlug, source })} className={`${VARIANTS[variant]} ${className}`}>
      {children}
    </button>
  )
}
