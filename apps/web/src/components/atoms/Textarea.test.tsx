import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import { Textarea } from './Textarea'

describe('Textarea', () => {
  it('accepts typed text', async () => {
    render(<Textarea aria-label="Descrição" />)

    await userEvent.type(screen.getByRole('textbox', { name: 'Descrição' }), 'olá')

    expect(screen.getByRole('textbox')).toHaveValue('olá')
  })
})
