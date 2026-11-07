import { useState } from 'react'
import { FeedPage } from '../components/pages/FeedPage'
import { useFeed } from '../hooks/useFeed'
import { useFeedFilters } from '../hooks/useFeedFilters'
import { useShare } from '../hooks/useShare'
import { useTags } from '../hooks/useTags'
import type { Post } from '../services/postService'
import { useAppLayout } from './AppLayoutContext'
import { PostCommentsDialog } from './PostCommentsDialog'

const SUGGESTED_TAGS = 8

export function FeedRoute() {
  const { requireAuth, feedVersion } = useAppLayout()
  const { filters, searchText, setSearchText, addTag, removeTag, setSort, clear } = useFeedFilters()
  const tags = useTags()
  const feed = useFeed(filters, feedVersion)
  const { notice, share } = useShare()

  const [commentsPost, setCommentsPost] = useState<Post | null>(null)

  return (
    <>
      <FeedPage
        filters={{
          searchText,
          onSearchChange: setSearchText,
          selectedTags: filters.tags,
          suggestedTags: tags.slice(0, SUGGESTED_TAGS).map((tag) => tag.name),
          onAddTag: addTag,
          onRemoveTag: removeTag,
          onClear: clear,
        }}
        sort={filters.sort}
        onSortChange={setSort}
        posts={feed.posts}
        loading={feed.loading}
        loadingMore={feed.loadingMore}
        hasMore={feed.hasMore}
        onLoadMore={feed.loadMore}
        onLike={(post) => requireAuth(() => feed.toggleLike(post))}
        onShare={share}
        onComment={setCommentsPost}
        error={feed.error}
        actionError={feed.actionError}
        notice={notice}
      />
      {commentsPost && (
        <PostCommentsDialog
          post={commentsPost}
          onClose={() => setCommentsPost(null)}
          onCommentAdded={feed.addComment}
        />
      )}
    </>
  )
}
