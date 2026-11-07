import { api } from '../lib/api'
import { createResource } from '../lib/createResource'
import type { Link } from './authService'

export type Author = { id: string; name: string; handle: string; avatarUrl: string | null }

export type Post = {
  id: string
  title: string
  description: string
  thumbnailUrl: string | null
  tags: string[]
  likesCount: number
  commentsCount: number
  likedByMe: boolean
  createdAt: string
  author: Author
  links: Link[]
}

export type PostComment = {
  id: string
  body: string
  createdAt: string
  author: Author
  links: Link[]
}

export type Tag = { name: string; postsCount: number }

export type Page<T> = { items: T[]; nextCursor: string | null; links: Link[] }

export type PostSort = 'recent' | 'popular'

export type ListPostsParams = {
  q?: string
  tags?: string[]
  sort?: PostSort
  authorId?: string
  cursor?: string | null
  limit?: number
}

export type NewPost = {
  title: string
  description: string
  thumbnailUrl?: string
  tags: string[]
}

const posts = createResource<Post, NewPost, Page<Post>>('/posts')
const tags = createResource<Tag>('/tags')

const commentsOf = (postId: string) =>
  posts.nested<PostComment, { body: string }, Page<PostComment>>(postId, 'comments')

export const listPosts = ({ cursor, ...params }: ListPostsParams = {}) =>
  posts.list({ ...params, cursor: cursor ?? undefined })

export const getPost = (id: string) => posts.get(id)

export const createPost = (data: NewPost) => posts.create(data)

export const likePost = (id: string) => api.put<void>(`/posts/${id}/likes/me`)

export const unlikePost = (id: string) => api.delete<void>(`/posts/${id}/likes/me`)

export const listComments = (id: string, cursor?: string | null) =>
  commentsOf(id).list({ cursor: cursor ?? undefined })

export const createComment = (id: string, body: string) =>
  commentsOf(id).create({ body })

export const listTags = () => tags.list()
