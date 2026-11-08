import { useEffect } from 'react'

/** Atualiza o título do documento (WCAG 2.4.2) e restaura ao desmontar. */
export function useDocumentTitle(title: string | null | undefined) {
  useEffect(() => {
    if (!title) return
    const previous = document.title
    document.title = title
    return () => {
      document.title = previous
    }
  }, [title])
}
