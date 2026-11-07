import type { ComponentProps } from 'react'

const variants = {
  underline: 'text-[15px] underline',
  accent: 'text-lg text-accent',
}

type TextLinkProps = ComponentProps<'a'> & {
  variant?: keyof typeof variants
}

export function TextLink({
  variant = 'underline',
  children,
  ...props
}: TextLinkProps) {
  return (
    <a
      className={`inline-flex items-center gap-3 hover:brightness-125 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent ${variants[variant]}`}
      {...props}
    >
      {children}
    </a>
  )
}
