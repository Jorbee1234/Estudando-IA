import type { ReactNode } from 'react'
import { cva } from 'class-variance-authority'
import { focusRing } from '../../lib/cn'

const tab = cva(`cursor-pointer px-1 text-[22px] leading-normal ${focusRing}`, {
  variants: {
    active: {
      true: 'font-semibold text-accent underline',
      false: 'text-field hover:text-muted',
    },
  },
})

type TabProps = {
  active: boolean
  onClick: () => void
  children: ReactNode
}

export function Tab({ active, onClick, children }: TabProps) {
  return (
    <button
      type="button"
      role="tab"
      aria-selected={active}
      onClick={onClick}
      className={tab({ active })}
    >
      {children}
    </button>
  )
}
