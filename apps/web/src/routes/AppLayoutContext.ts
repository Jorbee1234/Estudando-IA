import { createContext, useContext } from 'react'

export type AppLayoutContextValue = {
  requireAuth: (action: () => void | Promise<void>) => void
  feedVersion: number
  refreshFeed: () => void
}

export const AppLayoutContext = createContext<AppLayoutContextValue | null>(null)

export function useAppLayout() {
  const value = useContext(AppLayoutContext)
  if (!value) {
    throw new Error('useAppLayout must be used within AppLayout')
  }
  return value
}
