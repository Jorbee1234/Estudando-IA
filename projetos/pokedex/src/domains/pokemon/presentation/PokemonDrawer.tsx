import { useEffect, useId, useRef, type CSSProperties, type ReactNode } from 'react'
import { motion } from 'framer-motion'
import type { To } from 'react-router-dom'
import { useFocusTrap } from '@/shared/a11y/useFocusTrap'
import { config, type TabId } from '@/shared/config'
import { useDocumentTitle } from '@/shared/hooks/useDocumentTitle'
import { generationLabel, statLabel, statShortLabel, t } from '@/shared/i18n/pt-BR'
import { decimeters, hectograms, padId, titleCase } from '@/shared/lib/format'
import { DataList } from '@/shared/ui/DataList'
import { PokeballLoader } from '@/shared/ui/PokeballLoader'
import { QueryState } from '@/shared/ui/QueryState'
import { Radar } from '@/shared/ui/Radar'
import { StatBars } from '@/shared/ui/StatBar'
import { Tabs, type TabConfig } from '@/shared/ui/Tabs'
import { AbilityCard, MovesList } from '@/domains/ability'
import { EvolutionTimeline, useEvolutionChain } from '@/domains/evolution'
import { useAccent, useShiny } from '@/domains/theme'
import { TypeBadge, typeTheme } from '@/domains/type'
import { usePokemon, useSpecies } from '../application/queries'
import { pickSprite, primaryType, type Pokemon } from '../domain/pokemon'
import { artworkShinyUrl, artworkUrl } from '../infrastructure/pokemonApi'
import { CryButton } from './CryButton'
import styles from './PokemonDrawer.module.scss'

interface Props {
  id: number
  onClose: () => void
  hrefFor: (id: number) => To
}

/** Diálogo modal acessível (focus trap, ESC, retorno de foco) com transição de elemento compartilhado. */
export function PokemonDrawer({ id, onClose, hrefFor }: Props) {
  const ref = useRef<HTMLDivElement>(null)
  const titleId = useId()
  const query = usePokemon(id)
  useFocusTrap(ref, onClose)

  return (
    <>
      <motion.div
        className={styles.backdrop}
        aria-hidden="true"
        onClick={onClose}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
      />
      <motion.div
        ref={ref}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
        className={styles.panel}
        // clip-path (e não translateX): transform em ancestral quebraria a medição do layoutId (shared element).
        initial={{ clipPath: 'inset(0 0 0 100%)', opacity: 0.4 }}
        animate={{ clipPath: 'inset(0 0 0 0%)', opacity: 1 }}
        exit={{ clipPath: 'inset(0 0 0 100%)', opacity: 0.4 }}
        transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
      >
        <button type="button" className={styles.close} onClick={onClose}>
          <span aria-hidden="true">✕</span>
          <span className="sr-only">{t.close}</span>
        </button>
        <QueryState
          query={query}
          errorMessage={t.drawer.notFound}
          skeleton={
            <div className={styles.skeleton}>
              <h2 id={titleId} className="sr-only">
                {t.loading}
              </h2>
              <PokeballLoader size={96} />
            </div>
          }
        >
          {(pokemon) => <DrawerContent pokemon={pokemon} titleId={titleId} hrefFor={hrefFor} />}
        </QueryState>
      </motion.div>
    </>
  )
}

