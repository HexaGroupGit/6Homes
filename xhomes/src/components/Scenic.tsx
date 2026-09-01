'use client'

import { useLayoutEffect, useRef } from 'react'
import Image from 'next/image'
import { gsap, registerEases, prefersReduced } from '@/lib/motion'
import { QUOTE } from '@/data/content'
import Clouds from '@/components/Clouds'

/**
 * The scenic interlude: the client's own drone frame — suburbs running to the
 * Melbourne skyline — held full-bleed while Tom's line about trust reveals
 * over it. The photograph creeps slowly larger through the scene; the clouds
 * drift on their own clock above the horizon.
 */
export default function Scenic() {
  const root = useRef<HTMLDivElement>(null)

  useLayoutEffect(() => {
    if (prefersReduced()) return
    registerEases()

    const ctx = gsap.context((self) => {
      const tween = gsap.fromTo(
        self.selector!('.sc-img'),
        { scale: 1.05 },
        {
          scale: 1.22,
          ease: 'none',
          transformOrigin: '50% 60%',
          scrollTrigger: {
            trigger: root.current,
            start: 'top top',
            end: 'bottom bottom',
            scrub: true,
          },
        }
      )
      return () => tween.kill()
    }, root)

    return () => ctx.revert()
  }, [])

  return (
    <div ref={root} className="dh-scene scene h-[220svh]">
      <section className="scene-screen bg-black text-white">
        <div className="plx-frame absolute inset-0">
          <Image
            src="/media/kinsfolk-s2-dji-0784.jpg"
            alt="Drone view over Melbourne suburbs from a Kinsfolk rooftop, city skyline on the horizon"
            fill
            sizes="100vw"
            className="sc-img object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-black/30" />
        </div>

        <Clouds className="h-[40svh] opacity-70 mix-blend-screen" />

        <div className="container-page relative flex h-full flex-col items-start justify-end pb-20 md:pb-28" data-rv-w>
          <span className="font-script text-[clamp(3rem,7vw,5.5rem)] leading-none text-white/60" aria-hidden data-rv="ctn">
            “
          </span>
          <blockquote className="display-md max-w-4xl normal-case" data-rv="h">
            {QUOTE.text}
          </blockquote>
          <p className="caps mt-8 text-white/60" data-rv="a">
            {QUOTE.attribution}
          </p>
        </div>
      </section>
    </div>
  )
}
