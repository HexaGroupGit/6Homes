'use client'

import { useLayoutEffect, useRef, useState } from 'react'
import { gsap, registerEases, prefersReduced } from '@/lib/motion'

/**
 * First-visit title plate: the chamfered frame (the wordmark's own corner
 * geometry, drawn at page scale), the lockup with the italic accent leaning
 * across it, a vertical progress line, then the whole plate lifts.
 *
 * Once per session; reduced motion never sees it; a CSS bail-out removes it
 * even if scripting dies, so it can never brick the page.
 */
const KEY = 'xh-intro-seen'

export default function Preloader() {
  const root = useRef<HTMLDivElement>(null)
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
      tl.fromTo(q('.pl-frame'), { opacity: 0, scale: 0.985 }, { opacity: 1, scale: 1, duration: 0.7, ease: 'out' })
        .fromTo(q('.pl-word'), { yPercent: 110 }, { yPercent: 0, duration: 0.8, ease: 'out' }, '-=0.3')
        .fromTo(
          q('.pl-accent'),
          { opacity: 0, rotate: -14, yPercent: 30 },
          { opacity: 1, rotate: -8, yPercent: 0, duration: 0.7, ease: 'out' },
          '-=0.35'
        )
        .fromTo(q('.pl-caps'), { opacity: 0 }, { opacity: 1, duration: 0.5, ease: 'out' }, '-=0.3')
        .fromTo(q('.pl-progress'), { scaleY: 0 }, { scaleY: 1, duration: 0.9, ease: 'inOut' }, '-=0.5')
        .to({}, { duration: 0.35 })
        .to(root.current, { yPercent: -100, duration: 0.95, ease: 'dive' })
    }, root)

    return () => {
      document.documentElement.style.overflow = ''
      ctx.revert()
    }
  }, [])

  if (gone) return null

  return (
    <div ref={root} aria-hidden className="pl-kill fixed inset-0 z-[90] bg-black text-white">
      {/* Ghost watermark — the wordmark itself at whisper opacity */}
      <div className="absolute inset-0 flex items-center justify-center overflow-hidden">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/brand/logo-white.png" alt="" className="w-[160%] max-w-none opacity-[0.04]" />
      </div>

      {/* The chamfered frame, inset like a drawing margin */}
      <div className="pl-frame absolute inset-5 md:inset-6">
        {/* Eight strokes: four sides stopping short, four 45° corner cuts */}
        <span className="absolute top-0 right-6 left-6 border-t border-white/30" />
        <span className="absolute right-6 bottom-0 left-6 border-t border-white/30" />
        <span className="absolute top-6 bottom-6 left-0 border-l border-white/30" />
        <span className="absolute top-6 right-0 bottom-6 border-l border-white/30" />
        <span className="absolute top-[3px] left-[3px] h-[30px] w-px origin-center rotate-45 border-l border-white/30" />
        <span className="absolute top-[3px] right-[3px] h-[30px] w-px origin-center -rotate-45 border-l border-white/30" />
        <span className="absolute bottom-[3px] left-[3px] h-[30px] w-px origin-center -rotate-45 border-l border-white/30" />
        <span className="absolute right-[3px] bottom-[3px] h-[30px] w-px origin-center rotate-45 border-l border-white/30" />
      </div>

      <div className="relative flex h-full flex-col items-center justify-between py-16 md:py-20">
        <p className="pl-caps caps text-white/50">Melbourne · Est. builders of better townhomes</p>

        <div className="px-8 text-center">
          <div className="overflow-hidden">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/brand/logo-white.png" alt="XHomes" className="pl-word mx-auto w-[min(74vw,560px)]" />
          </div>
          <p className="pl-accent font-script mt-2 -rotate-6 text-[clamp(1.6rem,3.4vw,2.6rem)] text-white/85">
            building with excellence
          </p>
        </div>

        <div className="flex flex-col items-center gap-5">
          <span className="pl-progress block h-24 w-px origin-top bg-white/70" />
          <p className="pl-caps caps text-white/50">XHomes — quality meets vision</p>
        </div>
      </div>

      <style>{`
        @keyframes pl-bail { to { opacity: 0; visibility: hidden; } }
        .pl-kill { animation: pl-bail 0.6s ease 3.4s forwards; }
      `}</style>
    </div>
  )
}
