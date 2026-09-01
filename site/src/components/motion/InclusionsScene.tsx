'use client'

import { useLayoutEffect, useRef, useState, type ReactNode } from 'react'
import Image from 'next/image'
import { gsap, registerEases, prefersReduced } from '@/lib/motion'
import { cnJoin } from '@/lib/cn'

/**
 * The inclusions, read out over a home at dusk.
 *
 * A sticky full-bleed twilight render holds the screen while scroll walks an
 * index down the specification list — each line lighting in turn, the way a
 * checker walks a QA sheet. The image itself creeps slowly larger the whole
 * time so the scene never feels frozen.
 */
export default function InclusionsScene({
  image,
  imageAlt,
  items,
  heading,
  cta,
}: {
  image: string
  imageAlt: string
  items: readonly string[]
  heading: ReactNode
  cta?: ReactNode
}) {
  const root = useRef<HTMLDivElement>(null)
  const [active, setActive] = useState(-1)

  useLayoutEffect(() => {
    if (prefersReduced()) {
      setActive(items.length) // everything lit, nothing moving
      return
    }
    registerEases()

    const ctx = gsap.context((self) => {
      const img = self.selector!('.is-img')[0]
      const tween = gsap.fromTo(
        img,
        { scale: 1.04 },
        {
          scale: 1.18,
          ease: 'none',
          transformOrigin: '50% 45%',
          scrollTrigger: {
            trigger: root.current,
            start: 'top top',
            end: 'bottom bottom',
            scrub: true,
            onUpdate: (st) => {
              // The list starts lighting once the scene has settled (first
              // ~15% of the scroll belongs to the arrival) and finishes with
              // ~10% spare so the last item holds lit for a beat.
              const p = (st.progress - 0.15) / 0.75
              setActive(p < 0 ? -1 : Math.min(items.length, Math.floor(p * (items.length + 1))))
            },
          },
        }
      )
      return () => tween.kill()
    }, root)

    return () => ctx.revert()
  }, [items.length])

  return (
    <div ref={root} className="is-scene scene h-[260svh]" data-bg="dark">
      <section className="is-screen scene-screen bg-deep-2 text-white">
        <div className="plx-frame absolute inset-0">
          <Image
            src={image}
            alt={imageAlt}
            fill
            sizes="100vw"
            className="is-img object-cover opacity-90"
          />
          <div className="absolute inset-0 bg-gradient-to-r from-ink/80 via-ink/40 to-ink/20" />
        </div>

        <div className="container-page relative grid h-full content-center gap-10 py-24 lg:grid-cols-[1.1fr_1fr] lg:gap-20">
          <div data-rv-w>
            <p className="spec text-teal" data-rv="a">
              Standard, always
            </p>
            <div className="mt-5" data-rv="h">
              {heading}
            </div>
            <p className="prose-body mt-6 max-w-sm !text-white/60" data-rv="p">
              There is no cheaper version of a 6Homes home with the budget tapware in it. This list
              is what arrives, every time, on every design.
            </p>
          </div>

          <div>
            <ol className="border-t border-white/20">
              {items.map((item, i) => {
                const lit = i < active || active >= items.length
                const current = i === active
                return (
                  <li
                    key={item}
                    // Rendered fully lit; the dimming skin only applies under
                    // html.has-motion, so no-JS readers get a readable list.
                    data-state={lit || current ? 'lit' : 'dim'}
                    className={cnJoin(
                      'is-item flex items-baseline gap-5 border-b border-white/15 py-3 transition-all duration-500 ease-drafting sm:py-3.5',
                      current && 'pl-2'
                    )}
                  >
                    <span className="is-idx spec shrink-0 text-teal transition-colors duration-500">
                      {String(i + 1).padStart(2, '0')}
                    </span>
                    <span className="text-[13px] leading-relaxed sm:text-[14px]">{item}</span>
                  </li>
                )
              })}
            </ol>
            {cta && <div className="mt-8">{cta}</div>}
          </div>
        </div>
      </section>
    </div>
  )
}
