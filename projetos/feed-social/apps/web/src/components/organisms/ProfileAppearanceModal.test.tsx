import { fireEvent, render, screen } from '@testing-library/react'
import type { ComponentProps } from 'react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { IMAGE_MAX_BYTES, messages } from '../../lib/profileValidation'
import { ProfileAppearanceModal } from './ProfileAppearanceModal'

beforeEach(() => {
  URL.createObjectURL = vi.fn(() => 'blob:preview')
  URL.revokeObjectURL = vi.fn()
})

const png = (size = 10) => new File([new Uint8Array(size)], 'banner.png', { type: 'image/png' })

function setup(props: Partial<ComponentProps<typeof ProfileAppearanceModal>> = {}) {
  const handlers = { onClose: vi.fn(), onSave: vi.fn() }
  render(<ProfileAppearanceModal open bannerUrl={null} accentColor={null} {...handlers} {...props} />)
  return handlers
}

describe('ProfileAppearanceModal', () => {
  it('is a dialog titled Banner e cor, starting from the current color', () => {
    setup({ accentColor: '#7DD3FC' })

    expect(screen.getByRole('dialog', { name: 'Banner e cor' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Azul', pressed: true })).toBeInTheDocument()
  })

  it('saves only the color when nothing else changed', async () => {
    const { onSave } = setup()

    await userEvent.click(screen.getByRole('button', { name: 'Rosa' }))
    await userEvent.click(screen.getByRole('button', { name: 'Salvar aparência' }))

    expect(onSave).toHaveBeenCalledWith({ accentColor: '#F9A8D4', banner: null, removeBanner: false })
  })

  it('saves null for the default color', async () => {
    const { onSave } = setup({ accentColor: '#7DD3FC' })

    await userEvent.click(screen.getByRole('button', { name: 'Verde' }))
    await userEvent.click(screen.getByRole('button', { name: 'Salvar aparência' }))

    expect(onSave).toHaveBeenCalledWith({ accentColor: null, banner: null, removeBanner: false })
  })

  it('saves a new banner together with the color', async () => {
    const { onSave } = setup()
    const banner = png()

    await userEvent.upload(screen.getByLabelText(/^Banner .PNG/), banner)
    await userEvent.click(screen.getByRole('button', { name: 'Salvar aparência' }))

    expect(onSave).toHaveBeenCalledWith({ accentColor: null, banner, removeBanner: false })
  })

  it('blocks a banner over 4 MB', async () => {
    setup()

    await userEvent.upload(screen.getByLabelText(/^Banner .PNG/), png(IMAGE_MAX_BYTES.banner + 1))

    expect(screen.getByRole('alert')).toHaveTextContent(messages.bannerTooLarge)
  })

  it('offers to remove the current banner and reports it', async () => {
    const { onSave } = setup({ bannerUrl: '/api/profiles/u1/banner?v=1' })

    await userEvent.click(screen.getByLabelText('Remover banner atual'))
    await userEvent.click(screen.getByRole('button', { name: 'Salvar aparência' }))

    expect(onSave).toHaveBeenCalledWith({ accentColor: null, banner: null, removeBanner: true })
  })

  it('does not offer to remove a banner that does not exist', () => {
    setup()

    expect(screen.queryByLabelText('Remover banner atual')).not.toBeInTheDocument()
  })

  it('does not report a removal when a replacement was chosen', async () => {
    const { onSave } = setup({ bannerUrl: '/api/profiles/u1/banner?v=1' })
    const banner = png()

    await userEvent.click(screen.getByLabelText('Remover banner atual'))
    await userEvent.upload(screen.getByLabelText(/^Banner .PNG/), banner)
    await userEvent.click(screen.getByRole('button', { name: 'Salvar aparência' }))

    expect(onSave).toHaveBeenCalledWith({ accentColor: null, banner, removeBanner: false })
  })

  it('blocks saving a color with too little contrast', () => {
    const { onSave } = setup()

    fireEvent.change(screen.getByLabelText('Escolher outra cor'), { target: { value: '#111111' } })

    expect(screen.getByRole('alert')).toHaveTextContent(messages.lowContrast)
    expect(screen.getByRole('button', { name: 'Salvar aparência' })).toBeDisabled()
    expect(onSave).not.toHaveBeenCalled()
  })

  it('shows the API error and disables saving while pending', () => {
    setup({ error: 'Imagem não encontrada.', pending: true })

    expect(screen.getByRole('alert')).toHaveTextContent('Imagem não encontrada.')
    expect(screen.getByRole('button', { name: 'Salvar aparência' })).toBeDisabled()
  })
})
