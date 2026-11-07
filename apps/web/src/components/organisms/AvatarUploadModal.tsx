import { useState } from 'react'
import type { FormEvent } from 'react'
import { Button } from '../atoms/Button'
import { Modal } from '../atoms/Modal'
import { ImageUploadField } from '../molecules/ImageUploadField'

type AvatarUploadModalProps = {
  open: boolean
  onClose: () => void
  avatarUrl: string | null
  onSave: (file: File) => void
  onRemove: () => void
  error?: string
  pending?: boolean
}

type AvatarFormProps = Omit<AvatarUploadModalProps, 'open' | 'onClose'>

function AvatarForm({ avatarUrl, onSave, onRemove, error, pending = false }: AvatarFormProps) {
  const [file, setFile] = useState<File | null>(null)

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (file) onSave(file)
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <ImageUploadField
        id="avatar-file"
        label="Escolha uma imagem PNG, JPEG ou WebP de até 2 MB"
        kind="avatar"
        file={file}
        onChange={setFile}
        currentUrl={avatarUrl}
      />
      {error && (
        <p role="alert" className="text-sm text-red-600">
          {error}
        </p>
      )}
      <Button type="submit" disabled={!file || pending}>
        Salvar foto
      </Button>
      {avatarUrl && (
        <Button variant="outline" onClick={onRemove} disabled={pending}>
          Remover foto
        </Button>
      )}
    </form>
  )
}

export function AvatarUploadModal({ open, onClose, ...form }: AvatarUploadModalProps) {
  return (
    <Modal open={open} onClose={onClose} title="Foto de perfil">
      <AvatarForm {...form} />
    </Modal>
  )
}
