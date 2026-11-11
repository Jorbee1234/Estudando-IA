package com.rotalog.service;

import com.rotalog.domain.StatusVeiculo;
import com.rotalog.domain.Veiculo;
import com.rotalog.exception.DadosVeiculoInvalidosException;
import com.rotalog.exception.PlacaDuplicadaException;
import com.rotalog.exception.VeiculoNaoEncontradoException;
import com.rotalog.repository.VeiculoRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.mockito.junit.jupiter.MockitoSettings;
import org.mockito.quality.Strictness;

import java.util.Arrays;
import java.util.Collections;
import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.contains;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.doThrow;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;

/**
 * Testes de caracterização do VeiculoService (ADR 0001, fase 1).
 *
 * Nasceram fixando o comportamento original, defeitos incluídos. A fase 6 corrigiu
 * (com aprovação) a placa em caixa diferente, a quilometragem menor/nula, o status
 * nulo e a quilometragem ignorada no cadastro; esses testes agora descrevem o
 * comportamento novo. Os marcados com "QUIRK" ainda fixam um defeito conhecido.
 */
@ExtendWith(MockitoExtension.class)
@MockitoSettings(strictness = Strictness.LENIENT)
class VeiculoServiceCaracterizacaoTest {

    @Mock
    private VeiculoRepository veiculoRepository;

    @Mock
    private NotificacaoClient notificacaoClient;

    private VeiculoService service;

    @BeforeEach
    void setUp() {
        // Colaboradores reais; só o repositório e o cliente HTTP são simulados.
        service = new VeiculoService(veiculoRepository, new VeiculoValidator(),
                new VeiculoNotificador(notificacaoClient, "gestor@rotalog.com"),
                new ManutencaoPreventivaPolicy(50000L));
    }

    private static Veiculo veiculo(Long id, String placa, StatusVeiculo status, Long km) {
        Veiculo v = new Veiculo();
        v.setId(id);
        v.setPlaca(placa);
        v.setModelo("Volvo FH");
        v.setAnoFabricacao(2020);
        v.setStatus(status);
        v.setQuilometragem(km);
        return v;
    }

    private void salvarDevolvendoArgumento() {
        when(veiculoRepository.save(any(Veiculo.class))).thenAnswer(inv -> inv.getArgument(0));
    }

    private void existe(Veiculo v) {
        when(veiculoRepository.findById(v.getId())).thenReturn(Optional.of(v));
    }

    @Nested
    @DisplayName("consultas")
    class Consultas {

        @Test
        void listarTodosDelegaAoRepositorio() {
            List<Veiculo> lista = Arrays.asList(veiculo(1L, "ABC1D23", StatusVeiculo.ATIVO, 0L));
            when(veiculoRepository.findAll()).thenReturn(lista);

            assertSame(lista, service.listarTodos());
        }

        @Test
        void buscarPorIdEncontrado() {
            Veiculo v = veiculo(1L, "ABC1D23", StatusVeiculo.ATIVO, 0L);
            existe(v);

            assertSame(v, service.buscarPorId(1L));
        }

        @Test
        void buscarPorIdNaoEncontradoLancaVeiculoNaoEncontradoComMensagem() {
            when(veiculoRepository.findById(99L)).thenReturn(Optional.empty());

            RuntimeException e = assertThrows(VeiculoNaoEncontradoException.class, () -> service.buscarPorId(99L));
            assertEquals("Veículo não encontrado: 99", e.getMessage());
        }

        @Test
        void buscarPorPlacaEncontrado() {
            Veiculo v = veiculo(1L, "ABC1D23", StatusVeiculo.ATIVO, 0L);
            when(veiculoRepository.findByPlaca("ABC1D23")).thenReturn(Optional.of(v));

            assertSame(v, service.buscarPorPlaca("ABC1D23"));
        }

        @Test
        void buscarPorPlacaNaoEncontrado() {
            when(veiculoRepository.findByPlaca("XXX0000")).thenReturn(Optional.empty());

            RuntimeException e = assertThrows(VeiculoNaoEncontradoException.class, () -> service.buscarPorPlaca("XXX0000"));
            assertEquals("Veículo não encontrado com placa: XXX0000", e.getMessage());
        }
    }

