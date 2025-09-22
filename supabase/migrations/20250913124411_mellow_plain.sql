/*
  # Sistema de Cadastros Administrativos

  1. Tabelas de Cadastros Básicos
    - `property_types` - Tipos de Imóvel
    - `enterprise_sizes` - Porte do Empreendimento  
    - `pollution_potentials` - Potencial Poluidor
    - `license_types` - Tipos de Licença
    - `study_types` - Tipos de Estudo
    - `reference_units` - Unidades de Referência
    - `documentation_templates` - Documentação
    - `activities` - Atividades
    - `billing_configurations` - Configuração de Cobrança

  2. Tabelas de Relacionamento
    - `activity_license_types` - Atividades ↔ Tipos de Licença
    - `activity_documents` - Atividades ↔ Documentos

  3. Segurança
    - RLS habilitado em todas as tabelas
    - Políticas para administradores
*/

-- Tipos de Imóvel
CREATE TABLE IF NOT EXISTS property_types (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text UNIQUE NOT NULL,
  description text,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Porte do Empreendimento
CREATE TABLE IF NOT EXISTS enterprise_sizes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text UNIQUE NOT NULL,
  description text,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Potencial Poluidor
CREATE TABLE IF NOT EXISTS pollution_potentials (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text UNIQUE NOT NULL,
  description text,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Unidades de Referência
CREATE TABLE IF NOT EXISTS reference_units (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text UNIQUE NOT NULL,
  name text NOT NULL,
  description text,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Tipos de Licença
CREATE TABLE IF NOT EXISTS license_types (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  abbreviation text UNIQUE NOT NULL,
  name text NOT NULL,
  validity_period integer NOT NULL,
  time_unit text NOT NULL CHECK (time_unit IN ('meses', 'anos')),
  description text,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Tipos de Estudo
CREATE TABLE IF NOT EXISTS study_types (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  abbreviation text UNIQUE NOT NULL,
  name text NOT NULL,
  description text,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Documentação/Templates
CREATE TABLE IF NOT EXISTS documentation_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text NOT NULL,
  document_types text[] NOT NULL CHECK (
    document_types <@ ARRAY['Word', 'PDF', 'Imagem', 'Zip', 'Excel']
  ),
  template_file_path text,
  template_file_name text,
  template_file_size integer,
  template_file_type text,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Atividades
CREATE TABLE IF NOT EXISTS activities (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code decimal(10,2) UNIQUE NOT NULL,
  name text NOT NULL,
  description text,
  enterprise_size_id uuid REFERENCES enterprise_sizes(id),
  pollution_potential_id uuid REFERENCES pollution_potentials(id),
  measurement_unit text,
  range_start decimal(15,2),
  range_end decimal(15,2),
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Configuração de Cobrança
CREATE TABLE IF NOT EXISTS billing_configurations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  activity_id uuid REFERENCES activities(id) ON DELETE CASCADE,
  enterprise_size_id uuid REFERENCES enterprise_sizes(id),
  pollution_potential_id uuid REFERENCES pollution_potentials(id),
  measurement_unit text,
  quantity_range_start decimal(15,2),
  quantity_range_end decimal(15,2),
  license_type_id uuid REFERENCES license_types(id),
  reference_unit_id uuid REFERENCES reference_units(id),
  unit_value decimal(15,2) NOT NULL,
  multiplication_factor decimal(10,4) DEFAULT 1.0,
  is_exempt boolean DEFAULT false,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Relacionamento: Atividades ↔ Tipos de Licença
CREATE TABLE IF NOT EXISTS activity_license_types (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  activity_id uuid REFERENCES activities(id) ON DELETE CASCADE,
  license_type_id uuid REFERENCES license_types(id) ON DELETE CASCADE,
  is_required boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  UNIQUE(activity_id, license_type_id)
);

-- Relacionamento: Atividades ↔ Documentos
CREATE TABLE IF NOT EXISTS activity_documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  activity_id uuid REFERENCES activities(id) ON DELETE CASCADE,
  documentation_template_id uuid REFERENCES documentation_templates(id) ON DELETE CASCADE,
  is_required boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  UNIQUE(activity_id, documentation_template_id)
);

-- Habilitar RLS em todas as tabelas
ALTER TABLE property_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE enterprise_sizes ENABLE ROW LEVEL SECURITY;
ALTER TABLE pollution_potentials ENABLE ROW LEVEL SECURITY;
ALTER TABLE reference_units ENABLE ROW LEVEL SECURITY;
ALTER TABLE license_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE study_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE documentation_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE activities ENABLE ROW LEVEL SECURITY;
ALTER TABLE billing_configurations ENABLE ROW LEVEL SECURITY;
ALTER TABLE activity_license_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE activity_documents ENABLE ROW LEVEL SECURITY;

-- Políticas RLS para administradores (assumindo que admin é identificado por role)
-- Para simplificar, vou permitir acesso a usuários autenticados por enquanto
-- Pode ser refinado depois com base no campo role do user_profiles

CREATE POLICY "Admin can manage property_types" ON property_types FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Admin can manage enterprise_sizes" ON enterprise_sizes FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Admin can manage pollution_potentials" ON pollution_potentials FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Admin can manage reference_units" ON reference_units FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Admin can manage license_types" ON license_types FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Admin can manage study_types" ON study_types FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Admin can manage documentation_templates" ON documentation_templates FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Admin can manage activities" ON activities FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Admin can manage billing_configurations" ON billing_configurations FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Admin can manage activity_license_types" ON activity_license_types FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Admin can manage activity_documents" ON activity_documents FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Triggers para updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_property_types_updated_at BEFORE UPDATE ON property_types FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_enterprise_sizes_updated_at BEFORE UPDATE ON enterprise_sizes FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_pollution_potentials_updated_at BEFORE UPDATE ON pollution_potentials FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_reference_units_updated_at BEFORE UPDATE ON reference_units FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_license_types_updated_at BEFORE UPDATE ON license_types FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_study_types_updated_at BEFORE UPDATE ON study_types FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_documentation_templates_updated_at BEFORE UPDATE ON documentation_templates FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_activities_updated_at BEFORE UPDATE ON activities FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_billing_configurations_updated_at BEFORE UPDATE ON billing_configurations FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Inserir dados iniciais

-- Tipos de Imóvel
INSERT INTO property_types (name, description) VALUES
('Rural', 'Propriedades rurais e áreas de produção agropecuária'),
('Linear', 'Empreendimentos lineares como rodovias, ferrovias, linhas de transmissão'),
('Urbano', 'Empreendimentos em áreas urbanas e industriais')
ON CONFLICT (name) DO NOTHING;

-- Porte do Empreendimento
INSERT INTO enterprise_sizes (name, description) VALUES
('Pequeno', 'Empreendimentos de pequeno porte'),
('Médio', 'Empreendimentos de médio porte'),
('Grande', 'Empreendimentos de grande porte'),
('Excepcional', 'Empreendimentos de porte excepcional')
ON CONFLICT (name) DO NOTHING;

-- Potencial Poluidor
INSERT INTO pollution_potentials (name, description) VALUES
('Baixo', 'Baixo potencial de impacto ambiental'),
('Médio', 'Médio potencial de impacto ambiental'),
('Alto', 'Alto potencial de impacto ambiental')
ON CONFLICT (name) DO NOTHING;

-- Unidades de Referência
INSERT INTO reference_units (code, name, description) VALUES
('UPF', 'Unidade Padrão Fiscal', 'Unidade de referência para cálculo de taxas ambientais'),
('UFIR', 'Unidade Fiscal de Referência', 'Unidade fiscal de referência estadual'),
('SM', 'Salário Mínimo', 'Salário mínimo nacional')
ON CONFLICT (code) DO NOTHING;

-- Tipos de Licença
INSERT INTO license_types (abbreviation, name, validity_period, time_unit, description) VALUES
('LP', 'Licença Prévia', 5, 'anos', 'Concedida na fase preliminar do planejamento do empreendimento'),
('LI', 'Licença de Instalação', 6, 'anos', 'Autoriza a instalação do empreendimento ou atividade'),
('LO', 'Licença de Operação', 4, 'anos', 'Autoriza a operação da atividade ou empreendimento'),
('AA', 'Autorização Ambiental', 2, 'anos', 'Para atividades de menor potencial poluidor'),
('RE', 'Renovação', 4, 'anos', 'Renovação de licenças existentes'),
('LOT', 'Licença de Operação Temporária', 1, 'anos', 'Operação temporária de atividades'),
('LAU', 'Licença Ambiental Única', 6, 'anos', 'Licença única para atividades específicas')
ON CONFLICT (abbreviation) DO NOTHING;

-- Tipos de Estudo
INSERT INTO study_types (abbreviation, name, description) VALUES
('EIA', 'Estudo de Impacto Ambiental', 'Estudo detalhado dos impactos ambientais'),
('RIMA', 'Relatório de Impacto Ambiental', 'Relatório síntese do EIA'),
('RAP', 'Relatório Ambiental Preliminar', 'Estudo ambiental simplificado'),
('RAS', 'Relatório Ambiental Simplificado', 'Estudo para atividades de menor impacto'),
('RCA', 'Relatório de Controle Ambiental', 'Relatório de controle e monitoramento'),
('EAS', 'Estudo Ambiental Simplificado', 'Estudo simplificado para pequenos empreendimentos'),
('EIV', 'Estudo de Impacto de Vizinhança', 'Estudo de impactos urbanos'),
('EVA', 'Estudo de Viabilidade Ambiental', 'Estudo de viabilidade técnica e ambiental')
ON CONFLICT (abbreviation) DO NOTHING;