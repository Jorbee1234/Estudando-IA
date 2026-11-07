import type { Post } from '../../services/postService'
import { AuthorBadge } from '../molecules/AuthorBadge'
import { PostThumbnail } from '../molecules/PostThumbnail'
import { TagList } from '../molecules/TagList'
import { PostActions } from './PostActions'

type PostCardProps = {
  post: Post
  onLike: (post: Post) => void
  onShare: (post: Post) => void
  onComment: (post: Post) => void
}

export function PostCard({ post, onLike, onShare, onComment }: PostCardProps) {
  return (
    <article className="flex h-full flex-col">
      <PostThumbnail postId={post.id} src={post.thumbnailUrl} />
      <div className="flex flex-1 flex-col gap-4 rounded-b-lg bg-card p-4">
        <div className="flex flex-col gap-2 text-muted">
          <h2 className="text-lg leading-normal font-semibold">{post.title}</h2>
          <p className="line-clamp-3 text-[15px] leading-normal">{post.description}</p>
        </div>
        <TagList tags={post.tags} />
        <div className="mt-auto flex items-center justify-between gap-4">
          <PostActions
            likesCount={post.likesCount}
            commentsCount={post.commentsCount}
            liked={post.likedByMe}
            onLike={() => onLike(post)}
            onShare={() => onShare(post)}
            onComment={() => onComment(post)}
          />
          <AuthorBadge
            name={post.author.name}
            handle={post.author.handle}
            userId={post.author.id}
            avatarUrl={post.author.avatarUrl}
          />
        </div>
      </div>
    </article>
  )
}
