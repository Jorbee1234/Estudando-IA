import { useId } from 'react'
import { useMotionPreference } from '@/shared/hooks/MotionPreferenceProvider'
import { useSound } from '@/shared/hooks/SoundProvider'
import { t } from '@/shared/i18n/pt-BR'
import { GenerationFilter } from '@/domains/generation'
import { useShiny } from '@/domains/theme'
import { TypeFilter } from '@/domains/type'
import styles from './AppHeader.module.scss'

interface Props {
  input: string
  onInput: (value: string) => void
  type: string | null
  onType: (value: string | null) => void
  generation: string | null
  onGeneration: (value: string | null) => void
  hasFilters: boolean
  onClear: () => void
}

export function AppHeader(props: Props) {
  const searchId = useId()
  const { shiny, toggleShiny } = useShiny()
  const { muted, toggleMuted } = useSound()
  const { manual, toggleManual } = useMotionPreference()

  return (
    <header className={styles.header}>
      <div className={styles.top}>
        <h1 className={styles.title}>{t.appTitle}</h1>
        <div role="group" aria-label={t.settings.group} className={styles.settings}>
          <button type="button" className={styles.toggle} aria-pressed={shiny} onClick={toggleShiny}>
            <span aria-hidden="true">✨</span> {t.settings.shiny}
          </button>
          <button type="button" className={styles.toggle} aria-pressed={!muted} onClick={toggleMuted}>
            <span aria-hidden="true">{muted ? '🔇' : '🔊'}</span> {muted ? t.settings.soundOff : t.settings.soundOn}
          </button>
          <button type="button" className={styles.toggle} aria-pressed={manual} onClick={toggleManual}>
            <span aria-hidden="true">🎞</span> {t.settings.motion}
          </button>
        </div>
      </div>

      <div role="search" className={styles.filters}>
        <div className={styles.searchField}>
          <label htmlFor={searchId} className={styles.label}>
            {t.search.label}
          </label>
          <input
            id={searchId}
            type="search"
            className={styles.search}
            value={props.input}
            placeholder={t.search.placeholder}
            autoComplete="off"
            onChange={(e) => props.onInput(e.target.value)}
          />
        </div>
        <GenerationFilter value={props.generation} onChange={props.onGeneration} />
        {props.hasFilters && (
          <button type="button" className={styles.clear} onClick={props.onClear}>
            {t.filters.clear}
          </button>
        )}
        <div className={styles.types}>
          <TypeFilter value={props.type} onChange={props.onType} />
        </div>
      </div>
    </header>
  )
}
