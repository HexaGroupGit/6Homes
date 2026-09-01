'use client'

import { useLayoutEffect, useRef, useState } from 'react'
import Image from 'next/image'
import { gsap, registerEases, prefersReduced } from '@/lib/motion'
import { PROCESS } from '@/data/content'

/**
 * How a project runs, read out over the built streetscape — the full-bleed
 * photograph holds sticky while scroll walks a highlight down the list.
 * With motion off, the list simply renders fully lit.
 */
export default function StickyIndex() {
  const root = useRef<HTMLDivElement>(null)
  const [active, setActive] = useState(-1)

  useLayoutEffect(() => {
    if (prefersReduced()) {
      setActive(PROCESS.length)
      return
    }
    registerEases()

    const ctx = gsap.context((self) => {
      const tween = gsap.fromTo(
        self.selector!('.ix-img'),
        { scale: 1.05 },
        {
          scale: 1.18,
          ease: 'none',
          transformOrigin: '50% 40%',
          scrollTrigger: {
            trigger: root.current,
            start: 'top top',
            end: 'bottom bottom',
            scrub: true,
            onUpdate: (st) => {
              const p = (st.progress - 0.15) / 0.72
              setActive(p < 0 ? -1 : Math.min(PROCESS.length, Math.floor(p * (PROCESS.length + 1))))
            },
          },
        }
      )
      return () => tween.kill()
    }, root)

    return () => ctx.revert()
  }, [])

  return (
    <div ref={root} className="ix-scene scene h-[240svh]">
      <section className="ix-screen scene-screen bg-black text-white">
        <div className="plx-frame absolute inset-0">
          <Image
            src="/media/kinsfolk-s2-dji-0823.jpg"
            alt="Kinsfolk townhouse street, breeze-block screens and new landscaping"
            fill
            sizes="100vw"
            className="ix-img object-cover opacity-85"
          />
          <div className="absolute inset-0 bg-gradient-to-r from-black/80 via-black/40 to-black/20" />
        </div>

        <div className="container-page relative grid h-full content-center gap-10 py-24 lg:grid-cols-[1.1fr_1fr] lg:gap-20">
          <div data-rv-w>
            <p className="caps text-white/60" data-rv="a">
              How it runs
            </p>
            <h2 className="display-md mt-5" data-rv="h">
              Properly,
              <br />
              start to finish
            </h2>
            <p className="body-copy mt-6 max-w-sm !text-white/60" data-rv="p">
              The same mindset on every job: strong teams, efficient projects, nothing skipped. This
              is what the process looks like when it is run right.
            </p>
          </div>

          <ol className="border-t border-white/25 self-center">
            {PROCESS.map((item, i) => {
              const lit = i < active || active >= PROCESS.length
              const current = i === active
              return (
                <li
                  key={item}
                  data-state={lit || current ? 'lit' : 'dim'}
                  className={`ix-item flex items-baseline gap-5 border-b border-white/15 py-4 transition-all duration-500 ${
                    current ? 'pl-2' : ''
                  }`}
                >
                  <span className="caps shrink-0 text-white/50">{String(i + 1).padStart(2, '0')}</span>
                  <span className="font-display text-[15px] tracking-[0.06em] uppercase sm:text-[17px]">{item}</span>
                </li>
              )
            })}
          </ol>
        </div>
      </section>
    </div>
  )
}
