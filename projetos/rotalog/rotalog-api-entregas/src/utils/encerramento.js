// Encerramento limpo: para de aceitar conexões, fecha o pool e sai.
// Chamado mais de uma vez, só a primeira vale. Se travar, sai com código 1 após o timeout.
function criarEncerramento(deps) {
    let encerrando = false;

    return function encerrar(motivo, codigo) {
        if (encerrando) return;
        encerrando = true;
        deps.logger.info({ motivo: motivo }, 'Encerrando');

        const forcar = setTimeout(function() {
            deps.logger.error('Encerramento excedeu o tempo limite');
            deps.sair(1);
        }, deps.timeoutMs);
        forcar.unref();

        function fecharBanco(codigoFinal) {
            Promise.resolve()
                .then(deps.fecharBanco)
                .catch(function(erro) { deps.logger.error({ err: erro }, 'Erro ao fechar o pool'); })
                .then(function() { deps.sair(codigoFinal); });
        }

        const servidor = deps.obterServidor();
        if (!servidor) return fecharBanco(codigo);

        servidor.close(function(erro) {
            fecharBanco(erro ? 1 : codigo);
        });
        if (servidor.closeIdleConnections) servidor.closeIdleConnections();
    };
}

module.exports = { criarEncerramento };
