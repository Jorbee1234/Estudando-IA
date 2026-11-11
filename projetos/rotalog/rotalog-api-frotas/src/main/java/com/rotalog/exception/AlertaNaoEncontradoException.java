package com.rotalog.exception;

/** Alerta de manutenção inexistente (HTTP 404). */
public class AlertaNaoEncontradoException extends RegraNegocioException {

    public AlertaNaoEncontradoException(String mensagem) {
        super(mensagem);
    }
}
