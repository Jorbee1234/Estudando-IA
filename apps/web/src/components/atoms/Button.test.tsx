import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { Button } from './Button'

describe('Button', () => {
  it('renders its content and handles clicks', async () => {
    const onClick = vi.fn()
    render(<Button onClick={onClick}>Login</Button>)

    await userEvent.click(screen.getByRole('button', { name: 'Login' }))

    expect(onClick).toHaveBeenCalledOnce()
  })

  it('does not submit forms unless asked to', () => {
    render(<Button>Login</Button>)

    expect(screen.getByRole('button')).toHaveAttribute('type', 'button')
  })
})

describe('Button variants', () => {
  it('renders the outline variant with an accent border', () => {
    render(<Button variant="outline">Publicar</Button>)

    expect(screen.getByRole('button', { name: 'Publicar' })).toHaveClass('border-accent')
  })

  it('uses the solid variant by default', () => {
    render(<Button>Entrar</Button>)

    expect(screen.getByRole('button', { name: 'Entrar' })).toHaveClass('bg-accent')
  })

  it('merges an external className over the variant classes', () => {
    render(<Button className="h-10 mt-4">Entrar</Button>)
    const button = screen.getByRole('button', { name: 'Entrar' })

    expect(button).toHaveClass('h-10', 'mt-4', 'bg-accent')
    expect(button).not.toHaveClass('h-[51px]')
  })
})
