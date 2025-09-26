/*
  # Criar tabela de tipos de processo

  1. Nova Tabela
    - `process_types`
      - `id` (uuid, primary key)
      - `name` (text, obrigatório, único)
      - `abbreviation` (text, opcional)
      - `description` (text, opcional)
      - `default_deadline_days` (integer, opcional)
      - `display_order` (integer, opcional)
      - `is_active` (boolean, padrão true)
      - `created_at` (timestamp)
      - `updated_at` (timestamp)

  2. Segurança
    - Habilitar RLS na tabela `process_types`
    - Adicionar política para usuários autenticados gerenciarem tipos de processo
*/

CREATE TABLE IF NOT EXISTS process_types (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  abbreviation text,
  description text,
  default_deadline_days integer,
  display_order integer DEFAULT 0,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Adicionar constraint de unicidade para o nome
ALTER TABLE process_types ADD CONSTRAINT process_types_name_key UNIQUE (name);

-- Habilitar RLS
ALTER TABLE process_types ENABLE ROW LEVEL SECURITY;

-- Política para administradores gerenciarem tipos de processo
CREATE POLICY "Admin can manage process_types"
  ON process_types
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Trigger para atualizar updated_at
CREATE TRIGGER update_process_types_updated_at
  BEFORE UPDATE ON process_types
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Inserir alguns tipos de processo padrão
INSERT INTO process_types (name, abbreviation, description, default_deadline_days, display_order) VALUES
('Licença Prévia', 'LP', 'Licença concedida na fase preliminar do planejamento do empreendimento', 180, 1),
('Licença de Instalação', 'LI', 'Licença que autoriza a instalação do empreendimento', 120, 2),
('Licença de Operação', 'LO', 'Licença que autoriza a operação da atividade ou empreendimento', 90, 3),
('Autorização Ambiental', 'AA', 'Autorização para atividades de menor impacto ambiental', 60, 4),
('Renovação de Licença', 'RE', 'Renovação de licenças ambientais já concedidas', 90, 5),
('Licença de Regularização', 'LR', 'Licença para regularização de empreendimentos já instalados', 150, 6);