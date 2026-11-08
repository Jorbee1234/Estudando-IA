import type { ComponentProps } from 'react'
import type { Post, PostSort } from '../../services/postService'
import { Button } from '../atoms/Button'
import { TabList } from '../molecules/TabList'
import { FeedFilters } from '../organisms/FeedFilters'
import { PostCard } from '../organisms/PostCard'

const sortOptions: { value: PostSort; label: string }[] = [
  { value: 'recent', label: 'Recentes' },
  { value: 'popular', label: 'Populares' },
]

type FeedPageProps = {
  filters: ComponentProps<typeof FeedFilters>
  sort: PostSort
  onSortChange: (sort: PostSort) => void
  posts: Post[]
  loading: boolean
  loadingMore: boolean
  hasMore: boolean
  onLoadMore: () => void
  onLike: (post: Post) => void
  onShare: (post: Post) => void
  onComment: (post: Post) => void
  error?: string
  actionError?: string
  notice?: string
}

export function FeedPage({
  filters,
  sort,
  onSortChange,
  posts,
  loading,
  loadingMore,
  hasMore,
  onLoadMore,
  onLike,
  onShare,
  onComment,
  error,
  actionError,
  notice,
}: FeedPageProps) {
  return (
    <>
      <title>Feed | Code Connect</title>
      <h1 className="sr-only">Feed</h1>
      <FeedFilters {...filters} />
      <div className="flex flex-col gap-8">
        <TabList label="Ordenação" options={sortOptions} value={sort} onChange={onSortChange} />
        {notice && (
          <p role="status" className="text-center text-[15px] text-accent">
            {notice}
          </p>
        )}
        {(error || actionError) && (
          <p role="alert" className="text-center text-sm text-red-600">
            {error ?? actionError}
          </p>
        )}
        {loading && posts.length === 0 && (
          <p role="status" className="text-center text-lg text-field">
            Carregando posts...
          </p>
        )}
        {!loading && !error && posts.length === 0 && (
          <p className="text-center text-lg text-field">Nenhum post encontrado.</p>
        )}
        {posts.length > 0 && (
          <ul className="grid grid-cols-1 gap-6 md:grid-cols-2">
            {posts.map((post) => (
              <li key={post.id}>
                <PostCard post={post} onLike={onLike} onShare={onShare} onComment={onComment} />
              </li>
            ))}
          </ul>
        )}
        {hasMore && (
          <div className="mx-auto w-full max-w-[240px]">
            <Button variant="outline" onClick={onLoadMore} disabled={loadingMore}>
              {loadingMore ? 'Carregando...' : 'Carregar mais'}
            </Button>
          </div>
        )}
      </div>
    </>
  )
}
