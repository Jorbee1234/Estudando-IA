import { useState } from 'react'
import { cva } from 'class-variance-authority'
import type { VariantProps } from 'class-variance-authority'
import { avatarColor } from '../../lib/placeholderGradient'

const avatar = cva(
  'flex shrink-0 items-center justify-center overflow-hidden rounded-full font-semibold text-white',
  {
    variants: {
      size: {
        sm: 'size-8 text-[15px]',
        xl: 'size-40 text-6xl md:size-[254px] md:text-8xl',
      },
    },
    defaultVariants: { size: 'sm' },
  },
)

type AvatarProps = VariantProps<typeof avatar> & {
  name: string
  src?: string | null
}

export function Avatar({ name, src, size }: AvatarProps) {
  const [failedSrc, setFailedSrc] = useState<string>()
  const initial = name.trim().charAt(0).toUpperCase() || '?'
  const showImage = Boolean(src) && failedSrc !== src

  return (
    <span
      aria-hidden="true"
      style={{ backgroundColor: avatarColor(name) }}
      className={avatar({ size })}
    >
      {showImage ? (
        <img
          src={src ?? undefined}
          alt=""
          onError={() => setFailedSrc(src ?? undefined)}
          className="size-full object-cover"
        />
      ) : (
        initial
      )}
    </span>
  )
}
