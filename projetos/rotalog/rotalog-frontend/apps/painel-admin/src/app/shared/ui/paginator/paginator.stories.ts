import type { Meta, StoryObj } from '@storybook/angular';
import { moduleMetadata } from '@storybook/angular';
import { PaginatorComponent } from './paginator.component';

const meta: Meta<PaginatorComponent> = {
  title: 'Shared/Paginator',
  component: PaginatorComponent,
  decorators: [moduleMetadata({ imports: [PaginatorComponent] })],
  args: { itens: 'veículos', total: 57, pagina: 2, tamanho: 10 },
};
export default meta;
type Story = StoryObj<PaginatorComponent>;

/** O resumo ("11–20 de 57") fica numa região aria-live polite. */
export const Padrao: Story = {};

export const PrimeiraPagina: Story = { args: { pagina: 1 } };

export const UltimaPagina: Story = { args: { pagina: 6 } };

export const Tamanho25: Story = { args: { tamanho: 25, pagina: 1 } };

/** Com poucos itens só o resumo aparece, sem controles. */
export const ListaCurta: Story = { args: { total: 7, pagina: 1 } };

export const SemItens: Story = { args: { total: 0, pagina: 1 } };
