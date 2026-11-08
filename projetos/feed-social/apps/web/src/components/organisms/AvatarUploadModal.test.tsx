import { render, screen } from '@testing-library/react'
import type { ComponentProps } from 'react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { IMAGE_MAX_BYTES, messages } from '../../lib/profileValidation'
import { AvatarUploadModal } from './AvatarUploadModal'

beforeEach(() => {
  URL.createObjectURL = vi.fn(() => 'blob:preview')
  URL.revokeObjectURL = vi.fn()
})

const png = (size = 10) => new File([new Uint8Array(size)], 'foto.png', { type: 'image/png' })

function setup(props: Partial<ComponentProps<typeof AvatarUploadModal>> = {}) {
  const handlers = { onClose: vi.fn(), onSave: vi.fn(), onRemove: vi.fn() }
  render(<AvatarUploadModal open avatarUrl={null} {...handlers} {...props} />)
  return handlers
}

describe('AvatarUploadModal', () => {
  it('renders nothing visible when closed', () => {
    render(<AvatarUploadModal open={false} avatarUrl={null} onClose={vi.fn()} onSave={vi.fn()} onRemove={vi.fn()} />)

    expect(screen.queryByRole('button', { name: 'Salvar foto' })).not.toBeInTheDocument()
  })

  it('is a dialog titled Foto de perfil', () => {
    setup()

    expect(screen.getByRole('dialog', { name: 'Foto de perfil' })).toBeInTheDocument()
  })

  it('cannot save before a file is chosen', () => {
    setup()

    expect(screen.getByRole('button', { name: 'Salvar foto' })).toBeDisabled()
  })

  it('sends the chosen file on save', async () => {
    const { onSave } = setup()
    const file = png()

    await userEvent.upload(screen.getByLabelText(/Escolha uma imagem/), file)
    await userEvent.click(screen.getByRole('button', { name: 'Salvar foto' }))

    expect(onSave).toHaveBeenCalledWith(file)
  })

  it('blocks a file that is too large and keeps saving disabled', async () => {
    const { onSave } = setup()

    await userEvent.upload(screen.getByLabelText(/Escolha uma imagem/), png(IMAGE_MAX_BYTES.avatar + 1))

    expect(screen.getByRole('alert')).toHaveTextContent(messages.avatarTooLarge)
    expect(screen.getByRole('button', { name: 'Salvar foto' })).toBeDisabled()
    expect(onSave).not.toHaveBeenCalled()
  })

  it('blocks a file of an unsupported type', async () => {
    setup()

    await userEvent.upload(
      screen.getByLabelText(/Escolha uma imagem/),
      new File(['x'], 'a.gif', { type: 'image/gif' }),
      { applyAccept: false },
    )

    expect(screen.getByRole('alert')).toHaveTextContent(messages.invalidImageType)
    expect(screen.getByRole('button', { name: 'Salvar foto' })).toBeDisabled()
  })

  it('offers to remove the current photo only when there is one', async () => {
    const view = render(
      <AvatarUploadModal open avatarUrl={null} onClose={vi.fn()} onSave={vi.fn()} onRemove={vi.fn()} />,
    )
    expect(screen.queryByRole('button', { name: 'Remover foto' })).not.toBeInTheDocument()
    view.unmount()

    const { onRemove } = setup({ avatarUrl: '/api/profiles/u1/avatar?v=1' })
    await userEvent.click(screen.getByRole('button', { name: 'Remover foto' }))

    expect(onRemove).toHaveBeenCalledOnce()
  })

  it('shows the error returned by the API', () => {
    setup({ error: 'A foto de perfil deve ter no máximo 2 MB.' })

    expect(screen.getByRole('alert')).toHaveTextContent('no máximo 2 MB')
  })

  it('disables the buttons while pending', () => {
    setup({ avatarUrl: '/x.png', pending: true })

    expect(screen.getByRole('button', { name: 'Salvar foto' })).toBeDisabled()
    expect(screen.getByRole('button', { name: 'Remover foto' })).toBeDisabled()
  })
})
