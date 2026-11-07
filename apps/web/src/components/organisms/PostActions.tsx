import { IconCount } from '../molecules/IconCount'

type PostActionsProps = {
  likesCount: number
  commentsCount: number
  liked: boolean
  onLike: () => void
  onShare: () => void
  onComment: () => void
}

export function PostActions({
  likesCount,
  commentsCount,
  liked,
  onLike,
  onShare,
  onComment,
}: PostActionsProps) {
  return (
    <div className="flex items-center gap-4">
      <IconCount icon="code" label="Curtir" count={likesCount} pressed={liked} onClick={onLike} />
      <IconCount icon="share" label="Compartilhar" onClick={onShare} />
      <IconCount icon="chat" label="Comentários" count={commentsCount} onClick={onComment} />
    </div>
  )
}
