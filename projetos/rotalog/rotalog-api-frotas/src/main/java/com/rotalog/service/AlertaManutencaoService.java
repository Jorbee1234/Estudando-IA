package com.rotalog.service;

import com.rotalog.domain.AlertaManutencao;
import com.rotalog.domain.Manutencao;
import com.rotalog.domain.StatusNotificacaoAlerta;
import com.rotalog.domain.StatusVeiculo;
import com.rotalog.domain.Veiculo;
import com.rotalog.dto.AlertaResponse;
import com.rotalog.dto.NotificacaoAlertaResposta;
import com.rotalog.dto.ReprocessamentoAlertasResponse;
import com.rotalog.dto.VerificacaoAlertasResponse;
import com.rotalog.exception.AlertaNaoEncontradoException;
import com.rotalog.repository.AlertaManutencaoRepository;
import com.rotalog.repository.ManutencaoRepository;
import com.rotalog.repository.VeiculoRepository;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.List;
import java.util.Optional;

/**
 * Alerta de manutenção preventiva.
 *
 * Critério: veículo ATIVO é elegível quando (km atual - km base) >= rotalog.manutencao.intervalo-km
 * (padrão 10000) OU hoje >= data base + rotalog.manutencao.intervalo-meses (padrão 6). A base é a última
 * manutenção CONCLUIDA do tipo PREVENTIVA/REVISAO; sem histórico, km base 0 e sem critério por data.
 *
 * Não geram alerta: veículo com preventiva/revisão PENDENTE ou EM_ANDAMENTO (já agendada) e veículo com
 * alerta aberto (PENDENTE/FALHA). Alerta ENVIADO também não é duplicado enquanto não houver uma nova
 * manutenção concluída depois da criação dele (escolha: evita reenviar o mesmo e-mail a cada verificação).
 *
 * A notificação é HTTP síncrona; qualquer erro de comunicação deixa o alerta PENDENTE (reprocessar reenvia
 * PENDENTE e FALHA). Sem retry/circuit breaker, limitação conhecida.
 */
@Slf4j
@Service
public class AlertaManutencaoService {

    private static final List<String> TIPOS_PREVENTIVOS = Arrays.asList("PREVENTIVA", "REVISAO");
    private static final List<String> STATUS_MANUTENCAO_ABERTA = Arrays.asList("PENDENTE", "EM_ANDAMENTO");
    private static final String STATUS_CONCLUIDA = "CONCLUIDA";
    private static final Sort MAIS_RECENTES = Sort.by(Sort.Direction.DESC, "dataCriacao", "id");

    private final AlertaManutencaoRepository alertaRepository;
    private final VeiculoRepository veiculoRepository;
    private final ManutencaoRepository manutencaoRepository;
    private final NotificacaoClient notificacaoClient;
    private final long intervaloKm;
    private final int intervaloMeses;

    public AlertaManutencaoService(AlertaManutencaoRepository alertaRepository,
                                   VeiculoRepository veiculoRepository,
                                   ManutencaoRepository manutencaoRepository,
                                   NotificacaoClient notificacaoClient,
                                   @Value("${rotalog.manutencao.intervalo-km:10000}") long intervaloKm,
                                   @Value("${rotalog.manutencao.intervalo-meses:6}") int intervaloMeses) {
        this.alertaRepository = alertaRepository;
        this.veiculoRepository = veiculoRepository;
        this.manutencaoRepository = manutencaoRepository;
        this.notificacaoClient = notificacaoClient;
        this.intervaloKm = intervaloKm;
        this.intervaloMeses = intervaloMeses;
    }

    public VerificacaoAlertasResponse verificar() {
        return verificar(LocalDate.now());
    }

    public VerificacaoAlertasResponse verificar(LocalDate hoje) {
        List<AlertaResponse> criados = new ArrayList<>();
        for (Veiculo veiculo : veiculoRepository.findByStatus(StatusVeiculo.ATIVO)) {
            Optional<AlertaManutencao> alerta = avaliar(veiculo, hoje);
            if (alerta.isPresent()) {
                AlertaManutencao salvo = alertaRepository.save(alerta.get());
                enviar(salvo, veiculo);
                criados.add(paraResposta(salvo, veiculo));
            }
        }
        log.info("Verificação de manutenção preventiva: {} alerta(s) criado(s)", criados.size());
        return new VerificacaoAlertasResponse(criados.size(), criados);
    }

