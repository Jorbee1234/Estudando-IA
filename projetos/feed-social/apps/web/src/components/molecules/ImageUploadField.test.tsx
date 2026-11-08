import { render, screen } from '@testing-library/react'
import { useState } from 'react'
import type { ComponentProps } from 'react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { IMAGE_MAX_BYTES, messages } from '../../lib/profileValidation'
import { ImageUploadField } from './ImageUploadField'

beforeEach(() => {
  URL.createObjectURL = vi.fn(() => 'blob:preview')
  URL.revokeObjectURL = vi.fn()
})

afterEach(() => vi.restoreAllMocks())

const png = (size = 10, name = 'foto.png') => new File([new Uint8Array(size)], name, { type: 'image/png' })

function Harness() {
  const [file, setFile] = useState<File | null>(null)
  return <ImageUploadField id="img" label="Foto" kind="avatar" file={file} onChange={setFile} />
}

function setup(props: Partial<ComponentProps<typeof ImageUploadField>> = {}) {
  const onChange = vi.fn()
  const view = render(
    <ImageUploadField id="img" label="Foto" kind="avatar" file={null} onChange={onChange} {...props} />,
  )
  return { onChange, ...view }
}

describe('ImageUploadField', () => {
  it('only offers png, jpeg and webp in the file picker', () => {
    setup()

    expect(screen.getByLabelText('Foto')).toHaveAttribute('accept', 'image/png,image/jpeg,image/webp')
  })

  it('reports a valid file', async () => {
    const { onChange } = setup()
    const file = png()

    await userEvent.upload(screen.getByLabelText('Foto'), file)

    expect(onChange).toHaveBeenCalledWith(file)
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
  })

  it('rejects a file of another type before sending it anywhere', async () => {
    const { onChange } = setup()
    const gif = new File(['x'], 'a.gif', { type: 'image/gif' })

    await userEvent.upload(screen.getByLabelText('Foto'), gif, { applyAccept: false })

    expect(onChange).toHaveBeenLastCalledWith(null)
    expect(screen.getByRole('alert')).toHaveTextContent(messages.invalidImageType)
    expect(screen.getByLabelText('Foto')).toBeInvalid()
  })

  it('rejects an avatar over 2 MB', async () => {
    const { onChange } = setup()

    await userEvent.upload(screen.getByLabelText('Foto'), png(IMAGE_MAX_BYTES.avatar + 1))

    expect(onChange).toHaveBeenLastCalledWith(null)
    expect(screen.getByRole('alert')).toHaveTextContent(messages.avatarTooLarge)
  })

  it('allows the same size for a banner and rejects one over 4 MB', async () => {
    const { onChange } = setup({ kind: 'banner' })

    await userEvent.upload(screen.getByLabelText('Foto'), png(IMAGE_MAX_BYTES.avatar + 1))
    expect(onChange).toHaveBeenLastCalledWith(expect.any(File))

    await userEvent.upload(screen.getByLabelText('Foto'), png(IMAGE_MAX_BYTES.banner + 1))
    expect(screen.getByRole('alert')).toHaveTextContent(messages.bannerTooLarge)
  })

  it('clears the error after a valid file is chosen', async () => {
    setup()
    const input = screen.getByLabelText('Foto')

    await userEvent.upload(input, new File(['x'], 'a.gif', { type: 'image/gif' }), { applyAccept: false })
    await userEvent.upload(input, png())

    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
  })

  it('previews the chosen file', async () => {
    render(<Harness />)

    await userEvent.upload(screen.getByLabelText('Foto'), png())

    expect(screen.getByAltText('Pré-visualização')).toHaveAttribute('src', 'blob:preview')
  })

  it('revokes the previous preview when another file is chosen and when it goes away', async () => {
    const { unmount } = render(<Harness />)
    const input = screen.getByLabelText('Foto')

    await userEvent.upload(input, png())
    await userEvent.upload(input, png(20, 'outra.png'))
    expect(URL.revokeObjectURL).toHaveBeenCalledTimes(1)

    unmount()
    expect(URL.revokeObjectURL).toHaveBeenCalledTimes(2)
  })

  it('drops the preview when the new file is invalid', async () => {
    render(<Harness />)
    const input = screen.getByLabelText('Foto')

    await userEvent.upload(input, png())
    await userEvent.upload(input, new File(['x'], 'a.gif', { type: 'image/gif' }), { applyAccept: false })

    expect(screen.queryByAltText('Pré-visualização')).not.toBeInTheDocument()
    expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:preview')
  })

  it('still works where object URLs are not available', async () => {
    URL.createObjectURL = undefined as unknown as typeof URL.createObjectURL
    const { onChange } = setup()

    await userEvent.upload(screen.getByLabelText('Foto'), png())

    expect(onChange).toHaveBeenCalledWith(expect.any(File))
    expect(screen.queryByAltText('Pré-visualização')).not.toBeInTheDocument()
  })

  it('shows the current image until a new one is chosen', () => {
    setup({ currentUrl: '/api/profiles/u1/avatar?v=1' })

    expect(screen.getByAltText('Pré-visualização')).toHaveAttribute('src', '/api/profiles/u1/avatar?v=1')
  })
})
