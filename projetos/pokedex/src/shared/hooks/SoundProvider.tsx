import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { readStored, writeStored } from '@/shared/lib/storage'

type SfxName = 'click' | 'toggle'

interface SoundContextValue {
  muted: boolean
  toggleMuted: () => void
  play: (name: SfxName) => void
}

const SoundContext = createContext<SoundContextValue | null>(null)
const STORAGE_KEY = 'pokedex:muted'

/** Pequenos "bips" estilo menu de videogame sintetizados com Web Audio (sem arquivos). */
const SFX: Record<SfxName, Array<{ freq: number; at: number; dur: number }>> = {
  click: [{ freq: 880, at: 0, dur: 0.05 }, { freq: 1175, at: 0.05, dur: 0.06 }],
  toggle: [{ freq: 520, at: 0, dur: 0.07 }, { freq: 780, at: 0.07, dur: 0.09 }],
}

export function SoundProvider({ children }: { children: ReactNode }) {
  const [muted, setMuted] = useState(() => readStored(STORAGE_KEY) === 'true')
  const ctxRef = useRef<AudioContext | null>(null)

  const play = useCallback(
    (name: SfxName) => {
      if (muted) return
      try {
        ctxRef.current ??= new AudioContext()
        const ctx = ctxRef.current
        if (ctx.state === 'suspended') void ctx.resume()
        const now = ctx.currentTime
        for (const note of SFX[name]) {
          const osc = ctx.createOscillator()
          const gain = ctx.createGain()
          osc.type = 'square'
          osc.frequency.value = note.freq
          gain.gain.setValueAtTime(0.04, now + note.at)
          gain.gain.exponentialRampToValueAtTime(0.0001, now + note.at + note.dur)
          osc.connect(gain).connect(ctx.destination)
          osc.start(now + note.at)
          osc.stop(now + note.at + note.dur)
        }
      } catch {
        /* áudio indisponível: ignora */
      }
    },
    [muted],
  )

  const toggleMuted = useCallback(() => {
    setMuted((m) => {
      writeStored(STORAGE_KEY, String(!m))
      return !m
    })
  }, [])

  // Um único listener delegado: qualquer botão/link/aba emite o clique de menu.
  useEffect(() => {
    const onClick = (event: MouseEvent) => {
      const target = event.target as Element | null
      if (target?.closest('button,a[href],[role="tab"],select') && !target.closest('[data-silent]')) play('click')
    }
    document.addEventListener('click', onClick)
    return () => document.removeEventListener('click', onClick)
  }, [play])

  const value = useMemo(() => ({ muted, toggleMuted, play }), [muted, toggleMuted, play])
  return <SoundContext value={value}>{children}</SoundContext>
}

export function useSound(): SoundContextValue {
  const ctx = useContext(SoundContext)
  if (!ctx) throw new Error('useSound precisa de <SoundProvider>')
  return ctx
}
