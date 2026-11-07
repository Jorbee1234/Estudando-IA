import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router'
import { describe, expect, it, vi } from 'vitest'
import { LoginForm } from './LoginForm'

function renderForm() {
  const onSubmit = vi.fn()
  render(
    <MemoryRouter>
      <LoginForm forgotPasswordHref="/esqueci-a-senha" onSubmit={onSubmit} />
    </MemoryRouter>,
  )
  return onSubmit
}

describe('LoginForm', () => {
  it('submits the entered data', async () => {
    const onSubmit = renderForm()

    await userEvent.type(screen.getByLabelText('Email'), 'ana@example.com')
    await userEvent.type(screen.getByLabelText('Senha'), 'segredo')
    await userEvent.click(screen.getByRole('checkbox', { name: 'Lembrar-me' }))
    await userEvent.click(screen.getByRole('button', { name: 'Login' }))

    expect(onSubmit).toHaveBeenCalledExactlyOnceWith({
      email: 'ana@example.com',
      password: 'segredo',
      remember: true,
    })
  })

  it('shows the error and disables the button while pending', () => {
    render(
      <MemoryRouter>
        <LoginForm
          forgotPasswordHref="/x"
          onSubmit={vi.fn()}
          error="E-mail or password is incorrect."
          pending
        />
      </MemoryRouter>,
    )

    expect(screen.getByRole('alert')).toHaveTextContent(
      'E-mail or password is incorrect.',
    )
    expect(screen.getByRole('button', { name: 'Login' })).toBeDisabled()
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
