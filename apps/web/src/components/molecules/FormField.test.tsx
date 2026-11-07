import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { FormField } from './FormField'

describe('FormField', () => {
  it('associates the label with the input and forwards input props', () => {
    render(<FormField id="password" label="Senha" type="password" required />)

    const input = screen.getByLabelText('Senha')

    expect(input).toHaveAttribute('type', 'password')
    expect(input).toBeRequired()
  })
})
