package com.rotalog.domain;

import com.rotalog.exception.DadosVeiculoInvalidosException;

/**
 * Situação de um veículo. Persistido como texto (EnumType.STRING), com os mesmos
 * valores que já existiam na coluna "status".
 */
public enum StatusVeiculo {
    ATIVO,
    INATIVO,
    MANUTENCAO;

    /**
     * Converte o texto recebido (ex.: filtro da rota /veiculos/status/{status}).
     * Diferencia maiúsculas de minúsculas, como a validação anterior.
     *
     * @throws DadosVeiculoInvalidosException se o valor não corresponder a um status
     */
    public static StatusVeiculo from(String valor) {
        if (valor == null) {
            throw new DadosVeiculoInvalidosException("Status é obrigatório");
        }
        for (StatusVeiculo status : values()) {
            if (status.name().equals(valor)) {
                return status;
            }
        }
        throw new DadosVeiculoInvalidosException("Status inválido: " + valor);
    }
}
