import type { ComponentProps } from 'react'

export function Button({
  type = 'button',
  children,
  ...props
}: ComponentProps<'button'>) {
  return (
    <button
      type={type}
      className="flex h-[51px] w-full cursor-pointer items-center justify-center gap-2 rounded-lg bg-accent text-lg font-semibold text-card transition hover:brightness-90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent disabled:cursor-not-allowed disabled:opacity-60"
      {...props}
    >
      {children}
    </button>
  )
}
