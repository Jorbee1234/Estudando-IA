import { motion } from 'framer-motion'
import { Link, type To } from 'react-router-dom'
import { t } from '@/shared/i18n/pt-BR'
import { titleCase } from '@/shared/lib/format'
import type { EvolutionCondition, EvolutionNode } from '../infrastructure/evolutionApi'
import styles from './EvolutionTimeline.module.scss'

interface Props {
  root: EvolutionNode
  currentId: number
  imageFor: (id: number) => string
  hrefFor: (id: number) => To
}

function describe(c: EvolutionCondition): string {
  const e = t.evolutionCondition
  switch (c.kind) {
    case 'level': return e.level(c.value)
    case 'item': return e.item(titleCase(c.value))
    case 'heldItem': return e.heldItem(titleCase(c.value))
    case 'time': return e.time(c.value)
    case 'move': return e.move(titleCase(c.value))
    case 'location': return e.location(titleCase(c.value))
    case 'happiness': return e.happiness
    case 'trade': return e.trade
    default: return e.other
  }
}

function Branch({ node, ...rest }: Props & { node: EvolutionNode }) {
  const { currentId, imageFor, hrefFor } = rest
  const isCurrent = node.id === currentId
  return (
    <li className={styles.branch}>
      <Link
        to={hrefFor(node.id)}
        replace
        className={styles.node}
        aria-current={isCurrent ? 'true' : undefined}
        data-current={isCurrent}
      >
        <motion.img
          layout
          src={imageFor(node.id)}
          alt=""
          width={96}
          height={96}
          loading="lazy"
          className={styles.image}
        />
        <span className={styles.name} lang="en">
          {titleCase(node.name)}
        </span>
        {isCurrent && <span className="sr-only"> ({t.drawer.currentForm})</span>}
      </Link>
      {node.children.length > 0 && (
        <ul className={styles.children}>
          {node.children.map((child) => (
            <li key={child.id} className={styles.step}>
              <span className={styles.arrow} aria-hidden="true">➔</span>
              <span className={styles.condition}>
                {child.conditions.length > 0 ? child.conditions.map(describe).join(' / ') : '—'}
              </span>
              <ul>
                <Branch node={child} {...rest} />
              </ul>
            </li>
          ))}
        </ul>
      )}
    </li>
  )
}

/** Linha do tempo recursiva: funciona para cadeias com 1, 3 ou várias ramificações (ex.: Eevee). */
export function EvolutionTimeline(props: Props) {
  if (props.root.children.length === 0) return <p className={styles.none}>{t.drawer.noEvolution}</p>
  return (
    <nav aria-label={t.drawer.evolution}>
      <ul className={styles.root}>
        <Branch node={props.root} {...props} />
      </ul>
    </nav>
  )
}
