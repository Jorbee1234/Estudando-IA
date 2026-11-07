import type { ComponentProps } from 'react'

export function Input(props: ComponentProps<'input'>) {
  return (
    <input
      className="w-full rounded bg-field px-4 py-2 text-[15px] leading-normal text-page outline-none placeholder:text-page/80 focus-visible:ring-2 focus-visible:ring-accent"
      {...props}
    />
  )
}
