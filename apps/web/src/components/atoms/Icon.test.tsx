import { render } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { Icon } from './Icon'

describe('Icon', () => {
  it('renders the requested icon hidden from assistive technology', () => {
    const { container } = render(<Icon name="arrow-right" />)
    const svg = container.querySelector('svg')

    expect(svg).toHaveAttribute('data-icon', 'arrow-right')
    expect(svg).toHaveAttribute('aria-hidden', 'true')
    expect(svg?.querySelector('path')).toBeInTheDocument()
  })

  it('renders the login icon', () => {
    const { container } = render(<Icon name="login" />)

    expect(container.querySelector('svg')).toHaveAttribute('data-icon', 'login')
  })
})
