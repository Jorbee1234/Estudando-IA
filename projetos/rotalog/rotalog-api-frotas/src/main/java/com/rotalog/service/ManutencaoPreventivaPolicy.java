package com.rotalog.service;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

/**
 * Regra da manutenção preventiva por quilometragem. O limite é configurável por
 * {@code rotalog.manutencao.limite-km-preventiva} (padrão: 50000 km).
 */
@Component
public class ManutencaoPreventivaPolicy {

    private final long limiteQuilometragem;

    public ManutencaoPreventivaPolicy(
            @Value("${rotalog.manutencao.limite-km-preventiva:50000}") long limiteQuilometragem) {
        this.limiteQuilometragem = limiteQuilometragem;
    }

    /** O limite é inclusivo; quilometragem nula não exige manutenção. */
    public boolean precisaDeManutencao(Long quilometragem) {
        return quilometragem != null && quilometragem >= limiteQuilometragem;
    }
}
