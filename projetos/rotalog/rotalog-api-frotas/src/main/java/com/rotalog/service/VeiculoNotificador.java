package com.rotalog.service;

import com.rotalog.domain.Veiculo;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

/**
 * Notifica o gestor sobre eventos de veículo. A falha no envio é registrada em log e
 * nunca interrompe o fluxo de negócio. O destinatário vem de
 * {@code rotalog.notificacao.gestor-email} (padrão: gestor@rotalog.com).
 *
 * FIXME: envio síncrono e sem timeout; candidato a @Async/eventos (ADR 0001, alternativas)
 */
@Slf4j
@Component
public class VeiculoNotificador {

    private final NotificacaoClient notificacaoClient;
    private final String destinatario;

    public VeiculoNotificador(NotificacaoClient notificacaoClient,
                              @Value("${rotalog.notificacao.gestor-email:gestor@rotalog.com}") String destinatario) {
        this.notificacaoClient = notificacaoClient;
        this.destinatario = destinatario;
    }

    public void novoVeiculo(Veiculo veiculo) {
        enviar("NOVO_VEICULO",
            "Novo veículo cadastrado: " + veiculo.getPlaca() + " - " + veiculo.getModelo());
    }

    public void alertaManutencao(Veiculo veiculo, Long quilometragem) {
        enviar("ALERTA_MANUTENCAO",
            "Veículo " + veiculo.getPlaca() + " atingiu " + quilometragem + " km. Agendar manutenção preventiva.");
    }

    public void veiculoDesativado(Veiculo veiculo) {
        enviar("VEICULO_DESATIVADO", "Veículo " + veiculo.getPlaca() + " foi desativado");
    }

    private void enviar(String tipo, String mensagem) {
        try {
            notificacaoClient.enviarNotificacao(tipo, destinatario, mensagem);
        } catch (Exception e) {
            log.error("Falha ao enviar notificação {}: {}", tipo, e.getMessage());
        }
    }
}
