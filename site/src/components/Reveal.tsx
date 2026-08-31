'use client'

import { useEffect, useRef, useState, type ElementType, type ReactNode } from 'react'

// Reveal-on-scroll. One observer per element, unobserved after it fires — an
// element should rise in once, not animate every time it re-enters.
//
// `variant` picks what kind of entrance: content rises, a rule draws itself
// across like a line being struck on a plan.
export default function Reveal({
  children,
  className = '',
  delay = 0,
  as: Tag = 'div',
  variant = 'rise',
}: {
  children: ReactNode
  className?: string
  delay?: number
  as?: ElementType
  variant?: 'rise' | 'rule'
}) {
  const ref = useRef<HTMLElement | null>(null)
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    const el = ref.current
    if (!el) return

    const io = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            setVisible(true)
            io.unobserve(entry.target)
          }
        }
      },
      // Fire a little before the element is fully in view, so the motion has
      // finished by the time the reader's eye arrives.
      { threshold: 0.15, rootMargin: '0px 0px -8% 0px' }
    )

    io.observe(el)
    return () => io.disconnect()
  }, [])

  const Component = Tag as ElementType
  const base = variant === 'rule' ? 'rule-draw' : 'reveal'

  return (
    <Component
      ref={ref}
      className={`${base} ${visible ? 'is-visible' : ''} ${className}`}
      style={{ transitionDelay: `${delay}ms` }}
    >
      {children}
    </Component>
  )
}
