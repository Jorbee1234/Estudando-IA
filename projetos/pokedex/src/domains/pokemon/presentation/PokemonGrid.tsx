import type { To } from 'react-router-dom'
import { config } from '@/shared/config'
import { useInView } from '@/shared/hooks/useInView'
import { t } from '@/shared/i18n/pt-BR'
import { DataList } from '@/shared/ui/DataList'
import { QueryState } from '@/shared/ui/QueryState'
import { usePokemonCatalog, usePrefetchPokemon } from '../application/queries'
import type { Pokemon, PokemonFilters } from '../domain/pokemon'
import { PokemonCard, PokemonCardSkeleton } from './PokemonCard'
import styles from './PokemonGrid.module.scss'

interface Props {
  filters: PokemonFilters
  hrefFor: (id: number) => To
}

export function PokemonGrid({ filters, hrefFor }: Props) {
  const catalog = usePokemonCatalog(filters)
  const prefetch = usePrefetchPokemon()
  const loadMore = () => {
    if (catalog.hasNextPage && !catalog.isFetchingNextPage) void catalog.fetchNextPage()
  }
  const sentinel = useInView(loadMore)

  const query = {
    data: catalog.isPending || catalog.isError ? undefined : catalog.items,
    isPending: catalog.isPending,
    isError: catalog.isError,
    refetch: catalog.refetch,
  }

  return (
    <QueryState<Pokemon[]>
      query={query}
      skeleton={
        <DataList
          className={styles.grid}
          items={[]}
          getKey={() => 0}
          renderItem={() => null}
          skeletonCount={config.pageSize}
          renderSkeleton={() => <PokemonCardSkeleton />}
        />
      }
      isEmpty={(items) => items.length === 0}
      empty={t.list.empty}
    >
      {(items) => (
        <div aria-busy={catalog.isFetchingNextPage || catalog.isRefetching}>
          <p role="status" className={styles.count}>
            {t.list.count(items.length, catalog.total)}
          </p>
          <DataList
            className={styles.grid}
            aria-label={t.list.title}
            items={items}
            getKey={(p) => p.id}
            renderItem={(p) => <PokemonCard pokemon={p} to={hrefFor(p.id)} onIntent={prefetch} />}
            skeletonCount={catalog.isFetchingNextPage ? config.pageSize : 0}
            renderSkeleton={() => <PokemonCardSkeleton />}
          />
          {catalog.hasNextPage && (
            <div className={styles.more}>
              {/* key força reobservar após cada página (sentinela pode continuar visível em telas altas) */}
              <div ref={sentinel} key={items.length} aria-hidden="true" />
              <button type="button" className={styles.button} onClick={loadMore} disabled={catalog.isFetchingNextPage}>
                {catalog.isFetchingNextPage ? t.list.loadingMore : t.list.loadMore}
              </button>
            </div>
          )}
        </div>
      )}
    </QueryState>
  )
}
