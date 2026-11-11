import { Component, signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ThemeService } from '../../core/theme/theme.service';
import { ButtonComponent } from './button/button.component';
import { DataTableComponent } from './data-table/data-table.component';
import { EmptyStateComponent } from './empty-state/empty-state.component';
import { FormControlDirective, FormFieldComponent } from './form-field/form-field.component';
import { PageHeaderComponent } from './page-header/page-header.component';
import { Ordem, SortableHeaderComponent } from './sortable-header/sortable-header.component';
import { StatusBadgeComponent } from './status-badge/status-badge.component';
import { ThemeToggleComponent } from './theme-toggle/theme-toggle.component';

@Component({
  standalone: true,
  imports: [
    StatusBadgeComponent,
    ButtonComponent,
    PageHeaderComponent,
    EmptyStateComponent,
    FormFieldComponent,
    FormControlDirective,
    DataTableComponent,
    SortableHeaderComponent,
  ],
  template: `
    <app-status-badge dominio="veiculo" [valor]="status()" />
    <button appButton variante="danger" [pequeno]="true">Remover</button>
    <app-page-header titulo="Veículos"><button appButton>Novo</button></app-page-header>
    <app-empty-state mensagem="Nada por aqui." />
    <app-form-field label="Placa" [obrigatorio]="true" [erro]="erro()" ajuda="Sete caracteres">
      <input appControl />
    </app-form-field>
    <app-data-table legenda="Lista de veículos">
      <thead>
        <tr>
          <th appSortable [ordem]="ordem()" (ordenar)="cliques = cliques + 1">Placa</th>
        </tr>
      </thead>
      <tbody><tr><td>ABC1D23</td></tr></tbody>
    </app-data-table>
  `,
})
class HostComponent {
  status = signal<string | null>('MANUTENCAO');
  erro = signal<string | null>(null);
  ordem = signal<Ordem>(null);
  cliques = 0;
}

describe('shared/ui', () => {
  let fixture: ComponentFixture<HostComponent>;
  let el: HTMLElement;

  beforeEach(() => {
    fixture = TestBed.createComponent(HostComponent);
    fixture.detectChanges();
    el = fixture.nativeElement;
  });

  it('status-badge mostra ícone decorativo + rótulo e a classe do tom', () => {
    const badge = el.querySelector('.status-badge') as HTMLElement;
    expect(badge.className).toContain('status--alerta');
    expect(badge.textContent).toContain('Em manutenção');
    expect(badge.querySelector('[aria-hidden="true"]')).not.toBeNull();
  });

  it('status-badge reage à mudança do valor e tolera valor desconhecido', () => {
    fixture.componentInstance.status.set('BAIXADO');
    fixture.detectChanges();
    const badge = el.querySelector('.status-badge') as HTMLElement;
    expect(badge.className).toContain('status--neutro');
    expect(badge.textContent).toContain('BAIXADO');
  });

  it('appButton mantém o <button> nativo, type=button e classes da variante', () => {
    const b = el.querySelector('button.btn--danger') as HTMLButtonElement;
    expect(b.tagName).toBe('BUTTON');
    expect(b.getAttribute('type')).toBe('button');
    expect(b.className).toContain('btn--sm');
  });

  it('page-header tem um h1 e projeta as ações', () => {
    const h1 = el.querySelector('app-page-header h1');
    expect(h1?.textContent).toBe('Veículos');
    expect(el.querySelector('app-page-header .page-header__acoes button')).not.toBeNull();
  });

  it('empty-state é anunciado (role=status)', () => {
    expect(el.querySelector('app-empty-state [role="status"]')?.textContent).toContain('Nada por aqui.');
  });

  it('form-field liga label, id, obrigatório e ajuda ao controle', () => {
    const input = el.querySelector('input') as HTMLInputElement;
    const label = el.querySelector('app-form-field label') as HTMLLabelElement;
    expect(input.id).toBeTruthy();
    expect(label.getAttribute('for')).toBe(input.id);
    expect(input.getAttribute('aria-required')).toBe('true');
    expect(input.getAttribute('aria-invalid')).toBeNull();
    expect(label.textContent).toContain('(obrigatório)');
    const msg = el.querySelector(`#${input.getAttribute('aria-describedby')}`);
    expect(msg?.textContent).toContain('Sete caracteres');
  });

  it('form-field com erro marca aria-invalid e anuncia por role=alert', () => {
    fixture.componentInstance.erro.set('Placa inválida');
    fixture.detectChanges();
    const input = el.querySelector('input') as HTMLInputElement;
    expect(input.getAttribute('aria-invalid')).toBe('true');
    const alerta = el.querySelector('[role="alert"]') as HTMLElement;
    expect(alerta.textContent).toContain('Placa inválida');
    expect(alerta.id).toBe(input.getAttribute('aria-describedby'));
  });

  it('cada form-field tem id próprio', () => {
    const a = TestBed.createComponent(HostComponent);
    a.detectChanges();
    const ids = [fixture, a].map((f) => (f.nativeElement as HTMLElement).querySelector('input')?.id);
    expect(ids[0]).not.toBe(ids[1]);
  });

  it('data-table tem legenda (caption) e região rotulada', () => {
    expect(el.querySelector('table caption')?.textContent).toBe('Lista de veículos');
    expect(el.querySelector('.table-wrap')?.getAttribute('aria-label')).toBe('Lista de veículos');
  });

  it('cabeçalho ordenável: scope=col, botão dentro do th e aria-sort', () => {
    const th = el.querySelector('th') as HTMLElement;
    expect(th.getAttribute('scope')).toBe('col');
    expect(th.getAttribute('aria-sort')).toBe('none');
    const botao = th.querySelector('button') as HTMLButtonElement;
    botao.click();
    expect(fixture.componentInstance.cliques).toBe(1);

    fixture.componentInstance.ordem.set('asc');
    fixture.detectChanges();
    expect(th.getAttribute('aria-sort')).toBe('ascending');
    fixture.componentInstance.ordem.set('desc');
    fixture.detectChanges();
    expect(th.getAttribute('aria-sort')).toBe('descending');
  });
});

describe('ThemeService e ThemeToggle', () => {
  beforeEach(() => {
    localStorage.clear();
    document.documentElement.removeAttribute('data-theme');
  });

  it('aplica data-theme no <html> e persiste a escolha', () => {
    const s = TestBed.inject(ThemeService);
    s.definir('escuro');
    TestBed.flushEffects();
    expect(document.documentElement.getAttribute('data-theme')).toBe('dark');
    expect(localStorage.getItem('rotalog.tema')).toBe('escuro');
    s.alternar();
    TestBed.flushEffects();
    expect(document.documentElement.getAttribute('data-theme')).toBe('light');
  });

  it('usa a escolha salva ao iniciar', () => {
    localStorage.setItem('rotalog.tema', 'escuro');
    expect(TestBed.inject(ThemeService).tema()).toBe('escuro');
  });

  it('não quebra quando o storage está bloqueado', () => {
    const set = jest.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('bloqueado');
    });
    const s = TestBed.inject(ThemeService);
    expect(() => s.definir('escuro')).not.toThrow();
    expect(s.tema()).toBe('escuro');
    set.mockRestore();
  });

  it('o botão expõe o estado em aria-pressed e alterna', () => {
    const f = TestBed.createComponent(ThemeToggleComponent);
    f.detectChanges();
    const b = (f.nativeElement as HTMLElement).querySelector('button') as HTMLButtonElement;
    expect(b.getAttribute('aria-pressed')).toBe('false');
    b.click();
    f.detectChanges();
    expect(b.getAttribute('aria-pressed')).toBe('true');
  });
});
