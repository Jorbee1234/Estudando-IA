import { createContext, useContext } from 'react'
import type { Credentials, NewUser, User } from '../services/authService'

export type AuthContextValue = {
  user: User | null
  loading: boolean
  login: (data: Credentials, remember: boolean) => Promise<void>
  signup: (data: NewUser, remember: boolean) => Promise<void>
  logout: () => void
}

export const AuthContext = createContext<AuthContextValue | null>(null)

export function useAuth() {
  const value = useContext(AuthContext)
  if (!value) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return value
}
