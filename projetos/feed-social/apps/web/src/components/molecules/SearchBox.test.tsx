import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { SearchBox } from './SearchBox'

describe('SearchBox', () => {
  it('shows the value and reports typing', async () => {
    const onChange = vi.fn()
    render(<SearchBox value="" onChange={onChange} />)

    await userEvent.type(screen.getByRole('searchbox', { name: 'Buscar posts' }), 'a')

    expect(onChange).toHaveBeenCalledWith('a')
    expect(screen.getByPlaceholderText('Digite o que você procura')).toBeInTheDocument()
  })
})
