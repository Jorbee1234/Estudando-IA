import { TestBed } from '@angular/core/testing';
import { ErrorHandler } from '@angular/core';
import { appConfig } from '../../app.config';
import { ConfirmService } from './confirm.service';
import { GlobalErrorHandler } from './global-error-handler';
import { ToastService } from './toast.service';

describe('ToastService', () => {
  beforeEach(() => jest.useFakeTimers());
  afterEach(() => jest.useRealTimers());

  it('info e sucesso somem sozinhos; erro fica até ser dispensado', () => {
    const t = TestBed.inject(ToastService);
    t.info('a');
    t.sucesso('b');
    t.erro('c');
    expect(t.toasts().map((x) => x.tipo)).toEqual(['info', 'sucesso', 'erro']);
    jest.advanceTimersByTime(ToastService.DURACAO_MS);
    expect(t.toasts().map((x) => x.mensagem)).toEqual(['c']);
    t.dispensar(t.toasts()[0].id);
    expect(t.toasts()).toEqual([]);
  });
});

describe('ConfirmService', () => {
  it('resolve true/false conforme a resposta e limpa o pedido', async () => {
    const c = TestBed.inject(ConfirmService);
    const p = c.confirmar({ titulo: 'T', mensagem: 'M', perigo: true });
    expect(c.pedido()).toMatchObject({ titulo: 'T', confirmar: 'Confirmar', cancelar: 'Cancelar', perigo: true });
    c.pedido()?.resolver(true);
    await expect(p).resolves.toBe(true);
    expect(c.pedido()).toBeNull();
  });

  it('um pedido novo cancela o anterior', async () => {
    const c = TestBed.inject(ConfirmService);
    const primeiro = c.confirmar({ titulo: '1', mensagem: 'm' });
    const segundo = c.confirmar({ titulo: '2', mensagem: 'm' });
    await expect(primeiro).resolves.toBe(false);
    c.pedido()?.resolver(true);
    await expect(segundo).resolves.toBe(true);
  });
});

describe('GlobalErrorHandler', () => {
  it('está registrado como ErrorHandler do app', () => {
    expect(appConfig.providers).toContainEqual({ provide: ErrorHandler, useClass: GlobalErrorHandler });
  });

  it('mostra aviso genérico e registra só nome e mensagem, sem o objeto', () => {
    const espiao = jest.spyOn(console, 'error').mockImplementation(() => undefined);
    const toast = TestBed.inject(ToastService);
    TestBed.runInInjectionContext(() => new GlobalErrorHandler()).handleError(new TypeError('falhou'));
    expect(toast.toasts().at(-1)).toMatchObject({ tipo: 'erro', mensagem: expect.stringContaining('inesperado') });
    expect(espiao).toHaveBeenCalledWith('[não tratado] TypeError: falhou');
    espiao.mockRestore();
  });
});
