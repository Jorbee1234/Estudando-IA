import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { Label } from './Label'

describe('Label', () => {
  it('labels the control it points to', () => {
    render(
      <>
        <Label htmlFor="password">Senha</Label>
        <input id="password" />
      </>,
    )

    expect(screen.getByLabelText('Senha')).toHaveAttribute('id', 'password')
  })
})
