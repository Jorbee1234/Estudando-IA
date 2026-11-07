import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { Tab } from './Tab'

describe('Tab', () => {
  it('exposes its selected state', () => {
    render(
      <Tab active onClick={vi.fn()}>
        Recentes
      </Tab>,
    )

    expect(screen.getByRole('tab', { name: 'Recentes', selected: true })).toBeInTheDocument()
  })

  it('handles clicks while inactive', async () => {
    const onClick = vi.fn()
    render(
      <Tab active={false} onClick={onClick}>
        Populares
      </Tab>,
    )

    await userEvent.click(screen.getByRole('tab', { name: 'Populares', selected: false }))

    expect(onClick).toHaveBeenCalledOnce()
  })
})
