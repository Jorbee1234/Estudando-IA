import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { SignupForm } from './SignupForm'

describe('SignupForm', () => {
  it('submits the entered data', async () => {
    const onSubmit = vi.fn()
    render(<SignupForm onSubmit={onSubmit} />)

    await userEvent.type(screen.getByLabelText('Nome'), 'Ana Souza')
    await userEvent.type(screen.getByLabelText('Email'), 'ana@exemplo.com')
    await userEvent.type(screen.getByLabelText('Senha'), 'segredo')
    await userEvent.click(screen.getByRole('checkbox', { name: 'Lembrar-me' }))
    await userEvent.click(screen.getByRole('button', { name: 'Cadastrar' }))

    expect(onSubmit).toHaveBeenCalledExactlyOnceWith({
      name: 'Ana Souza',
      email: 'ana@exemplo.com',
      password: 'segredo',
      remember: true,
    })
  })

  it('does not submit without the required fields', async () => {
    const onSubmit = vi.fn()
    render(<SignupForm onSubmit={onSubmit} />)

    await userEvent.click(screen.getByRole('button', { name: 'Cadastrar' }))

    expect(onSubmit).not.toHaveBeenCalled()
  })
})
