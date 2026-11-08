import { useEffect, useId, useRef, useState } from 'react'
import type { ChangeEvent } from 'react'
import { cva } from 'class-variance-authority'
import { ACCEPTED_IMAGE_TYPES, validateImageFile } from '../../lib/profileValidation'
import type { ImageKind } from '../../lib/profileValidation'
import { Label } from '../atoms/Label'

const preview = cva('bg-page object-cover', {
  variants: {
    shape: {
      circle: 'size-32 rounded-full',
      wide: 'aspect-[16/5] w-full rounded-lg',
    },
  },
})

type Preview = { file: File; url: string }

type ImageUploadFieldProps = {
  id: string
  label: string
  kind: ImageKind
  file: File | null
  onChange: (file: File | null) => void
  currentUrl?: string | null
  shape?: 'circle' | 'wide'
}

export function ImageUploadField({
  id,
  label,
  kind,
  file,
  onChange,
  currentUrl,
  shape = 'circle',
}: ImageUploadFieldProps) {
  const errorId = useId()
  const input = useRef<HTMLInputElement>(null)
  const objectUrl = useRef<string>(undefined)
  const [error, setError] = useState<string>()
  const [chosen, setChosen] = useState<Preview>()

  useEffect(
    () => () => {
      if (objectUrl.current) URL.revokeObjectURL(objectUrl.current)
    },
    [],
  )

  function replacePreview(next?: Preview) {
    if (objectUrl.current) URL.revokeObjectURL(objectUrl.current)
    objectUrl.current = next?.url
    setChosen(next)
  }

  function handleChange(event: ChangeEvent<HTMLInputElement>) {
    const selected = event.target.files?.[0]
    if (!selected) {
      setError(undefined)
      replacePreview(undefined)
      onChange(null)
      return
    }

    const problem = validateImageFile(selected, kind)
    setError(problem)
    if (problem) {
      if (input.current) input.current.value = ''
      replacePreview(undefined)
      onChange(null)
      return
    }

    replacePreview(
      typeof URL.createObjectURL === 'function'
        ? { file: selected, url: URL.createObjectURL(selected) }
        : undefined,
    )
    onChange(selected)
  }

  const shown = chosen && chosen.file === file ? chosen.url : currentUrl

  return (
    <div className="flex flex-col gap-2">
      <Label htmlFor={id}>{label}</Label>
      {shown && <img src={shown} alt="Pré-visualização" className={preview({ shape })} />}
      <input
        ref={input}
        id={id}
        type="file"
        accept={ACCEPTED_IMAGE_TYPES.join(',')}
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? errorId : undefined}
        onChange={handleChange}
        className="text-sm text-field file:mr-4 file:cursor-pointer file:rounded-lg file:border file:border-accent file:bg-transparent file:px-4 file:py-2 file:text-accent"
      />
      {error && (
        <p id={errorId} role="alert" className="text-sm text-red-600">
          {error}
        </p>
      )}
    </div>
  )
}
