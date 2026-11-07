import type { CSSProperties } from 'react'
import type { Post } from '../../services/postService'
import type { Profile } from '../../services/profileService'
import { Button } from '../atoms/Button'
import { PostCard } from '../organisms/PostCard'
import { ProfileBanner } from '../organisms/ProfileBanner'
import { ProfileHeader } from '../organisms/ProfileHeader'

type ProfilePageProps = {
  profile?: Profile
  loading: boolean
  error?: string
  isOwner: boolean
  onEditAvatar: () => void
  onEditAppearance: () => void
  onEditProfile: () => void
  posts: Post[]
  postsLoading: boolean
  loadingMore: boolean
  hasMore: boolean
  onLoadMore: () => void
  onLike: (post: Post) => void
  onShare: (post: Post) => void
  onComment: (post: Post) => void
  postsError?: string
  actionError?: string
  notice?: string
}

export function ProfilePage({
  profile,
  loading,
  error,
  isOwner,
  onEditAvatar,
  onEditAppearance,
  onEditProfile,
  posts,
  postsLoading,
  loadingMore,
  hasMore,
  onLoadMore,
  onLike,
  onShare,
  onComment,
  postsError,
  actionError,
  notice,
}: ProfilePageProps) {
  if (!profile) {
    return (
      <>
        <title>Perfil | Code Connect</title>
        {loading && (
          <p role="status" className="text-center text-lg text-field">
            Carregando perfil...
          </p>
        )}
        {error && (
          <p role="alert" className="text-center text-lg text-red-600">
            {error}
          </p>
        )}
      </>
    )
  }

  const accent = profile.accentColor
    ? ({ '--color-accent': profile.accentColor } as CSSProperties)
    : undefined

  return (
    <div style={accent} className="flex flex-col gap-10">
      <title>{`${profile.name} | Code Connect`}</title>
      <ProfileBanner bannerUrl={profile.bannerUrl} editable={isOwner} onEdit={onEditAppearance} />
      <ProfileHeader
        profile={profile}
        isOwner={isOwner}
        onEditAvatar={onEditAvatar}
        onEditProfile={onEditProfile}
      />
      <hr className="h-px border-0 bg-field/40" />
      <section aria-labelledby="profile-projects" className="flex flex-col gap-8">
        <h2
          id="profile-projects"
          className="text-center text-[22px] leading-normal font-semibold text-accent underline"
        >
          {isOwner ? 'Meus projetos' : 'Projetos'}
        </h2>
        {notice && (
          <p role="status" className="text-center text-[15px] text-accent">
            {notice}
          </p>
        )}
        {(postsError || actionError) && (
          <p role="alert" className="text-center text-sm text-red-600">
            {postsError ?? actionError}
          </p>
        )}
        {postsLoading && posts.length === 0 && (
          <p role="status" className="text-center text-lg text-field">
            Carregando projetos...
          </p>
        )}
        {!postsLoading && !postsError && posts.length === 0 && (
          <p className="text-center text-lg text-field">
            {isOwner ? 'Você ainda não publicou nenhum projeto.' : 'Nenhum projeto publicado ainda.'}
          </p>
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
      </section>
    </div>
  )
}
