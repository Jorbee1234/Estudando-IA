import { TestBed } from '@angular/core/testing';
import { SidebarStateService } from './sidebar-state.service';

describe('SidebarStateService', () => {
  beforeEach(() => {
    localStorage.clear();
    document.documentElement.removeAttribute('data-sidebar');
  });

  it('começa expandido e sem atributo no <html>', () => {
    const s = TestBed.inject(SidebarStateService);
    TestBed.flushEffects();
    expect(s.recolhida()).toBe(false);
    expect(document.documentElement.hasAttribute('data-sidebar')).toBe(false);
  });

  it('recolher grava data-sidebar="recolhida" e expandir remove', () => {
    const s = TestBed.inject(SidebarStateService);
    s.alternar();
    TestBed.flushEffects();
    expect(document.documentElement.getAttribute('data-sidebar')).toBe('recolhida');
    s.alternar();
    TestBed.flushEffects();
    expect(document.documentElement.hasAttribute('data-sidebar')).toBe(false);
  });

  it('guarda a escolha e a retoma ao iniciar', () => {
    TestBed.inject(SidebarStateService).definir(true);
    expect(localStorage.getItem('rotalog.sidebar')).toBe('recolhida');
    TestBed.resetTestingModule();
    expect(TestBed.inject(SidebarStateService).recolhida()).toBe(true);
  });

  it('valor salvo desconhecido cai no expandido', () => {
    localStorage.setItem('rotalog.sidebar', 'qualquer');
    expect(TestBed.inject(SidebarStateService).recolhida()).toBe(false);
  });

  it('não quebra com o storage bloqueado, nem ao ler nem ao gravar', () => {
    const set = jest.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('bloqueado');
    });
    const get = jest.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('bloqueado');
    });
    const s = TestBed.inject(SidebarStateService);
    expect(s.recolhida()).toBe(false);
    expect(() => s.definir(true)).not.toThrow();
    expect(s.recolhida()).toBe(true);
    set.mockRestore();
    get.mockRestore();
  });
});
