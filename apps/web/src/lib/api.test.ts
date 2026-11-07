import { AxiosError } from 'axios'
import type { AxiosAdapter, AxiosResponse, InternalAxiosRequestConfig } from 'axios'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { api, getApiErrorMessage, getApiFieldErrors, http } from './api'
import { getToken, setToken } from './authStorage'

function respond(
  config: InternalAxiosRequestConfig,
  status: number,
  data: unknown,
): AxiosResponse {
  return { data, status, statusText: '', headers: {}, config }
}

function useAdapter(status: number, data: unknown = {}) {
  const requests: InternalAxiosRequestConfig[] = []
  const adapter: AxiosAdapter = (config) => {
    requests.push(config)
    const response = respond(config, status, data)
    return status < 400
      ? Promise.resolve(response)
      : Promise.reject(
          new AxiosError('fail', undefined, config, undefined, response),
        )
  }
  http.defaults.adapter = adapter
  return requests
}

describe('api', () => {
  beforeEach(() => {
    localStorage.clear()
    sessionStorage.clear()
  })

  afterEach(() => {
    delete http.defaults.adapter
  })

  it('prefixes /api and returns the response body', async () => {
    const requests = useAdapter(200, { ok: true })

    await expect(api.get('/health')).resolves.toEqual({ ok: true })
    expect(requests[0].baseURL).toBe('/api')
    expect(requests[0].url).toBe('/health')
  })

  it('returns undefined on 204', async () => {
    useAdapter(204, '')

    await expect(api.delete('/x')).resolves.toBeUndefined()
  })

  it('sends the stored token as a Bearer header', async () => {
    setToken('abc', false)
    const requests = useAdapter(200)

    await api.get('/users/me')

    expect(requests[0].headers.get('Authorization')).toBe('Bearer abc')
  })

  it('drops the token on a 401 outside the login endpoint', async () => {
    setToken('abc', false)
    useAdapter(401, { title: 'Unauthorized' })

    await expect(api.get('/users/me')).rejects.toBeInstanceOf(AxiosError)
    expect(getToken()).toBeNull()
  })

  it('keeps the token on a 401 from the login endpoint', async () => {
    setToken('abc', false)
    useAdapter(401, { title: 'Invalid credentials' })

    await expect(api.post('/tokens')).rejects.toBeInstanceOf(
      AxiosError,
    )
    expect(getToken()).toBe('abc')
  })
})

describe('getApiErrorMessage', () => {
  function errorWith(data: unknown) {
    const config = { headers: {} } as InternalAxiosRequestConfig
    return new AxiosError('fail', undefined, config, undefined, respond(config, 400, data))
  }

  it('prefers the first validation error', () => {
    expect(
      getApiErrorMessage(
        errorWith({ title: 'Bad', errors: { Password: ['Too short'] } }),
      ),
    ).toBe('Too short')
  })

  it('falls back to detail, then title', () => {
    expect(getApiErrorMessage(errorWith({ title: 'T', detail: 'D' }))).toBe('D')
    expect(getApiErrorMessage(errorWith({ title: 'T' }))).toBe('T')
  })

  it('handles network errors and unknown errors', () => {
    expect(getApiErrorMessage(new AxiosError('Network Error'))).toContain(
      'conectar',
    )
    expect(getApiErrorMessage(new Error('x'))).toContain('Tente novamente')
  })
})

describe('api verbs', () => {
  afterEach(() => {
    delete http.defaults.adapter
  })

  it.each([
    ['post', 'POST'],
    ['put', 'PUT'],
    ['patch', 'PATCH'],
  ] as const)('%s sends the method and body', async (verb, method) => {
    const requests = useAdapter(200)

    await api[verb]('/x', { a: 1 })

    expect(requests[0].method?.toUpperCase()).toBe(method)
    expect(JSON.parse(requests[0].data)).toEqual({ a: 1 })
  })

  it('get and delete send the right methods', async () => {
    const requests = useAdapter(200)

    await api.get('/x')
    await api.delete('/x')

    expect(requests.map((r) => r.method?.toUpperCase())).toEqual(['GET', 'DELETE'])
  })

  it('serializes repeated query parameters without indexes', async () => {
    const requests = useAdapter(200)

    await api.get('/x', { params: { tags: ['a', 'b'] } })

    expect(requests[0].paramsSerializer).toEqual({ indexes: null })
  })
})

describe('getApiFieldErrors', () => {
  function errorWith(data: unknown) {
    const config = { headers: {} } as InternalAxiosRequestConfig
    return new AxiosError('fail', undefined, config, undefined, respond(config, 400, data))
  }

  it('maps each field, lower-cased, to its first message', () => {
    expect(
      getApiFieldErrors(errorWith({ errors: { Name: ['Curto', 'Outro'], Username: ['Em uso'] } })),
    ).toEqual({ name: 'Curto', username: 'Em uso' })
  })

  it('skips fields without messages', () => {
    expect(getApiFieldErrors(errorWith({ errors: { Name: [], About: ['Longo'] } }))).toEqual({ about: 'Longo' })
  })

  it('is empty when the response has no field errors', () => {
    expect(getApiFieldErrors(errorWith({ title: 'T', detail: 'D' }))).toEqual({})
  })

  it('is empty for errors that did not come from the API', () => {
    expect(getApiFieldErrors(new Error('boom'))).toEqual({})
    expect(getApiFieldErrors(undefined)).toEqual({})
  })
})
