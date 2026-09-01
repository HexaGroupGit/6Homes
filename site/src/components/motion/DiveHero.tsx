'use client'

import { useLayoutEffect, useRef, type ReactNode } from 'react'
import Image from 'next/image'
import { gsap, registerEases, prefersReduced } from '@/lib/motion'

/**
 * The landing hero: the split plate that becomes a camera move.
 *
 * Frame 0 is the site's existing identity — title block on paper at the left,
 * photograph plated on the right. Scroll expands the photograph to full bleed
 * and then dives INTO it (scale toward a biased origin, the reference site's
 * exact trick — no WebGL, one image, one transform), while the title block
 * exits upward at half speed. The stat rail rises to close the scene.
 *
 * Sticky-in-tall-wrapper, no pinning. Without JS the scene is simply the
 * split-plate hero at its natural height, fully readable.
 */
export default function DiveHero({
  image,
  imageAlt,
  caption,
  title,
  rail,
}: {
  image: string
  imageAlt: string
  caption: ReactNode
  title: ReactNode
  rail: ReactNode
}) {
  const root = useRef<HTMLDivElement>(null)

  useLayoutEffect(() => {
    if (prefersReduced()) return
    registerEases()

    const ctx = gsap.context((self) => {
      const q = (s: string) => self.selector!(s) as HTMLElement[]

      const mm = gsap.matchMedia()

      mm.add('(min-width: 1024px)', () => {
        const tl = gsap.timeline({
          defaults: { ease: 'none' },
          scrollTrigger: {
            trigger: root.current,
            start: 'top top',
            end: 'bottom bottom',
            scrub: true,
          },
        })

        // The photograph starts clipped to the right-hand plate, expands to
        // full bleed, then the camera dives.
        tl.fromTo(
          q('.dh-media'),
          { clipPath: 'inset(0% 0% 0% 55%)' },
          { clipPath: 'inset(0% 0% 0% 0%)', duration: 0.4, ease: 'inOut' },
          0
        )
          .fromTo(
            q('.dh-img'),
            { scale: 1.12, yPercent: 0 },
            { scale: 1.85, yPercent: -6, duration: 0.72, ease: 'in', transformOrigin: '52% 66%' },
            0.28
          )
          // Title block exits upward at half the scroll's pace and fades.
          .fromTo(
            q('.dh-title'),
            { yPercent: 0, autoAlpha: 1 },
            { yPercent: -36, autoAlpha: 0, duration: 0.45, ease: 'none' },
            0.05
          )
          // The plate caption dissolves as its plate stops being a plate.
          .to(q('.dh-caption'), { autoAlpha: 0, duration: 0.15 }, 0.3)
          // Stat rail arrives for the scene's final act.
          .fromTo(
            q('.dh-rail'),
            { yPercent: 100 },
            { yPercent: 0, duration: 0.2, ease: 'out' },
            0.66
          )

        return () => tl.kill()
      })

      mm.add('(max-width: 1023px)', () => {
        // Small screens skip the plate expansion — image is full-bleed under a
        // paper title band; scroll still dives gently.
        gsap.set(q('.dh-media'), { clipPath: 'none' })
        const tl = gsap.timeline({
          scrollTrigger: {
            trigger: root.current,
            start: 'top top',
            end: 'bottom bottom',
            scrub: true,
          },
        })
        tl.fromTo(
          q('.dh-img'),
          { scale: 1.05 },
          { scale: 1.5, ease: 'in', transformOrigin: '50% 62%' }
        )
          .to(q('.dh-title'), { autoAlpha: 0, duration: 0.3, ease: 'none' }, 0.25)
          .fromTo(q('.dh-rail'), { yPercent: 100 }, { yPercent: 0, ease: 'out', duration: 0.25 }, 0.7)
        return () => tl.kill()
      })
    }, root)

    return () => ctx.revert()
  }, [])

  return (
    <div ref={root} className="dh-scene scene h-[280svh] lg:h-[300svh]">
      <section className="scene-screen bg-paper">
        {/* Photograph layer — full-bleed underneath, clipped to a plate at rest */}
        <div className="dh-media plx-frame absolute inset-0 bg-panel [clip-path:inset(0_0_0_55%)] max-lg:[clip-path:none]">
          <Image
            src={image}
            alt={imageAlt}
            fill
            priority
            sizes="100vw"
            className="dh-img object-cover"
          />
          {/* Mobile scrim so the title band reads over the image */}
          <div className="absolute inset-x-0 bottom-0 h-2/3 bg-gradient-to-t from-ink/70 via-ink/25 to-transparent lg:hidden" />
          <div className="dh-caption absolute inset-x-0 bottom-0 hidden bg-gradient-to-t from-ink/70 to-transparent p-6 pt-20 md:p-8 md:pt-24 lg:block">
            {caption}
          </div>
        </div>

        {/* Title plate */}
        <div className="dh-title absolute inset-0 flex items-end lg:items-center">
          <div className="w-full lg:max-w-[55%]">{title}</div>
        </div>

        {/* Stat rail — parked below the fold, rises at the end of the dive */}
        <div className="dh-rail absolute inset-x-0 bottom-0 border-t border-rule bg-paper">
          {rail}
        </div>
      </section>
    </div>
  )
}
