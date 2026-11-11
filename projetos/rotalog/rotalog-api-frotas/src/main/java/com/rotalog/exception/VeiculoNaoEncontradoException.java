package com.rotalog.exception;

/** Veículo inexistente (HTTP 404). */
public class VeiculoNaoEncontradoException extends RegraNegocioException {

    public VeiculoNaoEncontradoException(String mensagem) {
        super(mensagem);
    }
}
