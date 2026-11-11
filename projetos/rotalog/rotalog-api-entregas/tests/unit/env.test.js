const { env, validarEnv } = require('../../src/config/env');

const guardadas = {};
const NOMES = ['DB_USER', 'DB_PASSWORD', 'DB_HOST', 'DB_PORT', 'PORT', 'HTTP_TIMEOUT_MS', 'API_FROTAS_URL'];

beforeEach(() => NOMES.forEach((n) => { guardadas[n] = process.env[n]; delete process.env[n]; }));
afterEach(() => NOMES.forEach((n) => {
    if (guardadas[n] === undefined) delete process.env[n]; else process.env[n] = guardadas[n];
}));

describe('validarEnv', () => {
    test('lista as obrigatórias ausentes, sem valores', () => {
        expect(() => validarEnv()).toThrow('Variáveis de ambiente obrigatórias ausentes: DB_USER, DB_PASSWORD');
    });

    test('passa com as obrigatórias definidas', () => {
        process.env.DB_USER = 'u';
        process.env.DB_PASSWORD = 'p';
        expect(() => validarEnv()).not.toThrow();
    });
});

describe('env', () => {
    test('credenciais não têm fallback', () => {
        expect(env.DB_USER).toBeUndefined();
        expect(env.DB_PASSWORD).toBeUndefined();
    });

    test('padrões sem credencial', () => {
        expect(env.DB_HOST).toBe('localhost');
        expect(env.DB_PORT).toBe(5432);
        expect(env.PORT).toBe(3000);
        expect(env.HTTP_TIMEOUT_MS).toBe(5000);
        expect(env.API_FROTAS_URL).toBe('http://localhost:8080/api');
    });

    test('lê no momento do uso e converte números', () => {
        process.env.PORT = '4000';
        process.env.HTTP_TIMEOUT_MS = 'abc';
        expect(env.PORT).toBe(4000);
        expect(env.HTTP_TIMEOUT_MS).toBe(5000);
    });
});
