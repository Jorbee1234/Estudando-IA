package com.rotalog.exception;

/** Placa, modelo, ano, quilometragem ou status inválidos (HTTP 400). */
public class DadosVeiculoInvalidosException extends RegraNegocioException {

    public DadosVeiculoInvalidosException(String mensagem) {
        super(mensagem);
    }
}
