import { render } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import type { ReactElement } from 'react'
import { MemoryRouter } from 'react-router'
import { describe, expect, it, vi } from 'vitest'
import { LoginPage } from '../components/pages/LoginPage'
import { SignupPage } from '../components/pages/SignupPage'
import { findWcagAAViolations } from './axe'

function renderInRouter(ui: ReactElement) {
  return render(<MemoryRouter>{ui}</MemoryRouter>)
}

// Automated WCAG 2.x level AA checks (axe-core). Automated tools only catch a
// part of the criteria, so a green run does not replace a manual review.
describe('accessibility (WCAG 2.2 AA)', () => {
  it('reports violations when the markup is inaccessible', async () => {
    render(
      <main>
        <img src="/x.png" />
        <input />
      </main>,
    )

    const violations = await findWcagAAViolations()

    expect(violations.some((line) => line.includes('[image-alt]'))).toBe(true)
    expect(violations.some((line) => line.includes('[label]'))).toBe(true)
  })

  it('LoginPage has no violations', async () => {
    renderInRouter(<LoginPage onLogin={vi.fn()} onSocialLogin={vi.fn()} />)

    expect(await findWcagAAViolations()).toEqual([])
  })

  it('SignupPage has no violations', async () => {
    renderInRouter(<SignupPage onSignup={vi.fn()} onSocialLogin={vi.fn()} />)

    expect(await findWcagAAViolations()).toEqual([])
  })

  it('LoginPage has no violations after a blocked submit', async () => {
    renderInRouter(<LoginPage onLogin={vi.fn()} onSocialLogin={vi.fn()} />)

    await userEvent.click(document.querySelector('button[type="submit"]')!)

    expect(await findWcagAAViolations()).toEqual([])
  })

  it('SignupPage has no violations after a blocked submit', async () => {
    renderInRouter(<SignupPage onSignup={vi.fn()} onSocialLogin={vi.fn()} />)

    await userEvent.click(document.querySelector('button[type="submit"]')!)

    expect(await findWcagAAViolations()).toEqual([])
  })
})
