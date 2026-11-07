import { Icon } from '../atoms/Icon'
import { focusRing } from '../../lib/cn'

type ProfileBannerProps = {
  bannerUrl: string | null
  editable: boolean
  onEdit: () => void
}

export function ProfileBanner({ bannerUrl, editable, onEdit }: ProfileBannerProps) {
  return (
    <div className="relative aspect-[16/5] min-h-32 w-full overflow-hidden rounded-lg bg-linear-to-br from-accent/40 to-card">
      {bannerUrl && <img src={bannerUrl} alt="" className="size-full object-cover" />}
      {editable && (
        <button
          type="button"
          onClick={onEdit}
          className={`absolute right-3 bottom-3 flex cursor-pointer items-center gap-2 rounded-lg bg-page/80 px-4 py-2 text-[15px] font-semibold text-accent hover:bg-page ${focusRing}`}
        >
          <Icon name="edit" />
          Banner e cor
        </button>
      )}
    </div>
  )
}
