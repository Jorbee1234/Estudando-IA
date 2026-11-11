import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { DataTableComponent } from './data-table.component';

@Component({
  standalone: true,
  imports: [DataTableComponent],
  template: `
    <app-data-table legenda="Lista de testes" [rolavel]="rolavel">
      <thead><tr><th scope="col">Nome</th></tr></thead>
      <tbody><tr><td data-label="Nome">Ana</td></tr></tbody>
    </app-data-table>
  `,
})
class HostComponent {
  rolavel = false;
}

describe('DataTableComponent (rolável)', () => {
  function render(rolavel: boolean) {
    const f = TestBed.createComponent(HostComponent);
    f.componentInstance.rolavel = rolavel;
    f.detectChanges();
    return (f.nativeElement as HTMLElement).querySelector('.table-wrap') as HTMLElement;
  }

  it('por padrão a tabela cresce (sem altura limitada)', () => {
    expect(render(false).classList).not.toContain('table-wrap--rolavel');
  });

  it('com [rolavel] a altura é limitada e a rolagem fica por dentro', () => {
    expect(render(true).classList).toContain('table-wrap--rolavel');
  });

  it('mantém a região focável e nomeada pela legenda (rolagem por teclado)', () => {
    const wrap = render(true);
    expect(wrap.getAttribute('tabindex')).toBe('0');
    expect(wrap.getAttribute('role')).toBe('region');
    expect(wrap.getAttribute('aria-label')).toBe('Lista de testes');
  });
});
