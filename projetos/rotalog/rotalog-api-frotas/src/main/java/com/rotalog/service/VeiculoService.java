package com.rotalog.service;

import com.rotalog.domain.StatusVeiculo;
import com.rotalog.domain.Veiculo;
import com.rotalog.exception.PlacaDuplicadaException;
import com.rotalog.exception.VeiculoNaoEncontradoException;
import com.rotalog.repository.VeiculoRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

/**
 * Cadastro, consulta e mudança de estado de veículos. Validação, notificação, regra de
 * manutenção preventiva e estatística ficam em classes próprias (ADR 0001, D1).
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class VeiculoService {

    private final VeiculoRepository veiculoRepository;
    private final VeiculoValidator validator;
    private final VeiculoNotificador notificador;
    private final ManutencaoPreventivaPolicy manutencaoPolicy;

    public List<Veiculo> listarTodos() {
        log.info("Listando todos os veículos");
        return veiculoRepository.findAll();
    }

    public Veiculo buscarPorId(Long id) {
        return veiculoRepository.findById(id)
                .orElseThrow(() -> new VeiculoNaoEncontradoException("Veículo não encontrado: " + id));
    }

    public Veiculo buscarPorPlaca(String placa) {
        return veiculoRepository.findByPlaca(placa)
                .orElseThrow(() -> new VeiculoNaoEncontradoException("Veículo não encontrado com placa: " + placa));
    }

    /**
     * Registra um novo veículo, sempre ATIVO. A placa é normalizada para maiúsculas antes
     * da checagem de duplicidade. Sem quilometragem informada, começa em 0.
     * A falha na notificação não impede o cadastro.
     */
    public Veiculo registrarVeiculo(String placa, String modelo, Integer anoFabricacao, Long quilometragem) {
        validator.validarPlaca(placa);

        String placaNormalizada = placa.toUpperCase();
        Optional<Veiculo> existente = veiculoRepository.findByPlaca(placaNormalizada);
        if (existente.isPresent()) {
            throw new PlacaDuplicadaException("Veículo com placa " + placaNormalizada + " já existe");
        }

        validator.validarModelo(modelo);
        validator.validarAnoFabricacao(anoFabricacao);

        long quilometragemInicial = quilometragem == null ? 0L : quilometragem;
        validator.validarQuilometragem(quilometragemInicial);

        Veiculo veiculo = new Veiculo();
        veiculo.setPlaca(placaNormalizada);
        veiculo.setModelo(modelo);
        veiculo.setAnoFabricacao(anoFabricacao);
        veiculo.setStatus(StatusVeiculo.ATIVO);
        veiculo.setQuilometragem(quilometragemInicial);
        veiculo.setDataCadastro(LocalDateTime.now());
        veiculo.setDataAtualizacao(LocalDateTime.now());

        Veiculo salvo = veiculoRepository.save(veiculo);
        log.info("Veículo registrado: {} - {}", salvo.getPlaca(), salvo.getModelo());

        notificador.novoVeiculo(salvo);

        return salvo;
    }

    /**
     * Atualiza só os campos informados. A quilometragem não pode ser negativa nem
     * menor que a atual.
     */
    public Veiculo atualizarVeiculo(Long id, String modelo, Integer anoFabricacao, Long quilometragem) {
        Veiculo veiculo = buscarPorId(id);

        if (modelo != null && !modelo.isEmpty()) {
            veiculo.setModelo(modelo);
        }
        if (anoFabricacao != null) {
            veiculo.setAnoFabricacao(anoFabricacao);
        }
        if (quilometragem != null) {
            validator.validarQuilometragem(quilometragem);
            validator.validarQuilometragemNaoMenorQueAtual(veiculo.getQuilometragem(), quilometragem);
            veiculo.setQuilometragem(quilometragem);
        }

        veiculo.setDataAtualizacao(LocalDateTime.now());
        return veiculoRepository.save(veiculo);
    }

    /**
     * Atualiza a quilometragem e, ao atingir o limite de manutenção preventiva,
     * notifica o gestor. A quilometragem não pode ser negativa nem menor que a atual.
     */
    public Veiculo atualizarQuilometragem(Long veiculoId, Long novaQuilometragem) {
        Veiculo veiculo = buscarPorId(veiculoId);

        validator.validarQuilometragem(novaQuilometragem);
        validator.validarQuilometragemNaoMenorQueAtual(veiculo.getQuilometragem(), novaQuilometragem);

        veiculo.setQuilometragem(novaQuilometragem);
        veiculo.setDataAtualizacao(LocalDateTime.now());

        Veiculo atualizado = veiculoRepository.save(veiculo);

        // FIXME: busca o veículo de novo; poderia usar o já carregado (ADR 0001, fase 6)
        if (precisaDeManutencao(veiculoId)) {
            notificador.alertaManutencao(veiculo, novaQuilometragem);
        }

        return atualizado;
    }

    public List<Veiculo> obterVeiculosPorStatus(String status) {
        return veiculoRepository.findByStatus(StatusVeiculo.from(status));
    }

    public Boolean precisaDeManutencao(Long veiculoId) {
        return manutencaoPolicy.precisaDeManutencao(buscarPorId(veiculoId).getQuilometragem());
    }

    public Veiculo desativarVeiculo(Long veiculoId) {
        Veiculo veiculo = buscarPorId(veiculoId);
        veiculo.setStatus(StatusVeiculo.INATIVO);
        veiculo.setDataAtualizacao(LocalDateTime.now());

        Veiculo desativado = veiculoRepository.save(veiculo);
        log.info("Veículo desativado: {}", veiculo.getPlaca());

        notificador.veiculoDesativado(veiculo);

        return desativado;
    }

    public Veiculo reativarVeiculo(Long veiculoId) {
        Veiculo veiculo = buscarPorId(veiculoId);
        veiculo.setStatus(StatusVeiculo.ATIVO);
        veiculo.setDataAtualizacao(LocalDateTime.now());

        log.info("Veículo reativado: {}", veiculo.getPlaca());
        return veiculoRepository.save(veiculo);
    }
}
