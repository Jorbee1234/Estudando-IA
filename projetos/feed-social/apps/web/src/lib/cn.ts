import { clsx } from 'clsx'
import type { ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

export const focusRing =
  'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}
