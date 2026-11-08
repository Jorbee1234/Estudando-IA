import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { AuthTemplate } from './AuthTemplate'

describe('AuthTemplate', () => {
  it('renders the banner, texts and content it receives', () => {
    render(
      <AuthTemplate
        banner={{ src: '/banner.png', alt: 'Banner de teste' }}
        title="Cadastro"
        subtitle="Crie sua conta."
      >
        <form aria-label="Formulário de teste" />
      </AuthTemplate>,
    )

    expect(screen.getByRole('img', { name: 'Banner de teste' })).toHaveAttribute(
      'src',
      '/banner.png',
    )
    expect(
      screen.getByRole('heading', { level: 1, name: 'Cadastro' }),
    ).toBeInTheDocument()
    expect(screen.getByText('Crie sua conta.')).toBeInTheDocument()
    expect(
      screen.getByRole('form', { name: 'Formulário de teste' }),
    ).toBeInTheDocument()
  })

  it('shows the brand logo over the banner', () => {
    render(
      <AuthTemplate
        banner={{ src: '/banner.png', alt: 'Banner de teste' }}
        title="Cadastro"
        subtitle="Crie sua conta."
      >
        <form aria-label="Formulário de teste" />
      </AuthTemplate>,
    )

    expect(screen.getByRole('img', { name: 'CodeConnect' })).toBeInTheDocument()
  })
})
