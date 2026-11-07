import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import { Checkbox } from './Checkbox'

describe('Checkbox', () => {
  it('toggles when clicked', async () => {
    render(<Checkbox aria-label="Lembrar-me" />)
    const checkbox = screen.getByRole('checkbox', { name: 'Lembrar-me' })

    expect(checkbox).not.toBeChecked()
    await userEvent.click(checkbox)
    expect(checkbox).toBeChecked()
  })
})
