import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { SocialButton } from './SocialButton'

describe('SocialButton', () => {
  it('has an accessible name and handles clicks', async () => {
    const onClick = vi.fn()
    render(
      <SocialButton
        iconSrc="/github.png"
        label="Entrar com Github"
        onClick={onClick}
      />,
    )

    await userEvent.click(
      screen.getByRole('button', { name: 'Entrar com Github' }),
    )

    expect(onClick).toHaveBeenCalledOnce()
  })
})
