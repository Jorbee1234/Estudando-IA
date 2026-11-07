import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { IconCount } from './IconCount'

describe('IconCount', () => {
  it('has an accessible name with the count and handles clicks', async () => {
    const onClick = vi.fn()
    render(<IconCount icon="chat" label="Comentários" count={12} onClick={onClick} />)

    await userEvent.click(screen.getByRole('button', { name: 'Comentários 12' }))

    expect(onClick).toHaveBeenCalledOnce()
  })

  it('exposes the pressed state of toggles', () => {
    render(<IconCount icon="code" label="Curtir" count={3} pressed onClick={vi.fn()} />)

    expect(screen.getByRole('button', { name: 'Curtir 3', pressed: true })).toBeInTheDocument()
  })

  it('is not a toggle when pressed is not set', () => {
    render(<IconCount icon="share" label="Compartilhar" onClick={vi.fn()} />)

    expect(screen.getByRole('button', { name: 'Compartilhar' })).not.toHaveAttribute('aria-pressed')
  })
})
