import type { StorybookConfig } from '@storybook/angular';

// Catálogo dos componentes de shared/ui (ADR 0003, D7). Usa o mesmo styles.css do app.
const config: StorybookConfig = {
  stories: ['../src/**/*.stories.ts'],
  addons: ['@storybook/addon-essentials', '@storybook/addon-a11y'],
  framework: { name: '@storybook/angular', options: {} },
  // A minificação apaga o nome das classes decoradas e o painel de controles falha com
  // "Invalid component undefined". Catálogo interno: o tamanho do bundle não importa.
  webpackFinal: async (config) => {
    config.optimization = { ...config.optimization, minimize: false };
    return config;
  },
};

export default config;
