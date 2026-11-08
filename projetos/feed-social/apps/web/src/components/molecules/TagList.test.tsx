import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { TagList } from './TagList'

describe('TagList', () => {
  it('lists every tag', () => {
    render(<TagList tags={['React', 'CSS']} />)

    expect(screen.getAllByRole('listitem').map((item) => item.textContent)).toEqual(['React', 'CSS'])
  })

  it('renders nothing without tags', () => {
    const { container } = render(<TagList tags={[]} />)

    expect(container).toBeEmptyDOMElement()
  })
})
