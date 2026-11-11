import type { Meta, StoryObj } from '@storybook/angular';
import { moduleMetadata } from '@storybook/angular';
import { EmptyStateComponent } from './empty-state.component';

const meta: Meta<EmptyStateComponent> = {
  title: 'Shared/EmptyState',
  component: EmptyStateComponent,
  decorators: [moduleMetadata({ imports: [EmptyStateComponent] })],
};
export default meta;
type Story = StoryObj<EmptyStateComponent>;

export const Padrao: Story = {
  args: { mensagem: 'Nenhum veículo encontrado.' },
};
