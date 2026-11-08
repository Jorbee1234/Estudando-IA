import { focusRing } from '../../lib/cn'
import type { Profile } from '../../services/profileService'
import { Avatar } from '../atoms/Avatar'
import { Button } from '../atoms/Button'
import { Icon } from '../atoms/Icon'
import { ProfileStat } from '../molecules/ProfileStat'

type ProfileHeaderProps = {
  profile: Profile
  isOwner: boolean
  onEditAvatar: () => void
  onEditProfile: () => void
}

export function ProfileHeader({ profile, isOwner, onEditAvatar, onEditProfile }: ProfileHeaderProps) {
  const avatar = <Avatar name={profile.name} src={profile.avatarUrl} size="xl" />

  return (
    <header className="flex flex-col items-center gap-6 md:flex-row md:items-center">
      {isOwner ? (
        <button
          type="button"
          onClick={onEditAvatar}
          aria-label="Alterar foto de perfil"
          className={`group relative cursor-pointer rounded-full ${focusRing}`}
        >
          {avatar}
          <span className="absolute inset-0 flex items-center justify-center rounded-full bg-page/60 text-white opacity-0 transition group-hover:opacity-100 group-focus-visible:opacity-100">
            <Icon name="camera" className="size-10" />
          </span>
        </button>
      ) : (
        avatar
      )}
      <div className="flex min-w-0 flex-1 flex-col gap-4 text-center md:text-left">
        <div className="flex flex-col items-center gap-4 md:flex-row md:gap-8">
          <p className="text-[22px] leading-normal font-semibold text-field">@{profile.handle}</p>
          {isOwner && (
            <Button variant="outline" onClick={onEditProfile} className="w-auto px-6">
              <Icon name="edit" />
              Editar perfil
            </Button>
          )}
        </div>
        <h1 className="text-[26px] leading-normal font-semibold break-words text-accent">{profile.name}</h1>
        {profile.about ? (
          <p className="text-lg leading-normal whitespace-pre-line text-field">{profile.about}</p>
        ) : (
          isOwner && <p className="text-lg leading-normal text-field">Conte um pouco sobre você.</p>
        )}
        <div className="flex items-center justify-center gap-6 md:justify-start">
          <ProfileStat value={profile.postsCount} label={profile.postsCount === 1 ? 'Projeto' : 'Projetos'} />
        </div>
      </div>
    </header>
  )
}
