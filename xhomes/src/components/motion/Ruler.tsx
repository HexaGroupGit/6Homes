'use client'

import { useEffect, useRef } from 'react'

/**
 * The page's scrollbar, drawn as a drafting ruler down the right edge —
 * millimetre ticks, an arrow thumb, and the progress as a three-digit
 * measurement. Desktop only; presentational (native scroll still drives it),
 * so it's plain rAF-on-scroll with no library weight.
 */
export default function Ruler() {
  const thumb = useRef<HTMLDivElement>(null)
  const label = useRef<HTMLSpanElement>(null)

  useEffect(() => {
    let raf = 0
    const update = () => {
      raf = 0
      const max = document.documentElement.scrollHeight - window.innerHeight
      const p = max > 0 ? window.scrollY / max : 0
      if (thumb.current) thumb.current.style.top = `${8 + p * (window.innerHeight - 40)}px`
      if (label.current) label.current.textContent = String(Math.round(p * 100)).padStart(3, '0')
    }
    const onScroll = () => {
      if (!raf) raf = requestAnimationFrame(update)
    }
    update()
    window.addEventListener('scroll', onScroll, { passive: true })
    window.addEventListener('resize', onScroll)
    return () => {
      window.removeEventListener('scroll', onScroll)
      window.removeEventListener('resize', onScroll)
      if (raf) cancelAnimationFrame(raf)
    }
  }, [])

  return (
    <div className="ruler" data-themed aria-hidden>
      <div className="ruler-ticks" />
      <div ref={thumb} className="ruler-thumb">
        <span
          ref={label}
          className="absolute top-[7px] right-0 font-mono text-[8px] tracking-[0.08em] tabular-nums"
        >
          000
        </span>
      </div>
    </div>
  )
}
