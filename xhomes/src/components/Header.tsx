'use client'

import { useEffect, useState } from 'react'
import { COMPANY } from '@/data/content'

const NAV = [
  ['#about', 'About'],
  ['#services', 'Services'],
  ['#projects', 'Projects'],
  ['#contact', 'Contact'],
] as const

/**
 * Fixed chrome, dark-first: white wordmark and nav over the hero, flipping to
 * ink whenever a light section passes beneath (the scroll system toggles
 * .on-light — the header never decides its own colour).
 */
export default function Header() {
  const [scrolled, setScrolled] = useState(false)
  const [open, setOpen] = useState(false)

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24)
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  useEffect(() => {
    document.body.style.overflow = open ? 'hidden' : ''
    return () => {
      document.body.style.overflow = ''
    }
  }, [open])

  return (
    <header
      data-themed
      className={`xh-header fixed inset-x-0 top-0 z-40 ${scrolled ? 'is-scrolled' : ''} ${open ? 'is-open' : ''}`}
    >
      <div className="container-page flex h-16 items-center justify-between gap-8 md:h-20">
        <a href="#top" aria-label="XHomes — top" className="relative block h-[18px] w-[160px] md:h-[22px] md:w-[196px]">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/brand/logo-white.png" alt="XHomes" className="logo-white absolute inset-0 h-full w-full object-contain" />
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/brand/logo-black.png" alt="" aria-hidden className="logo-black absolute inset-0 h-full w-full object-contain" />
        </a>

        <nav className="hidden items-center gap-9 lg:flex" aria-label="Main">
          {NAV.map(([href, label]) => (
            <a key={href} href={href} className="caps opacity-70 transition-opacity duration-300 hover:opacity-100">
              {label}
            </a>
          ))}
        </nav>

        <div className="hidden items-center gap-7 lg:flex">
          <a href={COMPANY.phoneHref} className="caps opacity-80 transition-opacity hover:opacity-100">
            {COMPANY.phone}
          </a>
          <a href="#contact" className="btn-x border border-current !py-3 hover:bg-white hover:text-black">
            Start a project
          </a>
        </div>

        <button
          type="button"
          onClick={() => setOpen((o) => !o)}
          aria-expanded={open}
          aria-label={open ? 'Close menu' : 'Open menu'}
          className="-mr-2 p-2 lg:hidden"
        >
          <svg viewBox="0 0 24 24" className="size-6" fill="none" stroke="currentColor" strokeWidth="1.4">
            {open ? <path d="M6 6l12 12M18 6L6 18" /> : <path d="M3 7h18M3 12h18M3 17h18" />}
          </svg>
        </button>
      </div>

      {open && (
        <div className="border-t border-white/15 bg-black text-white lg:hidden">
          <nav className="container-page flex flex-col py-3" aria-label="Main">
            {NAV.map(([href, label], i) => (
              <a
                key={href}
                href={href}
                onClick={() => setOpen(false)}
                className="flex items-baseline gap-5 border-b border-white/10 py-4 last:border-0"
              >
                <span className="caps w-6 text-white/40">{String(i + 1).padStart(2, '0')}</span>
                <span className="display-sm">{label}</span>
              </a>
            ))}
          </nav>
          <div className="container-page flex flex-col gap-3 pb-8">
            <a href={COMPANY.phoneHref} className="caps text-white/70">
              {COMPANY.phone}
            </a>
            <a href={`mailto:${COMPANY.email}`} className="caps text-white/70">
              {COMPANY.email}
            </a>
          </div>
        </div>
      )}
    </header>
  )
}
