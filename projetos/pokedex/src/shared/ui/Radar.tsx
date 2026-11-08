import { useEffect } from 'react'
import { animate, motion, useMotionValue, useTransform } from 'framer-motion'
import { useMotionPreference } from '@/shared/hooks/MotionPreferenceProvider'

export interface RadarDatum {
  key: string
  label: string
  value: number
  max: number
}

const SIZE = 260
const CENTER = SIZE / 2
const RADIUS = 86
const RINGS = [0.25, 0.5, 0.75, 1]

const point = (index: number, total: number, ratio: number) => {
  const angle = (Math.PI * 2 * index) / total - Math.PI / 2
  return [CENTER + Math.cos(angle) * RADIUS * ratio, CENTER + Math.sin(angle) * RADIUS * ratio] as const
}

/**
 * Gráfico radar genérico. Decorativo para leitores de tela (`role="img"` + resumo),
 * pois os mesmos valores aparecem como texto nas barras ao lado.
 */
export function Radar({ data, summary }: { data: readonly RadarDatum[]; summary: string }) {
  const { reduced } = useMotionPreference()
  const progress = useMotionValue(reduced ? 1 : 0)

  useEffect(() => {
    if (reduced) {
      progress.set(1)
      return
    }
    const controls = animate(progress, 1, { duration: 0.8, ease: 'easeOut' })
    return () => controls.stop()
  }, [progress, reduced])

  const points = useTransform(progress, (p) =>
    data.map((d, i) => point(i, data.length, Math.min(1, d.value / d.max) * p).join(',')).join(' '),
  )

  if (data.length < 3) return null

  return (
    <svg viewBox={`0 0 ${SIZE} ${SIZE}`} role="img" aria-label={summary} style={{ width: '100%', maxWidth: 300 }}>
      {RINGS.map((r) => (
        <polygon
          key={r}
          points={data.map((_, i) => point(i, data.length, r).join(',')).join(' ')}
          fill="none"
          stroke="var(--border)"
          strokeWidth="1"
        />
      ))}
      {data.map((d, i) => {
        const [x, y] = point(i, data.length, 1)
        const [lx, ly] = point(i, data.length, 1.2)
        return (
          <g key={d.key} aria-hidden="true">
            <line x1={CENTER} y1={CENTER} x2={x} y2={y} stroke="var(--border)" strokeWidth="1" />
            <text x={lx} y={ly} fill="var(--text-muted)" fontSize="11" textAnchor="middle" dominantBaseline="middle">
              {d.label}
            </text>
          </g>
        )
      })}
      <motion.polygon
        points={points}
        fill="var(--accent)"
        fillOpacity="0.35"
        stroke="var(--accent)"
        strokeWidth="2.5"
        strokeLinejoin="round"
      />
    </svg>
  )
}
