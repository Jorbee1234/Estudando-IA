import type { ComponentProps } from 'react'

export function Input(props: ComponentProps<'input'>) {
  return (
    <input
      className="h-10 w-full rounded bg-field px-4 text-[15px] text-page outline-none placeholder:text-page/80 focus-visible:ring-2 focus-visible:ring-accent"
      {...props}
    />
  )
}
