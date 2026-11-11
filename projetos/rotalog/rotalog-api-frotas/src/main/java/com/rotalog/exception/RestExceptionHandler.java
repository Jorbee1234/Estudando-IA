package com.rotalog.exception;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;

import java.util.Collections;
import java.util.Map;

/**
 * Traduz as exceções de regra de negócio em HTTP, mantendo o corpo {"erro": "..."}
 * que os consumidores já usam.
 */
@RestControllerAdvice
public class RestExceptionHandler {

    @ExceptionHandler(VeiculoNaoEncontradoException.class)
    public ResponseEntity<Map<String, String>> naoEncontrado(VeiculoNaoEncontradoException e) {
        return resposta(HttpStatus.NOT_FOUND, e);
    }

    @ExceptionHandler(AlertaNaoEncontradoException.class)
    public ResponseEntity<Map<String, String>> alertaNaoEncontrado(AlertaNaoEncontradoException e) {
        return resposta(HttpStatus.NOT_FOUND, e);
    }

    @ExceptionHandler(PlacaDuplicadaException.class)
    public ResponseEntity<Map<String, String>> conflito(PlacaDuplicadaException e) {
        return resposta(HttpStatus.CONFLICT, e);
    }

    @ExceptionHandler(DadosVeiculoInvalidosException.class)
    public ResponseEntity<Map<String, String>> invalido(DadosVeiculoInvalidosException e) {
        return resposta(HttpStatus.BAD_REQUEST, e);
    }

    private ResponseEntity<Map<String, String>> resposta(HttpStatus status, RegraNegocioException e) {
        return ResponseEntity.status(status).body(Collections.singletonMap("erro", e.getMessage()));
    }
}
