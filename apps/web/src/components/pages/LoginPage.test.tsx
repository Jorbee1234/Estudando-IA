import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { LoginPage } from './LoginPage'

describe('LoginPage', () => {
  it('reports form submissions and social logins', async () => {
    const onLogin = vi.fn()
    const onSocialLogin = vi.fn()
    render(<LoginPage onLogin={onLogin} onSocialLogin={onSocialLogin} />)

    await userEvent.type(screen.getByLabelText('Email ou usuário'), 'ana')
    await userEvent.type(screen.getByLabelText('Senha'), 'segredo')
    await userEvent.click(screen.getByRole('button', { name: 'Login' }))
    await userEvent.click(
      screen.getByRole('button', { name: 'Entrar com Github' }),
    )

    expect(onLogin).toHaveBeenCalledExactlyOnceWith({
      login: 'ana',
      password: 'segredo',
      remember: false,
    })
    expect(onSocialLogin).toHaveBeenCalledExactlyOnceWith('github')
  })

  it('links to the signup page', () => {
    render(<LoginPage onLogin={vi.fn()} onSocialLogin={vi.fn()} />)

    expect(
      screen.getByRole('link', { name: 'Crie seu cadastro!' }),
    ).toHaveAttribute('href', '/cadastro')
  })
})
