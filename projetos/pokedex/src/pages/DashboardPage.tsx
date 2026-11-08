import { AnimatePresence } from 'framer-motion'
import { Navigate, useLocation, useMatch, useNavigate, type To } from 'react-router-dom'
import { t } from '@/shared/i18n/pt-BR'
import { PokemonDrawer, PokemonGrid } from '@/domains/pokemon'
import { AppHeader } from './AppHeader'
import styles from './DashboardPage.module.scss'
import { useCatalogFilters } from './useCatalogFilters'

export function DashboardPage() {
  const location = useLocation()
  const navigate = useNavigate()
  const match = useMatch('/pokemon/:id')
  const catalog = useCatalogFilters()

  const openId = match ? Number(match.params.id) : null
  const drawerOpen = openId !== null && Number.isInteger(openId) && openId > 0

  // Mantém os filtros (?q=&type=&gen=) ao abrir/fechar o drawer.
  const hrefFor = (id: number): To => ({ pathname: `/pokemon/${id}`, search: location.search })
  const close = () => navigate({ pathname: '/', search: location.search })

  if (match && !drawerOpen) return <Navigate to="/" replace />

  return (
    <>
      <a href="#main" className={styles.skip}>
        {t.skipToContent}
      </a>
      {/* `inert` remove o fundo da árvore de foco/leitores enquanto o diálogo modal está aberto. */}
      <div className={styles.page} inert={drawerOpen}>
        <AppHeader
          input={catalog.input}
          onInput={catalog.setInput}
          type={catalog.filters.type}
          onType={catalog.setType}
          generation={catalog.filters.generation}
          onGeneration={catalog.setGeneration}
          hasFilters={catalog.hasFilters}
          onClear={catalog.clear}
        />
        <main id="main" tabIndex={-1}>
          <PokemonGrid filters={catalog.filters} hrefFor={hrefFor} />
        </main>
      </div>
      <AnimatePresence>
        {drawerOpen && <PokemonDrawer key="drawer" id={openId} onClose={close} hrefFor={hrefFor} />}
      </AnimatePresence>
    </>
  )
}
