import type { FormEvent } from 'react'
import type { PostComment } from '../../services/postService'
import { Button } from '../atoms/Button'
import { Textarea } from '../atoms/Textarea'
import { CommentItem } from '../molecules/CommentItem'

type CommentSectionProps = {
  comments: PostComment[]
  loading: boolean
  hasMore: boolean
  onLoadMore: () => void
  authenticated: boolean
  onRequireAuth: () => void
  onSubmit: (body: string) => void
  submitting?: boolean
  error?: string
}

export function CommentSection({
  comments,
  loading,
  hasMore,
  onLoadMore,
  authenticated,
  onRequireAuth,
  onSubmit,
  submitting = false,
  error,
}: CommentSectionProps) {
  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const form = event.currentTarget
    const body = String(new FormData(form).get('body')).trim()
    if (!body) return
    onSubmit(body)
    form.reset()
  }

  return (
    <section aria-label="Comentários" className="flex flex-col gap-4">
      {authenticated ? (
        <form onSubmit={handleSubmit} className="flex flex-col gap-3">
          <Textarea
            name="body"
            aria-label="Escreva um comentário"
            placeholder="Escreva um comentário"
            maxLength={1000}
            required
          />
          <Button type="submit" disabled={submitting}>
            Comentar
          </Button>
        </form>
      ) : (
        <Button variant="outline" onClick={onRequireAuth}>
          Entre para comentar
        </Button>
      )}
      {error && (
        <p role="alert" className="text-sm text-red-600">
          {error}
        </p>
      )}
      {comments.length > 0 && (
        <div className="flex flex-col gap-3">
          {comments.map((comment) => (
            <CommentItem
              key={comment.id}
              authorName={comment.author.name}
              authorHandle={comment.author.handle}
              authorAvatarUrl={comment.author.avatarUrl}
              body={comment.body}
              createdAt={comment.createdAt}
            />
          ))}
        </div>
      )}
      {!loading && comments.length === 0 && (
        <p className="text-[15px] text-field">Ainda não há comentários.</p>
      )}
      {loading && <p className="text-[15px] text-field">Carregando comentários...</p>}
      {hasMore && !loading && (
        <button
          type="button"
          onClick={onLoadMore}
          className="cursor-pointer self-center text-lg text-accent hover:brightness-125 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
        >
          Ver mais comentários
        </button>
      )}
    </section>
  )
}
