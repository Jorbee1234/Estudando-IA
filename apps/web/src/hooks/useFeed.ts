import { useCallback, useEffect, useState } from 'react'
import { getApiErrorMessage } from '../lib/api'
import { likePost, listPosts, unlikePost } from '../services/postService'
import type { Post } from '../services/postService'
import type { FeedFilters } from './useFeedFilters'

export function useFeed(filters: FeedFilters, refreshKey = 0, authorId?: string) {
  const [posts, setPosts] = useState<Post[]>([])
  const [nextCursor, setNextCursor] = useState<string | null>(null)
  const [loadedKey, setLoadedKey] = useState<string>()
  const [failedKey, setFailedKey] = useState<{ key: string; message: string }>()
  const [loadingMore, setLoadingMore] = useState(false)
  const [actionError, setActionError] = useState<string>()

  const { q, sort } = filters
  const tagsKey = filters.tags.join('\n')
  const requestKey = JSON.stringify([q, tagsKey, sort, refreshKey, authorId])

  useEffect(() => {
    const request = { obsolete: false }

    listPosts({ q, tags: tagsKey ? tagsKey.split('\n') : [], sort, authorId })
      .then((page) => {
        if (request.obsolete) return
        setPosts(page.items)
        setNextCursor(page.nextCursor)
        setLoadedKey(requestKey)
      })
      .catch((err: unknown) => {
        if (request.obsolete) return
        setFailedKey({ key: requestKey, message: getApiErrorMessage(err) })
      })

    return () => {
      request.obsolete = true
    }
  }, [q, tagsKey, sort, authorId, requestKey])

  const loading = loadedKey !== requestKey && failedKey?.key !== requestKey
  const error = failedKey?.key === requestKey ? failedKey.message : undefined

  const loadMore = useCallback(async () => {
    if (!nextCursor || loadingMore) return
    setLoadingMore(true)
    try {
      const page = await listPosts({
        q,
        tags: tagsKey ? tagsKey.split('\n') : [],
        sort,
        authorId,
        cursor: nextCursor,
      })
      setPosts((current) => [...current, ...page.items])
      setNextCursor(page.nextCursor)
    } catch (err) {
      setActionError(getApiErrorMessage(err))
    }
    setLoadingMore(false)
  }, [nextCursor, loadingMore, q, tagsKey, sort, authorId])

  const patchPost = useCallback(
    (id: string, change: (post: Post) => Post) =>
      setPosts((current) => current.map((p) => (p.id === id ? change(p) : p))),
    [],
  )

  const toggleLike = useCallback(
    async (post: Post) => {
      const flip = (p: Post): Post => ({
        ...p,
        likedByMe: !p.likedByMe,
        likesCount: p.likesCount + (p.likedByMe ? -1 : 1),
      })
      setActionError(undefined)
      patchPost(post.id, flip)
      try {
        await (post.likedByMe ? unlikePost(post.id) : likePost(post.id))
      } catch (err) {
        patchPost(post.id, flip)
        setActionError(getApiErrorMessage(err))
      }
    },
    [patchPost],
  )

  const addComment = useCallback(
    (id: string) =>
      patchPost(id, (p) => ({ ...p, commentsCount: p.commentsCount + 1 })),
    [patchPost],
  )

  return {
    posts,
    loading,
    loadingMore,
    error,
    actionError,
    hasMore: nextCursor !== null,
    loadMore,
    toggleLike,
    addComment,
  }
}
