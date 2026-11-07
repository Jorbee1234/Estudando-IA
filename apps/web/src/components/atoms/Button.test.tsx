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
