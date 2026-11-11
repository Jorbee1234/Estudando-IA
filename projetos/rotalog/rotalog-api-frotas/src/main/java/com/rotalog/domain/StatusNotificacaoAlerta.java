package com.rotalog.domain;

import com.rotalog.exception.DadosVeiculoInvalidosException;

/** Situação do envio da notificação de um alerta de manutenção. */
public enum StatusNotificacaoAlerta {
    PENDENTE,
    ENVIADO,
    FALHA;

    /** Converte o filtro recebido na rota; diferencia maiúsculas de minúsculas. */
    public static StatusNotificacaoAlerta from(String valor) {
        for (StatusNotificacaoAlerta status : values()) {
            if (status.name().equals(valor)) {
                return status;
            }
        }
        throw new DadosVeiculoInvalidosException("Status de alerta inválido: " + valor);
    }
}
