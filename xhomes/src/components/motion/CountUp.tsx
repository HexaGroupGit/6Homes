'use client'

import { useLayoutEffect, useRef } from 'react'
import { gsap, ScrollTrigger, prefersReduced } from '@/lib/motion'

/**
 * A figure that ticks up to its value when it enters view — spec data being
 * measured, not decoration. Renders the final value in markup so crawlers and
 * no-JS readers always see the real number.
 */
export default function CountUp({
  value,
  prefix = '',
  suffix = '',
  className,
  duration = 1.4,
}: {
  value: number
  prefix?: string
  suffix?: string
  className?: string
  duration?: number
}) {
  const ref = useRef<HTMLSpanElement>(null)

  useLayoutEffect(() => {
    const el = ref.current
    if (!el || prefersReduced()) return

    const proxy = { v: 0 }
    const render = () => {
      el.textContent = `${prefix}${Math.round(proxy.v)}${suffix}`
    }
    const st = ScrollTrigger.create({
      trigger: el,
      start: 'top 88%',
      once: true,
      onEnter: () => {
        gsap.to(proxy, { v: value, duration, ease: 'power2.out', onUpdate: render })
      },
    })
    return () => st.kill()
  }, [value, prefix, suffix, duration])

  return (
    <span ref={ref} className={className}>
      {prefix}
      {value}
      {suffix}
    </span>
  )
}
