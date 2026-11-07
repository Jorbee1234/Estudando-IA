import { useState } from 'react'
import type { FormEvent } from 'react'
import { DEFAULT_ACCENT, hasEnoughContrast } from '../../lib/profileValidation'
import { Button } from '../atoms/Button'
import { Modal } from '../atoms/Modal'
import { ColorPicker } from '../molecules/ColorPicker'
import { ImageUploadField } from '../molecules/ImageUploadField'

export type AppearanceChange = {
  accentColor: string | null
  banner: File | null
  removeBanner: boolean
}

type ProfileAppearanceModalProps = {
  open: boolean
  onClose: () => void
  bannerUrl: string | null
  accentColor: string | null
  onSave: (change: AppearanceChange) => void
  error?: string
  pending?: boolean
}

type AppearanceFormProps = Omit<ProfileAppearanceModalProps, 'open' | 'onClose'>

function AppearanceForm({ bannerUrl, accentColor, onSave, error, pending = false }: AppearanceFormProps) {
  const [color, setColor] = useState(accentColor)
  const [banner, setBanner] = useState<File | null>(null)
  const [removeBanner, setRemoveBanner] = useState(false)

  const legible = hasEnoughContrast(color ?? DEFAULT_ACCENT)

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!legible) return
    onSave({ accentColor: color, banner, removeBanner: removeBanner && !banner })
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-6">
      <ColorPicker label="Cor de destaque" value={color} onChange={setColor} />
      <ImageUploadField
        id="banner-file"
        label="Banner (PNG, JPEG ou WebP de até 4 MB)"
        kind="banner"
        shape="wide"
        file={banner}
        onChange={setBanner}
        currentUrl={removeBanner ? null : bannerUrl}
      />
      {bannerUrl && !banner && (
        <label className="flex cursor-pointer items-center gap-2 text-field">
          <input
            type="checkbox"
            checked={removeBanner}
            onChange={(event) => setRemoveBanner(event.target.checked)}
            className="size-4 accent-accent"
          />
          Remover banner atual
        </label>
      )}
      {error && (
        <p role="alert" className="text-sm text-red-600">
          {error}
        </p>
      )}
      <Button type="submit" disabled={pending || !legible}>
        Salvar aparência
      </Button>
    </form>
  )
}

export function ProfileAppearanceModal({ open, onClose, ...form }: ProfileAppearanceModalProps) {
  return (
    <Modal open={open} onClose={onClose} title="Banner e cor">
      <AppearanceForm {...form} />
    </Modal>
  )
}
