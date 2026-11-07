import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import { Input } from './Input'

describe('Input', () => {
  it('forwards native props and accepts typing', async () => {
    render(<Input placeholder="usuario123" type="email" />)
    const input = screen.getByPlaceholderText('usuario123')

    await userEvent.type(input, 'ana@example.com')

    expect(input).toHaveAttribute('type', 'email')
    expect(input).toHaveValue('ana@example.com')
  })
})
