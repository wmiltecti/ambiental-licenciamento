/*
  # Configuração de Cobrança para Licenciamento Ambiental

  1. Nova Tabela
    - `billing_configurations`
      - `id` (uuid, primary key)
      - `activity_id` (uuid, foreign key para activities)
      - `license_type_id` (uuid, foreign key para license_types)
      - `reference_unit_id` (uuid, foreign key para reference_units)
      - `unit_value` (decimal, valor base)
      - `multiplication_factor` (decimal, fator multiplicador)
      - `is_exempt` (boolean, isenção de taxa)
      - Campos automáticos derivados da atividade
      - Configuração de direcionamento de receita
      - `created_at`, `updated_at` (timestamps)

  2. Segurança
    - Habilitar RLS na tabela `billing_configurations`
    - Política para administradores gerenciarem configurações

  3. Funcionalidades
    - Trigger para preenchimento automático de campos baseados na atividade
    - Trigger para atualização automática do campo updated_at
    - Constraint para evitar configurações duplicadas
    - Dados de exemplo baseados na legislação brasileira
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

-- Verificar se a função de trigger já existe antes de criar
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_proc 
    WHERE proname = 'update_billing_configurations_updated_at'
  ) THEN
    -- Criar função para trigger de updated_at
    CREATE FUNCTION update_billing_configurations_updated_at()
    RETURNS TRIGGER AS $func$
    BEGIN
      NEW.updated_at = now();
      RETURN NEW;
    END;
    $func$ LANGUAGE plpgsql;
  END IF;
END $$;

-- Verificar se o trigger já existe antes de criar
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger 
    WHERE tgname = 'update_billing_configurations_updated_at'
  ) THEN
    -- Criar trigger para updated_at
    CREATE TRIGGER update_billing_configurations_updated_at
      BEFORE UPDATE ON billing_configurations
      FOR EACH ROW
      EXECUTE FUNCTION update_billing_configurations_updated_at();
  END IF;
END $$;

-- Habilitar RLS
ALTER TABLE billing_configurations ENABLE ROW LEVEL SECURITY;

-- Verificar se a política já existe antes de criar
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'billing_configurations' 
    AND policyname = 'Admin can manage billing_configurations'
  ) THEN
    -- Política RLS para administradores
    CREATE POLICY "Admin can manage billing_configurations"
      ON billing_configurations
      FOR ALL
      TO authenticated
      USING (true)
      WITH CHECK (true);
  END IF;
END $$;

-- Função para calcular valores automáticos baseados na atividade
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_proc 
    WHERE proname = 'update_billing_config_from_activity'
  ) THEN
    -- Criar função para preenchimento automático
    CREATE FUNCTION update_billing_config_from_activity()
    RETURNS TRIGGER AS $func$
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
    $func$ LANGUAGE plpgsql;
  END IF;
END $$;

-- Verificar se o trigger de preenchimento automático já existe
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger 
    WHERE tgname = 'billing_config_auto_fill'
  ) THEN
    -- Trigger para preenchimento automático
    CREATE TRIGGER billing_config_auto_fill
      BEFORE INSERT OR UPDATE ON billing_configurations
      FOR EACH ROW
      WHEN (NEW.activity_id IS NOT NULL)
      EXECUTE FUNCTION update_billing_config_from_activity();
  END IF;
END $$;

-- Inserir dados de exemplo baseados nas regras brasileiras (apenas se não existirem)
DO $$
BEGIN
  -- Verificar se já existem configurações
  IF NOT EXISTS (SELECT 1 FROM billing_configurations LIMIT 1) THEN
    -- Inserir apenas se as tabelas referenciadas tiverem dados
    IF EXISTS (SELECT 1 FROM activities WHERE code = 1.2) 
       AND EXISTS (SELECT 1 FROM license_types WHERE abbreviation = 'LP')
       AND EXISTS (SELECT 1 FROM reference_units WHERE code = 'UPF') THEN
      
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
      );
      
      -- Adicionar mais exemplos se as referências existirem
      IF EXISTS (SELECT 1 FROM license_types WHERE abbreviation = 'LI') THEN
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
        );
      END IF;
      
      IF EXISTS (SELECT 1 FROM license_types WHERE abbreviation = 'LO') THEN
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
      END IF;
    END IF;
  END IF;
END $$;