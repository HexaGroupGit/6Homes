/**
 * Drifting cloud layers — the reference site's mechanic rebuilt from scratch
 * with cloud plates extracted from the client's own Kinsfolk sky photography
 * (scripts/make-clouds.mjs).
 *
 * Pure CSS: each layer is a track of four copies of one translucent strip on
 * a linear keyframe; -50% of a four-copy track is exactly two copies, so the
 * loop never shows a seam. Every second copy is flipped vertically so the
 * repeat doesn't read as a repeat. Layer speeds differ purely by duration.
 * No JS, no scroll coupling — weather, not choreography.
 */
const LAYERS = [
  { img: '/media/clouds-1.webp', h: 220, drift: '110s', top: '-2%', opacity: 0.9 },
  { img: '/media/clouds-2.webp', h: 300, drift: '80s', top: '10%', opacity: 0.75 },
  { img: '/media/clouds-3.webp', h: 380, drift: '58s', top: '-6%', opacity: 0.6 },
]

export default function Clouds({ className = '' }: { className?: string }) {
  return (
    <div aria-hidden className={`pointer-events-none absolute inset-x-0 top-0 ${className}`}>
      {LAYERS.map((layer) => (
        <div
          key={layer.img}
          className="marquee absolute right-0 left-0"
          style={{ top: layer.top, opacity: layer.opacity }}
        >
          <div
            className="marquee-track"
            style={{ '--drift': layer.drift, '--cloud-h': `${layer.h}px` } as React.CSSProperties}
          >
            {[0, 1, 2, 3].map((i) => (
              // eslint-disable-next-line @next/next/no-img-element
              <img key={i} src={layer.img} alt="" loading="lazy" />
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}
