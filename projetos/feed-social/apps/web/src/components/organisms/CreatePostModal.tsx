import type { FormEvent } from 'react'
import type { NewPost } from '../../services/postService'
import { Button } from '../atoms/Button'
import { Modal } from '../atoms/Modal'
import { FormField } from '../molecules/FormField'
import { TextareaField } from '../molecules/TextareaField'

type CreatePostModalProps = {
  open: boolean
  onClose: () => void
  onSubmit: (post: NewPost) => void
  error?: string
  pending?: boolean
}

export function CreatePostModal({ open, onClose, onSubmit, error, pending = false }: CreatePostModalProps) {
  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const data = new FormData(event.currentTarget)
    const thumbnailUrl = String(data.get('thumbnailUrl')).trim()
    onSubmit({
      title: String(data.get('title')).trim(),
      description: String(data.get('description')).trim(),
      tags: String(data.get('tags'))
        .split(',')
        .map((tag) => tag.trim())
        .filter(Boolean),
      ...(thumbnailUrl && { thumbnailUrl }),
    })
  }

  return (
    <Modal open={open} onClose={onClose} title="Publicar projeto">
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <FormField id="post-title" name="title" label="Título" maxLength={120} minLength={3} required />
        <TextareaField id="post-description" name="description" label="Descrição" maxLength={2000} required />
        <FormField
          id="post-tags"
          name="tags"
          label="Tags (separadas por vírgula, até 5)"
          placeholder="React, CSS, Acessibilidade"
        />
        <FormField
          id="post-thumbnail"
          name="thumbnailUrl"
          label="URL da imagem de capa (opcional)"
          type="url"
          placeholder="https://..."
        />
        {error && (
          <p role="alert" className="text-sm text-red-600">
            {error}
          </p>
        )}
        <Button type="submit" disabled={pending}>
          Publicar
        </Button>
      </form>
    </Modal>
  )
}
