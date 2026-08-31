import Link from 'next/link'

/**
 * The real 6Homes lockup.
 *
 * The brand pack only ships a vertical lockup and a mark-only PNG, neither of
 * which works in a 64px header — so scripts/split-logo.mjs splits the official
 * vector into its mark and wordmark, and they are set side by side here. It is
 * the actual artwork, not a redrawn approximation.
 *
 * The wordmark carries its fill inside the SVG and cannot inherit currentColor,
 * so `tone` picks a real white asset rather than trying to recolour one.
 */
export default function Wordmark({
  className = '',
  size = 'md',
  tone = 'colour',
}: {
  className?: string
  size?: 'sm' | 'md' | 'lg'
  tone?: 'colour' | 'white'
}) {
  // Heights in px for the wordmark; the mark is set proportionally larger since
  // its artwork is square and would otherwise read smaller than the type.
  const sizes = {
    sm: { word: 14, mark: 24 },
    md: { word: 17, mark: 29 },
    lg: { word: 24, mark: 41 },
  }[size]

  const suffix = tone === 'white' ? '-white' : ''

  return (
    <Link href="/" className={`inline-flex items-center gap-2.5 ${className}`} aria-label="6Homes — home">
      {/* eslint-disable-next-line @next/next/no-img-element -- a static SVG; next/image adds nothing */}
      <img src={`/brand/mark${suffix}.svg`} alt="" width={sizes.mark} height={sizes.mark} style={{ height: sizes.mark }} />
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={`/brand/wordmark${suffix}.svg`}
        alt="6Homes"
        height={sizes.word}
        style={{ height: sizes.word, width: 'auto' }}
      />
    </Link>
  )
}
