package com.rotalog.dto;

import com.fasterxml.jackson.annotation.JsonFormat;
import lombok.Getter;
import lombok.Setter;

import java.time.LocalDate;
import java.time.LocalDateTime;

/** Alerta de manutenção preventiva com dados do veículo. */
@Getter
@Setter
public class AlertaResponse {

    private Long id;
    private Long veiculoId;
    private String placa;
    private String modelo;
    private String tipoAlerta;
    private String motivo;
    private Long kmAtual;
    private Long kmBase;
    @JsonFormat(shape = JsonFormat.Shape.STRING, pattern = "yyyy-MM-dd")
    private LocalDate dataBase;
    private String statusNotificacao;
    private Long notificacaoId;
    private Integer tentativas;
    private String erro;
    private LocalDateTime dataCriacao;
    private LocalDateTime dataAtualizacao;
}
