package com.rotalog.dto;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

/** Resposta de POST /api/notificacoes/alerta-manutencao da api-notificacoes. */
@Getter
@Setter
@NoArgsConstructor
@JsonIgnoreProperties(ignoreUnknown = true)
public class NotificacaoAlertaResposta {

    private Long notificacaoId;
    private String status; // ENVIADO ou FALHA
    private String erro;
}
