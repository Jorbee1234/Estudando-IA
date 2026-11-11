package com.rotalog.service;

import com.rotalog.domain.StatusVeiculo;
import com.rotalog.domain.Veiculo;
import com.rotalog.dto.EstatisticaFrotaResponse;
import com.rotalog.exception.DadosVeiculoInvalidosException;
import com.rotalog.repository.VeiculoRepository;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.doThrow;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

/** Testes das classes extraídas do VeiculoService (ADR 0001, fase 5). */
@ExtendWith(MockitoExtension.class)
class ComponentesVeiculoTest {

    @Mock
    private VeiculoRepository veiculoRepository;

    @Mock
    private NotificacaoClient notificacaoClient;

    private static Veiculo veiculo() {
        Veiculo v = new Veiculo();
        v.setPlaca("ABC1D23");
        v.setModelo("Volvo FH");
        return v;
    }

    // --- VeiculoValidator ---

    private final VeiculoValidator validator = new VeiculoValidator();

    @Test
    void validatorPlaca() {
        assertDoesNotThrow(() -> validator.validarPlaca("ABC1D23"));
        assertEquals("Placa é obrigatória",
                assertThrows(DadosVeiculoInvalidosException.class, () -> validator.validarPlaca(null)).getMessage());
        assertEquals("Placa é obrigatória",
                assertThrows(DadosVeiculoInvalidosException.class, () -> validator.validarPlaca("")).getMessage());
        assertEquals("Placa deve ter 7 caracteres",
                assertThrows(DadosVeiculoInvalidosException.class, () -> validator.validarPlaca("ABC123")).getMessage());
    }

    @Test
    void validatorModelo() {
        assertDoesNotThrow(() -> validator.validarModelo("Volvo"));
        assertThrows(DadosVeiculoInvalidosException.class, () -> validator.validarModelo(null));
        assertThrows(DadosVeiculoInvalidosException.class, () -> validator.validarModelo(""));
    }

    @Test
    void validatorAnoNosLimites() {
        assertDoesNotThrow(() -> validator.validarAnoFabricacao(1900));
        assertDoesNotThrow(() -> validator.validarAnoFabricacao(2100));
        assertThrows(DadosVeiculoInvalidosException.class, () -> validator.validarAnoFabricacao(1899));
        assertThrows(DadosVeiculoInvalidosException.class, () -> validator.validarAnoFabricacao(2101));
        assertThrows(DadosVeiculoInvalidosException.class, () -> validator.validarAnoFabricacao(null));
    }

    @Test
    void validatorQuilometragem() {
        assertDoesNotThrow(() -> validator.validarQuilometragem(0L));
        assertThrows(DadosVeiculoInvalidosException.class, () -> validator.validarQuilometragem(-1L));
        assertThrows(DadosVeiculoInvalidosException.class, () -> validator.validarQuilometragem(null));
    }

    @Test
    void validatorQuilometragemNaoMenorQueAtual() {
        assertDoesNotThrow(() -> validator.validarQuilometragemNaoMenorQueAtual(100L, 100L));
        assertDoesNotThrow(() -> validator.validarQuilometragemNaoMenorQueAtual(100L, 101L));
        assertDoesNotThrow(() -> validator.validarQuilometragemNaoMenorQueAtual(null, 0L));
        assertThrows(DadosVeiculoInvalidosException.class,
                () -> validator.validarQuilometragemNaoMenorQueAtual(100L, 99L));
    }

    // --- ManutencaoPreventivaPolicy ---

    @Test
    void policyUsaLimiteConfigurado() {
        ManutencaoPreventivaPolicy policy = new ManutencaoPreventivaPolicy(1000L);

        assertFalse(policy.precisaDeManutencao(999L));
        assertTrue(policy.precisaDeManutencao(1000L));
        assertFalse(policy.precisaDeManutencao(null));
    }

    // --- VeiculoNotificador ---

    @Test
    void notificadorUsaDestinatarioConfigurado() {
        new VeiculoNotificador(notificacaoClient, "outro@rotalog.com").veiculoDesativado(veiculo());

        verify(notificacaoClient).enviarNotificacao(
                "VEICULO_DESATIVADO", "outro@rotalog.com", "Veículo ABC1D23 foi desativado");
    }

    @Test
    void notificadorEngoleFalhaDoCliente() {
        doThrow(new RuntimeException("fora do ar"))
                .when(notificacaoClient).enviarNotificacao(anyString(), anyString(), anyString());

        VeiculoNotificador notificador = new VeiculoNotificador(notificacaoClient, "gestor@rotalog.com");

        assertDoesNotThrow(() -> notificador.novoVeiculo(veiculo()));
        assertDoesNotThrow(() -> notificador.alertaManutencao(veiculo(), 60000L));
        assertDoesNotThrow(() -> notificador.veiculoDesativado(veiculo()));
    }

    // --- VeiculoEstatisticaService ---

    @Test
    void estatisticaUsaContagemPorStatus() {
        when(veiculoRepository.count()).thenReturn(6L);
        when(veiculoRepository.countByStatus(StatusVeiculo.ATIVO)).thenReturn(3L);
        when(veiculoRepository.countByStatus(StatusVeiculo.INATIVO)).thenReturn(2L);
        when(veiculoRepository.countByStatus(StatusVeiculo.MANUTENCAO)).thenReturn(1L);

        EstatisticaFrotaResponse r = new VeiculoEstatisticaService(veiculoRepository).obterEstatisticas();

        assertEquals(6L, r.getTotal());
        assertEquals(3L, r.getAtivos());
        assertEquals(2L, r.getInativos());
        assertEquals(1L, r.getEmManutencao());
    }
}
