import type { ComponentProps } from 'react'

export function Label({ children, ...props }: ComponentProps<'label'>) {
  return (
    <label className="text-lg" {...props}>
      {children}
    </label>
  )
}
