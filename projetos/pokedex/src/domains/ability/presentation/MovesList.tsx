import { useMemo, useState } from 'react'
import { config } from '@/shared/config'
import { methodLabel, t } from '@/shared/i18n/pt-BR'
import { titleCase } from '@/shared/lib/format'
import { DataList } from '@/shared/ui/DataList'
import { FilterChips, type ChipOption } from '@/shared/ui/FilterChips'
import styles from './MovesList.module.scss'

interface Move {
  name: string
  method: string
  level: number
}

/** Lista de golpes filtrável por método; as opções de filtro vêm dos próprios dados. */
export function MovesList({ moves }: { moves: readonly Move[] }) {
  const [method, setMethod] = useState<string | null>(null)
  const [limit, setLimit] = useState<number>(config.movesPageSize)

  const options = useMemo<ChipOption<string>[]>(() => {
    const counts = new Map<string, number>()
    moves.forEach((m) => counts.set(m.method, (counts.get(m.method) ?? 0) + 1))
    return [...counts].map(([value, count]) => ({ value, label: `${methodLabel(value)} (${count})` }))
  }, [moves])

  const visible = useMemo(
    () =>
      moves
        .filter((m) => !method || m.method === method)
        .sort((a, b) => a.level - b.level || a.name.localeCompare(b.name)),
    [moves, method],
  )

  if (moves.length === 0) return <p className={styles.empty}>{t.drawer.noMoves}</p>

  return (
    <div className={styles.wrap}>
      <FilterChips
        legend={t.drawer.moves}
        options={options}
        value={method}
        onChange={(v) => {
          setMethod(v)
          setLimit(config.movesPageSize)
        }}
      />
      <DataList
        className={styles.list}
        itemClassName={styles.item}
        items={visible.slice(0, limit)}
        getKey={(m) => `${m.name}-${m.method}`}
        renderItem={(m) => (
          <>
            <span lang="en">{titleCase(m.name)}</span>
            <span className={styles.meta}>
              {methodLabel(m.method)}
              {m.method === 'level-up' && ` · ${t.drawer.level(m.level)}`}
            </span>
          </>
        )}
      />
      {limit < visible.length && (
        <button type="button" className={styles.more} onClick={() => setLimit((l) => l + config.movesPageSize)}>
          {t.drawer.showMoreMoves}
        </button>
      )}
    </div>
  )
}