    public ReprocessamentoAlertasResponse reprocessar() {
        List<AlertaManutencao> abertos = alertaRepository.findByStatusNotificacaoIn(
                Arrays.asList(StatusNotificacaoAlerta.PENDENTE, StatusNotificacaoAlerta.FALHA));
        int reprocessados = 0;
        int enviados = 0;
        for (AlertaManutencao alerta : abertos) {
            Optional<Veiculo> veiculo = veiculoRepository.findById(alerta.getVeiculoId());
            if (!veiculo.isPresent()) {
                log.warn("Alerta {} ignorado: veículo {} não existe", alerta.getId(), alerta.getVeiculoId());
                continue;
            }
            enviar(alerta, veiculo.get());
            reprocessados++;
            if (alerta.getStatusNotificacao() == StatusNotificacaoAlerta.ENVIADO) {
                enviados++;
            }
        }
        return new ReprocessamentoAlertasResponse(reprocessados, enviados);
    }

    public List<AlertaResponse> listar(String status, Long veiculoId) {
        StatusNotificacaoAlerta filtro = (status == null || status.isEmpty()) ? null : StatusNotificacaoAlerta.from(status);
        List<AlertaManutencao> alertas;
        if (filtro != null && veiculoId != null) {
            alertas = alertaRepository.findByStatusNotificacaoAndVeiculoId(filtro, veiculoId, MAIS_RECENTES);
        } else if (filtro != null) {
            alertas = alertaRepository.findByStatusNotificacao(filtro, MAIS_RECENTES);
        } else if (veiculoId != null) {
            alertas = alertaRepository.findByVeiculoId(veiculoId, MAIS_RECENTES);
        } else {
            alertas = alertaRepository.findAll(MAIS_RECENTES);
        }
        List<AlertaResponse> respostas = new ArrayList<>();
        for (AlertaManutencao alerta : alertas) {
            respostas.add(paraResposta(alerta, veiculoRepository.findById(alerta.getVeiculoId()).orElse(null)));
        }
        return respostas;
    }

    public AlertaResponse buscarPorId(Long id) {
        AlertaManutencao alerta = alertaRepository.findById(id)
                .orElseThrow(() -> new AlertaNaoEncontradoException("Alerta não encontrado: " + id));
        return paraResposta(alerta, veiculoRepository.findById(alerta.getVeiculoId()).orElse(null));
    }

    /** Retorna o alerta (ainda não salvo) se o veículo estiver elegível e sem impedimentos. */
    private Optional<AlertaManutencao> avaliar(Veiculo veiculo, LocalDate hoje) {
        if (veiculo.getStatus() != StatusVeiculo.ATIVO) {
            return Optional.empty();
        }
        Long id = veiculo.getId();
        if (manutencaoRepository.existsByVeiculoIdAndTipoManutencaoInAndStatusIn(
                id, TIPOS_PREVENTIVOS, STATUS_MANUTENCAO_ABERTA)) {
            return Optional.empty();
        }

        Optional<Manutencao> base = manutencaoRepository
                .findFirstByVeiculoIdAndStatusAndTipoManutencaoInOrderByDataManutencaoDesc(
                        id, STATUS_CONCLUIDA, TIPOS_PREVENTIVOS);

        if (temAlertaQueBloqueia(id, base.orElse(null))) {
            return Optional.empty();
        }

        long kmAtual = veiculo.getQuilometragem() != null ? veiculo.getQuilometragem() : 0L;
        long kmBase = base.map(Manutencao::getQuilometragemManutencao).orElse(0L);
        LocalDate dataBase = base.map(Manutencao::getDataManutencao).map(LocalDateTime::toLocalDate).orElse(null);

        String tipo;
        String motivo;
        if (kmAtual - kmBase >= intervaloKm) {
            tipo = AlertaManutencao.TIPO_KM;
            motivo = "Rodou " + (kmAtual - kmBase) + " km desde a última manutenção (limite " + intervaloKm + " km)";
        } else if (dataBase != null && !hoje.isBefore(dataBase.plusMonths(intervaloMeses))) {
            tipo = AlertaManutencao.TIPO_DATA;
            motivo = "Última manutenção em " + dataBase + " (intervalo de " + intervaloMeses + " meses)";
        } else {
            return Optional.empty();
        }

        AlertaManutencao alerta = new AlertaManutencao();
        alerta.setVeiculoId(id);
        alerta.setTipoAlerta(tipo);
        alerta.setMotivo(motivo);
        alerta.setKmAtual(kmAtual);
        alerta.setKmBase(kmBase);
        alerta.setDataBase(dataBase);
        alerta.setStatusNotificacao(StatusNotificacaoAlerta.PENDENTE);
        alerta.setTentativas(0);
        LocalDateTime agora = LocalDateTime.now();
        alerta.setDataCriacao(agora);
        alerta.setDataAtualizacao(agora);
        return Optional.of(alerta);
    }

