import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { AuthPrompt } from './AuthPrompt'

describe('AuthPrompt', () => {
  it('shows the question and links to the given address', () => {
    render(
      <AuthPrompt
        question="Ainda não tem conta?"
        linkLabel="Crie seu cadastro!"
        href="/cadastro"
        icon="clipboard"
      />,
    )

    expect(screen.getByText('Ainda não tem conta?')).toBeInTheDocument()
    expect(
      screen.getByRole('link', { name: 'Crie seu cadastro!' }),
    ).toHaveAttribute('href', '/cadastro')
  })
})
