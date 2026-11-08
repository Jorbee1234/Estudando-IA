import AxeBuilder from '@axe-core/playwright'
import { expect, test } from '@playwright/test'

const WCAG_TAGS = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa']

test('dashboard carrega cards, é acessível e filtra', async ({ page }) => {
  await page.goto('/')
  await expect(page.getByRole('heading', { level: 1, name: 'Pokédex' })).toBeVisible()
  const list = page.getByRole('list', { name: 'Pokémon' })
  await expect(list.getByRole('link').first()).toBeVisible({ timeout: 30_000 })
  await expect(list.getByRole('link').first()).toContainText('Bulbasaur')

  const axe = await new AxeBuilder({ page }).withTags(WCAG_TAGS).analyze()
  expect(axe.violations, JSON.stringify(axe.violations.map((v) => [v.id, v.nodes.map((n) => n.target)]), null, 1)).toEqual([])

  // busca com debounce
  await page.getByLabel('Buscar Pokémon').fill('char')
  await expect(list.getByRole('link').first()).toContainText('Charmander', { timeout: 15_000 })
  await expect(page).toHaveURL(/q=char/)

  // filtro de tipo gerado pela API
  await page.getByLabel('Buscar Pokémon').fill('')
  await page.getByRole('button', { name: /Fogo/ }).click()
  await page.getByLabel('Geração').selectOption('generation-i')
  await expect(page.getByRole('status').filter({ hasText: 'Pokémon carregados' })).toContainText('12 de 12', {
    timeout: 20_000,
  })
})

test('drawer: abre por rota, abas, evolução, foco e ESC', async ({ page }) => {
  await page.goto('/pokemon/133') // Eevee: 8 evoluções ramificadas
  const dialog = page.getByRole('dialog')
  await expect(dialog.getByRole('heading', { level: 2, name: 'Eevee' })).toBeVisible({ timeout: 30_000 })
  await expect(dialog.getByRole('meter')).toHaveCount(6)

  const axe = await new AxeBuilder({ page }).withTags(WCAG_TAGS).analyze()
  expect(axe.violations, JSON.stringify(axe.violations.map((v) => [v.id, v.nodes.map((n) => n.target)]), null, 1)).toEqual([])

  // navegação por setas nas abas
  const overview = dialog.getByRole('tab', { name: 'Visão geral' })
  await overview.focus()
  await page.keyboard.press('ArrowRight')
  await expect(dialog.getByRole('tab', { name: 'Habilidades', selected: true })).toBeFocused()
  await expect(dialog.getByText('Run Away', { exact: false }).first()).toBeVisible({ timeout: 20_000 })

  await page.keyboard.press('ArrowRight')
  await expect(dialog.getByRole('tab', { name: 'Evolução', selected: true })).toBeFocused()
  const links = dialog.getByRole('navigation', { name: 'Linha evolutiva' }).getByRole('link')
  await expect(links).toHaveCount(9, { timeout: 20_000 })

  // clicar em uma evolução troca os dados
  await links.filter({ hasText: 'Vaporeon' }).click()
  await expect(page).toHaveURL(/\/pokemon\/134/)
  await expect(dialog.getByRole('heading', { level: 2, name: 'Vaporeon' })).toBeVisible({ timeout: 20_000 })

  // focus trap + ESC
  for (let i = 0; i < 40; i++) await page.keyboard.press('Tab')
  expect(await page.evaluate(() => !!document.activeElement?.closest('[role="dialog"]'))).toBe(true)
  await page.keyboard.press('Escape')
  await expect(dialog).toBeHidden()
  await expect(page).toHaveURL(/localhost:5173\/(\?.*)?$/)
})

test('modo Shiny e reduzir animações alteram o tema e persistem', async ({ page }) => {
  await page.goto('/')
  await page.getByRole('button', { name: /Modo Brilho/ }).click()
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'shiny')
  await page.getByRole('button', { name: /Reduzir animações/ }).click()
  await expect(page.locator('html')).toHaveAttribute('data-reduce-motion', 'true')
  await page.reload()
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'shiny')
})
