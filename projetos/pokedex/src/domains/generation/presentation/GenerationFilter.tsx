import { useId } from 'react'
import { generationLabel, t } from '@/shared/i18n/pt-BR'
import { useGenerations } from '../application/useGenerations'
import styles from './GenerationFilter.module.scss'

interface Props {
  value: string | null
  onChange: (generation: string | null) => void
}

/** <select> nativo (acessível por padrão) com opções vindas de GET /generation. */
export function GenerationFilter({ value, onChange }: Props) {
  const id = useId()
  const { data } = useGenerations()
  return (
    <div className={styles.field}>
      <label htmlFor={id} className={styles.label}>
        {t.filters.generation}
      </label>
      <select
        id={id}
        className={styles.select}
        value={value ?? ''}
        onChange={(e) => onChange(e.target.value || null)}
        disabled={!data}
      >
        <option value="">{t.filters.allGenerations}</option>
        {data?.map((g) => (
          <option key={g.id} value={g.name}>
            {generationLabel(g.name)}
          </option>
        ))}
      </select>
    </div>
  )
}
