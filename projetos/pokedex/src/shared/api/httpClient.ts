export class HttpError extends Error {
  status: number
  constructor(status: number, message: string) {
    super(message)
    this.name = 'HttpError'
    this.status = status
  }
}

export async function getJson<T>(url: string, signal?: AbortSignal): Promise<T> {
  const response = await fetch(url, { signal })
  if (!response.ok) throw new HttpError(response.status, `HTTP ${response.status} em ${url}`)
  return (await response.json()) as T
}

export interface NamedRef {
  name: string
  url: string
}

/** Extrai o id numérico do final de uma URL da PokéAPI. */
export function idFromUrl(url: string): number {
  const id = Number(url.split('/').filter(Boolean).pop())
  return Number.isFinite(id) ? id : NaN
}
