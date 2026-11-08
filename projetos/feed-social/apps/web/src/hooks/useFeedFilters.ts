import { useCallback, useEffect, useRef, useState } from 'react'
import { useSearchParams } from 'react-router'
import type { PostSort } from '../services/postService'

const SEARCH_DEBOUNCE_MS = 300

export type FeedFilters = { q: string; tags: string[]; sort: PostSort }

export function useFeedFilters() {
  const [params, setParams] = useSearchParams()

  const q = params.get('q') ?? ''
  const tags = params.getAll('tags')
  const sort: PostSort = params.get('sort') === 'popular' ? 'popular' : 'recent'

  const [searchText, setSearchTextState] = useState(q)
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined)

  useEffect(() => () => clearTimeout(timer.current), [])

  const update = useCallback(
    (change: (next: URLSearchParams) => void) =>
      setParams(
        (current) => {
          const next = new URLSearchParams(current)
          change(next)
          return next
        },
        { replace: true },
      ),
    [setParams],
  )

  const setSearchText = useCallback(
    (value: string) => {
      setSearchTextState(value)
      clearTimeout(timer.current)
      timer.current = setTimeout(() => {
        update((next) => {
          if (value.trim()) next.set('q', value.trim())
          else next.delete('q')
        })
      }, SEARCH_DEBOUNCE_MS)
    },
    [update],
  )

  const addTag = useCallback(
    (tag: string) =>
      update((next) => {
        if (!next.getAll('tags').includes(tag)) next.append('tags', tag)
      }),
    [update],
  )

  const removeTag = useCallback(
    (tag: string) =>
      update((next) => {
        const remaining = next.getAll('tags').filter((t) => t !== tag)
        next.delete('tags')
        remaining.forEach((t) => next.append('tags', t))
      }),
    [update],
  )

  const setSort = useCallback(
    (value: PostSort) =>
      update((next) => {
        if (value === 'popular') next.set('sort', value)
        else next.delete('sort')
      }),
    [update],
  )

  const clear = useCallback(() => {
    clearTimeout(timer.current)
    setSearchTextState('')
    update((next) => {
      next.delete('q')
      next.delete('tags')
    })
  }, [update])

  const filters: FeedFilters = { q, tags, sort }
  return { filters, searchText, setSearchText, addTag, removeTag, setSort, clear }
}
