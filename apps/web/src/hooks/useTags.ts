import { useEffect, useState } from 'react'
import { listTags } from '../services/postService'
import type { Tag } from '../services/postService'

export function useTags() {
  const [tags, setTags] = useState<Tag[]>([])

  useEffect(() => {
    let ignore = false
    listTags()
      .then((result) => {
        if (!ignore) setTags(result)
      })
      .catch(() => {})
    return () => {
      ignore = true
    }
  }, [])

  return tags
}
