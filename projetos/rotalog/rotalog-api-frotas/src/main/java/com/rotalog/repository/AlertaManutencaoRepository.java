package com.rotalog.repository;

import com.rotalog.domain.AlertaManutencao;
import com.rotalog.domain.StatusNotificacaoAlerta;
import org.springframework.data.domain.Sort;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Collection;
import java.util.List;
import java.util.Optional;

@Repository
public interface AlertaManutencaoRepository extends JpaRepository<AlertaManutencao, Long> {

    List<AlertaManutencao> findByStatusNotificacao(StatusNotificacaoAlerta status, Sort sort);

    List<AlertaManutencao> findByVeiculoId(Long veiculoId, Sort sort);

    List<AlertaManutencao> findByStatusNotificacaoAndVeiculoId(StatusNotificacaoAlerta status, Long veiculoId, Sort sort);

    List<AlertaManutencao> findByStatusNotificacaoIn(Collection<StatusNotificacaoAlerta> status);

    /** Alerta mais recente do veículo (qualquer status). */
    Optional<AlertaManutencao> findFirstByVeiculoIdOrderByDataCriacaoDesc(Long veiculoId);
}
