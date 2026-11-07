import { fireEvent, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { messages } from '../../lib/profileValidation'
import { ColorPicker } from './ColorPicker'

describe('ColorPicker', () => {
  it('marks the default green as selected when there is no color', () => {
    render(<ColorPicker label="Cor de destaque" value={null} onChange={vi.fn()} />)

    expect(screen.getByRole('button', { name: 'Verde', pressed: true })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Azul', pressed: false })).toBeInTheDocument()
    expect(screen.getByText('#81FE88')).toBeInTheDocument()
  })

  it('reports the chosen preset', async () => {
    const onChange = vi.fn()
    render(<ColorPicker label="Cor de destaque" value={null} onChange={onChange} />)

    await userEvent.click(screen.getByRole('button', { name: 'Azul' }))

    expect(onChange).toHaveBeenCalledWith('#7DD3FC')
  })

  it('reports null when the default green is chosen again', async () => {
    const onChange = vi.fn()
    render(<ColorPicker label="Cor de destaque" value="#7DD3FC" onChange={onChange} />)

    await userEvent.click(screen.getByRole('button', { name: 'Verde' }))

    expect(onChange).toHaveBeenCalledWith(null)
  })

  it('reports a free color in upper case', () => {
    const onChange = vi.fn()
    render(<ColorPicker label="Cor de destaque" value={null} onChange={onChange} />)

    fireEvent.change(screen.getByLabelText('Escolher outra cor'), { target: { value: '#ff00aa' } })

    expect(onChange).toHaveBeenCalledWith('#FF00AA')
  })

  it('warns when the color has too little contrast with the dark background', () => {
    render(<ColorPicker label="Cor de destaque" value="#111111" onChange={vi.fn()} />)

    expect(screen.getByRole('alert')).toHaveTextContent(messages.lowContrast)
    expect(screen.getByLabelText('Escolher outra cor')).toHaveAccessibleDescription(messages.lowContrast)
  })

  it('does not warn for a legible color', () => {
    render(<ColorPicker label="Cor de destaque" value="#7DD3FC" onChange={vi.fn()} />)

    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
  })

  it('groups the controls under the label', () => {
    render(<ColorPicker label="Cor de destaque" value={null} onChange={vi.fn()} />)

    expect(screen.getByRole('group', { name: 'Cor de destaque' })).toBeInTheDocument()
  })
})
