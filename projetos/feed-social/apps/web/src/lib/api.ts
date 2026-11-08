import axios, { isAxiosError } from 'axios'
import type { AxiosRequestConfig } from 'axios'
import { clearToken, getToken } from './authStorage'

// In development, Vite proxies /api to the backend (see vite.config.ts).
export const http = axios.create({
  baseURL: '/api',
  headers: { 'Content-Type': 'application/json' },
})

http.interceptors.request.use((config) => {
  const token = getToken()
  if (token) {
    config.headers.set('Authorization', `Bearer ${token}`)
  }
  return config
})

http.interceptors.response.use(undefined, (error: unknown) => {
  // An expired/invalid token drops the session. A 401 from the login endpoint
  // just means wrong credentials.
  if (
    isAxiosError(error) &&
    error.response?.status === 401 &&
    error.config?.url !== '/tokens'
  ) {
    clearToken()
  }
  return Promise.reject(error)
})

const repeatedParams = { indexes: null }

async function request<T>(
  method: string,
  path: string,
  config?: AxiosRequestConfig,
): Promise<T> {
  const response = await http.request<T>({
    url: path,
    method,
    paramsSerializer: repeatedParams,
    ...config,
  })
  return (response.status === 204 ? undefined : response.data) as T
}

export const api = {
  get: <T>(path: string, config?: AxiosRequestConfig) =>
    request<T>('GET', path, config),
  post: <T>(path: string, data?: unknown, config?: AxiosRequestConfig) =>
    request<T>('POST', path, { ...config, data }),
  put: <T>(path: string, data?: unknown, config?: AxiosRequestConfig) =>
    request<T>('PUT', path, { ...config, data }),
  patch: <T>(path: string, data?: unknown, config?: AxiosRequestConfig) =>
    request<T>('PATCH', path, { ...config, data }),
  delete: <T>(path: string, config?: AxiosRequestConfig) =>
    request<T>('DELETE', path, config),
}

type ProblemDetails = {
  title?: string
  detail?: string
  errors?: Record<string, string[]>
}

const FALLBACK_MESSAGE = 'Não foi possível concluir a solicitação. Tente novamente.'

export function getApiErrorMessage(error: unknown): string {
  if (!isAxiosError<ProblemDetails>(error)) {
    return FALLBACK_MESSAGE
  }
  if (!error.response) {
    return 'Não foi possível conectar ao servidor.'
  }
  const { errors, detail, title } = error.response.data ?? {}
  const firstValidation = errors && Object.values(errors).flat()[0]
  return firstValidation ?? detail ?? title ?? FALLBACK_MESSAGE
}

export function getApiFieldErrors(error: unknown): Record<string, string> {
  const errors = isAxiosError<ProblemDetails>(error) ? error.response?.data?.errors : undefined
  if (!errors) {
    return {}
  }
  return Object.fromEntries(
    Object.entries(errors).flatMap(([field, messages]) =>
      messages[0] ? [[field.toLowerCase(), messages[0]]] : [],
    ),
  )
}
