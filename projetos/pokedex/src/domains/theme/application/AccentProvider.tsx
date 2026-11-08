import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'

interface AccentContextValue {
  setHover: (color: string | null) => void
  setSelected: (color: string | null) => void
}

const Ctx = createContext<AccentContextValue | null>(null)

/**
 * Cor de destaque adaptativa: vem do tipo primário do Pokémon sob hover ou aberto no drawer.
 * Aplicada como `--accent` na raiz; a transição suave é feita via @property no CSS.
 */
export function AccentProvider({ children }: { children: ReactNode }) {
  const [hover, setHover] = useState<string | null>(null)
  const [selected, setSelected] = useState<string | null>(null)
  const color = hover ?? selected

  useEffect(() => {
    const root = document.documentElement
    if (color) root.style.setProperty('--accent', color)
    else root.style.removeProperty('--accent')
  }, [color])

  const value = useMemo(() => ({ setHover, setSelected }), [])
  return <Ctx value={value}>{children}</Ctx>
}

export function useAccent(): AccentContextValue {
  const ctx = useContext(Ctx)
  if (!ctx) throw new Error('useAccent precisa de <AccentProvider>')
  return ctx
}
