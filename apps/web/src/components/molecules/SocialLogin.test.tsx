import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { SocialLogin } from './SocialLogin'

const providers = [
  { id: 'github', label: 'Entrar com Github', iconSrc: '/github.png' },
  { id: 'gmail', label: 'Entrar com Gmail', iconSrc: '/Gmail.png' },
]

describe('SocialLogin', () => {
  it('shows the title and reports the selected provider', async () => {
    const onSelect = vi.fn()
    render(
      <SocialLogin
        title="ou entre com outras contas"
        providers={providers}
        onSelect={onSelect}
      />,
    )

    expect(screen.getByText('ou entre com outras contas')).toBeInTheDocument()

    await userEvent.click(
      screen.getByRole('button', { name: 'Entrar com Gmail' }),
    )

    expect(onSelect).toHaveBeenCalledExactlyOnceWith('gmail')
  })
})
