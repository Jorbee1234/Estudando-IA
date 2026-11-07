import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { LoginForm } from './LoginForm'

function renderForm() {
  const onSubmit = vi.fn()
  render(<LoginForm forgotPasswordHref="/esqueci-a-senha" onSubmit={onSubmit} />)
  return onSubmit
}

describe('LoginForm', () => {
  it('submits the entered data', async () => {
    const onSubmit = renderForm()

    await userEvent.type(screen.getByLabelText('Email ou usuário'), 'ana')
    await userEvent.type(screen.getByLabelText('Senha'), 'segredo')
    await userEvent.click(screen.getByRole('checkbox', { name: 'Lembrar-me' }))
    await userEvent.click(screen.getByRole('button', { name: 'Login' }))

    expect(onSubmit).toHaveBeenCalledExactlyOnceWith({
      login: 'ana',
      password: 'segredo',
      remember: true,
    })
  })

  it('does not submit without the required fields', async () => {
    const onSubmit = renderForm()

    await userEvent.click(screen.getByRole('button', { name: 'Login' }))

    expect(onSubmit).not.toHaveBeenCalled()
  })

  it('links to password recovery', () => {
    renderForm()

    expect(
      screen.getByRole('link', { name: 'Esqueci a senha' }),
    ).toHaveAttribute('href', '/esqueci-a-senha')
  })
})
