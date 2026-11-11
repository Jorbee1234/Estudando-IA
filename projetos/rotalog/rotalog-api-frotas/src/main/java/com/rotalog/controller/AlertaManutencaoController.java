package com.rotalog.controller;

import com.rotalog.dto.AlertaResponse;
import com.rotalog.dto.ReprocessamentoAlertasResponse;
import com.rotalog.dto.VerificacaoAlertasResponse;
import com.rotalog.service.AlertaManutencaoService;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/alertas-manutencao")
public class AlertaManutencaoController {

    private final AlertaManutencaoService service;

    public AlertaManutencaoController(AlertaManutencaoService service) {
        this.service = service;
    }

    @PostMapping("/verificar")
    public VerificacaoAlertasResponse verificar() {
        return service.verificar();
    }

    @PostMapping("/reprocessar")
    public ReprocessamentoAlertasResponse reprocessar() {
        return service.reprocessar();
    }

    @GetMapping
    public List<AlertaResponse> listar(@RequestParam(required = false) String status,
                                       @RequestParam(required = false) Long veiculoId) {
        return service.listar(status, veiculoId);
    }

    @GetMapping("/{id}")
    public AlertaResponse buscar(@PathVariable Long id) {
        return service.buscarPorId(id);
    }
}
