package com.rotalog.dto;

import com.fasterxml.jackson.annotation.JsonProperty;
import lombok.Getter;
import lombok.RequiredArgsConstructor;

/** Totais da frota por status. Os nomes JSON são os mesmos da resposta anterior. */
@Getter
@RequiredArgsConstructor
public class EstatisticaFrotaResponse {

    private final long total;
    private final long ativos;
    private final long inativos;

    @JsonProperty("em_manutencao")
    private final long emManutencao;
}
