import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { TextareaField } from './TextareaField'

describe('TextareaField', () => {
  it('associates the label with the textarea', () => {
    render(<TextareaField id="description" label="Descrição" />)

    expect(screen.getByRole('textbox', { name: 'Descrição' })).toBeInTheDocument()
  })
})
