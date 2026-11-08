import { motion } from 'framer-motion'
import { t } from '@/shared/i18n/pt-BR'
import { titleCase } from '@/shared/lib/format'
import { Tooltip } from '@/shared/ui/Tooltip'
import { QueryState } from '@/shared/ui/QueryState'
import { useAbility } from '../application/useAbility'
import styles from './AbilityCard.module.scss'

interface Props {
  name: string
  isHidden: boolean
}

/** Card de habilidade; o efeito completo aparece no tooltip (hover e foco). */
export function AbilityCard({ name, isHidden }: Props) {
  const query = useAbility(name)
  return (
    <motion.div layout initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}>
      <QueryState query={query} skeleton={<div className={styles.card} style={{ minHeight: '5rem' }} />}>
        {(ability) => (
          <Tooltip content={<span lang="en">{ability.effect ?? ability.shortEffect}</span>}>
            <div className={styles.card}>
              <p className={styles.title}>
                <span lang="en">{titleCase(name)}</span>
                {isHidden && <span className={styles.hidden}>{t.drawer.hidden}</span>}
              </p>
              <p className={styles.effect} lang="en">
                {ability.shortEffect}
              </p>
            </div>
          </Tooltip>
        )}
      </QueryState>
    </motion.div>
  )
}
