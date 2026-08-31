import { useEffect, useRef, useState } from 'react'

/**
 * Draw-your-signature pad. Pointer events cover mouse, trackpad, touch and
 * stylus in one code path, which matters because most people sign a contract on
 * a phone.
 *
 * Calls onChange(dataUri | null) — null once cleared, so the parent can disable
 * its submit button without reaching into the canvas.
 */
export default function SignatureCanvas({ onChange, height = 170 }) {
  const canvasRef = useRef(null)
  const drawing = useRef(false)
  const last = useRef(null)
  const [hasInk, setHasInk] = useState(false)

  // Size the backing store to the device pixel ratio, or the stroke looks like
  // it was drawn with a crayon on a retina screen.
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const resize = () => {
      const ratio = window.devicePixelRatio || 1
      const { width } = canvas.getBoundingClientRect()
      canvas.width = width * ratio
      canvas.height = height * ratio
      const ctx = canvas.getContext('2d')
      ctx.scale(ratio, ratio)
      ctx.lineWidth = 2
      ctx.lineCap = 'round'
      ctx.lineJoin = 'round'
      ctx.strokeStyle = '#16242C'
    }

    resize()
    window.addEventListener('resize', resize)
    return () => window.removeEventListener('resize', resize)
  }, [height])

  const pointFrom = (e) => {
    const rect = canvasRef.current.getBoundingClientRect()
    return { x: e.clientX - rect.left, y: e.clientY - rect.top }
  }

  const start = (e) => {
    e.preventDefault()
    canvasRef.current.setPointerCapture(e.pointerId)
    drawing.current = true
    last.current = pointFrom(e)
  }

  const move = (e) => {
    if (!drawing.current) return
    e.preventDefault()
    const ctx = canvasRef.current.getContext('2d')
    const p = pointFrom(e)
    ctx.beginPath()
    ctx.moveTo(last.current.x, last.current.y)
    ctx.lineTo(p.x, p.y)
    ctx.stroke()
    last.current = p
    if (!hasInk) setHasInk(true)
  }

  const end = (e) => {
    if (!drawing.current) return
    drawing.current = false
    try { canvasRef.current.releasePointerCapture(e.pointerId) } catch { /* already released */ }
    onChange?.(canvasRef.current.toDataURL('image/png'))
  }

  const clear = () => {
    const canvas = canvasRef.current
    canvas.getContext('2d').clearRect(0, 0, canvas.width, canvas.height)
    setHasInk(false)
    onChange?.(null)
  }

  return (
    <div>
      <div className="relative rounded-md border border-hair bg-white">
        <canvas
          ref={canvasRef}
          style={{ height, touchAction: 'none' }}
          className="w-full cursor-crosshair rounded-md"
          onPointerDown={start}
          onPointerMove={move}
          onPointerUp={end}
          onPointerCancel={end}
          onPointerLeave={end}
        />
        {!hasInk && (
          <span className="pointer-events-none absolute inset-0 grid place-items-center text-sm text-mute/60">
            Sign here
          </span>
        )}
        <div className="pointer-events-none absolute right-6 bottom-8 left-6 border-b border-dashed border-hair" />
      </div>
      <div className="mt-2 flex items-center justify-between">
        <span className="text-xs text-mute">Draw your signature with a finger, stylus or mouse.</span>
        <button type="button" onClick={clear} className="text-xs text-brand-600 hover:underline" disabled={!hasInk}>
          Clear
        </button>
      </div>
    </div>
  )
}
