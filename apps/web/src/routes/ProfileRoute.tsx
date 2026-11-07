import { useState } from 'react'
import { useParams } from 'react-router'
import { useAuth } from '../auth/AuthContext'
import { ProfilePage } from '../components/pages/ProfilePage'
import { EditProfileModal } from '../components/organisms/EditProfileModal'
import { AvatarUploadModal } from '../components/organisms/AvatarUploadModal'
import { ProfileAppearanceModal } from '../components/organisms/ProfileAppearanceModal'
import type { AppearanceChange } from '../components/organisms/ProfileAppearanceModal'
import { useAsyncAction } from '../hooks/useAsyncAction'
import { useFeed } from '../hooks/useFeed'
import type { FeedFilters } from '../hooks/useFeedFilters'
import { useProfile } from '../hooks/useProfile'
import { useShare } from '../hooks/useShare'
import type { Post } from '../services/postService'
import type { ProfileChanges } from '../services/profileService'
import { removeImage, updateProfile, uploadImage } from '../services/profileService'
import { useAppLayout } from './AppLayoutContext'
import { PostCommentsDialog } from './PostCommentsDialog'

const ALL_POSTS: FeedFilters = { q: '', tags: [], sort: 'recent' }

export function ProfileRoute() {
  const { userId = '' } = useParams()
  const { user } = useAuth()
  const { requireAuth, feedVersion, refreshFeed } = useAppLayout()
  const { profile, loading, error, reload, replace } = useProfile(userId, feedVersion)
  const feed = useFeed(ALL_POSTS, feedVersion, userId)
  const { notice, share } = useShare()

  const [commentsPost, setCommentsPost] = useState<Post | null>(null)
  const [avatarOpen, setAvatarOpen] = useState(false)
  const [appearanceOpen, setAppearanceOpen] = useState(false)
  const [editProfileOpen, setEditProfileOpen] = useState(false)

  const editProfile = useAsyncAction()
  const avatar = useAsyncAction()
  const appearance = useAsyncAction()

  const isOwner = user !== null && user.id === userId

  async function saveProfile(changes: ProfileChanges) {
    const saved = await editProfile.run(async () => {
      replace(await updateProfile(changes))
    })
    if (saved) {
      refreshFeed()
      setEditProfileOpen(false)
    }
  }

  async function saveAvatar(file: File) {
    const saved = await avatar.run(async () => {
      await uploadImage('avatar', file)
      await reload()
    })
    if (saved) setAvatarOpen(false)
  }

  async function removeAvatar() {
    const removed = await avatar.run(async () => {
      await removeImage('avatar')
      await reload()
    })
    if (removed) setAvatarOpen(false)
  }

  async function saveAppearance({ accentColor, banner, removeBanner }: AppearanceChange) {
    if (!profile) return
    const saved = await appearance.run(async () => {
      await updateProfile({ accentColor: accentColor ?? '' })
      if (banner) await uploadImage('banner', banner)
      else if (removeBanner) await removeImage('banner')
      await reload()
    })
    if (saved) setAppearanceOpen(false)
  }

  return (
    <>
      <ProfilePage
        profile={profile}
        loading={loading}
        error={error}
        isOwner={isOwner}
        onEditAvatar={() => {
          avatar.clearError()
          setAvatarOpen(true)
        }}
        onEditAppearance={() => {
          appearance.clearError()
          setAppearanceOpen(true)
        }}
        onEditProfile={() => {
          editProfile.clearError()
          setEditProfileOpen(true)
        }}
        posts={feed.posts}
        postsLoading={feed.loading}
        loadingMore={feed.loadingMore}
        hasMore={feed.hasMore}
        onLoadMore={feed.loadMore}
        onLike={(post) => requireAuth(() => feed.toggleLike(post))}
        onShare={share}
        onComment={setCommentsPost}
        postsError={feed.error}
        actionError={feed.actionError}
        notice={notice}
      />
      {profile && isOwner && (
        <>
          <EditProfileModal
            open={editProfileOpen}
            onClose={() => setEditProfileOpen(false)}
            profile={profile}
            onSave={saveProfile}
            error={editProfile.error}
            fieldErrors={editProfile.fieldErrors}
            pending={editProfile.pending}
          />
          <AvatarUploadModal
            open={avatarOpen}
            onClose={() => setAvatarOpen(false)}
            avatarUrl={profile.avatarUrl}
            onSave={saveAvatar}
            onRemove={removeAvatar}
            error={avatar.error}
            pending={avatar.pending}
          />
          <ProfileAppearanceModal
            open={appearanceOpen}
            onClose={() => setAppearanceOpen(false)}
            bannerUrl={profile.bannerUrl}
            accentColor={profile.accentColor}
            onSave={saveAppearance}
            error={appearance.error}
            pending={appearance.pending}
          />
        </>
      )}
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
