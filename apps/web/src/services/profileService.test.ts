import { afterEach, describe, expect, it, vi } from 'vitest'
import { http } from '../lib/api'
import { getProfile, removeImage, updateProfile, uploadImage } from './profileService'

afterEach(() => vi.restoreAllMocks())

describe('profileService', () => {
  it('reads a profile by user id', async () => {
    const request = vi.spyOn(http, 'request').mockResolvedValue({ status: 200, data: { id: 'u1' } })

    const profile = await getProfile('u1')

    expect(request.mock.calls[0][0]).toMatchObject({ url: '/profiles/u1', method: 'GET' })
    expect(profile).toEqual({ id: 'u1' })
  })

  it('updates only the given fields with a PATCH to /profiles/me', async () => {
    const request = vi.spyOn(http, 'request').mockResolvedValue({ status: 200, data: { name: 'Novo' } })

    const profile = await updateProfile({ name: 'Novo', username: 'novo_user' })

    expect(request.mock.calls[0][0]).toMatchObject({
      url: '/profiles/me',
      method: 'PATCH',
      data: { name: 'Novo', username: 'novo_user' },
    })
    expect(profile).toEqual({ name: 'Novo' })
  })

  it('sends an empty string to clear the about or the color', async () => {
    const request = vi.spyOn(http, 'request').mockResolvedValue({ status: 200, data: {} })

    await updateProfile({ about: '', accentColor: '' })

    expect(request.mock.calls[0][0]).toMatchObject({ data: { about: '', accentColor: '' } })
  })

  it.each(['avatar', 'banner'] as const)('uploads the %s as a multipart file part', async (kind) => {
    const request = vi.spyOn(http, 'request').mockResolvedValue({ status: 204, data: '' })
    const file = new File(['x'], 'foto.png', { type: 'image/png' })

    await uploadImage(kind, file)

    const config = request.mock.calls[0][0]
    expect(config).toMatchObject({ url: `/profiles/me/${kind}`, method: 'PUT' })
    expect(config.data).toBeInstanceOf(FormData)
    expect((config.data as FormData).get('file')).toBe(file)
    expect(config.headers).toMatchObject({ 'Content-Type': 'multipart/form-data' })
  })

  it.each(['avatar', 'banner'] as const)('removes the %s with DELETE', async (kind) => {
    const request = vi.spyOn(http, 'request').mockResolvedValue({ status: 204, data: '' })

    await removeImage(kind)

    expect(request.mock.calls[0][0]).toMatchObject({ url: `/profiles/me/${kind}`, method: 'DELETE' })
  })
})