    @Nested
    @DisplayName("registrarVeiculo")
    class Registrar {

        @Test
        void sucessoCriaVeiculoAtivoComKmZeroEPlacaMaiuscula() {
            when(veiculoRepository.findByPlaca("ABC1D23")).thenReturn(Optional.empty());
            salvarDevolvendoArgumento();

            Veiculo salvo = service.registrarVeiculo("ABC1D23", "Volvo FH", 2020, null);

            assertEquals("ABC1D23", salvo.getPlaca());
            assertEquals("Volvo FH", salvo.getModelo());
            assertEquals(2020, salvo.getAnoFabricacao());
            assertEquals(StatusVeiculo.ATIVO, salvo.getStatus());
            assertEquals(0L, salvo.getQuilometragem());
            assertNotNull(salvo.getDataCadastro());
            assertNotNull(salvo.getDataAtualizacao());
        }

        @Test
        void sucessoNotificaGestor() {
            when(veiculoRepository.findByPlaca(anyString())).thenReturn(Optional.empty());
            salvarDevolvendoArgumento();

            service.registrarVeiculo("ABC1D23", "Volvo FH", 2020, null);

            verify(notificacaoClient).enviarNotificacao(
                    eq("NOVO_VEICULO"),
                    eq("gestor@rotalog.com"),
                    eq("Novo veículo cadastrado: ABC1D23 - Volvo FH"));
        }

        @Test
        void falhaNaNotificacaoNaoImpedeOCadastro() {
            when(veiculoRepository.findByPlaca(anyString())).thenReturn(Optional.empty());
            salvarDevolvendoArgumento();
            doThrow(new RuntimeException("api fora do ar"))
                    .when(notificacaoClient).enviarNotificacao(anyString(), anyString(), anyString());

            Veiculo salvo = assertDoesNotThrow(() -> service.registrarVeiculo("ABC1D23", "Volvo FH", 2020, null));

            assertEquals("ABC1D23", salvo.getPlaca());
            verify(veiculoRepository).save(any(Veiculo.class));
        }

        @Test
        void placaNulaLancaPlacaObrigatoria() {
            RuntimeException e = assertThrows(DadosVeiculoInvalidosException.class,
                    () -> service.registrarVeiculo(null, "Volvo FH", 2020, null));
            assertEquals("Placa é obrigatória", e.getMessage());
            verify(veiculoRepository, never()).save(any());
        }

        @Test
        void placaVaziaLancaPlacaObrigatoria() {
            RuntimeException e = assertThrows(DadosVeiculoInvalidosException.class,
                    () -> service.registrarVeiculo("", "Volvo FH", 2020, null));
            assertEquals("Placa é obrigatória", e.getMessage());
        }

        @Test
        void placaComTamanhoErradoLancaErro() {
            RuntimeException curta = assertThrows(DadosVeiculoInvalidosException.class,
                    () -> service.registrarVeiculo("ABC123", "Volvo FH", 2020, null));
            RuntimeException longa = assertThrows(DadosVeiculoInvalidosException.class,
                    () -> service.registrarVeiculo("ABC1D234", "Volvo FH", 2020, null));

            assertEquals("Placa deve ter 7 caracteres", curta.getMessage());
            assertEquals("Placa deve ter 7 caracteres", longa.getMessage());
        }

        @Test
        void placaDuplicadaLancaErro() {
            when(veiculoRepository.findByPlaca("ABC1D23"))
                    .thenReturn(Optional.of(veiculo(1L, "ABC1D23", StatusVeiculo.ATIVO, 0L)));

            RuntimeException e = assertThrows(PlacaDuplicadaException.class,
                    () -> service.registrarVeiculo("ABC1D23", "Volvo FH", 2020, null));
            assertEquals("Veículo com placa ABC1D23 já existe", e.getMessage());
            verify(veiculoRepository, never()).save(any());
        }

