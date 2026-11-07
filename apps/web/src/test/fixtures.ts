import type { Post, PostComment } from '../services/postService'
import type { Profile } from '../services/profileService'

export const samplePost: Post = {
  id: 'p1',
  title: 'Landing page responsiva',
  description: 'Uma descrição curta.',
  thumbnailUrl: null,
  tags: ['React', 'CSS'],
  likesCount: 5,
  commentsCount: 2,
  likedByMe: false,
  createdAt: '2026-11-07T13:16:56Z',
  author: { id: 'u1', name: 'Júlio Costa', handle: 'julio', avatarUrl: null },
  links: [],
}

export const sampleProfile: Profile = {
  id: 'u1',
  name: 'Júlio Costa',
  handle: 'julio',
  about: 'Desenvolvedor front-end.',
  accentColor: null,
  avatarUrl: null,
  bannerUrl: null,
  postsCount: 3,
  usernameChangeAvailableAt: null,
  links: [],
}

export const sampleComment: PostComment = {
  id: 'c1',
  body: 'Ficou muito bom!',
  createdAt: '2026-11-07T14:00:00Z',
  author: { id: 'u2', name: 'Ana Souza', handle: 'ana', avatarUrl: null },
  links: [],
}
