import type { Meta, StoryObj } from '@storybook/angular';
import { moduleMetadata } from '@storybook/angular';
import { ThemeToggleComponent } from './theme-toggle.component';

const meta: Meta<ThemeToggleComponent> = {
  title: 'Shared/ThemeToggle',
  component: ThemeToggleComponent,
  decorators: [moduleMetadata({ imports: [ThemeToggleComponent] })],
};
export default meta;

export const Padrao: StoryObj<ThemeToggleComponent> = {};
