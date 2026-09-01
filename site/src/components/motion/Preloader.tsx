'use client'

import { useLayoutEffect, useRef, useState } from 'react'
import { gsap, registerEases, prefersReduced } from '@/lib/motion'

/**
 * First-visit title block: a dimension rule strikes across the paper, the
 * wordmark stamps in over it, and the whole sheet lifts to reveal the hero.
 * ~2.3 seconds, once per session — a title block, not a loading screen.
 *
 * Fails safe three ways: repeat visits skip it (sessionStorage), reduced
 * motion never mounts it, and if JS dies a CSS animation removes it anyway so
 * it can never brick the page.
 */
const KEY = '6h-intro-seen'

export default function Preloader() {
  const root = useRef<HTMLDivElement>(null)
  // Render optimistically (covers the first paint); the effect immediately
  // strips it for return visitors before anything is visible for long.
  const [gone, setGone] = useState(false)

  useLayoutEffect(() => {
    if (prefersReduced() || sessionStorage.getItem(KEY)) {
      setGone(true)
      return
    }
    sessionStorage.setItem(KEY, '1')
    registerEases()

    const ctx = gsap.context((self) => {
      const q = (s: string) => self.selector!(s)
      document.documentElement.style.overflow = 'hidden'

      const tl = gsap.timeline({
        onComplete: () => {
          document.documentElement.style.overflow = ''
          setGone(true)
        },
      })
      tl.fromTo(q('.pl-rule'), { scaleX: 0 }, { scaleX: 1, duration: 0.55, ease: 'out' })
        .fromTo(
          q('.pl-tick'),
          { scaleY: 0 },
          { scaleY: 1, duration: 0.3, ease: 'out', stagger: 0.08 },
          '-=0.2'
        )
        .fromTo(
          q('.pl-word'),
          { yPercent: 110 },
          { yPercent: 0, duration: 0.7, ease: 'out' },
          '-=0.25'
        )
        .fromTo(q('.pl-spec'), { opacity: 0 }, { opacity: 1, duration: 0.4, ease: 'out' }, '-=0.3')
        .to({}, { duration: 0.45 }) // hold the mark
        .to(root.current, {
          clipPath: 'inset(0% 0% 100% 0%)',
          duration: 0.85,
          ease: 'dive',
        })
    }, root)

    return () => {
      document.documentElement.style.overflow = ''
      ctx.revert()
    }
  }, [])

  if (gone) return null

  return (
    <div
      ref={root}
      aria-hidden
      className="pl-kill fixed inset-0 z-[90] flex items-center justify-center bg-paper [clip-path:inset(0%_0%_0%_0%)]"
    >
      <div className="relative w-[min(78vw,540px)]">
        <div className="pl-rule h-px origin-left bg-ink/70" />
        <div className="pl-tick absolute top-[-5px] left-0 h-[11px] w-px origin-bottom bg-teal" />
        <div className="pl-tick absolute top-[-5px] right-0 h-[11px] w-px origin-bottom bg-teal" />
        <div className="mt-5 overflow-hidden">
          <div className="pl-word display-sm text-center">6Homes</div>
        </div>
        <p className="pl-spec spec mt-4 text-center text-mute">
          Modular homes · Designed &amp; assembled in Australia
        </p>
      </div>
      {/* No-JS / crashed-JS escape hatch: CSS removes the cover regardless. */}
      <style>{`
        @keyframes pl-bail { to { opacity: 0; visibility: hidden; } }
        .pl-kill { animation: pl-bail 0.6s ease 3.2s forwards; }
      `}</style>
    </div>
  )
}
