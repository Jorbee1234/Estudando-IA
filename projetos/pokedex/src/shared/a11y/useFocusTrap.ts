import { useEffect, type RefObject } from 'react'

const FOCUSABLE =
  'a[href],button:not([disabled]),input:not([disabled]),select:not([disabled]),textarea:not([disabled]),[tabindex]:not([tabindex="-1"])'

/**
 * Diálogo modal acessível: move o foco ao abrir, prende o Tab dentro do container,
 * fecha com ESC e devolve o foco ao elemento que abriu (WCAG 2.1.2 / 2.4.3).
 */
export function useFocusTrap(ref: RefObject<HTMLElement | null>, onEscape: () => void) {
  useEffect(() => {
    const container = ref.current
    if (!container) return
    const opener = document.activeElement as HTMLElement | null
    const focusables = () => Array.from(container.querySelectorAll<HTMLElement>(FOCUSABLE))

    ;(focusables()[0] ?? container).focus()

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.stopPropagation()
        onEscape()
        return
      }
      if (event.key !== 'Tab') return
      const items = focusables()
      if (items.length === 0) {
        event.preventDefault()
        return
      }
      const first = items[0]
      const last = items[items.length - 1]
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault()
        last.focus()
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault()
        first.focus()
      } else if (!container.contains(document.activeElement)) {
        event.preventDefault()
        first.focus()
      }
    }

    document.addEventListener('keydown', onKeyDown)
    return () => {
      document.removeEventListener('keydown', onKeyDown)
      if (opener && document.contains(opener)) opener.focus()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ref])
}