        @Test
        void placaEmCaixaDiferenteEhDuplicada() {
            // A placa é normalizada para maiúsculas antes da checagem de duplicidade (fase 6).
            when(veiculoRepository.findByPlaca("ABC1D23"))
                    .thenReturn(Optional.of(veiculo(1L, "ABC1D23", StatusVeiculo.ATIVO, 0L)));

            PlacaDuplicadaException e = assertThrows(PlacaDuplicadaException.class,
                    () -> service.registrarVeiculo("abc1d23", "Volvo FH", 2020, null));

            assertEquals("Veículo com placa ABC1D23 já existe", e.getMessage());
            verify(veiculoRepository, never()).save(any());
        }

        @Test
        void usaAQuilometragemInformadaNoCadastro() {
            when(veiculoRepository.findByPlaca(anyString())).thenReturn(Optional.empty());
            salvarDevolvendoArgumento();

            assertEquals(1500L, service.registrarVeiculo("ABC1D23", "Volvo FH", 2020, 1500L).getQuilometragem());
        }

        @Test
        void quilometragemNegativaNoCadastroLancaErro() {
            when(veiculoRepository.findByPlaca(anyString())).thenReturn(Optional.empty());

            DadosVeiculoInvalidosException e = assertThrows(DadosVeiculoInvalidosException.class,
                    () -> service.registrarVeiculo("ABC1D23", "Volvo FH", 2020, -5L));

            assertEquals("Quilometragem não pode ser negativa", e.getMessage());
            verify(veiculoRepository, never()).save(any());
        }

        @Test
        void modeloNuloOuVazioLancaErro() {
            when(veiculoRepository.findByPlaca(anyString())).thenReturn(Optional.empty());

            assertEquals("Modelo é obrigatório", assertThrows(DadosVeiculoInvalidosException.class,
                    () -> service.registrarVeiculo("ABC1D23", null, 2020, null)).getMessage());
            assertEquals("Modelo é obrigatório", assertThrows(DadosVeiculoInvalidosException.class,
                    () -> service.registrarVeiculo("ABC1D23", "", 2020, null)).getMessage());
        }

        @Test
        void anoInvalidoLancaErro() {
            when(veiculoRepository.findByPlaca(anyString())).thenReturn(Optional.empty());

            for (Integer ano : new Integer[] {null, 1899, 2101}) {
                RuntimeException e = assertThrows(DadosVeiculoInvalidosException.class,
                        () -> service.registrarVeiculo("ABC1D23", "Volvo FH", ano, null));
                assertEquals("Ano de fabricação inválido", e.getMessage());
            }
        }

        @Test
        void anosNosLimitesSaoAceitos() {
            when(veiculoRepository.findByPlaca(anyString())).thenReturn(Optional.empty());
            salvarDevolvendoArgumento();

            assertEquals(1900, service.registrarVeiculo("ABC1D23", "Volvo FH", 1900, null).getAnoFabricacao());
            assertEquals(2100, service.registrarVeiculo("ABC1D24", "Volvo FH", 2100, null).getAnoFabricacao());
        }

        @Test
        void duplicidadeEhChecadaAntesDoModelo() {
            // Ordem das validações: placa vazia -> tamanho -> duplicidade -> modelo -> ano.
            when(veiculoRepository.findByPlaca("ABC1D23"))
                    .thenReturn(Optional.of(veiculo(1L, "ABC1D23", StatusVeiculo.ATIVO, 0L)));

            RuntimeException e = assertThrows(PlacaDuplicadaException.class,
                    () -> service.registrarVeiculo("ABC1D23", null, null, null));
            assertEquals("Veículo com placa ABC1D23 já existe", e.getMessage());
        }
    }

    @Nested
    @DisplayName("atualizarVeiculo")
    class Atualizar {