function DrawerContent({ pokemon, titleId, hrefFor }: { pokemon: Pokemon; titleId: string; hrefFor: (id: number) => To }) {
  const { shiny } = useShiny()
  const { setSelected } = useAccent()
  const species = useSpecies(pokemon.id)
  const type = primaryType(pokemon)
  const name = titleCase(pokemon.name)
  const sprite = pickSprite(pokemon.sprites, { shiny, animated: true })

  useDocumentTitle(`${name} · ${t.appTitle}`)
  useEffect(() => {
    if (type) setSelected(typeTheme(type).color)
    return () => setSelected(null)
  }, [type, setSelected])

  const statData = pokemon.stats.map((s) => ({
    key: s.key,
    label: statLabel(s.key),
    value: s.value,
    max: config.statScaleMax,
  }))

  const renderers: Record<TabId, () => ReactNode> = {
    overview: () => (
      <div className={styles.section}>
        {species.data?.flavorText && (
          <p className={styles.flavor} lang="en">
            {species.data.flavorText}
          </p>
        )}
        <CryButton src={pokemon.cry} name={name} />
        <dl className={styles.facts}>
          <div><dt>{t.drawer.height}</dt><dd>{decimeters(pokemon.height)}</dd></div>
          <div><dt>{t.drawer.weight}</dt><dd>{hectograms(pokemon.weight)}</dd></div>
          {species.data?.generation && (
            <div><dt>{t.drawer.generation}</dt><dd>{generationLabel(species.data.generation)}</dd></div>
          )}
        </dl>
        <h3 className={styles.heading}>{t.drawer.stats}</h3>
        <div className={styles.stats}>
          <Radar
            data={pokemon.stats.map((s) => ({
              key: s.key,
              label: statShortLabel(s.key),
              value: s.value,
              max: config.statScaleMax,
            }))}
            summary={`${t.drawer.stats}: ${statData.map((d) => `${d.label} ${d.value}`).join(', ')}`}
          />
          <StatBars data={statData} />
        </div>
      </div>
    ),
    abilities: () => (
      <div className={styles.section}>
        <h3 className={styles.heading}>{t.drawer.abilities}</h3>
        <DataList
          className={styles.abilities}
          items={pokemon.abilities}
          getKey={(a) => a.name}
          renderItem={(a) => <AbilityCard name={a.name} isHidden={a.isHidden} />}
        />
        <MovesList moves={pokemon.moves} />
      </div>
    ),
    evolution: () => (
      <EvolutionTab speciesQuery={species} currentId={pokemon.id} shiny={shiny} hrefFor={hrefFor} />
    ),
  }

  const tabs: TabConfig[] = config.tabs.map((tab) => ({ id: tab, label: t.drawer.tabs[tab], render: renderers[tab] }))

  return (
    <div className={styles.content} style={{ '--drawer-accent': type ? typeTheme(type).color : undefined } as CSSProperties}>
      <header className={styles.hero}>
        {sprite && (
          <motion.img
            layoutId={`art-${pokemon.id}`}
            src={sprite}
            alt={t.drawer.spriteAlt(name, shiny)}
            width={475}
            height={475}
            className={styles.sprite}
          />
        )}
        <p className={styles.number}>{padId(pokemon.id)}</p>
        <h2 id={titleId} className={styles.title} lang="en">
          {name}
        </h2>
        {species.data?.genus && (
          <p className={styles.genus} lang="en">
            {species.data.genus}
          </p>
        )}
        <div className={styles.types}>
          {pokemon.types.map((tp) => (
            <TypeBadge key={tp} type={tp} />
          ))}
        </div>
      </header>
      <Tabs tabs={tabs} label={t.drawer.tabsLabel} />
    </div>
  )
}

interface EvolutionTabProps {
  speciesQuery: ReturnType<typeof useSpecies>
  currentId: number
  shiny: boolean
  hrefFor: (id: number) => To
}

function EvolutionTab({ speciesQuery, currentId, shiny, hrefFor }: EvolutionTabProps) {
  const chain = useEvolutionChain(speciesQuery.data?.evolutionChainId ?? null)
  const loading = <div className={styles.skeleton}><PokeballLoader /></div>

  return (
    <div className={styles.section}>
      <h3 className={styles.heading}>{t.drawer.evolution}</h3>
      <QueryState query={speciesQuery} skeleton={loading}>
        {(sp) =>
          sp.evolutionChainId === null ? (
            <p className={styles.genus}>{t.drawer.noEvolution}</p>
          ) : (
            <QueryState query={chain} skeleton={loading}>
              {(root) => (
                <EvolutionTimeline
                  root={root}
                  currentId={currentId}
                  imageFor={shiny ? artworkShinyUrl : artworkUrl}
                  hrefFor={hrefFor}
                />
              )}
            </QueryState>
          )
        }
      </QueryState>
    </div>
  )
}
