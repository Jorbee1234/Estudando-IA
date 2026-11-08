import { useEffect, useId, useState, type ReactNode } from 'react'
import styles from './Tooltip.module.scss'

interface Props {
  content: ReactNode
  children: ReactNode
  className?: string
}

/**
 * Tooltip acessível (WCAG 1.4.13): aparece em hover E foco, é "hoverable",
 * persiste até sair/desfocar e fecha com ESC.
 */
export function Tooltip({ content, children, className }: Props) {
  const id = useId()
  const [hovered, setHovered] = useState(false)
  const [focused, setFocused] = useState(false)
  const [dismissed, setDismissed] = useState(false)
  const open = (hovered || focused) && !dismissed

  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.stopPropagation()
        setDismissed(true)
      }
    }
    document.addEventListener('keydown', onKey, true)
    return () => document.removeEventListener('keydown', onKey, true)
  }, [open])

  return (
    <span
      className={`${styles.wrap} ${className ?? ''}`}
      onMouseEnter={() => {
        setHovered(true)
        setDismissed(false)
      }}
      onMouseLeave={() => setHovered(false)}
      onFocus={() => {
        setFocused(true)
        setDismissed(false)
      }}
      onBlur={() => setFocused(false)}
    >
      {/* oxlint-disable-next-line jsx-a11y/no-noninteractive-tabindex -- precisa de foco para exibir o tooltip por teclado (WCAG 1.4.13) */}
      <span aria-describedby={id} tabIndex={0} className={styles.trigger}>
        {children}
      </span>
      <span role="tooltip" id={id} className={styles.tip} data-open={open}>
        {content}
      </span>
    </span>
  )
}
