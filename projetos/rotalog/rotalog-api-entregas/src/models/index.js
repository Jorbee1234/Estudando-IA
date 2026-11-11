const Entrega = require('./Entrega');
const Rastreamento = require('./Rastreamento');

Entrega.hasMany(Rastreamento, { foreignKey: 'entrega_id', as: 'rastreamentos' });
Rastreamento.belongsTo(Entrega, { foreignKey: 'entrega_id', as: 'entrega' });

module.exports = { Entrega, Rastreamento };
