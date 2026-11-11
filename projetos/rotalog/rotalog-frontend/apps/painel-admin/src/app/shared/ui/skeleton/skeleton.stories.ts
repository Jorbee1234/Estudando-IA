import type { Meta, StoryObj } from '@storybook/angular';
import { moduleMetadata } from '@storybook/angular';
import { SkeletonComponent } from './skeleton.component';

const meta: Meta<SkeletonComponent> = {
  title: 'Shared/Skeleton',
  component: SkeletonComponent,
  decorators: [moduleMetadata({ imports: [SkeletonComponent] })],
  argTypes: {
    variante: { control: 'select', options: ['linha', 'cartao', 'estatisticas', 'tabela', 'grafico'] },
  },
};
export default meta;
type Story = StoryObj<SkeletonComponent>;

export const Tabela: Story = {
  args: { variante: 'tabela', linhas: 5, colunas: 7, rotulo: 'Carregando veículos...' },
};

export const Cartao: Story = {
  args: { variante: 'cartao', linhas: 4, rotulo: 'Carregando alertas...' },
};

export const Estatisticas: Story = {
  args: { variante: 'estatisticas', colunas: 4, anunciar: false },
};

export const EstatisticasCompactas: Story = {
  args: { variante: 'estatisticas', colunas: 4, compacto: true, anunciar: false },
};

export const Grafico: Story = {
  args: { variante: 'grafico', altura: '14rem', rotulo: 'Carregando gráfico...' },
};

export const Linhas: Story = {
  args: { variante: 'linha', linhas: 3, rotulo: 'Carregando...' },
};

/** Como o dashboard compõe as peças: um único anúncio e as demais [anunciar]="false". */
export const ComposicaoDoDashboard: Story = {
  render: () => ({
    template: `
      <p class="visually-hidden" role="status">Carregando dados...</p>
      <app-skeleton variante="estatisticas" [colunas]="4" [anunciar]="false" />
      <app-skeleton variante="cartao" [linhas]="4" [anunciar]="false" />
      <app-skeleton variante="tabela" [linhas]="3" [colunas]="5" [anunciar]="false" />
    `,
  }),
};
