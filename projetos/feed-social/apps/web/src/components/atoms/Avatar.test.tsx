import { fireEvent, render } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { Avatar } from './Avatar'

describe('Avatar', () => {
  it('shows the initial of the name and is hidden from assistive technology', () => {
    const { container } = render(<Avatar name="julio costa" />)

    expect(container.firstChild).toHaveTextContent('J')
    expect(container.firstChild).toHaveAttribute('aria-hidden', 'true')
  })

  it('falls back to a placeholder for an empty name', () => {
    const { container } = render(<Avatar name="  " />)

    expect(container.firstChild).toHaveTextContent('?')
  })

  it('shows the picture instead of the initial when there is one', () => {
    const { container } = render(<Avatar name="Júlio" src="/api/profiles/u1/avatar?v=1" />)

    expect(container.querySelector('img')).toHaveAttribute('src', '/api/profiles/u1/avatar?v=1')
    expect(container.firstChild).not.toHaveTextContent('J')
  })

  it('goes back to the initial when the picture fails to load', () => {
    const { container } = render(<Avatar name="Júlio" src="/broken.png" />)

    fireEvent.error(container.querySelector('img')!)

    expect(container.querySelector('img')).not.toBeInTheDocument()
    expect(container.firstChild).toHaveTextContent('J')
  })

  it('tries again when the picture changes after a failure', () => {
    const { container, rerender } = render(<Avatar name="Júlio" src="/broken.png" />)
    fireEvent.error(container.querySelector('img')!)

    rerender(<Avatar name="Júlio" src="/new.png" />)

    expect(container.querySelector('img')).toHaveAttribute('src', '/new.png')
  })

  it('has a small default size and a large one for the profile', () => {
    const { container, rerender } = render(<Avatar name="Júlio" />)
    expect(container.firstChild).toHaveClass('size-8')

    rerender(<Avatar name="Júlio" size="xl" />)
    expect(container.firstChild).toHaveClass('md:size-[254px]')
  })
})