    private boolean temAlertaQueBloqueia(Long veiculoId, Manutencao base) {
        Optional<AlertaManutencao> ultimo = alertaRepository.findFirstByVeiculoIdOrderByDataCriacaoDesc(veiculoId);
        if (!ultimo.isPresent()) {
            return false;
        }
        AlertaManutencao alerta = ultimo.get();
        if (alerta.getStatusNotificacao() != StatusNotificacaoAlerta.ENVIADO) {
            return true; // aberto (PENDENTE/FALHA)
        }
        // ENVIADO: só libera um novo alerta após uma manutenção concluída depois dele
        return base == null
                || base.getDataManutencao() == null
                || alerta.getDataCriacao() == null
                || !base.getDataManutencao().isAfter(alerta.getDataCriacao());
    }

    /** Chama a api-notificacoes e grava o status; falhas de comunicação deixam o alerta PENDENTE. */
    private void enviar(AlertaManutencao alerta, Veiculo veiculo) {
        alerta.setTentativas((alerta.getTentativas() != null ? alerta.getTentativas() : 0) + 1);
        try {
            NotificacaoAlertaResposta resposta = notificacaoClient.enviarAlertaManutencao(alerta, veiculo);
            aplicarResposta(alerta, resposta);
        } catch (Exception e) {
            log.error("Notificação indisponível para o alerta {}: {}", alerta.getId(), e.getMessage());
            alerta.setStatusNotificacao(StatusNotificacaoAlerta.PENDENTE);
            alerta.setErro(truncar(e.getMessage()));
        }
        alerta.setDataAtualizacao(LocalDateTime.now());
        alertaRepository.save(alerta);
    }

    private void aplicarResposta(AlertaManutencao alerta, NotificacaoAlertaResposta resposta) {
        if (resposta == null || resposta.getStatus() == null) {
            alerta.setStatusNotificacao(StatusNotificacaoAlerta.PENDENTE);
            alerta.setErro("Resposta inválida da api-notificacoes");
            return;
        }
        alerta.setNotificacaoId(resposta.getNotificacaoId());
        if ("ENVIADO".equalsIgnoreCase(resposta.getStatus())) {
            alerta.setStatusNotificacao(StatusNotificacaoAlerta.ENVIADO);
            alerta.setErro(null);
        } else if ("FALHA".equalsIgnoreCase(resposta.getStatus())) {
            alerta.setStatusNotificacao(StatusNotificacaoAlerta.FALHA);
            alerta.setErro(truncar(resposta.getErro()));
        } else {
            alerta.setStatusNotificacao(StatusNotificacaoAlerta.PENDENTE);
            alerta.setErro(truncar("Status desconhecido: " + resposta.getStatus()));
        }
    }

    private static String truncar(String texto) {
        if (texto == null) {
            return null;
        }
        return texto.length() > 500 ? texto.substring(0, 500) : texto;
    }

    private AlertaResponse paraResposta(AlertaManutencao alerta, Veiculo veiculo) {
        AlertaResponse r = new AlertaResponse();
        r.setId(alerta.getId());
        r.setVeiculoId(alerta.getVeiculoId());
        if (veiculo != null) {
            r.setPlaca(veiculo.getPlaca());
            r.setModelo(veiculo.getModelo());
        }
        r.setTipoAlerta(alerta.getTipoAlerta());
        r.setMotivo(alerta.getMotivo());
        r.setKmAtual(alerta.getKmAtual());
        r.setKmBase(alerta.getKmBase());
        r.setDataBase(alerta.getDataBase());
        r.setStatusNotificacao(alerta.getStatusNotificacao() != null ? alerta.getStatusNotificacao().name() : null);
        r.setNotificacaoId(alerta.getNotificacaoId());
        r.setTentativas(alerta.getTentativas());
        r.setErro(alerta.getErro());
        r.setDataCriacao(alerta.getDataCriacao());
        r.setDataAtualizacao(alerta.getDataAtualizacao());
        return r;
    }
}
