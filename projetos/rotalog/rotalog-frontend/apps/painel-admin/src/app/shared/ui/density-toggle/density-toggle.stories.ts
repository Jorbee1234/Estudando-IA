import type { Meta, StoryObj } from '@storybook/angular';
import { moduleMetadata } from '@storybook/angular';
import { DensityToggleComponent } from './density-toggle.component';

const meta: Meta<DensityToggleComponent> = {
  title: 'Shared/DensityToggle',
  component: DensityToggleComponent,
  decorators: [moduleMetadata({ imports: [DensityToggleComponent] })],
};
export default meta;

/** Alterna data-densidade no <html>; a barra de ferramentas do Storybook faz o mesmo. */
export const Padrao: StoryObj<DensityToggleComponent> = {};
