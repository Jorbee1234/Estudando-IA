import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { CreatePostModal } from './CreatePostModal'

describe('CreatePostModal', () => {
  it('submits the post with parsed tags', async () => {
    const onSubmit = vi.fn()
    render(<CreatePostModal open onClose={vi.fn()} onSubmit={onSubmit} />)

    await userEvent.type(screen.getByLabelText('Título'), 'Meu projeto')
    await userEvent.type(screen.getByLabelText('Descrição'), 'Uma descrição')
    await userEvent.type(screen.getByLabelText(/^Tags/), 'React, , CSS ')
    await userEvent.click(screen.getByRole('button', { name: 'Publicar' }))

    expect(onSubmit).toHaveBeenCalledWith({
      title: 'Meu projeto',
      description: 'Uma descrição',
      tags: ['React', 'CSS'],
    })
  })

  it('includes the cover URL when informed', async () => {
    const onSubmit = vi.fn()
    render(<CreatePostModal open onClose={vi.fn()} onSubmit={onSubmit} />)

    await userEvent.type(screen.getByLabelText('Título'), 'Meu projeto')
    await userEvent.type(screen.getByLabelText('Descrição'), 'Uma descrição')
    await userEvent.type(screen.getByLabelText(/capa/), 'https://example.com/a.png')
    await userEvent.click(screen.getByRole('button', { name: 'Publicar' }))

    expect(onSubmit).toHaveBeenCalledWith(
      expect.objectContaining({ thumbnailUrl: 'https://example.com/a.png' }),
    )
  })

  it('shows the error and disables the button while pending', () => {
    render(<CreatePostModal open onClose={vi.fn()} onSubmit={vi.fn()} error="Falhou" pending />)

    expect(screen.getByRole('alert')).toHaveTextContent('Falhou')
    expect(screen.getByRole('button', { name: 'Publicar' })).toBeDisabled()
  })
})
