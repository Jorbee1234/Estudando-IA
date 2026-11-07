import type { ComponentProps } from 'react'
import { Checkbox } from '../atoms/Checkbox'

type CheckboxFieldProps = ComponentProps<typeof Checkbox> & {
  label: string
}

export function CheckboxField({ label, ...checkboxProps }: CheckboxFieldProps) {
  return (
    <label className="flex cursor-pointer items-center gap-2 text-[15px] text-content/60">
      <Checkbox {...checkboxProps} />
      {label}
    </label>
  )
}
