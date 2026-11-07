import { useState } from 'react'
import { placeholderGradient } from '../../lib/placeholderGradient'
import { Icon } from '../atoms/Icon'

type PostThumbnailProps = {
  postId: string
  src: string | null
}

export function PostThumbnail({ postId, src }: PostThumbnailProps) {
  const [failedSrc, setFailedSrc] = useState<string>()
  const showImage = src !== null && src !== failedSrc

  return (
    <div className="flex h-60 rounded-t-lg bg-field p-6">
      <div className="size-full overflow-hidden rounded-lg shadow-[0_16px_24px_rgba(0,0,0,0.24)]">
        {showImage ? (
          <img
            src={src}
            alt=""
            loading="lazy"
            onError={() => setFailedSrc(src)}
            className="size-full object-cover"
          />
        ) : (
          <div
            data-testid="thumbnail-placeholder"
            aria-hidden="true"
            style={{ background: placeholderGradient(postId) }}
            className="flex size-full items-center justify-center text-white/80"
          >
            <Icon name="code" className="size-16" />
          </div>
        )}
      </div>
    </div>
  )
}
