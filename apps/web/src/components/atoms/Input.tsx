import type { ComponentProps } from 'react'
import { cn } from '../../lib/cn'
import { fieldStyles } from './fieldStyles'

export function Input({ className, ...props }: ComponentProps<'input'>) {
  return <input className={cn(fieldStyles, className)} {...props} />
}
