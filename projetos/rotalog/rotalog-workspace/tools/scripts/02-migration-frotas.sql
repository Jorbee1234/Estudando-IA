-- RotaLog - API Frotas Schema
-- Criação das tabelas no schema 'frotas'

SET search_path TO frotas;

-- Tabela de veículos
CREATE TABLE IF NOT EXISTS veiculos (
    id BIGSERIAL PRIMARY KEY,
    placa VARCHAR(7) UNIQUE NOT NULL,
    modelo VARCHAR(100),
    ano_fabricacao INTEGER,
    quilometragem BIGINT DEFAULT 0,
    status VARCHAR(20) DEFAULT 'ATIVO',
    data_cadastro TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    data_atualizacao TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- TODO: Add indexes
-- TODO: Add constraints

-- Tabela de motoristas
CREATE TABLE IF NOT EXISTS motoristas (
    id BIGSERIAL PRIMARY KEY,
    nome VARCHAR(100) NOT NULL,
    cnh VARCHAR(11) UNIQUE NOT NULL,
    categoria_cnh VARCHAR(5),
    vencimento_cnh DATE,
    status VARCHAR(20) DEFAULT 'ATIVO',
    data_cadastro TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    data_atualizacao TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- TODO: Add foreign key constraints

-- Tabela de manutenções
CREATE TABLE IF NOT EXISTS manutencoes (
    id BIGSERIAL PRIMARY KEY,
    veiculo_id BIGINT,
    tipo_manutencao VARCHAR(50),
    data_manutencao TIMESTAMP,
    quilometragem_manutencao BIGINT,
    custo DECIMAL(10, 2),
    descricao TEXT,
    status VARCHAR(20) DEFAULT 'PENDENTE',
    data_criacao TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    data_atualizacao TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Tabela de alertas de manutenção preventiva
CREATE TABLE IF NOT EXISTS alertas_manutencao (
    id BIGSERIAL PRIMARY KEY,
    veiculo_id BIGINT NOT NULL,
    tipo_alerta VARCHAR(10) NOT NULL,
    motivo VARCHAR(255),
    km_atual BIGINT,
    km_base BIGINT,
    data_base DATE,
    status_notificacao VARCHAR(10) NOT NULL DEFAULT 'PENDENTE',
    notificacao_id BIGINT,
    tentativas INTEGER NOT NULL DEFAULT 0,
    erro VARCHAR(500),
    data_criacao TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    data_atualizacao TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_alertas_manutencao_status_notificacao ON alertas_manutencao (status_notificacao);
CREATE INDEX IF NOT EXISTS idx_alertas_manutencao_veiculo_id ON alertas_manutencao (veiculo_id);

-- FIXME: Missing audit tables
-- FIXME: Missing event sourcing tables
