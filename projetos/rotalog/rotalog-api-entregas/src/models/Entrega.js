// FIXME(MAPA §5.2): schema com 3 fontes de verdade; sem índices nem ENUM de status
// (a lista de status do SQL continua duplicada em src/config/*.sql).

const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');
const { STATUS } = require('../constants/status');

const Entrega = sequelize.define('Entrega', {
    id: {
        type: DataTypes.BIGINT,
        primaryKey: true,
        autoIncrement: true
    },
    numero_pedido: {
        type: DataTypes.STRING(50),
        allowNull: false,
        unique: true
    },
    veiculo_placa: {
        type: DataTypes.STRING(7),
        allowNull: true
    },
    motorista_id: {
        type: DataTypes.BIGINT,
        allowNull: true
    },
    // motorista_nome e veiculo_modelo são denormalizados (a fonte é a api-frotas).
    motorista_nome: {
        type: DataTypes.STRING(100),
        allowNull: true
    },
    veiculo_modelo: {
        type: DataTypes.STRING(100),
        allowNull: true
    },
    origem_endereco: {
        type: DataTypes.STRING(255),
        allowNull: false
    },
    origem_lat: {
        type: DataTypes.DECIMAL(10, 7),
        allowNull: true
    },
    origem_lng: {
        type: DataTypes.DECIMAL(10, 7),
        allowNull: true
    },
    destino_endereco: {
        type: DataTypes.STRING(255),
        allowNull: false
    },
    destino_lat: {
        type: DataTypes.DECIMAL(10, 7),
        allowNull: true
    },
    destino_lng: {
        type: DataTypes.DECIMAL(10, 7),
        allowNull: true
    },
    peso_kg: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: true
    },
    distancia_km: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: true
    },
    tempo_estimado_minutos: {
        type: DataTypes.INTEGER,
        allowNull: true
    },
    status: {
        type: DataTypes.STRING(20),
        allowNull: false,
        defaultValue: STATUS.PENDENTE
    },
    observacoes: {
        type: DataTypes.TEXT,
        allowNull: true
    },
    data_criacao: {
        type: DataTypes.DATE,
        defaultValue: DataTypes.NOW
    },
    data_atualizacao: {
        type: DataTypes.DATE,
        defaultValue: DataTypes.NOW
    },
    data_coleta: {
        type: DataTypes.DATE,
        allowNull: true
    },
    data_entrega: {
        type: DataTypes.DATE,
        allowNull: true
    }
}, {
    tableName: 'entregas',
    timestamps: false
});

module.exports = Entrega;
