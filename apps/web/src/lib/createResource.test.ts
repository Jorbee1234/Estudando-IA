import { afterEach, describe, expect, it, vi } from 'vitest'
import { http } from './api'
import { createResource } from './createResource'

afterEach(() => vi.restoreAllMocks())

type Item = { id: string }

function mockRequest(status = 200, data: unknown = {}) {
  return vi.spyOn(http, 'request').mockResolvedValue({ status, data })
}

describe('createResource', () => {
  const items = createResource<Item, { name: string }>('/items')

  it('lists with query params', async () => {
    const request = mockRequest(200, [])

    await items.list({ q: 'a' })

    expect(request.mock.calls[0][0]).toMatchObject({
      url: '/items',
      method: 'GET',
      params: { q: 'a' },
    })
  })

  it('gets one item by id', async () => {
    const request = mockRequest()

    await items.get('7')

    expect(request.mock.calls[0][0]).toMatchObject({ url: '/items/7', method: 'GET' })
  })

  it('creates with POST and the body', async () => {
    const request = mockRequest(201, { id: '1' })

    await expect(items.create({ name: 'x' })).resolves.toEqual({ id: '1' })

    expect(request.mock.calls[0][0]).toMatchObject({
      url: '/items',
      method: 'POST',
      data: { name: 'x' },
    })
  })

  it('removes with DELETE and resolves undefined on 204', async () => {
    const request = mockRequest(204, '')

    await expect(items.remove('7')).resolves.toBeUndefined()

    expect(request.mock.calls[0][0]).toMatchObject({ url: '/items/7', method: 'DELETE' })
  })

  it('builds nested resource paths', async () => {
    const request = mockRequest()

    await items.nested('7', 'children').list()

    expect(request.mock.calls[0][0]).toMatchObject({ url: '/items/7/children' })
  })
})
