import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { Tag } from './Tag'

describe('Tag', () => {
  it('renders a static label by default', () => {
    render(<Tag>React</Tag>)

    expect(screen.getByText('React')).toBeInTheDocument()
    expect(screen.queryByRole('button')).not.toBeInTheDocument()
  })

  it('renders a clickable suggestion as a filter', async () => {
    const onClick = vi.fn()
    render(
      <Tag variant="filter" onClick={onClick}>
        React
      </Tag>,
    )

    await userEvent.click(screen.getByRole('button', { name: 'React' }))

    expect(onClick).toHaveBeenCalledOnce()
  })

  it('renders a selected tag that can be removed', async () => {
    const onClick = vi.fn()
    render(
      <Tag variant="selected" onClick={onClick}>
        Front-end
      </Tag>,
    )

    await userEvent.click(screen.getByRole('button', { name: 'Remover filtro Front-end' }))

    expect(onClick).toHaveBeenCalledOnce()
  })
})
