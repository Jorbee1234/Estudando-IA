import type { ComponentProps } from 'react'
import { Link } from 'react-router'
import { cva } from 'class-variance-authority'
import type { VariantProps } from 'class-variance-authority'
import { cn, focusRing } from '../../lib/cn'

const textLink = cva(`inline-flex items-center gap-3 hover:brightness-125 ${focusRing}`, {
  variants: {
    variant: {
      underline: 'text-[15px] underline',
      accent: 'min-h-9 text-lg text-accent [&_svg]:size-6',
    },
  },
  defaultVariants: { variant: 'underline' },
})

type TextLinkProps = Omit<ComponentProps<typeof Link>, 'to'> &
  VariantProps<typeof textLink> & {
    href: string
  }

export function TextLink({
  href,
  variant,
  className,
  children,
  ...props
}: TextLinkProps) {
  return (
    <Link
      to={href}
      className={cn(textLink({ variant }), typeof className === 'string' && className)}
      {...props}
    >
      {children}
    </Link>
  )
}
