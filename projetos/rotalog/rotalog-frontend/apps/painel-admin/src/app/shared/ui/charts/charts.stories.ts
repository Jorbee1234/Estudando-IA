import type { Meta, StoryObj } from '@storybook/angular';
import { moduleMetadata } from '@storybook/angular';
import { BarChartComponent } from './bar-chart.component';
import { DadoGrafico } from './dado-grafico';
import { DonutChartComponent } from './donut-chart.component';

const frota: DadoGrafico[] = [
  { rotulo: 'Ativo', valor: 18, cor: 'var(--grafico-3)' },
  { rotulo: 'Em manutenção', valor: 4, cor: 'var(--grafico-2)' },
  { rotulo: 'Inativo', valor: 2, cor: 'var(--grafico-sem-dado)' },
];

const meses: DadoGrafico[] = [
  { rotulo: 'jun/2026', valor: 3, cor: 'var(--grafico-1)' },
  { rotulo: 'jul/2026', valor: 7, cor: 'var(--grafico-1)' },
  { rotulo: 'ago/2026', valor: 5, cor: 'var(--grafico-1)' },
  { rotulo: 'set/2026', valor: 12, cor: 'var(--grafico-1)' },
];

/** Todas as séries da paleta (--grafico-1 a 6), para revisar as cores nos dois temas. */
const paleta: DadoGrafico[] = [1, 2, 3, 4, 5, 6].map((n) => ({
  rotulo: `Série ${n}`,
  valor: 10 + n * 3,
  cor: `var(--grafico-${n})`,
}));

const meta: Meta<DonutChartComponent> = {
  title: 'Shared/Charts',
  component: DonutChartComponent,
  decorators: [moduleMetadata({ imports: [DonutChartComponent, BarChartComponent] })],
};
export default meta;
type Story = StoryObj<DonutChartComponent>;

/** O desenho é decorativo (aria-hidden); a tabela de dados oculta é o que o leitor de tela lê. */
export const Rosca: Story = {
  args: { titulo: 'Frota por situação', unidade: 'veículos', unidadeSingular: 'veículo', dados: frota },
};

export const RoscaUmaCategoria: Story = {
  args: { titulo: 'Frota por situação', unidade: 'veículos', unidadeSingular: 'veículo', dados: [frota[0]] },
};

export const RoscaTotalUm: Story = {
  args: {
    titulo: 'Frota por situação',
    unidade: 'veículos',
    unidadeSingular: 'veículo',
    dados: [{ rotulo: 'Ativo', valor: 1, cor: 'var(--grafico-3)' }],
  },
};

export const RoscaSemDados: Story = {
  args: { titulo: 'Frota por situação', unidade: 'veículos', dados: [] },
};

export const RoscaComTodaAPaleta: Story = {
  args: { titulo: 'Paleta de gráficos', unidade: 'itens', dados: paleta },
};

export const Barras: Story = {
  render: () => ({
    props: { dados: meses },
    template: `<app-bar-chart titulo="Manutenções por mês" unidade="manutenções" unidadeSingular="manutenção" [dados]="dados" />`,
  }),
};

export const BarrasComTodaAPaleta: Story = {
  render: () => ({
    props: { dados: paleta },
    template: `<app-bar-chart titulo="Paleta de gráficos" unidade="itens" [dados]="dados" />`,
  }),
};

export const BarrasSemDados: Story = {
  render: () => ({
    template: `<app-bar-chart titulo="Manutenções por mês" unidade="manutenções" [dados]="[]" />`,
  }),
};
