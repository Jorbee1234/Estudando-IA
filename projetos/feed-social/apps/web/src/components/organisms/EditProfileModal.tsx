import { useId, useState } from 'react'
import type { FormEvent } from 'react'
import {
  ABOUT_MAX_LENGTH,
  NAME_MAX_LENGTH,
  USERNAME_MAX_LENGTH,
  normalizeUsername,
  validateName,
  validateUsername,
} from '../../lib/profileValidation'
import type { Profile, ProfileChanges } from '../../services/profileService'
import { Button } from '../atoms/Button'
import { Modal } from '../atoms/Modal'
import { FormField } from '../molecules/FormField'
import { TextareaField } from '../molecules/TextareaField'

type EditProfileModalProps = {
  open: boolean
  onClose: () => void
  profile: Profile
  onSave: (changes: ProfileChanges) => void
  error?: string
  fieldErrors?: Record<string, string>
  pending?: boolean
}

type FormValues = { name: string; username: string; about: string }

type EditProfileFormProps = Omit<EditProfileModalProps, 'open'>

const unlockDateFormat = new Intl.DateTimeFormat('pt-BR', { dateStyle: 'short' })

function EditProfileForm({
  onClose,
  profile,
  onSave,
  error,
  fieldErrors = {},
  pending = false,
}: EditProfileFormProps) {
  const ids = { name: useId(), username: useId(), about: useId(), hint: useId() }
  const [openedAt] = useState(() => Date.now())
  const [values, setValues] = useState<FormValues>({
    name: profile.name,
    username: profile.handle,
    about: profile.about ?? '',
  })
  const [submitted, setSubmitted] = useState<FormValues>()

  const unlockAt = profile.usernameChangeAvailableAt ? new Date(profile.usernameChangeAvailableAt) : null
  const usernameLocked = unlockAt !== null && unlockAt.getTime() > openedAt

  const nameProblem = validateName(values.name)
  const usernameProblem = usernameLocked ? undefined : validateUsername(values.username)

  const changes: ProfileChanges = {}
  if (values.name.trim() !== profile.name) changes.name = values.name.trim()
  if (!usernameLocked && normalizeUsername(values.username) !== profile.handle) {
    changes.username = normalizeUsername(values.username)
  }
  if (values.about.trim() !== (profile.about ?? '')) changes.about = values.about.trim()

  const hasChanges = Object.keys(changes).length > 0
  const canSave = hasChanges && !nameProblem && !usernameProblem && !pending

  const sameAsSubmitted = (field: keyof FormValues) =>
    submitted !== undefined && submitted[field].trim() === values[field].trim()
  const serverError = (field: keyof FormValues) => (sameAsSubmitted(field) ? fieldErrors[field] : undefined)
  const unchangedSinceSubmit = (['name', 'username', 'about'] as const).every(sameAsSubmitted)
  const generalError = error && Object.keys(fieldErrors).length === 0 && unchangedSinceSubmit ? error : undefined

  const nameError = nameProblem ?? serverError('name')
  const usernameError = usernameProblem ?? serverError('username')
  const aboutError = serverError('about')

  function update(field: keyof FormValues, value: string) {
    setValues((current) => ({ ...current, [field]: value }))
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!canSave) return
    setSubmitted(values)
    onSave(changes)
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-5">
      <div className="flex flex-col gap-2">
        <FormField
          id={ids.name}
          name="name"
          label="Nome"
          required
          maxLength={NAME_MAX_LENGTH}
          autoComplete="name"
          value={values.name}
          onChange={(event) => update('name', event.target.value)}
          aria-invalid={nameError ? true : undefined}
          aria-describedby={nameError ? `${ids.name}-error` : undefined}
        />
        {nameError && (
          <p id={`${ids.name}-error`} role="alert" className="text-sm text-red-600">
            {nameError}
          </p>
        )}
      </div>

      <div className="flex flex-col gap-2">
        <FormField
          id={ids.username}
          name="username"
          label="@username"
          maxLength={USERNAME_MAX_LENGTH}
          autoComplete="off"
          autoCapitalize="none"
          spellCheck={false}
          disabled={usernameLocked}
          value={values.username}
          onChange={(event) => update('username', event.target.value)}
          aria-invalid={usernameError ? true : undefined}
          aria-describedby={usernameError ? `${ids.username}-error ${ids.hint}` : ids.hint}
        />
        <p id={ids.hint} className="text-sm text-field">
          {usernameLocked && unlockAt
            ? `Você poderá trocar o @username em ${unlockDateFormat.format(unlockAt)}.`
            : 'De 3 a 30 caracteres: letras minúsculas, números ou _. Depois de trocar, você só poderá trocar de novo em 30 dias.'}
        </p>
        {usernameError && (
          <p id={`${ids.username}-error`} role="alert" className="text-sm text-red-600">
            {usernameError}
          </p>
        )}
      </div>

      <div className="flex flex-col gap-2">
        <TextareaField
          id={ids.about}
          name="about"
          label="Sobre"
          maxLength={ABOUT_MAX_LENGTH}
          value={values.about}
          onChange={(event) => update('about', event.target.value)}
          aria-invalid={aboutError ? true : undefined}
          aria-describedby={aboutError ? `${ids.about}-error` : undefined}
        />
        <p className="text-sm text-field">
          {values.about.length}/{ABOUT_MAX_LENGTH}
        </p>
        {aboutError && (
          <p id={`${ids.about}-error`} role="alert" className="text-sm text-red-600">
            {aboutError}
          </p>
        )}
      </div>

      {generalError && (
        <p role="alert" className="text-sm text-red-600">
          {generalError}
        </p>
      )}

      <div className="flex gap-3">
        <Button type="submit" disabled={!canSave}>
          Salvar
        </Button>
        <Button variant="outline" onClick={onClose} disabled={pending}>
          Cancelar
        </Button>
      </div>
    </form>
  )
}

export function EditProfileModal({ open, onClose, ...form }: EditProfileModalProps) {
  return (
    <Modal open={open} onClose={onClose} title="Editar perfil">
      <EditProfileForm onClose={onClose} {...form} />
    </Modal>
  )
}
