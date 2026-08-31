'use client'

import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react'
import type { Intent } from './config'
import EnquiryModal from './EnquiryModal'

// A single modal instance mounted once in the root layout, opened from anywhere
// by intent. Every CTA on the site — hero, cards, footer, a design page — is
// then just a button that calls open('brochure').

type OpenOptions = { designSlug?: string; source?: string }

type EnquiryContext = {
  open: (intent: Intent, options?: OpenOptions) => void
  close: () => void
}

const Ctx = createContext<EnquiryContext | null>(null)

export function EnquiryProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<{ intent: Intent; options: OpenOptions } | null>(null)

  const open = useCallback((intent: Intent, options: OpenOptions = {}) => setState({ intent, options }), [])
  const close = useCallback(() => setState(null), [])

  const value = useMemo(() => ({ open, close }), [open, close])

  return (
    <Ctx.Provider value={value}>
      {children}
      {state && (
        <EnquiryModal
          intent={state.intent}
          designSlug={state.options.designSlug}
          source={state.options.source}
          onClose={close}
        />
      )}
    </Ctx.Provider>
  )
}

export function useEnquiry() {
  const ctx = useContext(Ctx)
  if (!ctx) throw new Error('useEnquiry must be used inside <EnquiryProvider>')
  return ctx
}
