import type { ComponentProps } from 'react'
import { cn } from '../../lib/cn'
import { fieldStyles } from './fieldStyles'

export function Textarea({ className, ...props }: ComponentProps<'textarea'>) {
  return (
    <textarea
      className={cn(fieldStyles, 'min-h-28 resize-y', className)}
      {...props}
    />
  )
}