        @Test
        void atualizaApenasCamposInformados() {
            Veiculo v = veiculo(1L, "ABC1D23", StatusVeiculo.ATIVO, 1000L);
            existe(v);
            salvarDevolvendoArgumento();

            Veiculo r = service.atualizarVeiculo(1L, null, 2022, null);

            assertEquals("Volvo FH", r.getModelo());
            assertEquals(2022, r.getAnoFabricacao());
            assertEquals(1000L, r.getQuilometragem());
            assertNotNull(r.getDataAtualizacao());
        }

        @Test
        void modeloVazioEhIgnorado() {
            Veiculo v = veiculo(1L, "ABC1D23", StatusVeiculo.ATIVO, 1000L);
            existe(v);
            salvarDevolvendoArgumento();

            assertEquals("Volvo FH", service.atualizarVeiculo(1L, "", null, null).getModelo());
        }

        @Test
        void atualizaModeloEQuilometragem() {
            Veiculo v = veiculo(1L, "ABC1D23", StatusVeiculo.ATIVO, 1000L);
            existe(v);
            salvarDevolvendoArgumento();

            Veiculo r = service.atualizarVeiculo(1L, "Scania R450", null, 2000L);

            assertEquals("Scania R450", r.getModelo());
            assertEquals(2000L, r.getQuilometragem());
        }

        @Test
        void quilometragemMenorQueAAtualEhRejeitada() {
            Veiculo v = veiculo(1L, "ABC1D23", StatusVeiculo.ATIVO, 5000L);
            existe(v);

            DadosVeiculoInvalidosException e = assertThrows(DadosVeiculoInvalidosException.class,
                    () -> service.atualizarVeiculo(1L, null, null, 100L));

            assertEquals("Quilometragem não pode ser menor que a atual (5000 km)", e.getMessage());
            assertEquals(5000L, v.getQuilometragem());
            verify(veiculoRepository, never()).save(any());
        }

        @Test
        void quilometragemIgualAAtualEhAceita() {
            Veiculo v = veiculo(1L, "ABC1D23", StatusVeiculo.ATIVO, 5000L);
            existe(v);
            salvarDevolvendoArgumento();

            assertEquals(5000L, service.atualizarVeiculo(1L, null, null, 5000L).getQuilometragem());
        }

        @Test
        void quilometragemNegativaEhRejeitada() {
            Veiculo v = veiculo(1L, "ABC1D23", StatusVeiculo.ATIVO, null);
            existe(v);

            assertThrows(DadosVeiculoInvalidosException.class,
                    () -> service.atualizarVeiculo(1L, null, null, -1L));
        }

        @Test
        void quilometragemAtualNulaAceitaQualquerValorValido() {
            Veiculo v = veiculo(1L, "ABC1D23", StatusVeiculo.ATIVO, null);
            existe(v);
            salvarDevolvendoArgumento();

            assertEquals(10L, service.atualizarVeiculo(1L, null, null, 10L).getQuilometragem());
        }

        @Test
        void naoEncontradoLancaVeiculoNaoEncontrado() {
            when(veiculoRepository.findById(99L)).thenReturn(Optional.empty());

            assertThrows(VeiculoNaoEncontradoException.class, () -> service.atualizarVeiculo(99L, "X", null, null));
            verify(veiculoRepository, never()).save(any());
        }
    }

    @Nested
    @DisplayName("atualizarQuilometragem")
    class AtualizarQuilometragem {

        @Test
        void gravaNovaQuilometragemSemNotificarAbaixoDoLimite() {
            Veiculo v = veiculo(1L, "ABC1D23", StatusVeiculo.ATIVO, 1000L);
            existe(v);
            salvarDevolvendoArgumento();

            Veiculo r = service.atualizarQuilometragem(1L, 49999L);

            assertEquals(49999L, r.getQuilometragem());
            assertNotNull(r.getDataAtualizacao());
            verifyNoInteractions(notificacaoClient);
        }

        @Test
        void notificaAoAtingirOLimiteDe50000() {
            Veiculo v = veiculo(1L, "ABC1D23", StatusVeiculo.ATIVO, 1000L);
            existe(v);
            salvarDevolvendoArgumento();

            service.atualizarQuilometragem(1L, 50000L);

            verify(notificacaoClient).enviarNotificacao(
                    eq("ALERTA_MANUTENCAO"),
                    eq("gestor@rotalog.com"),
                    eq("Veículo ABC1D23 atingiu 50000 km. Agendar manutenção preventiva."));
        }

