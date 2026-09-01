'use client'

import { useLayoutEffect, useRef } from 'react'
import { gsap, registerEases, prefersReduced } from '@/lib/motion'
import { REASONS, STATS } from '@/data/content'
import CountUp from '@/components/motion/CountUp'

/**
 * The dome: a section with an enormous top radius rising in normal flow over
 * the sticky hero — the shape is the transition. Its title is set on an SVG
 * circle path, and the scrub animates exactly one property, word-spacing, so
 * the words spread themselves around the curve as the dome arrives.
 */
export default function DomeIntro() {
  const root = useRef<HTMLElement>(null)

  useLayoutEffect(() => {
    if (prefersReduced()) return
    registerEases()

    const ctx = gsap.context((self) => {
      const tween = gsap.fromTo(
        self.selector!('[data-dome-text]'),
        { wordSpacing: '0rem' },
        {
          wordSpacing: '7rem',
          ease: 'none',
          scrollTrigger: {
            trigger: root.current,
            start: 'top bottom',
            end: 'top 15%',
            scrub: true,
          },
        }
      )
      return () => tween.kill()
    }, root)

    return () => ctx.revert()
  }, [])

  return (
    <section ref={root} id="about" data-bg="light" className="dome relative z-[2] bg-paper text-neutral-900">
      {/* Curved title hugging the dome's shoulder */}
      <div className="pointer-events-none relative mx-auto -mt-2 h-[38vw] max-h-[430px] w-full overflow-hidden">
        <svg viewBox="0 0 1600 1600" className="absolute top-0 left-1/2 w-[min(115vw,1800px)] -translate-x-1/2" aria-hidden>
          <defs>
            <path id="dome-arc" d="M 800,800 m -676,0 a 676,676 0 1,1 1352,0 a 676,676 0 1,1 -1352,0" />
          </defs>
          <text data-dome-text textAnchor="middle" className="fill-neutral-900 font-display text-[46px] tracking-[0.18em] uppercase">
            <textPath href="#dome-arc" startOffset="25%">
              Three reasons to build with XHomes
            </textPath>
          </text>
        </svg>
      </div>

      <div className="container-page pb-24 md:pb-32">
        <div className="mx-auto max-w-2xl text-center" data-rv-w>
          <p className="caps text-stone" data-rv="a">
            About XHomes
          </p>
          <h2 className="display-md mt-5" data-rv="h">
            Where quality
            <br />
            meets vision
          </h2>
          <p className="body-copy mx-auto mt-7 max-w-xl" data-rv="p">
            A premier Melbourne construction company specialising in premium townhouse projects and
            single dwelling homes — a commitment to craftsmanship and client satisfaction, brought to
            life with precision and care.
          </p>
        </div>

        {/* The three reasons */}
        <div className="mt-16 grid gap-10 md:mt-24 md:grid-cols-3 md:gap-8">
          {REASONS.map((r) => (
            <div key={r.n} className="border-t border-neutral-300 pt-6" data-rv-w>
              <span className="caps text-stone" data-rv="a">
                {r.n}
              </span>
              <h3 className="display-sm mt-4" data-rv="h">
                {r.title}
              </h3>
              <p className="body-copy mt-4 max-w-sm" data-rv="p">
                {r.body}
              </p>
            </div>
          ))}
        </div>

        {/* The numbers, measured in */}
        <dl className="mt-16 grid grid-cols-2 border-t border-neutral-300 md:mt-24 md:grid-cols-4">
          {STATS.map((s, i) => (
            <div
              key={s.label}
              className={`px-5 py-7 md:px-8 md:py-9 ${i > 0 ? 'md:border-l md:border-neutral-300' : ''} ${
                i % 2 === 1 ? 'border-l border-neutral-300 md:border-l' : ''
              } ${i > 1 ? 'border-t border-neutral-300 md:border-t-0' : ''}`}
            >
              <dt className="caps text-stone">{s.label}</dt>
              <dd className="font-display mt-3 text-3xl md:text-4xl">
                <CountUp value={s.value} suffix={s.suffix} />
              </dd>
            </div>
          ))}
        </dl>
      </div>
    </section>
  )
}
