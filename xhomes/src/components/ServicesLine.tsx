'use client'

import { useLayoutEffect, useRef, useState } from 'react'
import Image from 'next/image'
import { gsap, registerEases, prefersReduced } from '@/lib/motion'
import { SERVICES } from '@/data/content'

/**
 * The services as a horizontal story: vertical scroll drives the panels
 * sideways past the viewport, each service paired with its own imagery.
 * Desktop only — small screens and motionless readers get the same markup as
 * an ordinary vertical section (the sv-* fallback CSS).
 */
export default function ServicesLine() {
  const root = useRef<HTMLDivElement>(null)
  const [active, setActive] = useState(0)

  useLayoutEffect(() => {
    if (prefersReduced()) return
    registerEases()

    const ctx = gsap.context((self) => {
      const mm = gsap.matchMedia()
      mm.add('(min-width: 1024px)', () => {
        const track = self.selector!('.sv-track')[0] as HTMLElement
        const tween = gsap.fromTo(
          track,
          { x: 0 },
          {
            x: () => -(track.scrollWidth - window.innerWidth),
            ease: 'none',
            scrollTrigger: {
              trigger: root.current,
              start: 'top top',
              end: 'bottom bottom',
              scrub: true,
              invalidateOnRefresh: true,
              onUpdate: (st) => setActive(Math.min(SERVICES.length - 1, Math.floor(st.progress * SERVICES.length))),
            },
          }
        )
        return () => tween.kill()
      })
    }, root)

    return () => ctx.revert()
  }, [])

  return (
    <div ref={root} id="services" className="sv-scene scene bg-black text-white lg:h-[380svh]">
      <div className="sv-screen lg:sticky lg:top-0 lg:h-svh lg:overflow-hidden">
        <div className="container-page flex items-baseline justify-between pt-20 lg:absolute lg:inset-x-0 lg:top-0 lg:z-10 lg:pt-24">
          <p className="caps text-white/60" data-rv="a">
            Our services
          </p>
          <p className="caps hidden text-white/40 tabular-nums lg:block">
            {String(active + 1).padStart(2, '0')} / {String(SERVICES.length).padStart(2, '0')}
          </p>
        </div>

        <div className="sv-track flex flex-col gap-16 px-6 pt-10 pb-20 md:px-10 lg:h-full lg:w-max lg:flex-row lg:items-center lg:gap-0 lg:px-0 lg:pt-0 lg:pb-0">
          {/* Intro panel */}
          <div className="shrink-0 lg:flex lg:w-[58vw] lg:items-center lg:pl-16" data-rv-w>
            <div>
              <h2 className="display-md" data-rv="h">
                What we do,
                <br />
                and do properly
              </h2>
              <p className="body-copy mt-7 max-w-md !text-white/60" data-rv="p">
                Four disciplines, one standard. Whether it is a masterplanned community or a single
                new home, the same team and the same care run the job end to end.
              </p>
              <p className="caps mt-10 hidden text-white/35 lg:block" data-rv="a">
                Scroll — the work moves past
              </p>
            </div>
          </div>

          {SERVICES.map((s) => (
            <div key={s.n} className="shrink-0 border-t border-white/12 pt-8 lg:w-[52vw] lg:border-t-0 lg:px-12 lg:pt-0" data-rv-w>
              <div className="lg:grid lg:grid-cols-[1fr_1.1fr] lg:items-center lg:gap-10">
                <div>
                  <span className="caps text-white/45" data-rv="a">
                    {s.n}
                  </span>
                  <h3 className="display-sm mt-4" data-rv="h">
                    {s.title}
                  </h3>
                  <p className="body-copy mt-4 max-w-sm !text-white/60" data-rv="p">
                    {s.body}
                  </p>
                </div>
                <div className="plx-frame cut-corners relative mt-7 aspect-[4/3] lg:mt-0" data-rv="img">
                  <Image src={s.image} alt={s.imageAlt} fill sizes="(max-width: 1024px) 92vw, 30vw" className="object-cover" />
                </div>
              </div>
            </div>
          ))}

          {/* Out panel */}
          <div className="shrink-0 lg:flex lg:w-[100vw] lg:items-center lg:justify-center" data-rv-w>
            <div className="text-center">
              <p className="caps text-white/45" data-rv="a">
                One team, end to end
              </p>
              <h3 className="display-md mt-5" data-rv="h">
                From first conversation
                <br />
                to the keys
              </h3>
              <div className="mt-9" data-rv="ctn">
                <a href="#contact" className="btn-x btn-x-light">
                  Talk to us about your site
                </a>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
