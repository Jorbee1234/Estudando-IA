import { useId, useRef, useState, type KeyboardEvent, type ReactNode } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import styles from './Tabs.module.scss'

export interface TabConfig {
  id: string
  label: string
  render: () => ReactNode
}

interface Props {
  tabs: readonly TabConfig[]
  label: string
  initialId?: string
}

/** Abas config-driven seguindo o padrão WAI-ARIA Tabs (setas, Home/End). */
export function Tabs({ tabs, label, initialId }: Props) {
  const base = useId()
  const [activeId, setActiveId] = useState(initialId ?? tabs[0]?.id)
  const refs = useRef<Record<string, HTMLButtonElement | null>>({})

  const move = (event: KeyboardEvent, index: number) => {
    const last = tabs.length - 1
    const next =
      event.key === 'ArrowRight' ? (index + 1) % tabs.length
      : event.key === 'ArrowLeft' ? (index - 1 + tabs.length) % tabs.length
      : event.key === 'Home' ? 0
      : event.key === 'End' ? last
      : null
    if (next === null) return
    event.preventDefault()
    const target = tabs[next]
    setActiveId(target.id)
    refs.current[target.id]?.focus()
  }

  const active = tabs.find((tab) => tab.id === activeId) ?? tabs[0]
  if (!active) return null

  return (
    <div>
      <div role="tablist" aria-label={label} className={styles.list}>
        {tabs.map((tab, i) => {
          const selected = tab.id === active.id
          return (
            <button
              key={tab.id}
              ref={(el) => {
                refs.current[tab.id] = el
              }}
              type="button"
              role="tab"
              id={`${base}-tab-${tab.id}`}
              aria-selected={selected}
              aria-controls={`${base}-panel-${tab.id}`}
              tabIndex={selected ? 0 : -1}
              className={styles.tab}
              onClick={() => setActiveId(tab.id)}
              onKeyDown={(e) => move(e, i)}
            >
              {tab.label}
              {selected && <motion.span layoutId={`${base}-indicator`} className={styles.indicator} />}
            </button>
          )
        })}
      </div>
      <AnimatePresence mode="wait" initial={false}>
        <motion.div
          key={active.id}
          role="tabpanel"
          id={`${base}-panel-${active.id}`}
          aria-labelledby={`${base}-tab-${active.id}`}
          tabIndex={0}
          className={styles.panel}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }}
          transition={{ duration: 0.18 }}
        >
          {active.render()}
        </motion.div>
      </AnimatePresence>
    </div>
  )
}
