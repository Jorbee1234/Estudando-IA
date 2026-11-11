package com.rotalog.controller;

import com.rotalog.dto.AlertaResponse;
import com.rotalog.dto.ReprocessamentoAlertasResponse;
import com.rotalog.dto.VerificacaoAlertasResponse;
import com.rotalog.exception.AlertaNaoEncontradoException;
import com.rotalog.exception.DadosVeiculoInvalidosException;
import com.rotalog.exception.RestExceptionHandler;
import com.rotalog.service.AlertaManutencaoService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;

import java.time.LocalDate;
import java.util.Collections;

import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/** Contrato HTTP de /alertas-manutencao. */
@ExtendWith(MockitoExtension.class)
class AlertaManutencaoControllerTest {

    @Mock
    private AlertaManutencaoService service;

    @InjectMocks
    private AlertaManutencaoController controller;

    private MockMvc mvc;

    @BeforeEach
    void setUp() {
        mvc = MockMvcBuilders.standaloneSetup(controller)
                .setControllerAdvice(new RestExceptionHandler())
                .build();
    }

    private static AlertaResponse alerta() {
        AlertaResponse a = new AlertaResponse();
        a.setId(1L);
        a.setVeiculoId(2L);
        a.setPlaca("ABC1D23");
        a.setModelo("Volvo");
        a.setTipoAlerta("KM");
        a.setKmAtual(25000L);
        a.setKmBase(0L);
        a.setDataBase(LocalDate.of(2026, 5, 10));
        a.setStatusNotificacao("PENDENTE");
        a.setTentativas(1);
        return a;
    }

    @Test
    void verificarRetornaCriadosEAlertas() throws Exception {
        when(service.verificar()).thenReturn(new VerificacaoAlertasResponse(1, Collections.singletonList(alerta())));

        mvc.perform(post("/alertas-manutencao/verificar"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.criados").value(1))
                .andExpect(jsonPath("$.alertas[0].veiculoId").value(2))
                .andExpect(jsonPath("$.alertas[0].statusNotificacao").value("PENDENTE"))
                .andExpect(jsonPath("$.alertas[0].dataBase").value("2026-05-10"));
    }

    @Test
    void reprocessarRetornaContagens() throws Exception {
        when(service.reprocessar()).thenReturn(new ReprocessamentoAlertasResponse(3, 2));

        mvc.perform(post("/alertas-manutencao/reprocessar"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.reprocessados").value(3))
                .andExpect(jsonPath("$.enviados").value(2));
    }

    @Test
    void listarRepassaFiltros() throws Exception {
        when(service.listar("PENDENTE", 2L)).thenReturn(Collections.singletonList(alerta()));

        mvc.perform(get("/alertas-manutencao").param("status", "PENDENTE").param("veiculoId", "2"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].id").value(1))
                .andExpect(jsonPath("$[0].placa").value("ABC1D23"));
    }

    @Test
    void listarComStatusInvalidoRetorna400() throws Exception {
        when(service.listar("XYZ", null)).thenThrow(new DadosVeiculoInvalidosException("Status de alerta inválido: XYZ"));

        mvc.perform(get("/alertas-manutencao").param("status", "XYZ"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.erro").value("Status de alerta inválido: XYZ"));
    }

    @Test
    void buscarPorIdRetornaAlerta() throws Exception {
        when(service.buscarPorId(1L)).thenReturn(alerta());

        mvc.perform(get("/alertas-manutencao/1"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.tipoAlerta").value("KM"));
    }

    @Test
    void buscarPorIdInexistenteRetorna404() throws Exception {
        when(service.buscarPorId(9L)).thenThrow(new AlertaNaoEncontradoException("Alerta não encontrado: 9"));

        mvc.perform(get("/alertas-manutencao/9"))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.erro").value("Alerta não encontrado: 9"));
    }
}
