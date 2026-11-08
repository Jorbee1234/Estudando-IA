import { AuthorBadge } from './AuthorBadge'

type CommentItemProps = {
  authorName: string
  authorHandle: string
  authorAvatarUrl?: string | null
  body: string
  createdAt: string
}

const dateFormat = new Intl.DateTimeFormat('pt-BR', { dateStyle: 'medium', timeStyle: 'short' })

export function CommentItem({ authorName, authorHandle, authorAvatarUrl, body, createdAt }: CommentItemProps) {
  return (
    <article className="flex flex-col gap-2 rounded-lg bg-page p-4">
      <div className="flex items-center justify-between gap-4">
        <AuthorBadge name={authorName} handle={authorHandle} avatarUrl={authorAvatarUrl} />
        <time dateTime={createdAt} className="text-[15px] text-field">
          {dateFormat.format(new Date(createdAt))}
        </time>
      </div>
      <p className="text-[15px] leading-normal break-words text-muted">{body}</p>
    </article>
  )
}
