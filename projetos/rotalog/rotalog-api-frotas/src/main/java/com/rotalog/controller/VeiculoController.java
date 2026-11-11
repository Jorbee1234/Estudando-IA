package com.rotalog.controller;

import com.rotalog.domain.Veiculo;
import com.rotalog.dto.EstatisticaFrotaResponse;
import com.rotalog.dto.VeiculoRequest;
import com.rotalog.service.VeiculoEstatisticaService;
import com.rotalog.service.VeiculoService;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

/**
 * VeiculoController - REST controller para gerenciamento de veículos.
 * Os erros de regra de negócio são traduzidos em HTTP pelo RestExceptionHandler.
 *
 * FIXME: Sem CORS configurado
 * FIXME: Sem Swagger/OpenAPI
 * FIXME: Sem HATEOAS
 * FIXME: Retornando entidade diretamente em vez de DTO de resposta
 */
@Slf4j
@RestController
@RequestMapping("/veiculos")
public class VeiculoController {

    @Autowired // FIXME: deveria usar injeção por construtor
    private VeiculoService veiculoService;

    @Autowired
    private VeiculoEstatisticaService estatisticaService;

    /**
     * FIXME: Sem paginação
     */
    @GetMapping
    public ResponseEntity<List<Veiculo>> listarTodos() {
        return ResponseEntity.ok(veiculoService.listarTodos());
    }

    @GetMapping("/{id}")
    public ResponseEntity<Veiculo> buscarPorId(@PathVariable Long id) {
        return ResponseEntity.ok(veiculoService.buscarPorId(id));
    }

    @GetMapping("/placa/{placa}")
    public ResponseEntity<Veiculo> buscarPorPlaca(@PathVariable String placa) {
        return ResponseEntity.ok(veiculoService.buscarPorPlaca(placa));
    }

    @GetMapping("/status/{status}")
    public ResponseEntity<List<Veiculo>> listarPorStatus(@PathVariable String status) {
        return ResponseEntity.ok(veiculoService.obterVeiculosPorStatus(status));
    }

    /**
     * FIXME: Sem @Valid no request body
     * FIXME: Sem URI no header Location
     */
    @PostMapping
    public ResponseEntity<Veiculo> registrarVeiculo(@RequestBody VeiculoRequest request) {
        Veiculo veiculo = veiculoService.registrarVeiculo(
            request.getPlaca(),
            request.getModelo(),
            request.getAnoFabricacao(),
            request.getQuilometragem()
        );
        return ResponseEntity.status(HttpStatus.CREATED).body(veiculo);
    }

    /**
     * FIXME: Sem @Valid
     * FIXME: Sem verificação de campos nulos
     */
    @PutMapping("/{id}")
    public ResponseEntity<Veiculo> atualizarVeiculo(@PathVariable Long id, @RequestBody VeiculoRequest request) {
        Veiculo veiculo = veiculoService.atualizarVeiculo(
            id,
            request.getModelo(),
            request.getAnoFabricacao(),
            request.getQuilometragem()
        );
        return ResponseEntity.ok(veiculo);
    }

    @PatchMapping("/{id}/quilometragem")
    public ResponseEntity<?> atualizarQuilometragem(@PathVariable Long id, @RequestBody Map<String, Long> body) {
        Long quilometragem = body.get("quilometragem");
        if (quilometragem == null) {
            Map<String, String> error = new HashMap<>();
            error.put("erro", "Campo 'quilometragem' é obrigatório");
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(error);
        }
        return ResponseEntity.ok(veiculoService.atualizarQuilometragem(id, quilometragem));
    }

    @PatchMapping("/{id}/desativar")
    public ResponseEntity<Veiculo> desativarVeiculo(@PathVariable Long id) {
        return ResponseEntity.ok(veiculoService.desativarVeiculo(id));
    }

    @PatchMapping("/{id}/reativar")
    public ResponseEntity<Veiculo> reativarVeiculo(@PathVariable Long id) {
        return ResponseEntity.ok(veiculoService.reativarVeiculo(id));
    }

    @GetMapping("/estatisticas")
    public ResponseEntity<EstatisticaFrotaResponse> obterEstatisticas() {
        return ResponseEntity.ok(estatisticaService.obterEstatisticas());
    }
}
