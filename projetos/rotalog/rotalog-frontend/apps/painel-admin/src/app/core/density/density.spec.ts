import { TestBed } from '@angular/core/testing';
import { DensityToggleComponent } from '../../shared/ui/density-toggle/density-toggle.component';
import { DensityService } from './density.service';

describe('DensityService', () => {
  beforeEach(() => {
    localStorage.clear();
    document.documentElement.removeAttribute('data-densidade');
  });

  it('confortável é o padrão e não grava atributo', () => {
    const s = TestBed.inject(DensityService);
    TestBed.flushEffects();
    expect(s.densidade()).toBe('confortavel');
    expect(document.documentElement.hasAttribute('data-densidade')).toBe(false);
  });

  it('compacta grava data-densidade="compacta" no <html> e volta a remover', () => {
    const s = TestBed.inject(DensityService);
    s.alternar();
    TestBed.flushEffects();
    expect(document.documentElement.getAttribute('data-densidade')).toBe('compacta');
    s.alternar();
    TestBed.flushEffects();
    expect(document.documentElement.hasAttribute('data-densidade')).toBe(false);
  });

  it('guarda a escolha e a retoma ao iniciar', () => {
    localStorage.setItem('rotalog.densidade', 'compacta');
    expect(TestBed.inject(DensityService).densidade()).toBe('compacta');
  });

  it('valor salvo desconhecido cai no confortável', () => {
    localStorage.setItem('rotalog.densidade', 'qualquer');
    expect(TestBed.inject(DensityService).densidade()).toBe('confortavel');
  });

  it('não quebra com o storage bloqueado', () => {
    const set = jest.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('bloqueado');
    });
    const s = TestBed.inject(DensityService);
    expect(() => s.definir('compacta')).not.toThrow();
    expect(s.densidade()).toBe('compacta');
    set.mockRestore();
  });

  it('o botão expõe o estado em aria-pressed e alterna', () => {
    const f = TestBed.createComponent(DensityToggleComponent);
    f.detectChanges();
    const b = (f.nativeElement as HTMLElement).querySelector('button') as HTMLButtonElement;
    expect(b.getAttribute('aria-pressed')).toBe('false');
    b.click();
    f.detectChanges();
    expect(b.getAttribute('aria-pressed')).toBe('true');
    expect(b.textContent).toContain('Modo compacto');
  });
});
