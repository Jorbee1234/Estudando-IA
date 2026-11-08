import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router'
import { describe, expect, it, vi } from 'vitest'
import { LoginModal } from './LoginModal'

function setup(open = true) {
  const handlers = { onClose: vi.fn(), onLogin: vi.fn() }
  render(
    <MemoryRouter>
      <LoginModal open={open} {...handlers} />
    </MemoryRouter>,
  )
  return handlers
}

describe('LoginModal', () => {
  it('submits the credentials', async () => {
    const { onLogin } = setup()

    await userEvent.type(screen.getByLabelText('Email'), 'ana@example.com')
    await userEvent.type(screen.getByLabelText('Senha'), 'Senha@1234')
    await userEvent.click(screen.getByRole('button', { name: 'Login' }))

    expect(onLogin).toHaveBeenCalledWith({
      email: 'ana@example.com',
      password: 'Senha@1234',
      remember: false,
    })
  })

  it('links to the signup page and closes when it is used', async () => {
    const { onClose } = setup()

    const link = screen.getByRole('link', { name: /Crie seu cadastro/ })
    expect(link).toHaveAttribute('href', '/cadastro')
    await userEvent.click(link)

    expect(onClose).toHaveBeenCalled()
  })

  it('renders nothing while closed', () => {
    setup(false)

    expect(screen.queryByLabelText('Email')).not.toBeInTheDocument()
  })
})
