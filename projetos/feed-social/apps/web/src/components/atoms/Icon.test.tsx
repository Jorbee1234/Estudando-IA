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

describe('Icon (feed icons)', () => {
  it.each(['search', 'close', 'feed', 'account', 'info', 'logout', 'code', 'share', 'chat', 'edit', 'camera'] as const)(
    'renders %s',
    (name) => {
      const { container } = render(<Icon name={name} />)

      expect(container.querySelector('svg')).toHaveAttribute('data-icon', name)
    },
  )

  it('accepts a custom size class', () => {
    const { container } = render(<Icon name="code" className="size-8" />)

    expect(container.querySelector('svg')).toHaveClass('size-8')
  })

  it('replaces the default size instead of stacking both', () => {
    const { container } = render(<Icon name="code" className="size-8" />)

    expect(container.querySelector('svg')).not.toHaveClass('size-[1.25em]')
  })

  it('uses the default size when none is given', () => {
    const { container } = render(<Icon name="code" />)

    expect(container.querySelector('svg')).toHaveClass('size-[1.25em]', 'shrink-0')
  })
})
