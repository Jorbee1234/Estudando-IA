import type { Meta, StoryObj } from '@storybook/angular';
import { moduleMetadata } from '@storybook/angular';
import { STATUS_CONFIG } from '../../constants/status-config';
import { StatusBadgeComponent } from './status-badge.component';

const meta: Meta<StatusBadgeComponent> = {
  title: 'Shared/StatusBadge',
  component: StatusBadgeComponent,
  decorators: [moduleMetadata({ imports: [StatusBadgeComponent] })],
};
export default meta;
type Story = StoryObj<StatusBadgeComponent>;

export const Padrao: Story = {
  args: { dominio: 'veiculo', valor: 'MANUTENCAO' },
};

/** Todos os status de todos os domínios, a partir do STATUS_CONFIG (fonte única). */
export const Todos: Story = {
  render: () => ({
    props: {
      grupos: Object.entries(STATUS_CONFIG).map(([dominio, mapa]) => ({
        dominio,
        valores: Object.keys(mapa),
      })),
    },
    template: `
      @for (g of grupos; track g.dominio) {
        <h3 style="margin: 1rem 0 .5rem">{{ g.dominio }}</h3>
        <div style="display:flex; gap:.5rem; flex-wrap:wrap">
          @for (v of g.valores; track v) {
            <app-status-badge [dominio]="$any(g.dominio)" [valor]="v" />
          }
        </div>
      }
    `,
  }),
};

export const ValorDesconhecido: Story = {
  args: { dominio: 'entrega', valor: 'ALGO_NOVO' },
};
