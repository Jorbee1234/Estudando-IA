import { expect, test } from '@playwright/test';
import { mockApis } from './fixtures';

// ADR 0001, fase 8: a tela só mostra o que as APIs realmente têm, e os formulários funcionam de ponta a ponta.
test.beforeEach(async ({ page }) => {
  await mockApis(page);
});

test('veículos: colunas e formulário só com campos que a API grava', async ({ page }) => {
  await page.goto('/veiculos');
  for (const col of ['Marca', 'Tipo']) {
    await expect(page.getByRole('columnheader', { name: col })).toHaveCount(0);
  }
  await page.getByRole('button', { name: '+ Novo Veículo' }).click();
  await expect(page.locator('form').getByLabel(/Placa/)).toBeVisible();
  for (const campo of ['Marca', 'Tipo', 'Status']) {
    await expect(page.locator('form').getByLabel(campo, { exact: true })).toHaveCount(0);
  }
});

test('veículos: o POST leva anoFabricacao e quilometragem (contrato real da API)', async ({ page }) => {
  let corpo: unknown;
  await page.route(/localhost:8080\/api\/veiculos$/, async (route) => {
    if (route.request().method() !== 'POST') return route.fallback();
    corpo = route.request().postDataJSON();
    return route.fulfill({ status: 201, contentType: 'application/json', body: '{"id":9,"placa":"NEW1A23","modelo":"X","anoFabricacao":2022,"quilometragem":5,"status":"ATIVO"}' });
  });
  await page.goto('/veiculos');
  await page.getByRole('button', { name: '+ Novo Veículo' }).click();
  await page.locator('form').getByLabel(/Placa/).fill('new1a23');
  await page.locator('form').getByLabel(/Modelo/).fill('X');
  await page.locator('form').getByLabel('Ano').fill('2022');
  await page.locator('form').getByLabel('KM Atual').fill('5');
  await page.getByRole('button', { name: 'Cadastrar' }).click();
  await expect(page.getByRole('heading', { name: 'Novo Veículo' })).toHaveCount(0);
  expect(corpo).toEqual({ placa: 'NEW1A23', modelo: 'X', anoFabricacao: 2022, quilometragem: 5 });
});

test('motoristas: sem CPF, telefone e e-mail; o PUT leva vencimentoCnh', async ({ page }) => {
  const erros: string[] = [];
  page.on('pageerror', (e) => erros.push(e.message));
  let corpo: unknown;
  await page.route(/localhost:8080\/api\/motoristas\/1$/, async (route) => {
    corpo = route.request().postDataJSON();
    return route.fulfill({ status: 200, contentType: 'application/json', body: '{"id":1,"nome":"Ana Souza","cnh":"12345678900","categoriaCnh":"C","vencimentoCnh":"2031-05-05","status":"ATIVO"}' });
  });
  await page.goto('/motoristas');
  for (const col of ['CPF', 'Telefone']) {
    await expect(page.getByRole('columnheader', { name: col })).toHaveCount(0);
  }
  await page.getByRole('row', { name: /Ana Souza/ }).getByRole('button', { name: 'Editar' }).click();
  for (const campo of ['CPF', 'Telefone', 'Email', 'Status']) {
    await expect(page.locator('form').getByLabel(campo, { exact: true })).toHaveCount(0);
  }
  await page.locator('form').getByLabel('Validade CNH').fill('2031-05-05');
  await page.getByRole('button', { name: 'Atualizar' }).click();
  await expect(page.getByRole('heading', { name: 'Editar Motorista' })).toHaveCount(0);
  expect(corpo).toMatchObject({ nome: 'Ana Souza', cnh: '12345678900', vencimentoCnh: '2031-05-05' });
  expect(erros).toEqual([]);
});

test('manutenções: sem a coluna Oficina', async ({ page }) => {
  await page.goto('/manutencoes');
  await expect(page.getByRole('columnheader', { name: 'Veículo ID' })).toBeVisible();
  await expect(page.getByRole('columnheader', { name: 'Oficina' })).toHaveCount(0);
});

test('com a autenticação desligada, /login volta ao dashboard e não há botão Sair', async ({ page }) => {
  await page.goto('/login');
  await expect(page).toHaveURL(/\/dashboard$/);
  await expect(page.getByRole('button', { name: 'Sair' })).toHaveCount(0);
});
