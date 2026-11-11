package com.rotalog.service;

import com.rotalog.domain.AlertaManutencao;
import com.rotalog.domain.Veiculo;
import com.rotalog.dto.NotificacaoAlertaResposta;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.client.SimpleClientHttpRequestFactory;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestTemplate;

import java.util.HashMap;
import java.util.Map;

/**
 * NotificacaoClient - HTTP client for api-notificacoes
 * 
 * FIXME: URL hardcoded
 * FIXME: Sem circuit breaker
 * FIXME: Sem retry logic
 * FIXME: Sem timeout configurável
 * FIXME: RestTemplate instanciado manualmente em vez de ser Bean
 */
@Slf4j
@Component
public class NotificacaoClient {

    // FIXME: URL hardcoded - deveria estar em application.properties
    private static final String NOTIFICACAO_API_URL = "http://localhost:5000";

    // FIXME: RestTemplate criado manualmente - deveria ser @Bean injetado
    private final RestTemplate restTemplate = new RestTemplate();

    // Usado só pelo alerta de manutenção: com timeout para não travar quando notificações está fora
    private final RestTemplate alertaRestTemplate = criarRestTemplateComTimeout();

    private static RestTemplate criarRestTemplateComTimeout() {
        SimpleClientHttpRequestFactory factory = new SimpleClientHttpRequestFactory();
        factory.setConnectTimeout(2000);
        factory.setReadTimeout(5000);
        return new RestTemplate(factory);
    }

    /**
     * Envia notificação para api-notificacoes
     * 
     * FIXME: Sem retry
     * FIXME: Sem fallback
     * FIXME: Sem validação de resposta
     * FIXME: Engolindo exceções no chamador
     */
    public void enviarNotificacao(String tipo, String destinatario, String mensagem) {
        try {
            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.APPLICATION_JSON);

            Map<String, String> body = new HashMap<>();
            body.put("tipo", tipo);
            body.put("destinatario", destinatario);
            body.put("mensagem", mensagem);
            body.put("canal", "email"); // FIXME: canal hardcoded

            HttpEntity<Map<String, String>> request = new HttpEntity<>(body, headers);

            String url = NOTIFICACAO_API_URL + "/api/notificacoes";
            log.info("Enviando notificação para {}: tipo={}, destinatario={}", url, tipo, destinatario);

            restTemplate.postForEntity(url, request, String.class);

            log.info("Notificação enviada com sucesso: tipo={}", tipo);
        } catch (Exception e) {
            // FIXME: Engolindo exceção - apenas logando
            log.error("Erro ao enviar notificação: tipo={}, erro={}", tipo, e.getMessage());
            // FIXME: Sem retry, sem fallback, sem dead letter queue
            throw e; // re-throw para o chamador decidir o que fazer
        }
    }

    /**
     * Pede à api-notificacoes o envio do alerta de manutenção preventiva (HTTP síncrono).
     * Usa RestTemplate próprio com timeout de conexão e leitura. Qualquer falha de
     * comunicação (conexão recusada, timeout, 5xx) sobe como exceção para o chamador,
     * que registra o alerta como PENDENTE.
     */
    public NotificacaoAlertaResposta enviarAlertaManutencao(AlertaManutencao alerta, Veiculo veiculo) {
        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_JSON);

        Map<String, Object> body = new HashMap<>();
        body.put("veiculoId", alerta.getVeiculoId());
        body.put("placa", veiculo.getPlaca());
        body.put("modelo", veiculo.getModelo());
        body.put("motivo", alerta.getMotivo());
        body.put("kmAtual", alerta.getKmAtual());
        body.put("kmBase", alerta.getKmBase());
        body.put("dataBase", alerta.getDataBase() != null ? alerta.getDataBase().toString() : null);
        body.put("referenciaId", "alerta-" + alerta.getId());

        String url = NOTIFICACAO_API_URL + "/api/notificacoes/alerta-manutencao";
        log.info("Enviando alerta de manutenção para {}: alerta={}, veiculo={}", url, alerta.getId(), veiculo.getPlaca());

        return alertaRestTemplate.postForObject(url, new HttpEntity<>(body, headers), NotificacaoAlertaResposta.class);
    }

    /**
     * Envia notificação SMS
     * 
     * FIXME: Código duplicado com enviarNotificacao
     * FIXME: Deveria ser o mesmo método com canal diferente
     */
    public void enviarSms(String destinatario, String mensagem) {
        try {
            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.APPLICATION_JSON);

            Map<String, String> body = new HashMap<>();
            body.put("tipo", "SMS");
            body.put("destinatario", destinatario);
            body.put("mensagem", mensagem);
            body.put("canal", "sms");

            HttpEntity<Map<String, String>> request = new HttpEntity<>(body, headers);

            String url = NOTIFICACAO_API_URL + "/api/notificacoes";
            restTemplate.postForEntity(url, request, String.class);
        } catch (Exception e) {
            log.error("Erro ao enviar SMS: {}", e.getMessage());
        }
    }
}
