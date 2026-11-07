import { Link } from 'react-router'
import { focusRing } from '../../lib/cn'
import { Avatar } from '../atoms/Avatar'

type AuthorBadgeProps = {
  name: string
  handle: string
  userId?: string
  avatarUrl?: string | null
}

export function AuthorBadge({ name, handle, userId, avatarUrl }: AuthorBadgeProps) {
  const content = (
    <>
      <Avatar name={name} src={avatarUrl} />
      <span title={name} className="text-[15px] leading-normal font-semibold text-field">
        @{handle}
      </span>
    </>
  )

  if (!userId) {
    return <div className="flex items-center gap-2">{content}</div>
  }

  return (
    <Link
      to={`/perfil/${userId}`}
      aria-label={`Ver perfil de ${name}`}
      className={`flex items-center gap-2 rounded hover:opacity-80 ${focusRing}`}
    >
      {content}
    </Link>
  )
}
