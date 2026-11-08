import { useEffect, useRef } from 'react'
import { useMotionPreference } from '@/shared/hooks/MotionPreferenceProvider'
import { useShiny } from '@/domains/theme/application/ShinyProvider'

interface Particle {
  x: number
  y: number
  r: number
  speed: number
  drift: number
  phase: number
}

const COUNT = 36

/** Partículas douradas suaves (sem flashes) — só no modo Shiny e sem preferência de reduzir movimento. */
export function GoldenParticles() {
  const { shiny } = useShiny()
  const { reduced } = useMotionPreference()
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const active = shiny && !reduced

  useEffect(() => {
    const canvas = canvasRef.current
    if (!active || !canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const resize = () => {
      canvas.width = window.innerWidth
      canvas.height = window.innerHeight
    }
    resize()
    window.addEventListener('resize', resize)

    const particles: Particle[] = Array.from({ length: COUNT }, () => ({
      x: Math.random() * canvas.width,
      y: Math.random() * canvas.height,
      r: 1 + Math.random() * 2.5,
      speed: 0.2 + Math.random() * 0.6,
      drift: 0.3 + Math.random() * 0.8,
      phase: Math.random() * Math.PI * 2,
    }))

    let frame = 0
    let raf = 0
    const tick = () => {
      frame += 1
      ctx.clearRect(0, 0, canvas.width, canvas.height)
      for (const p of particles) {
        p.y -= p.speed
        p.x += Math.sin(frame / 60 + p.phase) * p.drift * 0.4
        if (p.y < -10) {
          p.y = canvas.height + 10
          p.x = Math.random() * canvas.width
        }
        const alpha = 0.35 + 0.25 * Math.sin(frame / 90 + p.phase)
        ctx.beginPath()
        ctx.fillStyle = `rgba(255, 205, 70, ${alpha})`
        ctx.shadowColor = 'rgba(255, 205, 70, 0.8)'
        ctx.shadowBlur = 8
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2)
        ctx.fill()
      }
      raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)

    return () => {
      cancelAnimationFrame(raf)
      window.removeEventListener('resize', resize)
    }
  }, [active])

  if (!active) return null
  return (
    <canvas
      ref={canvasRef}
      aria-hidden="true"
      style={{ position: 'fixed', inset: 0, pointerEvents: 'none', zIndex: 5 }}
    />
  )
}
