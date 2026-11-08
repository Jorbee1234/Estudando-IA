import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { getToken, setToken } from '../lib/authStorage'
import * as authService from '../services/authService'
import { useAuth } from './AuthContext'
import { AuthProvider } from './AuthProvider'
import { RequireAuth } from './RequireAuth'

vi.mock('../services/authService')

const ana = { id: '1', name: 'Ana', email: 'ana@example.com', links: [] }

function Probe() {
  const { user, login, signup, logout } = useAuth()
  return (
    <>
      <p>{user ? `user:${user.name}` : 'anonymous'}</p>
      <button onClick={() => login({ email: 'a', password: 'b' }, false)}>
        login
      </button>
      <button onClick={() => signup({ name: 'Ana', email: 'a', password: 'b' }, true)}>
        signup
      </button>
      <button onClick={logout}>logout</button>
    </>
  )
}

function renderProvider() {
  render(
    <AuthProvider>
      <Probe />
    </AuthProvider>,
  )
}

describe('AuthProvider', () => {
  beforeEach(() => {
    vi.resetAllMocks()
    localStorage.clear()
    sessionStorage.clear()
    vi.mocked(authService.login).mockResolvedValue({
      accessToken: 'tok',
      tokenType: 'Bearer',
      expiresIn: 60,
      links: [],
    })
    vi.mocked(authService.getCurrentUser).mockResolvedValue(ana)
    vi.mocked(authService.signup).mockResolvedValue(ana)
  })

  it('logs in, stores the token and loads the user', async () => {
    renderProvider()

    await userEvent.click(screen.getByText('login'))

    expect(await screen.findByText('user:Ana')).toBeVisible()
    expect(sessionStorage.getItem('accessToken')).toBe('tok')
  })

  it('signs up and then logs in with the remember choice', async () => {
    renderProvider()

    await userEvent.click(screen.getByText('signup'))

    expect(await screen.findByText('user:Ana')).toBeVisible()
    expect(authService.login).toHaveBeenCalledWith({ email: 'a', password: 'b' })
    expect(localStorage.getItem('accessToken')).toBe('tok')
  })

  it('logs out', async () => {
    renderProvider()
    await userEvent.click(screen.getByText('login'))
    await screen.findByText('user:Ana')

    await userEvent.click(screen.getByText('logout'))

    expect(screen.getByText('anonymous')).toBeVisible()
    expect(getToken()).toBeNull()
  })

  it('restores the session from a stored token', async () => {
    setToken('tok', true)
    renderProvider()

    expect(await screen.findByText('user:Ana')).toBeVisible()
  })

  it('discards a stored token the API rejects', async () => {
    setToken('tok', true)
    vi.mocked(authService.getCurrentUser).mockRejectedValue(new Error('401'))
    renderProvider()

    await waitFor(() => expect(getToken()).toBeNull())
    expect(screen.getByText('anonymous')).toBeVisible()
  })
})

describe('RequireAuth', () => {
  it('redirects anonymous visitors to /login', () => {
    render(
      <MemoryRouter initialEntries={['/']}>
        <AuthProvider>
          <Routes>
            <Route path="/" element={<RequireAuth>private</RequireAuth>} />
            <Route path="/login" element={<p>login page</p>} />
          </Routes>
        </AuthProvider>
      </MemoryRouter>,
    )

    expect(screen.getByText('login page')).toBeVisible()
  })
})
