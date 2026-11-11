package com.rotalog.controller;

import com.rotalog.domain.StatusVeiculo;
import com.rotalog.domain.Veiculo;
import com.rotalog.exception.DadosVeiculoInvalidosException;
import com.rotalog.exception.PlacaDuplicadaException;
import com.rotalog.exception.RestExceptionHandler;
import com.rotalog.exception.VeiculoNaoEncontradoException;
import com.rotalog.dto.EstatisticaFrotaResponse;
import com.rotalog.service.VeiculoEstatisticaService;
import com.rotalog.service.VeiculoService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/** Contrato HTTP de /veiculos (ADR 0001, fase 4): status por tipo de exceção e corpo {"erro": "..."}. */
@ExtendWith(MockitoExtension.class)
class VeiculoControllerTest {

    private static final String BODY_VEICULO =
            "{\"placa\":\"ABC1D23\",\"modelo\":\"Volvo\",\"anoFabricacao\":2020}";

    @Mock
    private VeiculoService veiculoService;

    @Mock
    private VeiculoEstatisticaService estatisticaService;

    @InjectMocks
    private VeiculoController controller;

    private MockMvc mvc;

    @BeforeEach
    void setUp() {
        mvc = MockMvcBuilders.standaloneSetup(controller)
                .setControllerAdvice(new RestExceptionHandler())
                .build();
    }

    private static Veiculo veiculo() {
        Veiculo v = new Veiculo();
        v.setId(1L);
        v.setPlaca("ABC1D23");
        v.setStatus(StatusVeiculo.ATIVO);
        return v;
    }

    @Test
    void buscarPorIdNaoEncontradoRetorna404() throws Exception {
        when(veiculoService.buscarPorId(99L)).thenThrow(new VeiculoNaoEncontradoException("Veículo não encontrado: 99"));

        mvc.perform(get("/veiculos/99"))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.erro").value("Veículo não encontrado: 99"));
    }

    @Test
    void buscarPorPlacaNaoEncontradoRetorna404() throws Exception {
        when(veiculoService.buscarPorPlaca(anyString())).thenThrow(new VeiculoNaoEncontradoException("não achou"));

        mvc.perform(get("/veiculos/placa/XXX0000")).andExpect(status().isNotFound());
    }

    @Test
    void statusInvalidoRetorna400() throws Exception {
        when(veiculoService.obterVeiculosPorStatus("x")).thenThrow(new DadosVeiculoInvalidosException("Status inválido: x"));

        mvc.perform(get("/veiculos/status/x"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.erro").value("Status inválido: x"));
    }

    @Test
    void registrarComSucessoRetorna201() throws Exception {
        when(veiculoService.registrarVeiculo(anyString(), anyString(), any(), any())).thenReturn(veiculo());

        mvc.perform(post("/veiculos").contentType(MediaType.APPLICATION_JSON).content(BODY_VEICULO))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.status").value("ATIVO"));
    }

    @Test
    void registrarPlacaDuplicadaRetorna409() throws Exception {
        when(veiculoService.registrarVeiculo(anyString(), anyString(), any(), any()))
                .thenThrow(new PlacaDuplicadaException("Veículo com placa ABC1D23 já existe"));

        mvc.perform(post("/veiculos").contentType(MediaType.APPLICATION_JSON).content(BODY_VEICULO))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.erro").value("Veículo com placa ABC1D23 já existe"));
    }

    @Test
    void registrarDadosInvalidosRetorna400() throws Exception {
        when(veiculoService.registrarVeiculo(any(), any(), any(), any()))
                .thenThrow(new DadosVeiculoInvalidosException("Placa é obrigatória"));

        mvc.perform(post("/veiculos").contentType(MediaType.APPLICATION_JSON).content("{}"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.erro").value("Placa é obrigatória"));
    }

    @Test
    void atualizarNaoEncontradoRetorna404() throws Exception {
        when(veiculoService.atualizarVeiculo(anyLong(), any(), any(), any()))
                .thenThrow(new VeiculoNaoEncontradoException("Veículo não encontrado: 99"));

        mvc.perform(put("/veiculos/99").contentType(MediaType.APPLICATION_JSON).content("{\"modelo\":\"X\"}"))
                .andExpect(status().isNotFound());
    }

    @Test
    void quilometragemNaoEncontradoRetorna404ENegativaRetorna400() throws Exception {
        when(veiculoService.atualizarQuilometragem(99L, 10L))
                .thenThrow(new VeiculoNaoEncontradoException("Veículo não encontrado: 99"));
        when(veiculoService.atualizarQuilometragem(1L, -1L))
                .thenThrow(new DadosVeiculoInvalidosException("Quilometragem não pode ser negativa"));

        mvc.perform(patch("/veiculos/99/quilometragem").contentType(MediaType.APPLICATION_JSON)
                        .content("{\"quilometragem\":10}"))
                .andExpect(status().isNotFound());
        mvc.perform(patch("/veiculos/1/quilometragem").contentType(MediaType.APPLICATION_JSON)
                        .content("{\"quilometragem\":-1}"))
                .andExpect(status().isBadRequest());
    }

    @Test
    void quilometragemAusenteRetorna400() throws Exception {
        mvc.perform(patch("/veiculos/1/quilometragem").contentType(MediaType.APPLICATION_JSON).content("{}"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.erro").value("Campo 'quilometragem' é obrigatório"));
    }

    @Test
    void desativarEReativarNaoEncontradoRetornam404() throws Exception {
        when(veiculoService.desativarVeiculo(99L)).thenThrow(new VeiculoNaoEncontradoException("x"));
        when(veiculoService.reativarVeiculo(99L)).thenThrow(new VeiculoNaoEncontradoException("x"));

        mvc.perform(patch("/veiculos/99/desativar")).andExpect(status().isNotFound());
        mvc.perform(patch("/veiculos/99/reativar")).andExpect(status().isNotFound());
    }

    @Test
    void estatisticasMantemOsNomesJsonDoContrato() throws Exception {
        when(estatisticaService.obterEstatisticas()).thenReturn(new EstatisticaFrotaResponse(10, 8, 1, 1));

        mvc.perform(get("/veiculos/estatisticas"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.total").value(10))
                .andExpect(jsonPath("$.ativos").value(8))
                .andExpect(jsonPath("$.inativos").value(1))
                .andExpect(jsonPath("$.em_manutencao").value(1))
                .andExpect(jsonPath("$.emManutencao").doesNotExist());
    }
}
