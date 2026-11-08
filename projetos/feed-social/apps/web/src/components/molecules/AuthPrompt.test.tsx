import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router'
import { describe, expect, it } from 'vitest'
import { AuthPrompt } from './AuthPrompt'

describe('AuthPrompt', () => {
  it('shows the question and links to the given address', () => {
    render(
      <MemoryRouter>
        <AuthPrompt
          question="Ainda não tem conta?"
          linkLabel="Crie seu cadastro!"
          href="/cadastro"
          icon="clipboard"
        />
      </MemoryRouter>,
    )

    expect(screen.getByText('Ainda não tem conta?')).toBeInTheDocument()
    expect(
      screen.getByRole('link', { name: 'Crie seu cadastro!' }),
    ).toHaveAttribute('href', '/cadastro')
  })

  it('places the question and the link on the same row in the inline layout', () => {
    const { container } = render(
      <MemoryRouter>
        <AuthPrompt
          question="Já tem conta?"
          linkLabel="Faça seu login!"
          href="/login"
          icon="login"
          layout="inline"
        />
      </MemoryRouter>,
    )

    expect(container.firstElementChild).toHaveClass('flex-row')
  })
})
