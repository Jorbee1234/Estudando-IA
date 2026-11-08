import styles from './PokeballLoader.module.scss'

interface Props {
  /** Se true, anuncia "Carregando…" para leitores de tela (use uma vez por região). */
  announce?: boolean
  label?: string
  size?: number
}

/** Skeleton temático: Pokébola pulsando no lugar de caixas cinzas. */
export function PokeballLoader({ announce = false, label = 'Carregando…', size = 56 }: Props) {
  return (
    <span className={styles.wrap} {...(announce ? { role: 'status' } : { 'aria-hidden': true })}>
      <svg className={styles.ball} width={size} height={size} viewBox="0 0 64 64" aria-hidden="true" focusable="false">
        <circle cx="32" cy="32" r="29" fill="var(--surface-2)" stroke="currentColor" strokeWidth="4" />
        <path d="M3 32a29 29 0 0 1 58 0z" fill="currentColor" opacity="0.55" />
        <path d="M3 32h58" stroke="currentColor" strokeWidth="4" />
        <circle cx="32" cy="32" r="8" fill="var(--surface)" stroke="currentColor" strokeWidth="4" />
      </svg>
      {announce && <span className="sr-only">{label}</span>}
    </span>
  )
}
