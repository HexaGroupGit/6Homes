'use client'

import { useLayoutEffect, useRef, useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { gsap, registerEases, prefersReduced } from '@/lib/motion'
import { Dim } from '@/components/ui'

/**
 * The process as a production line.
 *
 * Vertical scroll drives the six steps horizontally past the viewport — the
 * one place a horizontal scrub means something at 6Homes, because this is
 * literally how a home moves through the factory. A continuous dimension rule
 * runs beneath the stations like a conveyor datum, and the manufacture station
 * carries the real factory floor.
 *
 * Desktop only: on small screens the same markup lays out as a vertical list
 * with ordinary reveals, because horizontal scrub on touch is a fight nobody
 * wins.
 */
export default function FactoryLine({
  steps,
  factoryImage,
}: {
  steps: readonly { n: string; title: string; body: string }[]
  factoryImage: string
}) {
  const root = useRef<HTMLDivElement>(null)
  const [active, setActive] = useState(0)

  useLayoutEffect(() => {
    if (prefersReduced()) return
    registerEases()

    const ctx = gsap.context((self) => {
      const mm = gsap.matchMedia()

      mm.add('(min-width: 1024px)', () => {
        const track = self.selector!('.fl-track')[0] as HTMLElement
        const travel = () => -(track.scrollWidth - window.innerWidth)

        const tween = gsap.fromTo(
          track,
          { x: 0 },
          {
            x: travel,
            ease: 'none',
            scrollTrigger: {
              trigger: root.current,
              start: 'top top',
              end: 'bottom bottom',
              scrub: true,
              invalidateOnRefresh: true,
              onUpdate: (st) => {
                setActive(Math.min(steps.length - 1, Math.floor(st.progress * steps.length)))
              },
            },
          }
        )
        return () => tween.kill()
      })
    }, root)

    return () => ctx.revert()
  }, [steps.length])

  return (
    <div ref={root} className="scene bg-deep text-white lg:h-[420svh]" data-bg="dark">
      <div className="lg:sticky lg:top-0 lg:h-svh lg:overflow-hidden">
        {/* Fixed furniture inside the screen: eyebrow + progress counter */}
        <div className="container-page flex items-baseline justify-between pt-20 lg:absolute lg:inset-x-0 lg:top-0 lg:z-10 lg:pt-24">
          <p className="spec text-teal" data-rv="a">
            How a build runs
          </p>
          <p className="spec hidden text-white/50 tabular-nums lg:block">
            {String(active + 1).padStart(2, '0')} / {String(steps.length).padStart(2, '0')}
          </p>
        </div>

        {/* The line itself */}
        <div className="fl-track flex flex-col gap-14 px-6 pt-10 pb-20 max-lg:container-page md:px-10 lg:h-full lg:w-max lg:flex-row lg:items-center lg:gap-0 lg:px-0 lg:pt-0 lg:pb-0">
          {/* Intro station */}
          <div className="shrink-0 lg:flex lg:w-[62vw] lg:items-center lg:pl-16" data-rv-w>
            <div>
              <h2 className="display" data-rv="h">
                Six steps,
                <br />
                in this order
              </h2>
              <p className="lead mt-8 max-w-md !text-white/60" data-rv="p">
                Your home is manufactured while your site is prepared. Running the two in parallel
                is where the months come off.
              </p>
              <p className="spec mt-10 hidden text-white/40 lg:block" data-rv="a">
                Scroll — the line moves
              </p>
            </div>
          </div>

          {steps.map((step, i) => (
            <div
              key={step.n}
              className="relative shrink-0 border-t border-white/15 pt-8 lg:w-[38vw] lg:border-t-0 lg:px-10 lg:pt-0"
              data-rv-w
            >
              {/* The conveyor datum: a continuous rule with a tick per station */}
              <div className="absolute top-[4.5rem] right-0 left-0 hidden border-t border-white/15 lg:block" />
              <div className="absolute top-[4.05rem] left-10 hidden h-[0.95rem] border-l border-teal lg:block" />

              <div className="lg:pt-24">
                <span className="spec text-teal" data-rv="a">
                  {step.n}
                </span>
                <h3 className="display-xs mt-4 text-white" data-rv="h">
                  {step.title}
                </h3>
                <p className="prose-body mt-4 max-w-xs !text-white/55" data-rv="p">
                  {step.body}
                </p>

                {/* The manufacture station carries the real factory floor */}
                {i === 4 && (
                  <div className="plx-frame relative mt-8 aspect-[16/9] max-w-md" data-rv="img">
                    <Image
                      src={factoryImage}
                      alt="Rows of completed 6Homes modules on the factory floor"
                      fill
                      sizes="(max-width: 1024px) 90vw, 30vw"
                      className="object-cover"
                    />
                    <div className="absolute right-0 bottom-0 left-0 p-4">
                      <Dim tone="light">The floor, mid-run</Dim>
                    </div>
                  </div>
                )}
              </div>
            </div>
          ))}

          {/* Out-station: the CTA */}
          <div className="shrink-0 lg:flex lg:w-[48vw] lg:items-center lg:px-16" data-rv-w>
            <div>
              <p className="spec text-white/40" data-rv="a">
                Permits through handover
              </p>
              <h3 className="display-sm mt-5 text-white" data-rv="h">
                About four months,
                <br />
                end to end
              </h3>
              <div className="mt-8" data-rv="ctn">
                <Link href="/our-process" className="btn btn-light">
                  The process in full
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
