'use client'

import { useRef, type ReactNode } from 'react'
import { gsap } from '@/lib/motion'

/**
 * Magnetic hover for primary CTAs: the element leans toward the cursor and
 * springs back on leave. Reference-site numbers, dialled down a notch —
 * a button should acknowledge the hand, not chase it.
 * Pointer-fine only; touch devices never see it.
 */
export default function Magnetic({
  children,
  strength = 18,
  className,
}: {
  children: ReactNode
  strength?: number
  className?: string
}) {
  const ref = useRef<HTMLDivElement>(null)

  const move = (e: React.PointerEvent) => {
    const el = ref.current
    if (!el || e.pointerType !== 'mouse') return
    const r = el.getBoundingClientRect()
    gsap.to(el, {
      x: (((e.clientX - r.left) / r.width - 0.5) * strength) / 16 + 'em',
      y: (((e.clientY - r.top) / r.height - 0.5) * strength) / 16 + 'em',
      duration: 1.2,
      ease: 'power4.out',
      force3D: true,
    })
  }

  const leave = () => {
    if (!ref.current) return
    gsap.to(ref.current, {
      x: 0,
      y: 0,
      duration: 1.2,
      ease: 'elastic.out(1, 0.35)',
      clearProps: 'transform',
    })
  }

  return (
    <div
      ref={ref}
      className={className ? `inline-block ${className}` : 'inline-block'}
      onPointerMove={move}
      onPointerLeave={leave}
    >
      {children}
    </div>
  )
}
