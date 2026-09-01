'use client'

// The site's motion system — one vocabulary, used by every page.
//
// The grammar is lifted from studying era-residence.com's production bundle
// (their exact CustomEase curves, durations and stagger rhythm), then spoken
// with the 6Homes drafting accent: rules that draw themselves, type that
// stamps in, apertures instead of arches. Three durations and a handful of
// named eases are the entire palette — every animation on the site picks from
// these, which is what makes the motion feel like one hand.
//
// Architecture note, learned from the same study: there are NO ScrollTrigger
// pins anywhere. Every "pinned" scene is CSS position:sticky inside an
// over-tall wrapper, with a scrubbed timeline mapped over the wrapper's
// scroll length. Sticky survives hydration, resize and address-bar chrome far
// better than pinning, and it costs nothing when JS is off.

import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { SplitText } from 'gsap/SplitText'
import { CustomEase } from 'gsap/CustomEase'

gsap.registerPlugin(ScrollTrigger, SplitText, CustomEase)

// ── The palette ─────────────────────────────────────────────────────────────
export const DUR = { s: 0.4, m: 0.8, l: 1.2 }
export const STAGGER = 0.1

let registered = false
export function registerEases() {
  if (registered) return
  registered = true
  CustomEase.create('out', '0.25,1,0.5,1') // reveals — fast start, long soft landing
  CustomEase.create('in', '0.5,0,0.75,0') // hides — gentle start, decisive exit
  CustomEase.create('inOut', '0.75,0,0.25,1') // symmetric moves
  CustomEase.create('dive', '0.6,0,0,1') // the hero camera move
}

// ── Reduced motion ──────────────────────────────────────────────────────────
export const prefersReduced = () =>
  typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches

// ── Reveal engine ───────────────────────────────────────────────────────────
// Declarative, attribute-driven, exactly like the reference site's system —
// so choreographing a page is markup, not bespoke effect code.
//
//   data-rv="h"     headline — masked lines rise with a settling pitch
//   data-rv="p"     paragraph — masked lines rise, quieter
//   data-rv="a"     annotation — mono spec text stamps in character by character
//   data-rv="ctn"   block/button — rises 3.3rem and fades in
//   data-rv="line"  rule — draws itself across via clip-path
//   data-rv="img"   image plate — skewed sliver sweeps open, inner img settles from 1.4×
//
// Elements sharing a [data-rv-w] wrapper reveal together on one trigger with
// a shared stagger; loose elements trigger themselves. Reveals fire once —
// content should arrive, not flicker on every pass.
//
// CSS gates initial visibility behind @media (scripting: enabled), so a
// browser without JS renders the whole page plainly.

type Revealer = {
  initial: (el: HTMLElement) => void
  reveal: (el: HTMLElement, index: number) => gsap.core.Tween | gsap.core.Timeline
}

const splitCache = new WeakMap<HTMLElement, SplitText>()

function splitLines(el: HTMLElement): SplitText {
  let split = splitCache.get(el)
  if (!split) {
    split = new SplitText(el, { type: 'lines,words', mask: 'lines', linesClass: 'rv-line' })
    splitCache.set(el, split)
  }
  return split
}

function splitChars(el: HTMLElement): SplitText {
  let split = splitCache.get(el)
  if (!split) {
    split = new SplitText(el, { type: 'chars', charsClass: 'rv-char' })
    splitCache.set(el, split)
  }
  return split
}

const REVEALERS: Record<string, Revealer> = {
  h: {
    initial: (el) => gsap.set(splitLines(el).lines, { yPercent: 110 }),
    reveal: (el, i) =>
      gsap.to(splitLines(el).lines, {
        yPercent: 0,
        duration: DUR.l,
        stagger: STAGGER,
        ease: 'out',
        delay: i * STAGGER,
      }),
  },
  p: {
    initial: (el) => gsap.set(splitLines(el).lines, { yPercent: 110 }),
    reveal: (el, i) =>
      gsap.to(splitLines(el).lines, {
        yPercent: 0,
        duration: DUR.l,
        stagger: STAGGER * 0.6,
        ease: 'out',
        delay: i * STAGGER,
      }),
  },
  a: {
    initial: (el) => gsap.set(splitChars(el).chars, { opacity: 0, x: '0.6em' }),
    reveal: (el, i) =>
      gsap.to(splitChars(el).chars, {
        opacity: 1,
        x: 0,
        duration: DUR.m,
        stagger: 0.02,
        ease: 'out',
        delay: i * STAGGER,
      }),
  },
  ctn: {
    initial: (el) => gsap.set(el, { opacity: 0, y: '3.333rem' }),
    reveal: (el, i) =>
      gsap.to(el, { opacity: 1, y: 0, duration: DUR.l, ease: 'out', delay: i * STAGGER }),
  },
  line: {
    initial: (el) => gsap.set(el, { clipPath: 'inset(0% 100% 0% 0%)' }),
    reveal: (el, i) =>
      gsap.to(el, {
        clipPath: 'inset(0% 0% 0% 0%)',
        duration: DUR.l,
        ease: 'out',
        delay: i * STAGGER,
      }),
  },
  img: {
    initial: (el) => {
      gsap.set(el, { clipPath: 'polygon(100% 0%, 100% 0%, 101% 100%, 125% 100%)' })
      const img = el.querySelector('img, video')
      if (img) gsap.set(img, { scale: 1.4, xPercent: 6 })
    },
    reveal: (el, i) => {
      const tl = gsap.timeline({ delay: i * STAGGER })
      tl.to(el, {
        clipPath: 'polygon(0% 0%, 100% 0%, 100% 100%, 0% 100%)',
        duration: DUR.l,
        ease: 'out',
      })
      const img = el.querySelector('img, video')
      if (img) tl.to(img, { scale: 1, xPercent: 0, duration: DUR.l * 1.15, ease: 'out' }, 0)
      return tl
    },
  },
}

