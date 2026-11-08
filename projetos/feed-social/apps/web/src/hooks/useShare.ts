import { useCallback, useEffect, useRef, useState } from 'react'
import type { Post } from '../services/postService'

const NOTICE_MS = 3000

export function useShare() {
  const [notice, setNotice] = useState<string>()
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined)

  useEffect(() => () => clearTimeout(timer.current), [])

  const share = useCallback(async (post: Post) => {
    let message = 'Link copiado!'
    try {
      await navigator.clipboard.writeText(`${window.location.origin}/posts/${post.id}`)
    } catch {
      message = 'Não foi possível copiar o link.'
    }
    setNotice(message)
    clearTimeout(timer.current)
    timer.current = setTimeout(() => setNotice(undefined), NOTICE_MS)
  }, [])

  return { notice, share }
}
