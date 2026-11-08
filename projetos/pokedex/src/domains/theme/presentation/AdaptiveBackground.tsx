import styles from './AdaptiveBackground.module.scss'

/** Fundo decorativo: o brilho segue `--accent` (tipo do Pokémon em foco), com transição via @property. */
export function AdaptiveBackground() {
  return <div className={styles.bg} aria-hidden="true" />
}
