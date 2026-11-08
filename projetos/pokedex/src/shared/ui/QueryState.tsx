import type { ReactNode } from 'react'
import { t } from '@/shared/i18n/pt-BR'
import styles from './QueryState.module.scss'

/** Subconjunto do resultado do React Query — mantém o componente desacoplado da biblioteca. */
interface QueryLike<T> {
  data: T | undefined
  isPending: boolean
  isError: boolean
  error?: unknown
  refetch: () => unknown
}

interface Props<T> {
  query: QueryLike<T>
  /** Layout idêntico ao conteúdo final (evita layout shift). */
  skeleton: ReactNode
  isEmpty?: (data: T) => boolean
  empty?: ReactNode
  errorMessage?: string
  children: (data: T) => ReactNode
}

/** Fronteira assíncrona padrão: carregando → skeleton, erro → alerta com retry, vazio → mensagem. */
export function QueryState<T>({ query, skeleton, isEmpty, empty, errorMessage = t.genericError, children }: Props<T>) {
  if (query.isPending) {
    return (
      <div aria-busy="true">
        <span role="status" className="sr-only">
          {t.loading}
        </span>
        {skeleton}
      </div>
    )
  }
  if (query.isError || query.data === undefined) {
    return (
      <div role="alert" className={styles.error}>
        <p>{errorMessage}</p>
        <button type="button" className={styles.retry} onClick={() => void query.refetch()}>
          {t.retry}
        </button>
      </div>
    )
  }
  if (isEmpty?.(query.data)) return <p className={styles.empty}>{empty}</p>
  return <>{children(query.data)}</>
}
