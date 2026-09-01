'use client'

import { useLayoutEffect, useRef, type ReactNode } from 'react'
import { gsap, registerEases, prefersReduced } from '@/lib/motion'

/**
 * The circular CTA: a straight label centred inside a drawn ring. At rest the
 * ring is two 15° ticks sitting opposite each other; on hover both grow until
 * they meet as a full circle over a faint track. Magnetic on fine pointers.
 *
 * r = 99.5 → circumference 2π·99.5 ≈ 625.2; a 15° tick is 0.0417 of that.
 */
const C = 2 * Math.PI * 99.5

export default function RingButton({ href, children }: { href: string; children: ReactNode }) {
  const root = useRef<HTMLAnchorElement>(null)
  const tl = useRef<gsap.core.Timeline | null>(null)

  useLayoutEffect(() => {
    if (prefersReduced()) return
    registerEases()

    const ctx = gsap.context((self) => {
      const arcs = self.selector!('[data-arc]')
      gsap.set(arcs, { strokeDasharray: `${0.0417 * C}px ${C}px` })
      tl.current = gsap
        .timeline({ paused: true })
        .to(arcs, { strokeDasharray: `${C / 2}px ${C}px`, duration: 0.8, ease: 'inOut' })
    }, root)

    return () => ctx.revert()
  }, [])

  const move = (e: React.PointerEvent) => {
    if (e.pointerType !== 'mouse' || !root.current) return
    const r = root.current.getBoundingClientRect()
    gsap.to(root.current, {
      x: (((e.clientX - r.left) / r.width - 0.5) * 25) / 16 + 'em',
      y: (((e.clientY - r.top) / r.height - 0.5) * 25) / 16 + 'em',
      duration: 1.6,
      ease: 'power4.out',
    })
  }

  const leave = () => {
    tl.current?.reverse()
    if (root.current)
      gsap.to(root.current, { x: 0, y: 0, duration: 1.6, ease: 'elastic.out(1, 0.3)', clearProps: 'transform' })
  }

  return (
    <a
      ref={root}
      href={href}
      className="ring-btn caps"
      onPointerEnter={() => tl.current?.play()}
      onPointerMove={move}
      onPointerLeave={leave}
    >
      <svg viewBox="0 0 200 200" aria-hidden>
        {/* the faint track */}
        <circle cx="100" cy="100" r="99.5" stroke="currentColor" opacity="0.2" />
        {/* two ticks, 180° apart, that grow into the ring */}
        <circle data-arc cx="100" cy="100" r="99.5" stroke="currentColor" transform="rotate(-150 100 100)" />
        <circle data-arc cx="100" cy="100" r="99.5" stroke="currentColor" transform="rotate(30 100 100)" />
      </svg>
      <span className="max-w-[130px]">{children}</span>
    </a>
  )
}
