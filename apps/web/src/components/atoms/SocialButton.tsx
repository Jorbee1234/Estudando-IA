type SocialButtonProps = {
  iconSrc: string
  iconWidth: number
  iconHeight: number
  // Visible provider name shown under the icon.
  name: string
  // Accessible name of the button; it must contain the visible name.
  label: string
  onClick: () => void
}

export function SocialButton({
  iconSrc,
  iconWidth,
  iconHeight,
  name,
  label,
  onClick,
}: SocialButtonProps) {
  return (
    <button
      type="button"
      aria-label={label}
      onClick={onClick}
      className="flex cursor-pointer flex-col items-center gap-1 rounded transition hover:brightness-125 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
    >
      <span className="flex h-8 items-center">
        <img src={iconSrc} alt="" width={iconWidth} height={iconHeight} />
      </span>
      <span className="text-[12.5px]">{name}</span>
    </button>
  )
}
