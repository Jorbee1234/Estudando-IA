import type { ComponentProps } from 'react'
import { Label } from '../atoms/Label'
import { Textarea } from '../atoms/Textarea'

type TextareaFieldProps = ComponentProps<'textarea'> & {
  id: string
  label: string
}

export function TextareaField({ id, label, ...textareaProps }: TextareaFieldProps) {
  return (
    <div className="flex flex-col gap-2">
      <Label htmlFor={id}>{label}</Label>
      <Textarea id={id} {...textareaProps} />
    </div>
  )
}
