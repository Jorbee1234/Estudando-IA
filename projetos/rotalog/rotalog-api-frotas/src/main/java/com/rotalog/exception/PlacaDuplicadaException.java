package com.rotalog.exception;

/** Já existe veículo com a placa informada (HTTP 409). */
public class PlacaDuplicadaException extends RegraNegocioException {

    public PlacaDuplicadaException(String mensagem) {
        super(mensagem);
    }
}
