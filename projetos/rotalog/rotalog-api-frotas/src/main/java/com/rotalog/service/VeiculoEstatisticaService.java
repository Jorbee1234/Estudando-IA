package com.rotalog.service;

import com.rotalog.domain.StatusVeiculo;
import com.rotalog.dto.EstatisticaFrotaResponse;
import com.rotalog.repository.VeiculoRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
public class VeiculoEstatisticaService {

    private final VeiculoRepository veiculoRepository;

    public EstatisticaFrotaResponse obterEstatisticas() {
        return new EstatisticaFrotaResponse(
            veiculoRepository.count(),
            veiculoRepository.countByStatus(StatusVeiculo.ATIVO),
            veiculoRepository.countByStatus(StatusVeiculo.INATIVO),
            veiculoRepository.countByStatus(StatusVeiculo.MANUTENCAO)
        );
    }
}
