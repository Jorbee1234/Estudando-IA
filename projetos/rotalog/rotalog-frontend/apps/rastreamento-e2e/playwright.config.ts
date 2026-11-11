import { defineConfig, devices } from '@playwright/test';
import { workspaceRoot } from '@nx/devkit';

const baseURL = process.env['BASE_URL'] || 'http://localhost:3001';

/**
 * E2E do portal `rastreamento` (ADR 0004, D10). A API e os tiles do OSM são
 * SEMPRE simulados (ver src/fixtures.ts): os testes não dependem de rede nem de banco.
 * Capturas de tela: `npx nx e2e-atualizar-capturas rastreamento-e2e` regera a linha de base.
 */
export default defineConfig({
  testDir: './src',
  snapshotPathTemplate: '{testDir}/__capturas__/{testFilePath}/{arg}-{projectName}{ext}',
  fullyParallel: true,
  reporter: [['list']],
  expect: { toHaveScreenshot: { maxDiffPixelRatio: 0.01, animations: 'disabled' } },
  use: {
    baseURL,
    locale: 'pt-BR',
    timezoneId: 'America/Sao_Paulo',
    trace: 'on-first-retry',
  },
  webServer: {
    command: 'npx nx run rastreamento:serve',
    url: baseURL,
    reuseExistingServer: !process.env['CI'],
    cwd: workspaceRoot,
    timeout: 180_000,
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
});
