import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { config } from '@/shared/config'
import { useDebounce } from '@/shared/hooks/useDebounce'
import type { PokemonFilters } from '@/domains/pokemon'

/** Filtros vivem na URL (?q=&type=&gen=): compartilháveis, com botão voltar funcional e persistentes ao abrir o drawer. */
export function useCatalogFilters() {
  const [params, setParams] = useSearchParams()
  const q = params.get('q') ?? ''
  const type = params.get('type')
  const generation = params.get('gen')

  const [input, setInput] = useState(q)
  const debounced = useDebounce(input, config.searchDebounceMs)

  // O updater funcional do React Router usa o snapshot do último render; atualizações em
  // sequência rápida (ex.: limpar busca + escolher tipo) se sobrescreveriam. A ref guarda o
  // estado mais recente já solicitado.
  const latest = useRef(params)
  const paramsKey = params.toString()
  useEffect(() => {
    latest.current = new URLSearchParams(paramsKey)
  }, [paramsKey])

  const update = useCallback(
    (patch: Record<string, string | null>) => {
      const next = new URLSearchParams(latest.current)
      for (const [key, value] of Object.entries(patch)) {
        if (value) next.set(key, value)
        else next.delete(key)
      }
      latest.current = next
      setParams(next, { replace: true })
    },
    [setParams],
  )

  useEffect(() => {
    if (debounced.trim() !== q) update({ q: debounced.trim() || null })
    // só reage ao valor debounced digitado pelo usuário
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debounced])

  const filters = useMemo<PokemonFilters>(() => ({ q, type, generation }), [q, type, generation])
  const hasFilters = !!(q || type || generation || input)

  return {
    filters,
    input,
    setInput,
    setType: (value: string | null) => update({ type: value }),
    setGeneration: (value: string | null) => update({ gen: value }),
    clear: () => {
      setInput('')
      update({ q: null, type: null, gen: null })
    },
    hasFilters,
  }
}
