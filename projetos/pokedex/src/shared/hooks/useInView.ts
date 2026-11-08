import { useCallback, useEffect, useRef } from 'react'

/** Chama `onEnter` quando o elemento-sentinela entra na viewport (scroll infinito). */
export function useInView(onEnter: () => void, rootMargin = '400px') {
  const callback = useRef(onEnter)
  useEffect(() => {
    callback.current = onEnter
  })

  const observer = useRef<IntersectionObserver | null>(null)
  return useCallback(
    (node: Element | null) => {
      observer.current?.disconnect()
      if (!node || typeof IntersectionObserver === 'undefined') return
      observer.current = new IntersectionObserver(
        (entries) => {
          if (entries.some((e) => e.isIntersecting)) callback.current()
        },
        { rootMargin },
      )
      observer.current.observe(node)
    },
    [rootMargin],
  )
}
