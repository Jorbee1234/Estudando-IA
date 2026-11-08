import { Divider } from '../atoms/Divider'
import { SocialButton } from '../atoms/SocialButton'

export type SocialProvider = {
  id: string
  name: string
  label: string
  iconSrc: string
  iconWidth: number
  iconHeight: number
}

type SocialLoginProps = {
  title: string
  providers: SocialProvider[]
  onSelect: (providerId: string) => void
}

export function SocialLogin({ title, providers, onSelect }: SocialLoginProps) {
  return (
    <div className="flex flex-col gap-[9px]">
      <Divider>{title}</Divider>
      <div className="flex items-start justify-center gap-6">
        {providers.map((provider) => (
          <SocialButton
            key={provider.id}
            iconSrc={provider.iconSrc}
            iconWidth={provider.iconWidth}
            iconHeight={provider.iconHeight}
            name={provider.name}
            label={provider.label}
            onClick={() => onSelect(provider.id)}
          />
        ))}
      </div>
    </div>
  )
}
