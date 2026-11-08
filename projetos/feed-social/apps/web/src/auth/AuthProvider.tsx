import { useCallback, useEffect, useMemo, useState } from 'react'
import type { ReactNode } from 'react'
import { clearToken, getToken, setToken } from '../lib/authStorage'
import * as authService from '../services/authService'
import type { User } from '../services/authService'
import { AuthContext } from './AuthContext'
import type { AuthContextValue } from './AuthContext'

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(() => getToken() !== null)

  useEffect(() => {
    if (!getToken()) return
    let cancelled = false
    authService
      .getCurrentUser()
      .then((current) => {
        if (!cancelled) setUser(current)
      })
      .catch(() => {
        clearToken()
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [])

  const login = useCallback<AuthContextValue['login']>(
    async (credentials, remember) => {
      const { accessToken } = await authService.login(credentials)
      setToken(accessToken, remember)
      setUser(await authService.getCurrentUser())
    },
    [],
  )

  const signup = useCallback<AuthContextValue['signup']>(
    async (data, remember) => {
      await authService.signup(data)
      await login({ email: data.email, password: data.password }, remember)
    },
    [login],
  )

  const logout = useCallback(() => {
    clearToken()
    setUser(null)
  }, [])

  const value = useMemo(
    () => ({ user, loading, login, signup, logout }),
    [user, loading, login, signup, logout],
  )

  return <AuthContext value={value}>{children}</AuthContext>
}
