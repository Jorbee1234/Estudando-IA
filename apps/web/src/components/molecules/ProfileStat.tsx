type ProfileStatProps = {
  value: number
  label: string
}

export function ProfileStat({ value, label }: ProfileStatProps) {
  return (
    <p className="flex items-center gap-2 text-lg leading-normal text-field">
      <span className="font-semibold">{value}</span>
      <span>{label}</span>
    </p>
  )
}
