import type { ComponentProps } from 'react'
import { cva } from 'class-variance-authority'
import type { VariantProps } from 'class-variance-authority'
import { cn, focusRing } from '../../lib/cn'

const button = cva(
  `flex h-[51px] w-full cursor-pointer items-center justify-center gap-2 rounded-lg text-lg font-semibold transition hover:brightness-90 disabled:cursor-not-allowed disabled:opacity-60 ${focusRing}`,
  {
    variants: {
      variant: {
        solid: 'bg-accent text-card',
        outline: 'border border-accent text-accent',
      },
    },
    defaultVariants: { variant: 'solid' },
  },
)

type ButtonProps = ComponentProps<'button'> & VariantProps<typeof button>

export function Button({
  type = 'button',
  variant,
  className,
  children,
  ...props
}: ButtonProps) {
  return (
    <button type={type} className={cn(button({ variant }), className)} {...props}>
      {children}
    </button>
  )
}
