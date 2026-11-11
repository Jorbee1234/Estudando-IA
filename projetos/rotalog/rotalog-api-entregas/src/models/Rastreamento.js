// FIXME(MAPA §5.2): sem FK no banco, sem índices e `evento` como texto livre.

const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const Rastreamento = sequelize.define('Rastreamento', {
    id: {
        type: DataTypes.BIGINT,
        primaryKey: true,
        autoIncrement: true
    },
    entrega_id: {
        type: DataTypes.BIGINT,
        allowNull: false
    },
    latitude: {
        type: DataTypes.DECIMAL(10, 7),
        allowNull: true
    },
    longitude: {
        type: DataTypes.DECIMAL(10, 7),
        allowNull: true
    },
    evento: {
        type: DataTypes.STRING(50),
        allowNull: false
    },
    descricao: {
        type: DataTypes.TEXT,
        allowNull: true
    },
    data_evento: {
        type: DataTypes.DATE,
        defaultValue: DataTypes.NOW
    }
}, {
    tableName: 'rastreamentos',
    timestamps: false
});

// Eventos da entrega, do mais recente para o mais antigo.
Rastreamento.porEntrega = function(entregaId) {
    return this.findAll({
        where: { entrega_id: entregaId },
        order: [['data_evento', 'DESC']]
    });
};

module.exports = Rastreamento;
