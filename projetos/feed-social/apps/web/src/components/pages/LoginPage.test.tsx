import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router'
import { describe, expect, it, vi } from 'vitest'
import { LoginPage } from './LoginPage'

function renderPage(onLogin = vi.fn(), onSocialLogin = vi.fn()) {
  render(
    <MemoryRouter>
      <LoginPage onLogin={onLogin} onSocialLogin={onSocialLogin} />
    </MemoryRouter>,
  )
}

describe('LoginPage', () => {
  it('reports form submissions and social logins', async () => {
    const onLogin = vi.fn()
    const onSocialLogin = vi.fn()
    renderPage(onLogin, onSocialLogin)

    await userEvent.type(screen.getByLabelText('Email'), 'ana@example.com')
    await userEvent.type(screen.getByLabelText('Senha'), 'segredo')
    await userEvent.click(screen.getByRole('button', { name: 'Login' }))
    await userEvent.click(
      screen.getByRole('button', { name: 'Entrar com Github' }),
    )

    expect(onLogin).toHaveBeenCalledExactlyOnceWith({
      email: 'ana@example.com',
      password: 'segredo',
      remember: false,
    })
    expect(onSocialLogin).toHaveBeenCalledExactlyOnceWith('github')
  })

  it('sets the document title', async () => {
    renderPage()

    await waitFor(() => expect(document.title).toBe('Login | Code Connect'))
  })

  it('links to the signup page', () => {
    renderPage()

    expect(
      screen.getByRole('link', { name: 'Crie seu cadastro!' }),
    ).toHaveAttribute('href', '/cadastro')
  })
})
