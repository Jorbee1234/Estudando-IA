import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { Modal } from './Modal'

describe('Modal', () => {
  it('shows its title and content when open', () => {
    render(
      <Modal open onClose={vi.fn()} title="Entrar">
        <p>Conteúdo</p>
      </Modal>,
    )

    expect(screen.getByRole('dialog', { name: 'Entrar' })).toBeInTheDocument()
    expect(screen.getByText('Conteúdo')).toBeInTheDocument()
  })

  it('renders no content while closed', () => {
    render(
      <Modal open={false} onClose={vi.fn()} title="Entrar">
        <p>Conteúdo</p>
      </Modal>,
    )

    expect(screen.queryByText('Conteúdo')).not.toBeInTheDocument()
  })

  it('closes from the close button', async () => {
    const onClose = vi.fn()
    render(
      <Modal open onClose={onClose} title="Entrar">
        <p>Conteúdo</p>
      </Modal>,
    )

    await userEvent.click(screen.getByRole('button', { name: 'Fechar' }))

    expect(onClose).toHaveBeenCalledOnce()
  })
})
