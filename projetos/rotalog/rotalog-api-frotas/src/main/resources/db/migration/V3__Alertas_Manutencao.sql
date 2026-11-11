-- Alerta de manutenção preventiva (espelho do script do docker-compose; idempotente)
CREATE TABLE IF NOT EXISTS alertas_manutencao (
    id BIGSERIAL PRIMARY KEY,
    veiculo_id BIGINT NOT NULL,
    tipo_alerta VARCHAR(10) NOT NULL,
    motivo VARCHAR(255),
    km_atual BIGINT,
    km_base BIGINT,
    data_base DATE,
    status_notificacao VARCHAR(10) DEFAULT 'PENDENTE',
    notificacao_id BIGINT,
    tentativas INTEGER DEFAULT 0,
    erro VARCHAR(500),
    data_criacao TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    data_atualizacao TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_alertas_manutencao_veiculo ON alertas_manutencao (veiculo_id);
CREATE INDEX IF NOT EXISTS idx_alertas_manutencao_status ON alertas_manutencao (status_notificacao);
