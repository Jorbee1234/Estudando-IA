package com.rotalog.dto;

import lombok.Getter;
import lombok.RequiredArgsConstructor;

import java.util.List;

/** Resultado de POST /alertas-manutencao/verificar. */
@Getter
@RequiredArgsConstructor
public class VerificacaoAlertasResponse {

    private final int criados;
    private final List<AlertaResponse> alertas;
}
