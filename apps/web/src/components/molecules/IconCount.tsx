import { cva } from 'class-variance-authority'
import { focusRing } from '../../lib/cn'
import { Icon } from '../atoms/Icon'
import type { IconName } from '../atoms/Icon'

const iconCount = cva(
  `flex cursor-pointer flex-col items-center rounded text-[15px] leading-normal hover:brightness-125 ${focusRing}`,
  {
    variants: {
      pressed: { true: 'text-accent', false: 'text-field' },
    },
  },
)

type IconCountProps = {
  icon: IconName
  label: string
  count?: number
  pressed?: boolean
  onClick: () => void
}

export function IconCount({ icon, label, count, pressed, onClick }: IconCountProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={pressed}
      aria-label={count === undefined ? label : `${label} ${count}`}
      className={iconCount({ pressed: !!pressed })}
    >
      <Icon name={icon} className="size-6" />
      {count !== undefined && <span aria-hidden="true">{count}</span>}
    </button>
  )
}
