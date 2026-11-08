import type { ReactNode } from 'react'

interface Props<T> {
  items: readonly T[]
  getKey: (item: T) => string | number
  renderItem: (item: T, index: number) => ReactNode
  /** Quantidade de skeletons exibidos ao final enquanto carrega mais itens. */
  skeletonCount?: number
  renderSkeleton?: (index: number) => ReactNode
  className?: string
  itemClassName?: string
  'aria-label'?: string
  'aria-labelledby'?: string
}

/** Lista genérica: o que aparece é totalmente definido pelos dados recebidos. */
export function DataList<T>({
  items,
  getKey,
  renderItem,
  skeletonCount = 0,
  renderSkeleton,
  className,
  itemClassName,
  ...aria
}: Props<T>) {
  return (
    <ul className={className} {...aria}>
      {items.map((item, i) => (
        <li key={getKey(item)} className={itemClassName}>
          {renderItem(item, i)}
        </li>
      ))}
      {renderSkeleton &&
        Array.from({ length: skeletonCount }, (_, i) => (
          <li key={`skeleton-${i}`} className={itemClassName} aria-hidden="true">
            {renderSkeleton(i)}
          </li>
        ))}
    </ul>
  )
}
