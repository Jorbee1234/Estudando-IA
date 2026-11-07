import { afterEach, describe, expect, it, vi } from 'vitest'
import { http } from '../lib/api'
import { listPosts, likePost } from './postService'

afterEach(() => vi.restoreAllMocks())

describe('postService', () => {
  it('sends repeated tag parameters and omits an empty cursor', async () => {
    const request = vi
      .spyOn(http, 'request')
      .mockResolvedValue({ status: 200, data: { items: [], nextCursor: null, links: [] } })

    await listPosts({ q: 'css', tags: ['React', 'CSS'], sort: 'popular', cursor: null })

    const config = request.mock.calls[0][0]
    expect(config.url).toBe('/posts')
    expect(config.params).toEqual({ q: 'css', tags: ['React', 'CSS'], sort: 'popular', cursor: undefined })
    expect(config.paramsSerializer).toEqual({ indexes: null })
  })

  it('likes through the idempotent PUT', async () => {
    const request = vi.spyOn(http, 'request').mockResolvedValue({ status: 204, data: '' })

    await likePost('abc')

    expect(request.mock.calls[0][0]).toMatchObject({ url: '/posts/abc/likes/me', method: 'PUT' })
  })
})
