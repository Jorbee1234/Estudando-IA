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
import com.rotalog.exception.DadosVeiculoInvalidosException;
import com.rotalog.repository.AlertaManutencaoRepository;
import com.rotalog.repository.ManutencaoRepository;
import com.rotalog.repository.VeiculoRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.domain.Sort;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.Arrays;
import java.util.Collections;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyCollection;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class AlertaManutencaoServiceTest {

    private static final LocalDate HOJE = LocalDate.of(2026, 11, 10);

    @Mock
    private AlertaManutencaoRepository alertaRepository;
    @Mock
    private VeiculoRepository veiculoRepository;
    @Mock
    private ManutencaoRepository manutencaoRepository;
    @Mock
    private NotificacaoClient notificacaoClient;

    private AlertaManutencaoService service;

    @BeforeEach
    void setUp() {
        service = new AlertaManutencaoService(alertaRepository, veiculoRepository, manutencaoRepository,
                notificacaoClient, 10000L, 6);
        lenient().when(alertaRepository.save(any(AlertaManutencao.class))).thenAnswer(inv -> {
            AlertaManutencao a = inv.getArgument(0);
            if (a.getId() == null) {
                a.setId(100L);
            }
            return a;
        });
        lenient().when(alertaRepository.findFirstByVeiculoIdOrderByDataCriacaoDesc(anyLong()))
                .thenReturn(Optional.empty());
        lenient().when(manutencaoRepository.existsByVeiculoIdAndTipoManutencaoInAndStatusIn(
                anyLong(), anyCollection(), anyCollection())).thenReturn(false);
        lenient().when(manutencaoRepository.findFirstByVeiculoIdAndStatusAndTipoManutencaoInOrderByDataManutencaoDesc(
                anyLong(), anyString(), anyCollection())).thenReturn(Optional.empty());
    }

    private Veiculo veiculo(long id, long km, StatusVeiculo status) {
        Veiculo v = new Veiculo();
        v.setId(id);
        v.setPlaca("ABC1D2" + id);
        v.setModelo("Volvo FH");
        v.setQuilometragem(km);
        v.setStatus(status);
        return v;
    }

    private void ativos(Veiculo... veiculos) {
        when(veiculoRepository.findByStatus(StatusVeiculo.ATIVO)).thenReturn(Arrays.asList(veiculos));
    }

    private Manutencao concluida(long km, LocalDateTime data) {
        Manutencao m = new Manutencao();
        m.setTipoManutencao("PREVENTIVA");
        m.setStatus("CONCLUIDA");
        m.setQuilometragemManutencao(km);
        m.setDataManutencao(data);
        return m;
    }

    private void base(long veiculoId, Manutencao m) {
        when(manutencaoRepository.findFirstByVeiculoIdAndStatusAndTipoManutencaoInOrderByDataManutencaoDesc(
                eq(veiculoId), eq("CONCLUIDA"), anyCollection())).thenReturn(Optional.of(m));
    }

    private void envioOk() {
        NotificacaoAlertaResposta r = new NotificacaoAlertaResposta();
        r.setNotificacaoId(7L);
        r.setStatus("ENVIADO");
        when(notificacaoClient.enviarAlertaManutencao(any(), any())).thenReturn(r);
    }

    @Test
    void criaAlertaPorKmEEnvia() {
        ativos(veiculo(1, 25000, StatusVeiculo.ATIVO));
        base(1, concluida(15000, HOJE.minusMonths(1).atStartOfDay()));
        envioOk();

        VerificacaoAlertasResponse r = service.verificar(HOJE);

        assertEquals(1, r.getCriados());
        AlertaResponse a = r.getAlertas().get(0);
        assertEquals("KM", a.getTipoAlerta());
        assertEquals(25000L, a.getKmAtual());
        assertEquals(15000L, a.getKmBase());
        assertEquals("ENVIADO", a.getStatusNotificacao());
        assertEquals(7L, a.getNotificacaoId());
        assertEquals(1, a.getTentativas());
        assertEquals("ABC1D21", a.getPlaca());
    }

    @Test
    void kmAbaixoDoIntervaloNaoGeraAlerta() {
        ativos(veiculo(1, 24999, StatusVeiculo.ATIVO));
        base(1, concluida(15000, HOJE.minusMonths(1).atStartOfDay()));

        assertEquals(0, service.verificar(HOJE).getCriados());
        verifyNoInteractions(notificacaoClient);
    }

    @Test
    void criaAlertaPorDataQuandoPassaramOsMeses() {
        ativos(veiculo(1, 5000, StatusVeiculo.ATIVO));
        base(1, concluida(4000, HOJE.minusMonths(6).atStartOfDay()));
        envioOk();

        AlertaResponse a = service.verificar(HOJE).getAlertas().get(0);

        assertEquals("DATA", a.getTipoAlerta());
        assertEquals(HOJE.minusMonths(6), a.getDataBase());
    }

    @Test
    void dataAindaNoPrazoNaoGeraAlerta() {
        ativos(veiculo(1, 5000, StatusVeiculo.ATIVO));
        base(1, concluida(4000, HOJE.minusMonths(6).plusDays(1).atStartOfDay()));

        assertEquals(0, service.verificar(HOJE).getCriados());
    }

    @Test
    void semHistoricoUsaKmBaseZeroESemData() {
        ativos(veiculo(1, 10000, StatusVeiculo.ATIVO), veiculo(2, 9999, StatusVeiculo.ATIVO));
        envioOk();

        VerificacaoAlertasResponse r = service.verificar(HOJE);

        assertEquals(1, r.getCriados());
        assertEquals(1L, r.getAlertas().get(0).getVeiculoId());
        assertEquals(0L, r.getAlertas().get(0).getKmBase());
        assertNull(r.getAlertas().get(0).getDataBase());
    }

    @Test
    void ignoraVeiculoInativo() {
        ativos(veiculo(1, 90000, StatusVeiculo.INATIVO));

        assertEquals(0, service.verificar(HOJE).getCriados());
        verifyNoInteractions(notificacaoClient);
    }

    @Test
    void ignoraVeiculoComPreventivaJaAgendada() {
        ativos(veiculo(1, 90000, StatusVeiculo.ATIVO));
        when(manutencaoRepository.existsByVeiculoIdAndTipoManutencaoInAndStatusIn(
                eq(1L), anyCollection(), anyCollection())).thenReturn(true);

        assertEquals(0, service.verificar(HOJE).getCriados());
        verifyNoInteractions(notificacaoClient);
    }

    @Test
    void naoDuplicaAlertaAberto() {
        ativos(veiculo(1, 90000, StatusVeiculo.ATIVO), veiculo(2, 90000, StatusVeiculo.ATIVO));
        for (long id = 1; id <= 2; id++) {
            AlertaManutencao aberto = new AlertaManutencao();
            aberto.setStatusNotificacao(id == 1 ? StatusNotificacaoAlerta.PENDENTE : StatusNotificacaoAlerta.FALHA);
            when(alertaRepository.findFirstByVeiculoIdOrderByDataCriacaoDesc(id)).thenReturn(Optional.of(aberto));
        }

        assertEquals(0, service.verificar(HOJE).getCriados());
        verifyNoInteractions(notificacaoClient);
    }

    @Test
    void naoDuplicaAlertaEnviadoSemNovaManutencao() {
        ativos(veiculo(1, 90000, StatusVeiculo.ATIVO));
        AlertaManutencao enviado = new AlertaManutencao();
        enviado.setStatusNotificacao(StatusNotificacaoAlerta.ENVIADO);
        enviado.setDataCriacao(LocalDateTime.of(2026, 10, 1, 10, 0));
        when(alertaRepository.findFirstByVeiculoIdOrderByDataCriacaoDesc(1L)).thenReturn(Optional.of(enviado));
        base(1, concluida(10000, LocalDateTime.of(2026, 9, 1, 10, 0))); // anterior ao alerta

        assertEquals(0, service.verificar(HOJE).getCriados());
    }

    @Test
    void geraNovoAlertaDepoisDeAlertaEnviadoENovaManutencao() {
        ativos(veiculo(1, 40000, StatusVeiculo.ATIVO));
        AlertaManutencao enviado = new AlertaManutencao();
        enviado.setStatusNotificacao(StatusNotificacaoAlerta.ENVIADO);
        enviado.setDataCriacao(LocalDateTime.of(2026, 1, 1, 10, 0));
        when(alertaRepository.findFirstByVeiculoIdOrderByDataCriacaoDesc(1L)).thenReturn(Optional.of(enviado));
        base(1, concluida(20000, LocalDateTime.of(2026, 2, 1, 10, 0))); // depois do alerta
        envioOk();

        assertEquals(1, service.verificar(HOJE).getCriados());
    }

    @Test
    void notificacoesForaDoArDeixaAlertaPendente() {
        ativos(veiculo(1, 25000, StatusVeiculo.ATIVO));
        when(notificacaoClient.enviarAlertaManutencao(any(), any()))
                .thenThrow(new RuntimeException("Connection refused"));

        AlertaResponse a = service.verificar(HOJE).getAlertas().get(0);

        assertEquals("PENDENTE", a.getStatusNotificacao());
        assertEquals("Connection refused", a.getErro());
        assertEquals(1, a.getTentativas());
        assertNull(a.getNotificacaoId());
    }

    @Test
    void respostaFalhaGravaStatusFalha() {
        ativos(veiculo(1, 25000, StatusVeiculo.ATIVO));
        NotificacaoAlertaResposta r = new NotificacaoAlertaResposta();
        r.setNotificacaoId(9L);
        r.setStatus("FALHA");
        r.setErro("SMTP indisponível");
        when(notificacaoClient.enviarAlertaManutencao(any(), any())).thenReturn(r);

        AlertaResponse a = service.verificar(HOJE).getAlertas().get(0);

        assertEquals("FALHA", a.getStatusNotificacao());
        assertEquals("SMTP indisponível", a.getErro());
        assertEquals(9L, a.getNotificacaoId());
    }

    @Test
    void respostaVaziaDeixaPendente() {
        ativos(veiculo(1, 25000, StatusVeiculo.ATIVO));
        when(notificacaoClient.enviarAlertaManutencao(any(), any())).thenReturn(null);

        assertEquals("PENDENTE", service.verificar(HOJE).getAlertas().get(0).getStatusNotificacao());
    }

    @Test
    void reprocessarReenviaPendentesEFalhas() {
        AlertaManutencao pendente = new AlertaManutencao();
        pendente.setId(1L);
        pendente.setVeiculoId(1L);
        pendente.setStatusNotificacao(StatusNotificacaoAlerta.PENDENTE);
        pendente.setTentativas(1);
        AlertaManutencao falha = new AlertaManutencao();
        falha.setId(2L);
        falha.setVeiculoId(2L);
        falha.setStatusNotificacao(StatusNotificacaoAlerta.FALHA);
        falha.setTentativas(1);
        when(alertaRepository.findByStatusNotificacaoIn(anyCollection())).thenReturn(Arrays.asList(pendente, falha));
        when(veiculoRepository.findById(1L)).thenReturn(Optional.of(veiculo(1, 1, StatusVeiculo.ATIVO)));
        when(veiculoRepository.findById(2L)).thenReturn(Optional.of(veiculo(2, 1, StatusVeiculo.ATIVO)));
        NotificacaoAlertaResposta ok = new NotificacaoAlertaResposta();
        ok.setNotificacaoId(5L);
        ok.setStatus("ENVIADO");
        NotificacaoAlertaResposta ruim = new NotificacaoAlertaResposta();
        ruim.setStatus("FALHA");
        ruim.setErro("x");
        when(notificacaoClient.enviarAlertaManutencao(eq(pendente), any())).thenReturn(ok);
        when(notificacaoClient.enviarAlertaManutencao(eq(falha), any())).thenReturn(ruim);

        ReprocessamentoAlertasResponse r = service.reprocessar();

        assertEquals(2, r.getReprocessados());
        assertEquals(1, r.getEnviados());
        assertEquals(StatusNotificacaoAlerta.ENVIADO, pendente.getStatusNotificacao());
        assertEquals(2, pendente.getTentativas());
        assertEquals(StatusNotificacaoAlerta.FALHA, falha.getStatusNotificacao());
    }

    @Test
    void reprocessarComNotificacoesForaMantemPendente() {
        AlertaManutencao pendente = new AlertaManutencao();
        pendente.setId(1L);
        pendente.setVeiculoId(1L);
        pendente.setStatusNotificacao(StatusNotificacaoAlerta.PENDENTE);
        when(alertaRepository.findByStatusNotificacaoIn(anyCollection())).thenReturn(Collections.singletonList(pendente));
        when(veiculoRepository.findById(1L)).thenReturn(Optional.of(veiculo(1, 1, StatusVeiculo.ATIVO)));
        when(notificacaoClient.enviarAlertaManutencao(any(), any())).thenThrow(new RuntimeException("timeout"));

        ReprocessamentoAlertasResponse r = service.reprocessar();

        assertEquals(1, r.getReprocessados());
        assertEquals(0, r.getEnviados());
        assertEquals(StatusNotificacaoAlerta.PENDENTE, pendente.getStatusNotificacao());
        assertEquals(1, pendente.getTentativas());
    }

    @Test
    void listarAplicaFiltros() {
        when(alertaRepository.findByStatusNotificacaoAndVeiculoId(eq(StatusNotificacaoAlerta.FALHA), eq(3L), any(Sort.class)))
                .thenReturn(Collections.emptyList());

        assertTrue(service.listar("FALHA", 3L).isEmpty());
        verify(alertaRepository).findByStatusNotificacaoAndVeiculoId(eq(StatusNotificacaoAlerta.FALHA), eq(3L), any(Sort.class));
    }

    @Test
    void listarComStatusInvalidoLancaExcecao() {
        assertThrows(DadosVeiculoInvalidosException.class, () -> service.listar("XYZ", null));
    }

    @Test
    void buscarPorIdInexistenteLancaNaoEncontrado() {
        when(alertaRepository.findById(5L)).thenReturn(Optional.empty());

        assertThrows(AlertaNaoEncontradoException.class, () -> service.buscarPorId(5L));
    }
}
