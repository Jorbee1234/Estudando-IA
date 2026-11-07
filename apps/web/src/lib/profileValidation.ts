export const ABOUT_MAX_LENGTH = 500

export type ImageKind = 'avatar' | 'banner'

export const IMAGE_MAX_BYTES: Record<ImageKind, number> = {
  avatar: 2 * 1024 * 1024,
  banner: 4 * 1024 * 1024,
}

export const ACCEPTED_IMAGE_TYPES = ['image/png', 'image/jpeg', 'image/webp']

export const DEFAULT_ACCENT = '#81FE88'

export const ACCENT_PRESETS: { name: string; value: string }[] = [
  { name: 'Verde', value: DEFAULT_ACCENT },
  { name: 'Azul', value: '#7DD3FC' },
  { name: 'Roxo', value: '#C4B5FD' },
  { name: 'Rosa', value: '#F9A8D4' },
  { name: 'Laranja', value: '#FDBA74' },
  { name: 'Amarelo', value: '#FDE047' },
  { name: 'Branco', value: '#FFFFFF' },
]

export const NAME_MIN_LENGTH = 2
export const NAME_MAX_LENGTH = 100

export function validateName(value: string): string | undefined {
  const length = value.trim().length
  return length < NAME_MIN_LENGTH || length > NAME_MAX_LENGTH ? messages.invalidName : undefined
}

export const USERNAME_MIN_LENGTH = 3
export const USERNAME_MAX_LENGTH = 30

const RESERVED_USERNAMES = ['me', 'admin', 'administrator', 'root', 'api', 'system', 'support', 'null', 'undefined']

export function normalizeUsername(value: string): string {
  return value.trim().replace(/^@/, '').toLowerCase()
}

export function validateUsername(value: string): string | undefined {
  const username = normalizeUsername(value)
  const validLength = username.length >= USERNAME_MIN_LENGTH && username.length <= USERNAME_MAX_LENGTH
  if (!validLength || !/^[a-z0-9_]+$/.test(username) || RESERVED_USERNAMES.includes(username)) {
    return messages.invalidUsername
  }
  return undefined
}

const PAGE_BACKGROUND_LUMINANCE = 0.0023
const MIN_CONTRAST = 3

export const messages = {
  invalidImageType: 'A imagem deve ser PNG, JPEG ou WebP.',
  avatarTooLarge: 'A foto de perfil deve ter no máximo 2 MB.',
  bannerTooLarge: 'O banner deve ter no máximo 4 MB.',
  emptyImage: 'O arquivo selecionado está vazio.',
  invalidName: 'O nome deve ter de 2 a 100 caracteres.',
  invalidUsername:
    'O @username deve ter de 3 a 30 caracteres: letras minúsculas, números ou _ (e não pode ser uma palavra reservada).',
  lowContrast: 'Esta cor tem pouco contraste com o fundo escuro. Escolha uma cor mais clara.',
}

export function validateImageFile(file: File, kind: ImageKind): string | undefined {
  if (!ACCEPTED_IMAGE_TYPES.includes(file.type)) return messages.invalidImageType
  if (file.size === 0) return messages.emptyImage
  if (file.size > IMAGE_MAX_BYTES[kind]) {
    return kind === 'avatar' ? messages.avatarTooLarge : messages.bannerTooLarge
  }
  return undefined
}

export function isHexColor(value: string): boolean {
  return /^#[0-9a-fA-F]{6}$/.test(value)
}

function channel(hex: string, start: number): number {
  const value = parseInt(hex.slice(start, start + 2), 16) / 255
  return value <= 0.03928 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4
}

export function contrastAgainstBackground(hex: string): number {
  const luminance = 0.2126 * channel(hex, 1) + 0.7152 * channel(hex, 3) + 0.0722 * channel(hex, 5)
  return (luminance + 0.05) / (PAGE_BACKGROUND_LUMINANCE + 0.05)
}

export function hasEnoughContrast(hex: string): boolean {
  return contrastAgainstBackground(hex) >= MIN_CONTRAST
}
