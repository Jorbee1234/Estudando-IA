import { Link } from 'react-router'
import { cva } from 'class-variance-authority'
import { focusRing } from '../../lib/cn'
import { Icon } from '../atoms/Icon'
import type { IconName } from '../atoms/Icon'

const navItem = cva(
  `flex flex-col items-center gap-2 rounded px-2 py-2 text-sm leading-normal lg:px-4 lg:text-[22px] ${focusRing}`,
  {
    variants: {
      active: { true: 'text-white', false: 'text-field' },
      disabled: {
        true: 'cursor-not-allowed opacity-60',
        false: 'cursor-pointer hover:text-white',
      },
    },
  },
)

type NavItemProps = {
  icon: IconName
  label: string
  active?: boolean
  href?: string
  onClick?: () => void
  disabled?: boolean
}

export function NavItem({ icon, label, active = false, href, onClick, disabled = false }: NavItemProps) {
  const className = navItem({ active, disabled })
  const content = (
    <>
      <Icon name={icon} className="size-6 lg:size-8" />
      {label}
    </>
  )

  if (href && !disabled) {
    return (
      <Link to={href} aria-current={active ? 'page' : undefined} className={className}>
        {content}
      </Link>
    )
  }

  return (
    <button type="button" onClick={onClick} disabled={disabled} className={className}>
      {content}
    </button>
  )
}
