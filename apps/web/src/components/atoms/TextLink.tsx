import type { ComponentProps } from 'react'
import { Link } from 'react-router'

const variants = {
  underline: 'text-[15px] underline',
  accent: 'min-h-9 text-lg text-accent [&_svg]:size-6',
}

type TextLinkProps = Omit<ComponentProps<typeof Link>, 'to'> & {
  href: string
  variant?: keyof typeof variants
}

export function TextLink({
  href,
  variant = 'underline',
  children,
  ...props
}: TextLinkProps) {
  return (
    <Link
      to={href}
      className={`inline-flex items-center gap-3 hover:brightness-125 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent ${variants[variant]}`}
      {...props}
    >
      {children}
    </Link>
  )
}
