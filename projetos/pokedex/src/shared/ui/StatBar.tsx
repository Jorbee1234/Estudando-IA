import { motion } from 'framer-motion'
import styles from './StatBar.module.scss'

export interface StatDatum {
  key: string
  label: string
  value: number
  max: number
}

/** Barras que "enchem" ao montar. O valor é texto real e exposto via role="meter". */
export function StatBars({ data }: { data: readonly StatDatum[] }) {
  return (
    <ul className={styles.list}>
      {data.map((d, i) => (
        <li key={d.key} className={styles.row}>
          <span className={styles.label} id={`stat-${d.key}`}>
            {d.label}
          </span>
          <span className={styles.value}>{d.value}</span>
          <span
            className={styles.track}
            role="meter"
            aria-labelledby={`stat-${d.key}`}
            aria-valuemin={0}
            aria-valuemax={d.max}
            aria-valuenow={d.value}
            aria-valuetext={`${d.value} de ${d.max}`}
          >
            <motion.span
              className={styles.fill}
              initial={{ width: 0 }}
              animate={{ width: `${Math.min(100, (d.value / d.max) * 100)}%` }}
              transition={{ duration: 0.7, delay: i * 0.05, ease: 'easeOut' }}
            />
          </span>
        </li>
      ))}
    </ul>
  )
}
