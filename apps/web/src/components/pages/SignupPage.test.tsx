import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router'
import { describe, expect, it, vi } from 'vitest'
import { SignupPage } from './SignupPage'

function renderPage(onSignup = vi.fn(), onSocialLogin = vi.fn()) {
  render(
    <MemoryRouter>
      <SignupPage onSignup={onSignup} onSocialLogin={onSocialLogin} />
    </MemoryRouter>,
  )
}

describe('SignupPage', () => {
  it('reports form submissions and social logins', async () => {
    const onSignup = vi.fn()
    const onSocialLogin = vi.fn()
    renderPage(onSignup, onSocialLogin)

    await userEvent.type(screen.getByLabelText('Nome'), 'Ana')
    await userEvent.type(screen.getByLabelText('Email'), 'ana@exemplo.com')
    await userEvent.type(screen.getByLabelText('Senha'), 'segredo')
    await userEvent.click(screen.getByRole('button', { name: 'Cadastrar' }))
    await userEvent.click(
      screen.getByRole('button', { name: 'Entrar com Github' }),
    )

    expect(onSignup).toHaveBeenCalledExactlyOnceWith({
      name: 'Ana',
      email: 'ana@exemplo.com',
      password: 'segredo',
      remember: false,
    })
    expect(onSocialLogin).toHaveBeenCalledExactlyOnceWith('github')
  })

  it('sets the document title', async () => {
    renderPage()

    await waitFor(() => expect(document.title).toBe('Cadastro | Code Connect'))
  })

  it('links to the login page', () => {
    renderPage()

    expect(
      screen.getByRole('link', { name: 'Faça seu login!' }),
    ).toHaveAttribute('href', '/login')
  })
})
