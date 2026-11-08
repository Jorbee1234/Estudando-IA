import { useEffect, useRef, useState } from 'react'
import { t } from '@/shared/i18n/pt-BR'
import styles from './CryButton.module.scss'

/** Toca o grito oficial. Nunca toca sozinho; o botão tem rótulo e estado textual. */
export function CryButton({ src, name }: { src: string | null; name: string }) {
  const [playing, setPlaying] = useState(false)
  const audioRef = useRef<HTMLAudioElement | null>(null)

  useEffect(() => () => audioRef.current?.pause(), [])

  const play = () => {
    if (!src) return
    audioRef.current?.pause()
    const audio = new Audio(src)
    audio.volume = 0.6
    audio.onended = () => setPlaying(false)
    audio.onerror = () => setPlaying(false)
    audioRef.current = audio
    setPlaying(true)
    audio.play().catch(() => setPlaying(false))
  }

  return (
    <div>
      <button
        type="button"
        className={styles.button}
        onClick={play}
        disabled={!src}
        data-silent // evita sobrepor o bip de menu ao grito
        data-playing={playing}
        aria-label={src ? t.drawer.playCry(name) : t.drawer.noCry}
      >
        <span className={styles.icon} aria-hidden="true">🔊</span>
        <span className={styles.wave} aria-hidden="true">
          {[0, 1, 2, 3, 4].map((i) => (
            <span key={i} style={{ animationDelay: `${i * 0.12}s` }} />
          ))}
        </span>
      </button>
      <span role="status" className="sr-only">
        {playing ? t.drawer.cryPlaying : ''}
      </span>
    </div>
  )
}
