import type { AxiosRequestConfig } from 'axios'
import { api } from './api'

export type Resource<T, TNew = Partial<T>, TList = T[]> = {
  list: (params?: object, config?: AxiosRequestConfig) => Promise<TList>
  get: (id: string, config?: AxiosRequestConfig) => Promise<T>
  create: (data: TNew, config?: AxiosRequestConfig) => Promise<T>
  remove: (id: string, config?: AxiosRequestConfig) => Promise<void>
  nested: <TChild, TChildNew = Partial<TChild>, TChildList = TChild[]>(
    id: string,
    segment: string,
  ) => Resource<TChild, TChildNew, TChildList>
}

export function createResource<T, TNew = Partial<T>, TList = T[]>(
  path: string,
): Resource<T, TNew, TList> {
  return {
    list: (params, config) => api.get<TList>(path, { ...config, params }),
    get: (id, config) => api.get<T>(`${path}/${id}`, config),
    create: (data, config) => api.post<T>(path, data, config),
    remove: (id, config) => api.delete<void>(`${path}/${id}`, config),
    nested: (id, segment) => createResource(`${path}/${id}/${segment}`),
  }
}
