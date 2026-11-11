import { expect, test } from '@playwright/test';
import { mockApis } from './fixtures';

// Tela de alertas de manutenção preventiva: lista, filtros na URL e ações (APIs mockadas).
test.describe('alertas de manutenção', () => {
  test('o menu leva à tela e a lista mostra o status com badge', async ({ page }) => {
    await mockApis(page);
    await page.goto('/dashboard');
    await page.getByRole('link', { name: 'Alertas de manutenção' }).click();
    await expect(page).toHaveURL(/\/alertas-manutencao/);
    await expect(page.getByRole('heading', { name: 'Alertas de manutenção' })).toBeVisible();
    await expect(page.locator('tbody tr')).toHaveCount(3);
    await expect(page.getByRole('row', { name: /ABC1D23/ })).toContainText('Enviado');
    await expect(page.getByRole('row', { name: /XYZ9K88/ })).toContainText('Pendente');
    await expect(page.getByRole('row', { name: /DEF4G56/ })).toContainText('Falha');
  });

  test('filtra por status e por placa, com o estado na URL', async ({ page }) => {
    await mockApis(page);
    await page.goto('/alertas-manutencao');
    await page.getByLabel('Filtrar por status').selectOption('FALHA');
    await expect(page).toHaveURL(/status=FALHA/);
    await expect(page.locator('tbody tr')).toHaveCount(1);
    await expect(page.locator('tbody tr')).toContainText('DEF4G56');

    await page.getByRole('button', { name: 'Limpar filtros' }).click();
    await expect(page.locator('tbody tr')).toHaveCount(3);

    await page.getByLabel('Buscar por placa').fill('xyz');
    await expect(page).toHaveURL(/q=xyz/);
    await expect(page.locator('tbody tr')).toHaveCount(1);
    await expect(page.locator('tbody tr')).toContainText('XYZ9K88');
  });

  test('um link com filtro na URL abre a tela já filtrada', async ({ page }) => {
    await mockApis(page);
    await page.goto('/alertas-manutencao?status=PENDENTE');
    await expect(page.getByLabel('Filtrar por status')).toHaveValue('PENDENTE');
    await expect(page.locator('tbody tr')).toHaveCount(1);
  });

  test('"Verificar agora" avisa com toast e recarrega a lista', async ({ page }) => {
    await mockApis(page);
    await page.goto('/alertas-manutencao');
    await expect(page.locator('tbody tr')).toHaveCount(3);
    await page.getByRole('button', { name: 'Verificar agora' }).click();
    await expect(page.getByRole('status').filter({ hasText: '1 alerta(s) de manutenção criado(s)' })).toBeVisible();
    await expect(page.locator('tbody tr')).toHaveCount(4);
    await expect(page.getByRole('row', { name: /NEW1A11/ })).toContainText('Enviado');
  });

  test('"Reenviar pendentes" reprocessa, avisa e atualiza os status', async ({ page }) => {
    await mockApis(page);
    await page.goto('/alertas-manutencao');
    await page.getByRole('button', { name: 'Reenviar pendentes' }).click();
    await expect(page.getByRole('status').filter({ hasText: '2 de 2 alerta(s) reenviado(s)' })).toBeVisible();
    await expect(page.getByRole('row', { name: /XYZ9K88/ })).toContainText('Enviado');
    await expect(page.getByRole('row', { name: /DEF4G56/ })).toContainText('Enviado');
  });

  test('lista vazia mostra o estado vazio', async ({ page }) => {
    await mockApis(page, { dados: { alertasManutencao: [] } });
    await page.goto('/alertas-manutencao');
    await expect(page.getByText('Nenhum alerta de manutenção encontrado.')).toBeVisible();
  });

  test('API fora do ar mostra o erro com "Tentar novamente"', async ({ page }) => {
    await mockApis(page, { apiForaDoAr: true });
    await page.goto('/alertas-manutencao');
    await expect(page.getByRole('alert')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Tentar novamente' })).toBeVisible();
    await expect(page.getByText('Nenhum alerta de manutenção encontrado.')).toHaveCount(0);
  });
});
