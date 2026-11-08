import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import { readStored, writeStored } from '@/shared/lib/storage'

interface ShinyContextValue {
  shiny: boolean
  toggleShiny: () => void
}

const Ctx = createContext<ShinyContextValue | null>(null)
const STORAGE_KEY = 'pokedex:shiny'

export function ShinyProvider({ children }: { children: ReactNode }) {
  const [shiny, setShiny] = useState(() => readStored(STORAGE_KEY) === 'true')

  useEffect(() => {
    if (shiny) document.documentElement.dataset.theme = 'shiny'
    else delete document.documentElement.dataset.theme
  }, [shiny])

  const toggleShiny = useCallback(() => {
    setShiny((s) => {
      writeStored(STORAGE_KEY, String(!s))
      return !s
    })
  }, [])

  const value = useMemo(() => ({ shiny, toggleShiny }), [shiny, toggleShiny])
  return <Ctx value={value}>{children}</Ctx>
}

export function useShiny(): ShinyContextValue {
  const ctx = useContext(Ctx)
  if (!ctx) throw new Error('useShiny precisa de <ShinyProvider>')
  return ctx
}
