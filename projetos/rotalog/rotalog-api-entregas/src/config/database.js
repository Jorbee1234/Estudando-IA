const { Sequelize } = require('sequelize');
const { env } = require('./env');
const logger = require('../utils/logger');

const sequelize = new Sequelize(env.DB_NAME, env.DB_USER, env.DB_PASSWORD, {
    host: env.DB_HOST,
    port: env.DB_PORT,
    dialect: 'postgres',
    logging: function(sql) { logger.debug(sql); },
    schema: env.DB_SCHEMA,
    define: {
        schema: env.DB_SCHEMA,
        timestamps: false,
        underscored: true
    },
    pool: {
        max: 5,
        min: 0,
        acquire: 30000,
        idle: 10000
    }
});

// Lança se o banco estiver fora: a API não sobe sem banco.
async function testConnection() {
    try {
        await sequelize.authenticate();
        logger.info('Conexão com o banco estabelecida');
    } catch (error) {
        logger.error({ err: error }, 'Não foi possível conectar ao banco');
        throw error;
    }
}

module.exports = { sequelize, testConnection };
