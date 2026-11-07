import { useCallback, useEffect, useState } from 'react'
import { getApiErrorMessage } from '../lib/api'
import { createComment, listComments } from '../services/postService'
import type { PostComment } from '../services/postService'

export function useComments(postId: string) {
  const [comments, setComments] = useState<PostComment[]>([])
  const [nextCursor, setNextCursor] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string>()

  useEffect(() => {
    let ignore = false
    listComments(postId)
      .then((page) => {
        if (ignore) return
        setComments(page.items)
        setNextCursor(page.nextCursor)
      })
      .catch((err: unknown) => {
        if (!ignore) setError(getApiErrorMessage(err))
      })
      .finally(() => {
        if (!ignore) setLoading(false)
      })
    return () => {
      ignore = true
    }
  }, [postId])

  const loadMore = useCallback(async () => {
    if (!nextCursor) return
    setLoading(true)
    try {
      const page = await listComments(postId, nextCursor)
      setComments((current) => [...current, ...page.items])
      setNextCursor(page.nextCursor)
    } catch (err) {
      setError(getApiErrorMessage(err))
    }
    setLoading(false)
  }, [postId, nextCursor])

  const add = useCallback(
    async (body: string) => {
      setSubmitting(true)
      setError(undefined)
      try {
        const comment = await createComment(postId, body)
        setComments((current) => [comment, ...current])
        return true
      } catch (err) {
        setError(getApiErrorMessage(err))
        return false
      } finally {
        setSubmitting(false)
      }
    },
    [postId],
  )

  return { comments, loading, hasMore: nextCursor !== null, loadMore, add, submitting, error }
}
