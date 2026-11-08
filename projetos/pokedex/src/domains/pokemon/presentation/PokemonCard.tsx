import type { CSSProperties } from 'react'
import { motion, useMotionValue, useSpring, useTransform } from 'framer-motion'
import { Link, type To } from 'react-router-dom'
import { useMotionPreference } from '@/shared/hooks/MotionPreferenceProvider'
import { padId, titleCase } from '@/shared/lib/format'
import { PokeballLoader } from '@/shared/ui/PokeballLoader'
import { TypeBadge, typeTheme } from '@/domains/type'
import { useAccent, useShiny } from '@/domains/theme'
import { pickSprite, primaryType, type Pokemon } from '../domain/pokemon'
import styles from './PokemonCard.module.scss'

interface Props {
  pokemon: Pokemon
  to: To
  onIntent?: (id: number) => void
}

export function PokemonCard({ pokemon, to, onIntent }: Props) {
  const { shiny } = useShiny()
  const { reduced } = useMotionPreference()
  const { setHover } = useAccent()

  const type = primaryType(pokemon)
  const color = type ? typeTheme(type).color : undefined
  const src = pickSprite(pokemon.sprites, { shiny })

  // Efeito tilt 3D seguindo o ponteiro (desligado com "reduzir animações").
  const px = useMotionValue(0)
  const py = useMotionValue(0)
  const rotateX = useSpring(useTransform(py, [-0.5, 0.5], [8, -8]), { stiffness: 200, damping: 20 })
  const rotateY = useSpring(useTransform(px, [-0.5, 0.5], [-8, 8]), { stiffness: 200, damping: 20 })

  const enter = () => {
    if (color) setHover(color)
    onIntent?.(pokemon.id)
  }
  const leave = () => {
    setHover(null)
    px.set(0)
    py.set(0)
  }

  return (
    <motion.div
      className={styles.tilt}
      style={reduced ? undefined : { rotateX, rotateY, transformPerspective: 800 }}
      whileHover={reduced ? undefined : { scale: 1.04 }}
      transition={{ type: 'spring', stiffness: 300, damping: 22 }}
      onPointerMove={(e) => {
        if (reduced) return
        const rect = e.currentTarget.getBoundingClientRect()
        px.set((e.clientX - rect.left) / rect.width - 0.5)
        py.set((e.clientY - rect.top) / rect.height - 0.5)
      }}
    >
      <Link
        to={to}
        className={styles.card}
        style={{ '--card-color': color } as CSSProperties}
        onPointerEnter={enter}
        onFocus={enter}
        onPointerLeave={leave}
        onBlur={leave}
      >
        <span className={styles.number}>{padId(pokemon.id)}</span>
        {src ? (
          // alt vazio: o nome do Pokémon já está no texto do link logo abaixo.
          <motion.img
            layoutId={`art-${pokemon.id}`}
            src={src}
            alt=""
            width={475}
            height={475}
            loading="lazy"
            className={styles.image}
          />
        ) : (
          <span className={styles.image}>
            <PokeballLoader size={72} />
          </span>
        )}
        <span className={styles.name} lang="en">
          {titleCase(pokemon.name)}
        </span>
        <span className={styles.types}>
          {pokemon.types.map((t) => (
            <TypeBadge key={t} type={t} />
          ))}
        </span>
      </Link>
    </motion.div>
  )
}

/** Mesmo layout do card real — troca sem layout shift. */
export function PokemonCardSkeleton() {
  return (
    <div className={`${styles.card} ${styles.skeleton}`}>
      <span className={styles.number}>#····</span>
      <span className={styles.image}>
        <PokeballLoader size={72} />
      </span>
      <span className={styles.name}>&nbsp;</span>
      <span className={styles.types}>&nbsp;</span>
    </div>
  )
}
