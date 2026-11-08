import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { ProfileStat } from './ProfileStat'

describe('ProfileStat', () => {
  it('shows the number and its label', () => {
    render(<ProfileStat value={3} label="Projetos" />)

    expect(screen.getByText('3')).toHaveClass('font-semibold')
    expect(screen.getByText('Projetos')).toBeInTheDocument()
  })

  it('renders zero', () => {
    render(<ProfileStat value={0} label="Projetos" />)

    expect(screen.getByText('0')).toBeInTheDocument()
  })
})
