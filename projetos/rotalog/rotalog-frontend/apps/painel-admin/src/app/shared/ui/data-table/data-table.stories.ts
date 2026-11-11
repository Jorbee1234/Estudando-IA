import type { Meta, StoryObj } from '@storybook/angular';
import { moduleMetadata } from '@storybook/angular';
import { ButtonComponent } from '../button/button.component';
import { SortableHeaderComponent } from '../sortable-header/sortable-header.component';
import { StatusBadgeComponent } from '../status-badge/status-badge.component';
import { DataTableComponent } from './data-table.component';

const meta: Meta<DataTableComponent> = {
  title: 'Shared/DataTable',
  component: DataTableComponent,
  decorators: [
    moduleMetadata({
      imports: [DataTableComponent, SortableHeaderComponent, StatusBadgeComponent, ButtonComponent],
    }),
  ],
};
export default meta;
type Story = StoryObj<DataTableComponent>;

/** Muitas linhas (25/50 por página): `rolavel` limita a altura e fixa o cabeçalho. */
export const Rolavel: Story = {
  args: { legenda: 'Lista de veículos', rolavel: true },
  render: (args) => ({
    props: { ...args, linhas: Array.from({ length: 40 }, (_, i) => i + 1) },
    template: `
      <app-data-table [legenda]="legenda" [rolavel]="rolavel">
        <thead><tr><th scope="col">ID</th><th scope="col">Placa</th><th scope="col">Modelo</th></tr></thead>
        <tbody>
          @for (n of linhas; track n) {
            <tr><td data-label="ID">{{ n }}</td><td data-label="Placa">AAA{{ n }}</td><td data-label="Modelo">Volvo FH</td></tr>
          }
        </tbody>
      </app-data-table>
    `,
  }),
};

export const ComOrdenacaoEStatus: Story = {
  args: { legenda: 'Lista de veículos' },
  render: (args) => ({
    props: { ...args, ordem: 'asc' },
    template: `
      <app-data-table [legenda]="legenda">
        <thead>
          <tr>
            <th appSortable [ordem]="ordem">Placa</th>
            <th appSortable [ordem]="null">Modelo</th>
            <th scope="col">Status</th>
            <th scope="col" class="col-num">KM Atual</th>
            <th scope="col">Ações</th>
          </tr>
        </thead>
        <tbody>
          <tr class="is-clickable">
            <td><button type="button" class="row-link">ABC1D23</button></td>
            <td>Volvo FH</td>
            <td><app-status-badge dominio="veiculo" valor="ATIVO" /></td>
            <td class="col-num">120.000 km</td>
            <td><div class="actions">
              <button appButton variante="secondary" [pequeno]="true">Editar</button>
              <button appButton variante="danger" [pequeno]="true">Desativar</button>
            </div></td>
          </tr>
          <tr class="is-clickable">
            <td><button type="button" class="row-link">XYZ9K88</button></td>
            <td>Scania R450</td>
            <td><app-status-badge dominio="veiculo" valor="MANUTENCAO" /></td>
            <td class="col-num">310.500 km</td>
            <td><div class="actions">
              <button appButton variante="secondary" [pequeno]="true">Editar</button>
              <button appButton variante="danger" [pequeno]="true">Desativar</button>
            </div></td>
          </tr>
          <tr class="is-clickable">
            <td><button type="button" class="row-link">QWE4R56</button></td>
            <td>Mercedes Actros</td>
            <td><app-status-badge dominio="veiculo" valor="INATIVO" /></td>
            <td class="col-num">88.200 km</td>
            <td><div class="actions">
              <button appButton variante="secondary" [pequeno]="true">Editar</button>
              <button appButton variante="danger" [pequeno]="true" disabled>Desativar</button>
            </div></td>
          </tr>
        </tbody>
      </app-data-table>
    `,
  }),
};
