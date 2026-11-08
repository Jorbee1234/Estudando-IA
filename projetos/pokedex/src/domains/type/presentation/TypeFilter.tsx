import { t, typeLabel } from '@/shared/i18n/pt-BR'
import { FilterChips, type ChipOption } from '@/shared/ui/FilterChips'
import { useTypes } from '../application/useTypes'
import { typeTheme } from '../domain/typeTheme'

interface Props {
  value: string | null
  onChange: (type: string | null) => void
}

/** Chips gerados a partir de GET /type — nenhuma lista fixa de tipos. */
export function TypeFilter({ value, onChange }: Props) {
  const { data } = useTypes()
  if (!data) return null
  const options: ChipOption<string>[] = data.map((name) => {
    const { color, icon } = typeTheme(name)
    return {
      value: name,
      color,
      label: (
        <>
          <span aria-hidden="true">{icon}</span>
          {typeLabel(name)}
        </>
      ),
    }
  })
  return <FilterChips legend={t.filters.type} options={options} value={value} onChange={onChange} />
}
