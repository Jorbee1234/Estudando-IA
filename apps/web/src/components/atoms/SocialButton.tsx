type SocialButtonProps = {
  iconSrc: string
  label: string
  onClick: () => void
}

// The provider images already include their visible name, so the label is only
// exposed to assistive technology.
export function SocialButton({ iconSrc, label, onClick }: SocialButtonProps) {
  return (
    <button
      type="button"
      aria-label={label}
      onClick={onClick}
      className="cursor-pointer rounded transition hover:brightness-125 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
    >
      <img src={iconSrc} alt="" />
    </button>
  )
}
