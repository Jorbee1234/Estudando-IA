import { render, screen } from '@testing-library/react'
import type { ComponentProps } from 'react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { messages } from '../../lib/profileValidation'
import type { Profile } from '../../services/profileService'
import { sampleProfile } from '../../test/fixtures'
import { EditProfileModal } from './EditProfileModal'

function setup(overrides: Partial<Profile> = {}, props: Partial<ComponentProps<typeof EditProfileModal>> = {}) {
  const handlers = { onClose: vi.fn(), onSave: vi.fn() }
  const profile = { ...sampleProfile, ...overrides }
  const view = render(<EditProfileModal open profile={profile} {...handlers} {...props} />)
  return { ...handlers, ...view, profile }
}

const nameField = () => screen.getByLabelText('Nome')
const usernameField = () => screen.getByLabelText('@username')
const aboutField = () => screen.getByLabelText('Sobre')
const saveButton = () => screen.getByRole('button', { name: 'Salvar' })

async function replaceText(field: HTMLElement, text: string) {
  await userEvent.clear(field)
  if (text) await userEvent.type(field, text)
}

const inDays = (days: number) => new Date(Date.now() + days * 24 * 60 * 60 * 1000).toISOString()

describe('EditProfileModal', () => {
  it('is a dialog titled Editar perfil with the three fields filled in', () => {
    setup()

    expect(screen.getByRole('dialog', { name: 'Editar perfil' })).toBeInTheDocument()
    expect(nameField()).toHaveValue('Júlio Costa')
    expect(usernameField()).toHaveValue('julio')
    expect(aboutField()).toHaveValue('Desenvolvedor front-end.')
  })

  it('renders nothing visible when closed', () => {
    render(<EditProfileModal open={false} onClose={vi.fn()} profile={sampleProfile} onSave={vi.fn()} />)

    expect(screen.queryByLabelText('Nome')).not.toBeInTheDocument()
  })

  it('limits the fields and shows a counter for the about', () => {
    setup()

    expect(nameField()).toHaveAttribute('maxlength', '100')
    expect(usernameField()).toHaveAttribute('maxlength', '30')
    expect(aboutField()).toHaveAttribute('maxlength', '500')
    expect(screen.getByText('24/500')).toBeInTheDocument()
  })

  it('cannot save while nothing changed', () => {
    setup()

    expect(saveButton()).toBeDisabled()
  })

  it('shows an empty about as an empty field', () => {
    setup({ about: null })

    expect(aboutField()).toHaveValue('')
    expect(screen.getByText('0/500')).toBeInTheDocument()
  })
})

describe('EditProfileModal saving', () => {
  it('sends only the name when only the name changed', async () => {
    const { onSave } = setup()

    await replaceText(nameField(), '  Júlio Oliveira ')
    await userEvent.click(saveButton())

    expect(onSave).toHaveBeenCalledWith({ name: 'Júlio Oliveira' })
  })

  it('sends only the username, normalized, when only it changed', async () => {
    const { onSave } = setup()

    await replaceText(usernameField(), '@Julio_Dev')
    await userEvent.click(saveButton())

    expect(onSave).toHaveBeenCalledWith({ username: 'julio_dev' })
  })

  it('sends all three when all changed', async () => {
    const { onSave } = setup()

    await replaceText(nameField(), 'Novo Nome')
    await replaceText(usernameField(), 'novo_user')
    await replaceText(aboutField(), 'Novo texto')
    await userEvent.click(saveButton())

    expect(onSave).toHaveBeenCalledWith({ name: 'Novo Nome', username: 'novo_user', about: 'Novo texto' })
  })

  it('sends an empty string to clear the about', async () => {
    const { onSave } = setup()

    await replaceText(aboutField(), '')
    await userEvent.click(saveButton())

    expect(onSave).toHaveBeenCalledWith({ about: '' })
  })

  it('does not count a change that only differs by surrounding spaces or case of the same username', async () => {
    setup()

    await replaceText(nameField(), '  Júlio Costa  ')
    await replaceText(usernameField(), ' JULIO ')

    expect(saveButton()).toBeDisabled()
  })

  it('cancels without saving', async () => {
    const { onClose, onSave } = setup()

    await replaceText(nameField(), 'Outro Nome')
    await userEvent.click(screen.getByRole('button', { name: 'Cancelar' }))

    expect(onClose).toHaveBeenCalledOnce()
    expect(onSave).not.toHaveBeenCalled()
  })

  it('disables both buttons while saving', () => {
    setup({}, { pending: true })

    expect(saveButton()).toBeDisabled()
    expect(screen.getByRole('button', { name: 'Cancelar' })).toBeDisabled()
  })
})