/** Wire every [data-rv] under `root`. Returns a cleanup function. */
export function wireReveals(root: HTMLElement | Document = document): () => void {
  registerEases()
  const els = Array.from(root.querySelectorAll<HTMLElement>('[data-rv]'))
  if (!els.length) return () => {}

  const reduced = prefersReduced()
  const triggers: ScrollTrigger[] = []

  // Group by wrapper so a headline + rule + copy in one block move as one
  // choreographed moment rather than three separate events.
  const groups = new Map<HTMLElement, HTMLElement[]>()
  for (const el of els) {
    const wrapper = (el.closest('[data-rv-w]') as HTMLElement) ?? el
    const list = groups.get(wrapper) ?? []
    list.push(el)
    groups.set(wrapper, list)
  }

  for (const [wrapper, members] of groups) {
    if (reduced) {
      // Reduced motion: everything simply present. The CSS gate hid it;
      // un-hide without theatrics.
      for (const el of members) gsap.set(el, { autoAlpha: 1 })
      continue
    }
    for (const el of members) {
      REVEALERS[el.dataset.rv ?? 'ctn']?.initial(el)
      gsap.set(el, { autoAlpha: 1 }) // lift the CSS gate now that initial states hold
    }
    triggers.push(
      ScrollTrigger.create({
        trigger: wrapper,
        start: 'top 82%',
        once: true,
        onEnter: () => {
          members.forEach((el, i) => REVEALERS[el.dataset.rv ?? 'ctn']?.reveal(el, i))
        },
      })
    )
  }

  return () => {
    for (const t of triggers) t.kill()
  }
}

// ── Parallax ────────────────────────────────────────────────────────────────
// data-plx="img"  — image drifts −12%→12% through its wrapper's journey
// data-plx="up" / "down" — content blocks shear past each other at ±8%
export function wireParallax(root: HTMLElement | Document = document): () => void {
  if (prefersReduced()) return () => {}
  const triggers: ScrollTrigger[] = []
  for (const el of Array.from(root.querySelectorAll<HTMLElement>('[data-plx]'))) {
    const kind = el.dataset.plx
    const target = kind === 'img' ? el.querySelector('img, video') ?? el : el
    const [from, to] = kind === 'img' ? [-12, 12] : kind === 'up' ? [8, -8] : [-8, 8]
    const tween = gsap.fromTo(
      target,
      { yPercent: from },
      {
        yPercent: to,
        ease: 'none',
        scrollTrigger: {
          trigger: el,
          start: 'top bottom',
          end: 'bottom top',
          scrub: 0.5,
        },
      }
    )
    if (tween.scrollTrigger) triggers.push(tween.scrollTrigger)
  }
  return () => {
    for (const t of triggers) t.kill()
  }
}

// ── Theme switching for fixed chrome ────────────────────────────────────────
// Sections declare data-bg="dark" | "light"; fixed UI (header, ruler) gets
// `.on-dark` while a dark section passes beneath its centre line.
export function wireThemeSwap(root: HTMLElement | Document = document): () => void {
  const fixed = Array.from(document.querySelectorAll<HTMLElement>('[data-themed]'))
  const sections = Array.from(root.querySelectorAll<HTMLElement>('[data-bg="light"]'))
  if (!fixed.length || !sections.length) return () => {}

  // Stateless by design: on every tick, an element is dark iff any dark
  // section's rect covers its centre line RIGHT NOW. The event-pair version
  // (onEnter/onLeave counting) desynced on large programmatic jumps — rects
  // cannot desync, because they carry no history.
  const recompute = () => {
    for (const el of fixed) {
      const r = el.getBoundingClientRect()
      const centre = r.top + r.height / 2
      const dark = sections.some((sec) => {
        const sr = sec.getBoundingClientRect()
        return sr.top <= centre && sr.bottom >= centre
      })
      el.classList.toggle('on-light', dark)
    }
  }

  // Driven by the ticker, not by scroll events: somewhere between Lenis and
  // ScrollTrigger a lone programmatic jump's event gets swallowed, and a
  // header that is illegible until the next wiggle is not acceptable. A
  // scroll-position guard keeps the layout reads off the hot path when
  // nothing is moving.
  let lastY = -1
  let settleFrames = 0
  const tick = () => {
    const y = window.scrollY
    if (y !== lastY) {
      lastY = y
      settleFrames = 3 // keep checking briefly after movement stops
      recompute()
    } else if (settleFrames > 0) {
      settleFrames--
      recompute()
    }
  }
  gsap.ticker.add(tick)
  window.addEventListener('resize', recompute)
  recompute()

  return () => {
    gsap.ticker.remove(tick)
    window.removeEventListener('resize', recompute)
    for (const el of fixed) el.classList.remove('on-light')
  }
}

export { gsap, ScrollTrigger, SplitText }
