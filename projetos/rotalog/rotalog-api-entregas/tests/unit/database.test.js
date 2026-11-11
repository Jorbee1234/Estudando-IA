// Usa o Sequelize real, sem abrir conexão: authenticate é simulado.
const { sequelize, testConnection } = require('../../src/config/database');

test('testConnection resolve quando o banco responde', async () => {
    jest.spyOn(sequelize, 'authenticate').mockResolvedValue();
    await expect(testConnection()).resolves.toBeUndefined();
});

test('testConnection rejeita quando o banco está fora (a API não sobe sem banco)', async () => {
    jest.spyOn(sequelize, 'authenticate').mockRejectedValue(new Error('ECONNREFUSED'));
    await expect(testConnection()).rejects.toThrow('ECONNREFUSED');
});
