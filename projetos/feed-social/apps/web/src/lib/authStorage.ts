const KEY = 'accessToken'

export function getToken(): string | null {
  try {
    return localStorage.getItem(KEY) ?? sessionStorage.getItem(KEY)
  } catch {
    return null
  }
}

export function setToken(token: string, remember: boolean) {
  clearToken()
  try {
    ;(remember ? localStorage : sessionStorage).setItem(KEY, token)
  } catch {
  }
}

export function clearToken() {
  try {
    localStorage.removeItem(KEY)
    sessionStorage.removeItem(KEY)
  } catch {
  }
}
