'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { COMPANY, NAV } from '@/data/content'
import Wordmark from './Wordmark'
import EnquireButton from './enquiry/EnquireButton'

// Every page opens on paper — the homepage hero puts its title block on the
// left and the photograph on the right — so the header is always dark-on-light.
// The only state it carries is a hairline that appears once you leave the top,
// which separates it from the page without drawing a box at rest.
export default function Header() {
  const [scrolled, setScrolled] = useState(false)
  const [open, setOpen] = useState(false)
  const pathname = usePathname()

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 16)
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  // Navigating with the drawer open should close it, or the new page renders
  // under a menu the reader thought they had left.
  useEffect(() => setOpen(false), [pathname])

  useEffect(() => {
    document.body.style.overflow = open ? 'hidden' : ''
    return () => {
      document.body.style.overflow = ''
    }
  }, [open])

  return (
    <header
      className={`fixed inset-x-0 top-0 z-40 bg-paper/95 text-ink backdrop-blur transition-colors duration-500 ease-drafting ${
        scrolled || open ? 'border-b border-rule' : 'border-b border-transparent'
      }`}
    >
      <div className="container-page flex h-16 items-center justify-between gap-8 md:h-20">
        <Wordmark />

        <nav className="hidden items-center gap-8 lg:flex" aria-label="Main">
          {NAV.map((item) => {
            const active = pathname === item.href || pathname.startsWith(`${item.href}/`)
            return (
              <Link
                key={item.href}
                href={item.href}
                aria-current={active ? 'page' : undefined}
                className={`spec transition-colors duration-500 ease-drafting ${
                  active ? 'text-teal-deep' : 'text-mute hover:text-ink'
                }`}
              >
                {item.label}
              </Link>
            )
          })}
        </nav>

        <div className="hidden items-center gap-7 lg:flex">
          <a href={COMPANY.phoneHref} className="font-mono text-[12px] text-navy transition-colors hover:text-teal-deep">
            {COMPANY.phone}
          </a>
          <EnquireButton intent="consultation" source="header" className="!px-6 !py-3">
            Consultation
          </EnquireButton>
        </div>

        <button
          type="button"
          onClick={() => setOpen((o) => !o)}
          aria-expanded={open}
          aria-label={open ? 'Close menu' : 'Open menu'}
          className="-mr-2 p-2 lg:hidden"
        >
          <svg viewBox="0 0 24 24" className="size-6" fill="none" stroke="currentColor" strokeWidth="1.4">
            {open ? (
              <path d="M6 6l12 12M18 6L6 18" strokeLinecap="square" />
            ) : (
              <path d="M3 7h18M3 12h18M3 17h18" strokeLinecap="square" />
            )}
          </svg>
        </button>
      </div>

      {open && (
        <div className="border-t border-rule bg-paper lg:hidden">
          <nav className="container-page flex flex-col py-2" aria-label="Main">
            {NAV.map((item, i) => (
              <Link
                key={item.href}
                href={item.href}
                className="flex items-baseline gap-5 border-b border-rule py-4 last:border-0"
              >
                <span className="spec w-6 text-mute/50">{String(i + 1).padStart(2, '0')}</span>
                <span className="display-xs">{item.label}</span>
              </Link>
            ))}
          </nav>
          <div className="container-page flex flex-col gap-4 py-6">
            <EnquireButton intent="consultation" source="mobile-menu" className="w-full">
              Book a consultation
            </EnquireButton>
            <a href={COMPANY.phoneHref} className="spec text-center text-mute">
              {COMPANY.phone} · {COMPANY.phoneDigits}
            </a>
          </div>
        </div>
      )}
    </header>
  )
}
