import { api } from '../lib/api'
import type { ImageKind } from '../lib/profileValidation'
import type { Link } from './authService'

export type Profile = {
  id: string
  name: string
  handle: string
  about: string | null
  accentColor: string | null
  avatarUrl: string | null
  bannerUrl: string | null
  postsCount: number
  usernameChangeAvailableAt: string | null
  links: Link[]
}

export type ProfileChanges = {
  name?: string
  username?: string
  about?: string
  accentColor?: string
}

export const getProfile = (userId: string) => api.get<Profile>(`/profiles/${userId}`)

export const updateProfile = (changes: ProfileChanges) => api.patch<Profile>('/profiles/me', changes)

export function uploadImage(kind: ImageKind, file: File) {
  const form = new FormData()
  form.append('file', file)
  return api.put<void>(`/profiles/me/${kind}`, form, {
    headers: { 'Content-Type': 'multipart/form-data' },
  })
}

export const removeImage = (kind: ImageKind) => api.delete<void>(`/profiles/me/${kind}`)
