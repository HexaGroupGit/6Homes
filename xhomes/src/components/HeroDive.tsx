'use client'

import { useLayoutEffect, useRef } from 'react'
import Image from 'next/image'
import { gsap, registerEases, prefersReduced } from '@/lib/motion'
import Clouds from '@/components/Clouds'

/**
 * The hero: their own completed townhouse street under a big sky, held sticky
 * while scroll dives the camera in — content drifts up first, then the
 * photograph scales toward a biased origin. Clouds drift across the sky on
 * their own clock, indifferent to the scroll.
 *
 * Load-in: the photograph settles from a slight over-scale as the intro plate
 * lifts, so arriving feels like the scene coming into focus.
 */
export default function HeroDive() {
  const root = useRef<HTMLDivElement>(null)

  useLayoutEffect(() => {
    if (prefersReduced()) return
    registerEases()

    const ctx = gsap.context((self) => {
      const q = (s: string) => self.selector!(s)

      // Arrival — timed to run out as the preloader lifts away.
      gsap.fromTo(
        q('.hv-img'),
        { scale: 1.14 },
        { scale: 1.04, duration: 1.6, ease: 'inOut', delay: 0.4 }
      )

      const tl = gsap.timeline({
        scrollTrigger: {
          trigger: root.current,
          start: 'top top',
          end: 'bottom bottom',
          scrub: true,
        },
      })
      tl.fromTo(q('.hv-title'), { y: 0, autoAlpha: 1 }, { y: -220, autoAlpha: 0, duration: 0.5, ease: 'none' }, 0)
        .fromTo(
          q('.hv-img'),
          { scale: 1.04, yPercent: 0 },
          { scale: 1.9, yPercent: -4, duration: 0.8, ease: 'in', transformOrigin: '50% 72%' },
          0.2
        )
        .to(q('.hv-scrim'), { opacity: 0.15, duration: 0.5 }, 0.3)

      return () => tl.kill()
    }, root)

    return () => ctx.revert()
  }, [])

  return (
    <div ref={root} id="top" className="dh-scene scene h-[260svh]">
      <section className="scene-screen bg-black text-white">
        <div className="plx-frame absolute inset-0">
          <Image
            src="/media/xh-hero-street.jpg"
            alt="A completed XHomes townhouse street — white and charcoal facades under a clear sky"
            fill
            priority
            sizes="100vw"
            className="hv-img object-cover"
          />
          <div className="hv-scrim absolute inset-0 bg-black/35" />
        </div>

        {/* The weather layer rides above the photograph's sky */}
        <Clouds className="h-[46svh] opacity-80 mix-blend-screen" />

        <div className="hv-title absolute inset-0 flex flex-col items-center justify-center px-6 text-center">
          <p className="caps text-white/70" data-rv="a">
            Melbourne · Townhouses &amp; new homes
          </p>
          <h1 className="display mt-6 max-w-5xl" data-rv="h">
            Building with
            <br />
            excellence
          </h1>
          <p className="font-script mt-2 -rotate-6 text-[clamp(1.7rem,3.6vw,3rem)] text-white/90" data-rv="ctn">
            where quality meets vision
          </p>
          <div className="mt-10 flex flex-wrap items-center justify-center gap-5" data-rv="ctn">
            <a href="#projects" className="btn-x btn-x-light">
              See the work
            </a>
            <a href="#contact" className="btn-x border border-white/60 text-white hover:bg-white hover:text-black">
              Start a project
            </a>
          </div>
        </div>

        <p className="caps absolute bottom-7 left-1/2 -translate-x-1/2 text-white/50">Scroll</p>
      </section>
    </div>
  )
}
