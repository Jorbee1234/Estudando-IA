import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import { MotionConfig } from 'framer-motion'
import { readStored, writeStored } from '@/shared/lib/storage'

interface MotionPreference {
  /** true quando o usuário (sistema OU toggle manual) pediu menos movimento. */
  reduced: boolean
  manual: boolean
  toggleManual: () => void
}

const Ctx = createContext<MotionPreference | null>(null)
const STORAGE_KEY = 'pokedex:reduce-motion'
const QUERY = '(prefers-reduced-motion: reduce)'

export function MotionPreferenceProvider({ children }: { children: ReactNode }) {
  const [manual, setManual] = useState(() => readStored(STORAGE_KEY) === 'true')
  const [system, setSystem] = useState(() => (typeof matchMedia === 'function' ? matchMedia(QUERY).matches : false))

  useEffect(() => {
    if (typeof matchMedia !== 'function') return
    const mq = matchMedia(QUERY)
    const onChange = () => setSystem(mq.matches)
    mq.addEventListener('change', onChange)
    return () => mq.removeEventListener('change', onChange)
  }, [])

  useEffect(() => {
    document.documentElement.dataset.reduceMotion = String(manual)
  }, [manual])

  const toggleManual = useCallback(() => {
    setManual((m) => {
      writeStored(STORAGE_KEY, String(!m))
      return !m
    })
  }, [])

  const value = useMemo(() => ({ reduced: manual || system, manual, toggleManual }), [manual, system, toggleManual])
  return (
    <Ctx value={value}>
      <MotionConfig reducedMotion={manual ? 'always' : 'user'}>{children}</MotionConfig>
    </Ctx>
  )
}

export function useMotionPreference(): MotionPreference {
  const ctx = useContext(Ctx)
  if (!ctx) throw new Error('useMotionPreference precisa de <MotionPreferenceProvider>')
  return ctx
}
