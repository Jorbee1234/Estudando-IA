import { useAuth } from '../auth/AuthContext'
import { Modal } from '../components/atoms/Modal'
import { CommentSection } from '../components/organisms/CommentSection'
import { useComments } from '../hooks/useComments'
import type { Post } from '../services/postService'
import { useAppLayout } from './AppLayoutContext'

type PostCommentsDialogProps = {
  post: Post
  onClose: () => void
  onCommentAdded: (postId: string) => void
}

export function PostCommentsDialog({ post, onClose, onCommentAdded }: PostCommentsDialogProps) {
  const { user } = useAuth()
  const { requireAuth } = useAppLayout()
  const { comments, loading, hasMore, loadMore, add, submitting, error } = useComments(post.id)

  return (
    <Modal open onClose={onClose} title={post.title}>
      <CommentSection
        comments={comments}
        loading={loading}
        hasMore={hasMore}
        onLoadMore={loadMore}
        authenticated={user !== null}
        onRequireAuth={() => requireAuth(() => {})}
        onSubmit={async (body) => {
          if (await add(body)) onCommentAdded(post.id)
        }}
        submitting={submitting}
        error={error}
      />
    </Modal>
  )
}