describe('EditProfileModal validation', () => {
  it.each(['', '   ', 'J'])('blocks the name "%s"', async (value) => {
    const { onSave } = setup()

    await replaceText(nameField(), value)

    expect(screen.getByRole('alert')).toHaveTextContent(messages.invalidName)
    expect(nameField()).toBeInvalid()
    expect(nameField()).toHaveAccessibleDescription(messages.invalidName)
    expect(saveButton()).toBeDisabled()
    expect(onSave).not.toHaveBeenCalled()
  })

  it.each(['ab', 'com espaço', 'com-hifen', 'admin', ''])('blocks the username "%s"', async (value) => {
    setup()

    await replaceText(usernameField(), value)

    expect(screen.getByRole('alert')).toHaveTextContent(messages.invalidUsername)
    expect(usernameField()).toBeInvalid()
    expect(saveButton()).toBeDisabled()
  })

  it('reports each problem next to its own field and lets the owner fix them', async () => {
    setup()

    await replaceText(nameField(), 'J')
    await replaceText(usernameField(), 'x')
    expect(screen.getAllByRole('alert')).toHaveLength(2)

    await replaceText(nameField(), 'Jo')
    await replaceText(usernameField(), 'xyz')

    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
    expect(saveButton()).toBeEnabled()
  })

  it('still describes the username with the 30 day rule when there is an error', async () => {
    setup()

    await replaceText(usernameField(), 'x')

    expect(usernameField()).toHaveAccessibleDescription(/30 dias/)
  })
})

describe('EditProfileModal username lock', () => {
  it('disables the username and says when it can change, keeping the rest editable', async () => {
    const { onSave } = setup({ usernameChangeAvailableAt: inDays(10) })

    expect(usernameField()).toBeDisabled()
    expect(usernameField()).toHaveAccessibleDescription(/Você poderá trocar o @username em \d{2}\/\d{2}\/\d{4}\./)
    await replaceText(nameField(), 'Outro Nome')
    await userEvent.click(saveButton())

    expect(onSave).toHaveBeenCalledWith({ name: 'Outro Nome' })
  })

  it('never sends the username while locked', async () => {
    const { onSave } = setup({ usernameChangeAvailableAt: inDays(10) })

    await replaceText(aboutField(), 'Novo texto')
    await userEvent.click(saveButton())

    expect(onSave).toHaveBeenCalledWith({ about: 'Novo texto' })
  })

  it('is not locked once the date has passed', () => {
    setup({ usernameChangeAvailableAt: new Date(Date.now() - 1000).toISOString() })

    expect(usernameField()).toBeEnabled()
    expect(usernameField()).toHaveAccessibleDescription(/30 dias/)
  })
})

describe('EditProfileModal API errors', () => {
  async function submitChange(props: Partial<ComponentProps<typeof EditProfileModal>>) {
    const view = setup({}, props)
    await replaceText(usernameField(), 'ana')
    await userEvent.click(saveButton())
    return view
  }

  it('shows the API error next to the field it belongs to', async () => {
    await submitChange({ fieldErrors: { username: 'Este @username já está em uso.' } })

    expect(screen.getByRole('alert')).toHaveTextContent('Este @username já está em uso.')
    expect(usernameField()).toBeInvalid()
    expect(usernameField()).toHaveAccessibleDescription(/Este @username já está em uso\./)
  })

  it('shows a general error when the API reports no specific field', async () => {
    await submitChange({ error: 'O @username só pode ser trocado a cada 30 dias.' })

    expect(screen.getByRole('alert')).toHaveTextContent('só pode ser trocado a cada 30 dias')
  })

  it('does not show a field error before anything was submitted', () => {
    setup({}, { fieldErrors: { username: 'Este @username já está em uso.' } })

    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
  })

  it('hides the API error as soon as the field is edited again', async () => {
    await submitChange({ fieldErrors: { username: 'Este @username já está em uso.' } })

    await userEvent.type(usernameField(), 'x')

    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
  })

  it('hides the general error after any field is edited', async () => {
    await submitChange({ error: 'Falhou.' })

    await userEvent.type(aboutField(), 'x')

    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
  })

  it('shows API errors for the name and the about too', async () => {
    const { onSave } = setup({}, {
      fieldErrors: { name: 'Nome ruim.', about: 'Texto longo.' },
    })

    await replaceText(nameField(), 'Novo Nome')
    await replaceText(aboutField(), 'Texto')
    await userEvent.click(saveButton())

    expect(onSave).toHaveBeenCalledOnce()
    expect(screen.getByText('Nome ruim.')).toBeInTheDocument()
    expect(screen.getByText('Texto longo.')).toBeInTheDocument()
  })
})
