package com.rotalog.dto;

import lombok.Getter;
import lombok.RequiredArgsConstructor;

/** Resultado de POST /alertas-manutencao/reprocessar. */
@Getter
@RequiredArgsConstructor
public class ReprocessamentoAlertasResponse {

    private final int reprocessados;
    private final int enviados;
}
