import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { CommentItem } from './CommentItem'

describe('CommentItem', () => {
  it('shows the author, the text and the date', () => {
    render(
      <CommentItem
        authorName="Ana Souza"
        authorHandle="ana"
        body="Ficou ótimo!"
        createdAt="2026-11-07T13:16:56Z"
      />,
    )

    expect(screen.getByText('@ana')).toBeInTheDocument()
    expect(screen.getByText('Ficou ótimo!')).toBeInTheDocument()
    expect(screen.getByRole('article').querySelector('time')).toHaveAttribute(
      'datetime',
      '2026-11-07T13:16:56Z',
    )
  })

  it('shows the picture of the author when there is one', () => {
    render(
      <CommentItem
        authorName="Ana Souza"
        authorHandle="ana"
        authorAvatarUrl="/api/profiles/u2/avatar?v=1"
        body="Ficou ótimo!"
        createdAt="2026-11-07T13:16:56Z"
      />,
    )

    expect(screen.getByRole('article').querySelector('img')).toHaveAttribute('src', '/api/profiles/u2/avatar?v=1')
  })

  it('shows the initial of the author without a picture', () => {
    render(
      <CommentItem authorName="Ana Souza" authorHandle="ana" body="Oi" createdAt="2026-11-07T13:16:56Z" />,
    )

    expect(screen.getByRole('article').querySelector('img')).not.toBeInTheDocument()
    expect(screen.getByRole('article')).toHaveTextContent('A')
  })
})
