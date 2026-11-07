import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { SocialButton } from './SocialButton'

function renderButton(onClick = vi.fn()) {
  render(
    <SocialButton
      iconSrc="/github.svg"
      iconWidth={33}
      iconHeight={32}
      name="Github"
      label="Entrar com Github"
      onClick={onClick}
    />,
  )
}

describe('SocialButton', () => {
  it('has an accessible name and handles clicks', async () => {
    const onClick = vi.fn()
    renderButton(onClick)

    await userEvent.click(
      screen.getByRole('button', { name: 'Entrar com Github' }),
    )

    expect(onClick).toHaveBeenCalledOnce()
  })

  it('shows the provider name and keeps it inside the accessible name', () => {
    renderButton()

    const button = screen.getByRole('button')

    expect(button).toHaveTextContent('Github')
    expect(button.getAttribute('aria-label')).toContain('Github')
  })

  it('reserves the icon size to avoid layout shifts', () => {
    renderButton()

    expect(document.querySelector('img')).toHaveAttribute('width', '33')
    expect(document.querySelector('img')).toHaveAttribute('height', '32')
  })
})