        @Test
        void falhaNaNotificacaoNaoImpedeAAtualizacao() {
            Veiculo v = veiculo(1L, "ABC1D23", StatusVeiculo.ATIVO, 1000L);
            existe(v);
            salvarDevolvendoArgumento();
            doThrow(new RuntimeException("fora do ar"))
                    .when(notificacaoClient).enviarNotificacao(anyString(), anyString(), anyString());

            Veiculo r = assertDoesNotThrow(() -> service.atualizarQuilometragem(1L, 60000L));

            assertEquals(60000L, r.getQuilometragem());
        }

        @Test
        void quilometragemNegativaLancaErroENaoGrava() {
            Veiculo v = veiculo(1L, "ABC1D23", StatusVeiculo.ATIVO, 1000L);
            existe(v);

            RuntimeException e = assertThrows(DadosVeiculoInvalidosException.class,
                    () -> service.atualizarQuilometragem(1L, -1L));
            assertEquals("Quilometragem não pode ser negativa", e.getMessage());
            verify(veiculoRepository, never()).save(any());
        }

        @Test
        void quilometragemMenorQueAAtualEhRejeitadaENaoGrava() {
            Veiculo v = veiculo(1L, "ABC1D23", StatusVeiculo.ATIVO, 5000L);
            existe(v);

            DadosVeiculoInvalidosException e = assertThrows(DadosVeiculoInvalidosException.class,
                    () -> service.atualizarQuilometragem(1L, 10L));

            assertEquals("Quilometragem não pode ser menor que a atual (5000 km)", e.getMessage());
            assertEquals(5000L, v.getQuilometragem());
            verify(veiculoRepository, never()).save(any());
            verifyNoInteractions(notificacaoClient);
        }

        @Test
        void quilometragemNulaLancaDadosInvalidos() {
            Veiculo v = veiculo(1L, "ABC1D23", StatusVeiculo.ATIVO, 1000L);
            existe(v);

            DadosVeiculoInvalidosException e = assertThrows(DadosVeiculoInvalidosException.class,
                    () -> service.atualizarQuilometragem(1L, null));

            assertEquals("Quilometragem é obrigatória", e.getMessage());
            verify(veiculoRepository, never()).save(any());
        }

        @Test
        void quirkConsultaOVeiculoDuasVezesPorAtualizacao() {
            // precisaDeManutencao() chama buscarPorId de novo (ADR §8).
            Veiculo v = veiculo(1L, "ABC1D23", StatusVeiculo.ATIVO, 1000L);
            existe(v);
            salvarDevolvendoArgumento();

            service.atualizarQuilometragem(1L, 2000L);

            verify(veiculoRepository, times(2)).findById(1L);
        }

        @Test
        void naoEncontradoLancaVeiculoNaoEncontrado() {
            when(veiculoRepository.findById(99L)).thenReturn(Optional.empty());

            assertThrows(VeiculoNaoEncontradoException.class, () -> service.atualizarQuilometragem(99L, 10L));
        }
    }

    @Nested
    @DisplayName("obterVeiculosPorStatus")
    class PorStatus {

        @Test
        void statusValidosDelegamAoRepositorio() {
            List<Veiculo> lista = Collections.singletonList(veiculo(1L, "ABC1D23", StatusVeiculo.ATIVO, 0L));
            when(veiculoRepository.findByStatus(StatusVeiculo.ATIVO)).thenReturn(lista);
            when(veiculoRepository.findByStatus(StatusVeiculo.INATIVO)).thenReturn(Collections.emptyList());
            when(veiculoRepository.findByStatus(StatusVeiculo.MANUTENCAO)).thenReturn(Collections.emptyList());

            assertSame(lista, service.obterVeiculosPorStatus("ATIVO"));
            assertTrue(service.obterVeiculosPorStatus("INATIVO").isEmpty());
            assertTrue(service.obterVeiculosPorStatus("MANUTENCAO").isEmpty());
        }

