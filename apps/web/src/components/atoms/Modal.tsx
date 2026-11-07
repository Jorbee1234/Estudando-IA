import { useEffect, useId, useRef } from 'react'
import type { ReactNode } from 'react'
import { Icon } from './Icon'

type ModalProps = {
  open: boolean
  onClose: () => void
  title: string
  children: ReactNode
}

export function Modal({ open, onClose, title, children }: ModalProps) {
  const ref = useRef<HTMLDialogElement>(null)
  const titleId = useId()

  useEffect(() => {
    const dialog = ref.current
    if (!dialog) return
    if (open && !dialog.open) {
      if (typeof dialog.showModal === 'function') dialog.showModal()
      else dialog.setAttribute('open', '')
    } else if (!open && dialog.open) {
      if (typeof dialog.close === 'function') dialog.close()
      else dialog.removeAttribute('open')
    }
  }, [open])

  return (
    <dialog
      ref={ref}
      aria-labelledby={titleId}
      onClose={onClose}
      onClick={(event) => {
        if (event.target === event.currentTarget) onClose()
      }}
      className="m-auto max-h-[90svh] w-[calc(100%-2rem)] max-w-[520px] overflow-y-auto rounded-[32px] border border-black bg-card p-8 text-content backdrop:bg-black/70"
    >
      {open && (
        <>
          <div className="flex items-start justify-between gap-4">
            <h2 id={titleId} className="text-[31px] leading-normal font-semibold">
              {title}
            </h2>
            <button
              type="button"
              onClick={onClose}
              aria-label="Fechar"
              className="cursor-pointer rounded p-1 text-field hover:text-content focus-visible:outline-2 focus-visible:outline-accent"
            >
              <Icon name="close" className="size-6" />
            </button>
          </div>
          <div className="mt-6">{children}</div>
        </>
      )}
    </dialog>
  )
}
