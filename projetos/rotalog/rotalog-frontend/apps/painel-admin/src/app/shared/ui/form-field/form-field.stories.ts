import type { Meta, StoryObj } from '@storybook/angular';
import { moduleMetadata } from '@storybook/angular';
import { FormControlDirective, FormFieldComponent } from './form-field.component';

const meta: Meta<FormFieldComponent> = {
  title: 'Shared/FormField',
  component: FormFieldComponent,
  decorators: [moduleMetadata({ imports: [FormFieldComponent, FormControlDirective] })],
  args: { label: 'Placa', obrigatorio: false, erro: null, ajuda: null },
};
export default meta;
type Story = StoryObj<FormFieldComponent>;

export const Padrao: Story = {
  render: (args) => ({
    props: args,
    template: `
      <app-form-field [label]="label" [obrigatorio]="obrigatorio" [erro]="erro" [ajuda]="ajuda">
        <input appControl type="text" />
      </app-form-field>
    `,
  }),
};

export const Obrigatorio: Story = {
  ...Padrao,
  args: { obrigatorio: true },
};

export const ComAjuda: Story = {
  ...Padrao,
  args: { label: 'Ano', ajuda: 'Ano de fabricação, com 4 dígitos.' },
};

export const ComErro: Story = {
  ...Padrao,
  args: { obrigatorio: true, erro: 'Campo obrigatório.' },
};

export const ComSelect: Story = {
  render: () => ({
    template: `
      <app-form-field label="Categoria CNH">
        <select appControl>
          <option>A</option><option>B</option><option>C</option>
        </select>
      </app-form-field>
    `,
  }),
};
