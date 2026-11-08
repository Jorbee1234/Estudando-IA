import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { PostThumbnail } from './PostThumbnail'

describe('PostThumbnail', () => {
  it('shows the cover image when there is one', () => {
    const { container } = render(<PostThumbnail postId="1" src="https://example.com/a.png" />)

    expect(container.querySelector('img')).toHaveAttribute('src', 'https://example.com/a.png')
    expect(screen.queryByTestId('thumbnail-placeholder')).not.toBeInTheDocument()
  })

  it('shows a generated placeholder without a cover', () => {
    const { container } = render(<PostThumbnail postId="1" src={null} />)

    expect(container.querySelector('img')).not.toBeInTheDocument()
    expect(screen.getByTestId('thumbnail-placeholder')).toBeInTheDocument()
  })

  it('falls back to the placeholder when the image fails to load', () => {
    const { container } = render(<PostThumbnail postId="1" src="https://example.com/broken.png" />)

    fireEvent.error(container.querySelector('img')!)

    expect(screen.getByTestId('thumbnail-placeholder')).toBeInTheDocument()
  })

  it('uses the same colors for the same post', () => {
    const first = render(<PostThumbnail postId="abc" src={null} />)
    const style = first.getByTestId('thumbnail-placeholder').getAttribute('style')
    first.unmount()

    render(<PostThumbnail postId="abc" src={null} />)

    expect(screen.getByTestId('thumbnail-placeholder')).toHaveAttribute('style', style)
  })
})
