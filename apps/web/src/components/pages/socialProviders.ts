import type { SocialProvider } from '../molecules/SocialLogin'

export const socialProviders: SocialProvider[] = [
  {
    id: 'github',
    name: 'Github',
    label: 'Entrar com Github',
    iconSrc: '/github.svg',
    iconWidth: 33,
    iconHeight: 32,
  },
  {
    id: 'gmail',
    name: 'Gmail',
    label: 'Entrar com Gmail',
    iconSrc: '/google.svg',
    iconWidth: 28,
    iconHeight: 28,
  },
]