        @Test
        void statusInvalidoLancaErro() {
            RuntimeException e = assertThrows(DadosVeiculoInvalidosException.class,
                    () -> service.obterVeiculosPorStatus("QUEBRADO"));
            assertEquals("Status inválido: QUEBRADO", e.getMessage());
            verify(veiculoRepository, never()).findByStatus(any(StatusVeiculo.class));
        }

        @Test
        void statusEhCaseSensitive() {
            assertThrows(DadosVeiculoInvalidosException.class, () -> service.obterVeiculosPorStatus("ativo"));
        }

        @Test
        void statusNuloLancaDadosInvalidos() {
            DadosVeiculoInvalidosException e = assertThrows(DadosVeiculoInvalidosException.class,
                    () -> service.obterVeiculosPorStatus(null));

            assertEquals("Status é obrigatório", e.getMessage());
        }
    }

    @Nested
    @DisplayName("precisaDeManutencao")
    class PrecisaManutencao {

        @Test
        void limiteEhInclusivoEm50000() {
            existe(veiculo(1L, "A", StatusVeiculo.ATIVO, 49999L));
            existe(veiculo(2L, "B", StatusVeiculo.ATIVO, 50000L));
            existe(veiculo(3L, "C", StatusVeiculo.ATIVO, 80000L));

            assertFalse(service.precisaDeManutencao(1L));
            assertTrue(service.precisaDeManutencao(2L));
            assertTrue(service.precisaDeManutencao(3L));
        }

        @Test
        void quilometragemNulaNaoPrecisa() {
            existe(veiculo(1L, "A", StatusVeiculo.ATIVO, null));

            assertFalse(service.precisaDeManutencao(1L));
        }
    }

    @Nested
    @DisplayName("desativar / reativar")
    class DesativarReativar {

        @Test
        void desativarMudaStatusParaInativoENotifica() {
            Veiculo v = veiculo(1L, "ABC1D23", StatusVeiculo.ATIVO, 0L);
            existe(v);
            salvarDevolvendoArgumento();

            Veiculo r = service.desativarVeiculo(1L);

            assertEquals(StatusVeiculo.INATIVO, r.getStatus());
            assertNotNull(r.getDataAtualizacao());
            verify(notificacaoClient).enviarNotificacao(
                    eq("VEICULO_DESATIVADO"),
                    eq("gestor@rotalog.com"),
                    eq("Veículo ABC1D23 foi desativado"));
        }

        @Test
        void desativarComFalhaNaNotificacaoAindaDesativa() {
            Veiculo v = veiculo(1L, "ABC1D23", StatusVeiculo.ATIVO, 0L);
            existe(v);
            salvarDevolvendoArgumento();
            doThrow(new RuntimeException("fora do ar"))
                    .when(notificacaoClient).enviarNotificacao(anyString(), anyString(), anyString());

            assertEquals(StatusVeiculo.INATIVO, assertDoesNotThrow(() -> service.desativarVeiculo(1L)).getStatus());
        }

        @Test
        void reativarMudaStatusParaAtivoESemNotificar() {
            Veiculo v = veiculo(1L, "ABC1D23", StatusVeiculo.INATIVO, 0L);
            existe(v);
            salvarDevolvendoArgumento();

            Veiculo r = service.reativarVeiculo(1L);

            assertEquals(StatusVeiculo.ATIVO, r.getStatus());
            assertNotNull(r.getDataAtualizacao());
            verifyNoInteractions(notificacaoClient);
        }

        @Test
        void desativarENaoEncontradoLancaVeiculoNaoEncontrado() {
            when(veiculoRepository.findById(99L)).thenReturn(Optional.empty());

            assertThrows(VeiculoNaoEncontradoException.class, () -> service.desativarVeiculo(99L));
            assertThrows(VeiculoNaoEncontradoException.class, () -> service.reativarVeiculo(99L));
        }
    }
}
