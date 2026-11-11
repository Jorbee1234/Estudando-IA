import type { Meta, StoryObj } from '@storybook/angular';
import { moduleMetadata } from '@storybook/angular';
import { ButtonComponent } from '../button/button.component';
import { PageHeaderComponent } from './page-header.component';

const meta: Meta<PageHeaderComponent> = {
  title: 'Shared/PageHeader',
  component: PageHeaderComponent,
  decorators: [moduleMetadata({ imports: [PageHeaderComponent, ButtonComponent] })],
};
export default meta;
type Story = StoryObj<PageHeaderComponent>;

export const SoTitulo: Story = {
  args: { titulo: 'Entregas' },
};

export const ComAcoes: Story = {
  args: { titulo: 'Gestão de Veículos' },
  render: (args) => ({
    props: args,
    template: `
      <app-page-header [titulo]="titulo">
        <button appButton variante="secondary">Atualizar</button>
        <button appButton>+ Novo Veículo</button>
      </app-page-header>
    `,
  }),
};
