/*
  # Criar tabela de atividades para licenciamento ambiental

  1. Nova Tabela
    - `activities`
      - `id` (uuid, primary key)
      - `code` (numeric, unique) - Código da atividade (ex: 1.1, 1.56)
      - `name` (text, unique) - Nome da atividade
      - `description` (text, optional) - Descrição detalhada
      - `enterprise_size_id` (uuid, foreign key) - Porte do empreendimento
      - `pollution_potential_id` (uuid, foreign key) - Potencial poluidor
      - `measurement_unit` (text) - Unidade de medida
      - `range_start` (numeric) - Faixa inicial de valor
      - `range_end` (numeric) - Faixa final de valor
      - `is_active` (boolean) - Status ativo/inativo
      - `created_at` (timestamp)
      - `updated_at` (timestamp)

  2. Tabelas de Relacionamento
    - `activity_license_types` - Relaciona atividades com tipos de licença
    - `activity_documents` - Relaciona atividades com documentos obrigatórios

  3. Segurança
    - Habilitar RLS em todas as tabelas
    - Políticas para usuários autenticados
*/

-- Criar tabela de atividades
CREATE TABLE IF NOT EXISTS activities (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code numeric(10,2) UNIQUE NOT NULL,
  name text UNIQUE NOT NULL,
  description text,
  enterprise_size_id uuid REFERENCES enterprise_sizes(id),
  pollution_potential_id uuid REFERENCES pollution_potentials(id),
  measurement_unit text,
  range_start numeric(15,2),
  range_end numeric(15,2),
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Criar tabela de relacionamento atividade-tipos de licença
CREATE TABLE IF NOT EXISTS activity_license_types (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  activity_id uuid REFERENCES activities(id) ON DELETE CASCADE,
  license_type_id uuid REFERENCES license_types(id) ON DELETE CASCADE,
  is_required boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  UNIQUE(activity_id, license_type_id)
);

-- Criar tabela de relacionamento atividade-documentos
CREATE TABLE IF NOT EXISTS activity_documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  activity_id uuid REFERENCES activities(id) ON DELETE CASCADE,
  documentation_template_id uuid REFERENCES documentation_templates(id) ON DELETE CASCADE,
  is_required boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  UNIQUE(activity_id, documentation_template_id)
);

-- Habilitar RLS
ALTER TABLE activities ENABLE ROW LEVEL SECURITY;
ALTER TABLE activity_license_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE activity_documents ENABLE ROW LEVEL SECURITY;

-- Políticas para activities
CREATE POLICY "Admin can manage activities"
  ON activities
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Políticas para activity_license_types
CREATE POLICY "Admin can manage activity_license_types"
  ON activity_license_types
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Políticas para activity_documents
CREATE POLICY "Admin can manage activity_documents"
  ON activity_documents
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Trigger para updated_at
CREATE TRIGGER update_activities_updated_at
  BEFORE UPDATE ON activities
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_activities_code ON activities(code);
CREATE INDEX IF NOT EXISTS idx_activities_name ON activities(name);
CREATE INDEX IF NOT EXISTS idx_activities_enterprise_size ON activities(enterprise_size_id);
CREATE INDEX IF NOT EXISTS idx_activities_pollution_potential ON activities(pollution_potential_id);
CREATE INDEX IF NOT EXISTS idx_activity_license_types_activity ON activity_license_types(activity_id);
CREATE INDEX IF NOT EXISTS idx_activity_license_types_license ON activity_license_types(license_type_id);
CREATE INDEX IF NOT EXISTS idx_activity_documents_activity ON activity_documents(activity_id);
CREATE INDEX IF NOT EXISTS idx_activity_documents_template ON activity_documents(documentation_template_id);