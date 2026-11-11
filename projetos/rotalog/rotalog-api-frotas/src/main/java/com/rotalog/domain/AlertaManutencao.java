package com.rotalog.domain;

import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import javax.persistence.*;
import java.time.LocalDate;
import java.time.LocalDateTime;

/** Alerta de manutenção preventiva de um veículo, com o status da notificação enviada. */
@Entity
@Table(name = "alertas_manutencao")
@Getter
@Setter
@NoArgsConstructor
public class AlertaManutencao {

    public static final String TIPO_KM = "KM";
    public static final String TIPO_DATA = "DATA";

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "veiculo_id", nullable = false)
    private Long veiculoId;

    @Column(name = "tipo_alerta")
    private String tipoAlerta; // KM ou DATA

    @Column(name = "motivo")
    private String motivo;

    @Column(name = "km_atual")
    private Long kmAtual;

    @Column(name = "km_base")
    private Long kmBase;

    @Column(name = "data_base")
    private LocalDate dataBase;

    @Enumerated(EnumType.STRING)
    @Column(name = "status_notificacao")
    private StatusNotificacaoAlerta statusNotificacao;

    @Column(name = "notificacao_id")
    private Long notificacaoId;

    @Column(name = "tentativas")
    private Integer tentativas;

    @Column(name = "erro")
    private String erro;

    @Column(name = "data_criacao")
    private LocalDateTime dataCriacao;

    @Column(name = "data_atualizacao")
    private LocalDateTime dataAtualizacao;
}
