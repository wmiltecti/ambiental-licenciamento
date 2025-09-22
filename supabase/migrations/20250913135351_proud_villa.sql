/*
  # Configuração de Cobrança - Sistema de Licenciamento Ambiental

  1. Tabelas Criadas
    - `billing_configurations` - Configurações de cobrança/taxas
    
  2. Campos Principais
    - Atividade (referência para activities)
    - Tipo de licença (referência para license_types)
    - Unidade de referência (referência para reference_units)
    - Valor base e fator de multiplicação
    - Configurações de isenção e direcionamento
    
  3. Campos Automáticos (derivados da atividade)
    - Porte do empreendimento
    - Potencial poluidor
    - Unidade de medida
    - Faixa de quantidade
    
  4. Segurança
    - RLS habilitado
    - Políticas para operações CRUD
    
  5. Validações
    - Constraint de unicidade para evitar duplicidade
    - Valores monetários não negativos
*/

-- Criar tabela de configurações de cobrança
CREATE TABLE IF NOT EXISTS billing_configurations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Campos obrigatórios
  activity_id uuid REFERENCES activities(id) ON DELETE CASCADE,
  license_type_id uuid REFERENCES license_types(id) ON DELETE CASCADE,
  reference_unit_id uuid REFERENCES reference_units(id) ON DELETE CASCADE,
  
  -- Valores de cobrança
  unit_value decimal(15,2) NOT NULL CHECK (unit_value >= 0),
  multiplication_factor decimal(10,4) DEFAULT 1.0 CHECK (multiplication_factor >= 0),
  
  -- Configurações
  is_exempt boolean DEFAULT false,
  
  -- Campos automáticos (derivados da atividade selecionada)
  enterprise_size_id uuid REFERENCES enterprise_sizes(id),
  pollution_potential_id uuid REFERENCES pollution_potentials(id),
  measurement_unit text,
  quantity_range_start decimal(15,2),
  quantity_range_end decimal(15,2),
  
  -- Direcionamento de arrecadação
  revenue_destination text DEFAULT 'estado' CHECK (revenue_destination IN ('estado', 'municipio', 'particionado')),
  municipality_percentage decimal(5,2) DEFAULT 0 CHECK (municipality_percentage >= 0 AND municipality_percentage <= 100),
  state_percentage decimal(5,2) DEFAULT 100 CHECK (state_percentage >= 0 AND state_percentage <= 100),
  
  -- Observações e configurações adicionais
  observations text,
  additional_variables jsonb DEFAULT '{}',
  
  -- Controle
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  
  -- Constraint para evitar duplicidade
  CONSTRAINT unique_billing_config UNIQUE (activity_id, license_type_id, enterprise_size_id, pollution_potential_id)
);

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_billing_configurations_activity ON billing_configurations(activity_id);
CREATE INDEX IF NOT EXISTS idx_billing_configurations_license_type ON billing_configurations(license_type_id);
CREATE INDEX IF NOT EXISTS idx_billing_configurations_active ON billing_configurations(is_active);

-- Trigger para updated_at
CREATE OR REPLACE FUNCTION update_billing_configurations_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_billing_configurations_updated_at
  BEFORE UPDATE ON billing_configurations
  FOR EACH ROW
  EXECUTE FUNCTION update_billing_configurations_updated_at();

-- Habilitar RLS
ALTER TABLE billing_configurations ENABLE ROW LEVEL SECURITY;

-- Políticas RLS
CREATE POLICY "Admin can manage billing_configurations"
  ON billing_configurations
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Inserir dados de exemplo baseados nas regras brasileiras
INSERT INTO billing_configurations (
  activity_id,
  license_type_id, 
  reference_unit_id,
  unit_value,
  multiplication_factor,
  is_exempt,
  revenue_destination,
  municipality_percentage,
  state_percentage,
  observations
) VALUES
-- Exemplo: Taxa de Licença Prévia (TLP) para atividade de mineração
(
  (SELECT id FROM activities WHERE code = 1.2 LIMIT 1),
  (SELECT id FROM license_types WHERE abbreviation = 'LP' LIMIT 1),
  (SELECT id FROM reference_units WHERE code = 'UPF' LIMIT 1),
  150.00, -- Valor base em UPF
  2.5,    -- Fator de multiplicação
  false,  -- Não isento
  'particionado',
  30.0,   -- 30% município
  70.0,   -- 70% estado
  'Taxa aplicável para atividades de mineração - Licença Prévia'
),
-- Exemplo: Taxa de Licença de Instalação (TLI)
(
  (SELECT id FROM activities WHERE code = 1.2 LIMIT 1),
  (SELECT id FROM license_types WHERE abbreviation = 'LI' LIMIT 1),
  (SELECT id FROM reference_units WHERE code = 'UPF' LIMIT 1),
  200.00, -- Valor base em UPF
  3.0,    -- Fator de multiplicação
  false,  -- Não isento
  'particionado',
  30.0,   -- 30% município
  70.0,   -- 70% estado
  'Taxa aplicável para atividades de mineração - Licença de Instalação'
),
-- Exemplo: Taxa de Licença de Operação (TLO)
(
  (SELECT id FROM activities WHERE code = 1.2 LIMIT 1),
  (SELECT id FROM license_types WHERE abbreviation = 'LO' LIMIT 1),
  (SELECT id FROM reference_units WHERE code = 'UPF' LIMIT 1),
  100.00, -- Valor base em UPF
  1.5,    -- Fator de multiplicação
  false,  -- Não isento
  'particionado',
  30.0,   -- 30% município
  70.0,   -- 70% estado
  'Taxa aplicável para atividades de mineração - Licença de Operação'
);

-- Função para calcular valores automáticos baseados na atividade
CREATE OR REPLACE FUNCTION update_billing_config_from_activity()
RETURNS TRIGGER AS $$
BEGIN
  -- Buscar dados da atividade selecionada
  SELECT 
    enterprise_size_id,
    pollution_potential_id,
    measurement_unit,
    range_start,
    range_end
  INTO 
    NEW.enterprise_size_id,
    NEW.pollution_potential_id,
    NEW.measurement_unit,
    NEW.quantity_range_start,
    NEW.quantity_range_end
  FROM activities 
  WHERE id = NEW.activity_id;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger para preenchimento automático
CREATE TRIGGER billing_config_auto_fill
  BEFORE INSERT OR UPDATE ON billing_configurations
  FOR EACH ROW
  WHEN (NEW.activity_id IS NOT NULL)
  EXECUTE FUNCTION update_billing_config_from_activity();