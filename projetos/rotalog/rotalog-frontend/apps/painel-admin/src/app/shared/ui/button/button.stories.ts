import type { Meta, StoryObj } from '@storybook/angular';
import { moduleMetadata } from '@storybook/angular';
import { ButtonComponent } from './button.component';

const meta: Meta<ButtonComponent> = {
  title: 'Shared/Button',
  component: ButtonComponent,
  decorators: [moduleMetadata({ imports: [ButtonComponent] })],
  argTypes: {
    variante: { control: 'select', options: ['primary', 'secondary', 'danger', 'ghost', 'icon'] },
    tipo: { control: 'inline-radio', options: ['button', 'submit'] },
  },
};
export default meta;
type Story = StoryObj<ButtonComponent>;

export const Padrao: Story = {
  args: { variante: 'primary', pequeno: false, tipo: 'button' },
  render: (args) => ({
    props: args,
    template: `<button appButton [variante]="variante" [pequeno]="pequeno" [tipo]="tipo">Salvar</button>`,
  }),
};

export const Variantes: Story = {
  render: () => ({
    template: `
      <div style="display:flex; gap:.75rem; flex-wrap:wrap; align-items:center">
        <button appButton variante="primary">Primário</button>
        <button appButton variante="secondary">Secundário</button>
        <button appButton variante="danger">Perigo</button>
        <button appButton variante="ghost">Fantasma</button>
        <button appButton variante="icon" aria-label="Fechar"><span aria-hidden="true">✕</span></button>
      </div>
    `,
  }),
};

export const Pequenos: Story = {
  render: () => ({
    template: `
      <div style="display:flex; gap:.75rem; align-items:center">
        <button appButton variante="secondary" [pequeno]="true">Editar</button>
        <button appButton variante="danger" [pequeno]="true">Desativar</button>
      </div>
    `,
  }),
};

export const Desabilitados: Story = {
  render: () => ({
    template: `
      <div style="display:flex; gap:.75rem">
        <button appButton disabled>Primário</button>
        <button appButton variante="danger" [pequeno]="true" disabled>Desativar</button>
      </div>
    `,
  }),
};
