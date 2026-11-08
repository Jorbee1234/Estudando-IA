import type { CSSProperties } from 'react'
import { typeLabel } from '@/shared/i18n/pt-BR'
import { readableOn } from '@/shared/lib/color'
import { typeTheme } from '../domain/typeTheme'
import styles from './TypeBadge.module.scss'

/** O tipo é sempre comunicado por texto + ícone, nunca só pela cor (WCAG 1.4.1). */
export function TypeBadge({ type }: { type: string }) {
  const { color, icon } = typeTheme(type)
  return (
    <span
      className={styles.badge}
      style={{ '--badge-bg': color, '--badge-text': readableOn(color) } as CSSProperties}
    >
      <span aria-hidden="true">{icon}</span>
      {typeLabel(type)}
    </span>
  )
}
