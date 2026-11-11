const frotasService = require('../services/frotasService');
const logger = require('../utils/logger');

// Cria um handler que consulta a api-frotas.
//   buscar(req)            -> Promise com o resultado
//   opcoes.naoEncontrado   -> mensagem do 404 quando o resultado é vazio (sem isso, nunca responde 404)
// Falha ao falar com a api-frotas responde 502; a causa vai só para o log.
function proxyFrotas(buscar, opcoes) {
    const config = opcoes || {};
    return function(req, res) {
        buscar(req)
            .then(function(resultado) {
                if (!resultado && config.naoEncontrado) {
                    return res.status(404).json({ error: config.naoEncontrado });
                }
                res.json(resultado);
            })
            .catch(function(err) {
                logger.error({ err: err }, 'Erro ao comunicar com api-frotas');
                res.status(502).json({ error: 'Erro ao comunicar com api-frotas' });
            });
    };
}

module.exports = {
    proxyFrotas,
    veiculosDisponiveis: proxyFrotas(function() {
        return frotasService.listarVeiculosAtivos();
    }),
    veiculoPorPlaca: proxyFrotas(function(req) {
        return frotasService.buscarVeiculoPorPlaca(req.params.placa);
    }, { naoEncontrado: 'Veículo não encontrado' }),
    disponibilidade: proxyFrotas(function(req) {
        return frotasService.verificarDisponibilidadeVeiculo(req.params.placa);
    }),
    motoristaPorId: proxyFrotas(function(req) {
        return frotasService.buscarMotoristaPorId(req.params.id);
    }, { naoEncontrado: 'Motorista não encontrado' })
};
