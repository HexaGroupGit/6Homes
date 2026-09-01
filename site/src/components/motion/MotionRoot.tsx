'use client'

import { useEffect } from 'react'
import { usePathname } from 'next/navigation'
import Lenis from 'lenis'
import { gsap, ScrollTrigger, wireReveals, wireParallax, wireThemeSwap, registerEases, prefersReduced } from '@/lib/motion'

// One instance for the whole app, owned by the layout. Everything scroll-
// related hangs off this: Lenis drives ScrollTrigger through GSAP's ticker,
// and each route change re-wires the declarative systems for the new page.
//
// With reduced motion on, Lenis never starts and the wiring functions no-op
// into plain visibility — native scroll, static page, everything readable.

let lenis: Lenis | null = null

export function useLenis() {
  return lenis
}

export default function MotionRoot() {
  const pathname = usePathname()

  // Lenis + ticker wiring: once for the app's life.
  useEffect(() => {
    registerEases()
    if (prefersReduced() || lenis) return
    // The CSS switch between "cinematic" and "plain" layouts. Only added when
    // motion actually runs, so no-JS and reduced-motion both get the plain
    // layouts from the same selector.
    document.documentElement.classList.add('has-motion')

    lenis = new Lenis({
      duration: 1.2,
      easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
      smoothWheel: true,
      touchMultiplier: 2,
    })
    lenis.on('scroll', ScrollTrigger.update)
    const raf = (t: number) => lenis?.raf(t * 1000)
    gsap.ticker.add(raf)
    gsap.ticker.lagSmoothing(0)

    return () => {
      gsap.ticker.remove(raf)
      lenis?.destroy()
      lenis = null
    }
  }, [])

  // Per-route: scroll to top, wire the declarative systems, refresh triggers
  // once images have had a beat to lay out.
  useEffect(() => {
    lenis?.scrollTo(0, { immediate: true })
    window.scrollTo(0, 0)

    const cleanups = [wireReveals(), wireParallax(), wireThemeSwap()]
    // Media loading shifts layout; a follow-up refresh keeps trigger positions
    // honest without waiting on every image.
    const t1 = setTimeout(() => ScrollTrigger.refresh(), 350)
    const t2 = setTimeout(() => ScrollTrigger.refresh(), 1200)

    return () => {
      clearTimeout(t1)
      clearTimeout(t2)
      for (const fn of cleanups) fn()
    }
  }, [pathname])

  return null
}
