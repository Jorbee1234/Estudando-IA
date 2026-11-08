import { api } from '../lib/api'
import { createResource } from '../lib/createResource'

export type Link = { rel: string; href: string; method: string }

export type User = {
  id: string
  name: string
  email: string
  links: Link[]
}

export type TokenResponse = {
  accessToken: string
  tokenType: string
  expiresIn: number
  links: Link[]
}

export type Credentials = { email: string; password: string }
export type NewUser = Credentials & { name: string }

const users = createResource<User, NewUser>('/users')
const tokens = createResource<TokenResponse, Credentials>('/tokens')

export const signup = (data: NewUser) => users.create(data)

export const login = (data: Credentials) => tokens.create(data)

export const getCurrentUser = () => api.get<User>('/users/me')
