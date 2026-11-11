package com.rotalog.exception;

/**
 * Base das violações de regra de negócio da API. O {@link RestExceptionHandler}
 * converte cada subclasse no status HTTP correspondente.
 */
public abstract class RegraNegocioException extends RuntimeException {

    protected RegraNegocioException(String mensagem) {
        super(mensagem);
    }
}
