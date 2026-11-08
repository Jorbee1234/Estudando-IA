import { beforeEach, describe, expect, it } from 'vitest'
import { clearToken, getToken, setToken } from './authStorage'

describe('authStorage', () => {
  beforeEach(() => {
    localStorage.clear()
    sessionStorage.clear()
  })

  it('persists in localStorage when remembered', () => {
    setToken('abc', true)

    expect(localStorage.getItem('accessToken')).toBe('abc')
    expect(sessionStorage.getItem('accessToken')).toBeNull()
    expect(getToken()).toBe('abc')
  })

  it('uses sessionStorage when not remembered, replacing an older token', () => {
    setToken('old', true)
    setToken('new', false)

    expect(localStorage.getItem('accessToken')).toBeNull()
    expect(getToken()).toBe('new')
  })

  it('clears the token', () => {
    setToken('abc', false)
    clearToken()

    expect(getToken()).toBeNull()
  })
})
