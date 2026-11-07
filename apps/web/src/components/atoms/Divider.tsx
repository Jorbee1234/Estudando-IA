import type { ReactNode } from 'react'

type DividerProps = {
  children: ReactNode
}

export function Divider({ children }: DividerProps) {
  return (
    <div className="flex items-center gap-4 text-[15px]">
      <span className="h-px flex-1 bg-content/60" />
      <span>{children}</span>
      <span className="h-px flex-1 bg-content/60" />
    </div>
  )
}
