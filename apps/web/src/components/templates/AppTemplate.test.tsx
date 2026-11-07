import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { AppTemplate } from './AppTemplate'

describe('AppTemplate', () => {
  it('renders the sidebar and the screen content', () => {
    render(
      <AppTemplate sidebar={<nav aria-label="Menu">menu</nav>}>
        <h1>Feed</h1>
      </AppTemplate>,
    )

    expect(screen.getByRole('navigation', { name: 'Menu' })).toBeInTheDocument()
    expect(screen.getByRole('main')).toContainElement(screen.getByRole('heading', { name: 'Feed' }))
  })
})
