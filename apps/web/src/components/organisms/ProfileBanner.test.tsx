import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { ProfileBanner } from './ProfileBanner'

describe('ProfileBanner', () => {
  it('shows the banner image when there is one', () => {
    const { container } = render(
      <ProfileBanner bannerUrl="/api/profiles/u1/banner?v=1" editable={false} onEdit={vi.fn()} />,
    )

    expect(container.querySelector('img')).toHaveAttribute('src', '/api/profiles/u1/banner?v=1')
  })

  it('shows only the accent gradient without an image', () => {
    const { container } = render(<ProfileBanner bannerUrl={null} editable={false} onEdit={vi.fn()} />)

    expect(container.querySelector('img')).not.toBeInTheDocument()
  })

  it('hides the edit button from visitors', () => {
    render(<ProfileBanner bannerUrl={null} editable={false} onEdit={vi.fn()} />)

    expect(screen.queryByRole('button', { name: 'Banner e cor' })).not.toBeInTheDocument()
  })

  it('lets the owner open the appearance dialog', async () => {
    const onEdit = vi.fn()
    render(<ProfileBanner bannerUrl={null} editable onEdit={onEdit} />)

    await userEvent.click(screen.getByRole('button', { name: 'Banner e cor' }))

    expect(onEdit).toHaveBeenCalledOnce()
  })
})
