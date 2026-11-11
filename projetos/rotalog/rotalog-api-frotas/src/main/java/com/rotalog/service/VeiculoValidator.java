package com.rotalog.service;

import com.rotalog.exception.DadosVeiculoInvalidosException;
import org.springframework.stereotype.Component;

/**
 * Regras de validação de dados de veículo. Cada método valida um campo, para o
 * chamador controlar a ordem das checagens.
 */
@Component
public class VeiculoValidator {

    private static final int TAMANHO_PLACA = 7;
    private static final int ANO_MINIMO = 1900;
    private static final int ANO_MAXIMO = 2100;

    public void validarPlaca(String placa) {
        if (placa == null || placa.isEmpty()) {
            throw new DadosVeiculoInvalidosException("Placa é obrigatória");
        }
        if (placa.length() != TAMANHO_PLACA) {
            throw new DadosVeiculoInvalidosException("Placa deve ter 7 caracteres");
        }
    }

    public void validarModelo(String modelo) {
        if (modelo == null || modelo.isEmpty()) {
            throw new DadosVeiculoInvalidosException("Modelo é obrigatório");
        }
    }

    public void validarAnoFabricacao(Integer ano) {
        if (ano == null || ano < ANO_MINIMO || ano > ANO_MAXIMO) {
            throw new DadosVeiculoInvalidosException("Ano de fabricação inválido");
        }
    }

    public void validarQuilometragem(Long quilometragem) {
        if (quilometragem == null) {
            throw new DadosVeiculoInvalidosException("Quilometragem é obrigatória");
        }
        if (quilometragem < 0) {
            throw new DadosVeiculoInvalidosException("Quilometragem não pode ser negativa");
        }
    }

    /** O odômetro não diminui: valor menor que o atual é rejeitado; igual é aceito. */
    public void validarQuilometragemNaoMenorQueAtual(Long atual, Long nova) {
        if (atual != null && nova < atual) {
            throw new DadosVeiculoInvalidosException(
                "Quilometragem não pode ser menor que a atual (" + atual + " km)");
        }
    }
}
