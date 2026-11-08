import type { CSSProperties, ReactNode } from 'react'
import { readableOn } from '@/shared/lib/color'
import styles from './FilterChips.module.scss'

export interface ChipOption<V extends string> {
  value: V
  label: ReactNode
  /** Cor de destaque opcional (hex). O texto é calculado para manter contraste AA. */
  color?: string
  /** Texto para leitores de tela quando `label` não for texto puro. */
  title?: string
}

interface Props<V extends string> {
  legend: string
  options: readonly ChipOption<V>[]
  value: V | null
  onChange: (value: V | null) => void
  /** Se true, clicar no chip selecionado limpa a seleção. */
  allowClear?: boolean
  hideLegend?: boolean
}

/** Seleção única em grupo de botões `aria-pressed`, gerada inteiramente a partir de `options`. */
export function FilterChips<V extends string>({ legend, options, value, onChange, allowClear = true, hideLegend }: Props<V>) {
  return (
    <fieldset className={styles.group}>
      <legend className={hideLegend ? 'sr-only' : styles.legend}>{legend}</legend>
      <div className={styles.chips}>
        {options.map((opt) => {
          const selected = opt.value === value
          const style = opt.color
            ? ({ '--chip-color': opt.color, '--chip-text': readableOn(opt.color) } as CSSProperties)
            : undefined
          return (
            <button
              key={opt.value}
              type="button"
              className={styles.chip}
              style={style}
              aria-pressed={selected}
              onClick={() => onChange(selected && allowClear ? null : opt.value)}
            >
              {opt.label}
            </button>
          )
        })}
      </div>
    </fieldset>
  )
}
