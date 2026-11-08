import { render } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { Symbol } from './Symbol'

describe('Symbol', () => {
  it('is decorative and hidden from assistive technology', () => {
    const { container } = render(<Symbol className="top-0 left-0" />)

    expect(container.firstElementChild).toHaveAttribute('aria-hidden', 'true')
    expect(container.firstElementChild).toHaveClass('top-0', 'left-0')
    expect(container.querySelectorAll('img')).toHaveLength(2)
  })
})
