'use client'

import { useLayoutEffect, useRef, useState } from 'react'
import Image from 'next/image'
import { gsap, registerEases, prefersReduced } from '@/lib/motion'
import { PROJECTS } from '@/data/content'

/**
 * The work: three communities, presented editorially. Lumina's interiors ship
 * in two schemes, so its panel carries a LIGHT / DARK toggle — a plain 0.8s
 * crossfade between the two matched renders, which is all a scene swap ever
 * needs to be.
 */
export default function Projects() {
  return (
    <section id="projects" data-bg="light" className="bg-powder py-20 text-neutral-900 md:py-32">
      <div className="container-page">
        <div className="mx-auto max-w-2xl text-center" data-rv-w>
          <p className="caps text-stone" data-rv="a">
            The work
          </p>
          <h2 className="display-md mt-5" data-rv="h">
            Communities,
            <br />
            not just addresses
          </h2>
        </div>

        <div className="mt-16 space-y-24 md:mt-24 md:space-y-36">
          {PROJECTS.map((p, i) => (
            <article key={p.slug} data-rv-w>
              <div className={`grid items-end gap-6 md:grid-cols-[1fr_auto] ${i % 2 ? 'md:text-right' : ''}`}>
                <div className={i % 2 ? 'md:order-2' : ''}>
                  <p className="caps text-stone" data-rv="a">
                    {p.place} · {p.status}
                  </p>
                  <h3 className="display mt-3" data-rv="h">
                    {p.name}
                  </h3>
                </div>
                <p className={`body-copy max-w-sm pb-2 ${i % 2 ? 'md:order-1' : ''}`} data-rv="p">
                  {p.body}
                </p>
              </div>

              <div className="plx-frame cut-corners relative mt-8 aspect-[16/9] md:aspect-[21/9]" data-rv="img" data-plx="img">
                <Image
                  src={p.hero}
                  alt={`${p.name}, ${p.place}`}
                  fill
                  sizes="100vw"
                  className={p.slug === 'berwick-views' ? 'bg-white object-contain p-6 md:p-10' : 'object-cover'}
                />
              </div>

              {p.tiles.length > 0 && (
                <div className="mt-6 grid grid-cols-3 gap-4 md:gap-6">
                  {p.tiles.map((t) => (
                    <div key={t} className="plx-frame cut-corners relative aspect-[4/3]" data-rv="img">
                      <Image src={t} alt="" fill sizes="33vw" className="object-cover" />
                    </div>
                  ))}
                </div>
              )}

              {'schemes' in p && p.schemes && <SchemeToggle schemes={p.schemes} />}
            </article>
          ))}
        </div>
      </div>
    </section>
  )
}

function SchemeToggle({
  schemes,
}: {
  schemes: { light: { label: string; image: string }; dark: { label: string; image: string } }
}) {
  const [mode, setMode] = useState<'light' | 'dark'>('light')
  const frame = useRef<HTMLDivElement>(null)

  useLayoutEffect(() => {
    if (prefersReduced() || !frame.current) return
    registerEases()
    const incoming = frame.current.querySelector(`[data-scheme="${mode}"]`)
    if (incoming) gsap.fromTo(incoming, { opacity: 0 }, { opacity: 1, duration: 0.8, ease: 'inOut' })
  }, [mode])

  return (
    <div className="mt-10" data-rv="ctn">
      <div className="flex items-center justify-center gap-2">
        {(['light', 'dark'] as const).map((m) => (
          <button
            key={m}
            type="button"
            onClick={() => setMode(m)}
            aria-pressed={mode === m}
            className={`btn-x !py-3 transition-colors ${
              mode === m ? 'bg-black text-white' : 'bg-transparent text-neutral-600 hover:text-black'
            }`}
          >
            {schemes[m].label}
          </button>
        ))}
      </div>

      <div ref={frame} className="cut-corners relative mt-6 aspect-[16/9] overflow-hidden md:aspect-[21/9]">
        {(['light', 'dark'] as const).map((m) => (
          <div key={m} data-scheme={m} className="absolute inset-0" style={{ zIndex: mode === m ? 1 : 0, opacity: mode === m ? 1 : 0 }}>
            <Image src={schemes[m].image} alt={`Lumina kitchen — ${schemes[m].label}`} fill sizes="100vw" className="object-cover" />
          </div>
        ))}
      </div>
    </div>
  )
}
