import { cva } from 'class-variance-authority'
import { focusRing } from '../../lib/cn'
import { Icon } from './Icon'

const tag = cva(
  'inline-flex items-center gap-2.5 rounded px-2 py-1 text-lg leading-normal text-card',
  {
    variants: {
      variant: {
        card: 'bg-muted',
        filter: `cursor-pointer bg-muted hover:brightness-90 ${focusRing}`,
        selected: `cursor-pointer bg-field hover:brightness-90 ${focusRing}`,
      },
    },
    defaultVariants: { variant: 'card' },
  },
)

type TagProps = {
  children: string
  variant?: 'card' | 'filter' | 'selected'
  onClick?: () => void
}

export function Tag({ children, variant = 'card', onClick }: TagProps) {
  const className = tag({ variant })

  if (variant === 'card') {
    return <span className={className}>{children}</span>
  }

  if (variant === 'filter') {
    return (
      <button type="button" onClick={onClick} className={className}>
        {children}
      </button>
    )
  }

  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={`Remover filtro ${children}`}
      className={className}
    >
      {children}
      <Icon name="close" className="size-[15px]" />
    </button>
  )
}
