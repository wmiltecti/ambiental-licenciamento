/*
  # Cadastro de Tipos de Licença Ambiental

  1. Nova Tabela
    - `license_types`
      - `id` (uuid, primary key)
      - `abbreviation` (text, unique) - Sigla/Abreviação (LP, LI, LO, etc.)
      - `name` (text, unique) - Nome do Tipo de Licença
      - `validity_period` (integer) - Prazo de validade
      - `time_unit` (text) - Unidade de tempo (meses/anos)
      - `description` (text, optional) - Descrição detalhada
      - `is_active` (boolean) - Status ativo/inativo
      - `created_at` (timestamp)
      - `updated_at` (timestamp)

  2. Segurança
    - Enable RLS na tabela `license_types`
    - Políticas para usuários autenticados gerenciarem tipos de licença

  3. Dados Iniciais
    - Inserir tipos de licença mais comuns conforme legislação brasileira
*/

-- Criar tabela de tipos de licença
CREATE TABLE IF NOT EXISTS license_types (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  abbreviation text UNIQUE NOT NULL,
  name text UNIQUE NOT NULL,
  validity_period integer NOT NULL,
  time_unit text NOT NULL CHECK (time_unit IN ('meses', 'anos')),
  description text,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Habilitar RLS
ALTER TABLE license_types ENABLE ROW LEVEL SECURITY;

-- Políticas RLS para administração
CREATE POLICY "Admin can manage license_types"
  ON license_types
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Trigger para updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_license_types_updated_at
    BEFORE UPDATE ON license_types
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Inserir dados iniciais dos tipos de licença mais comuns
INSERT INTO license_types (abbreviation, name, validity_period, time_unit, description) VALUES
('LP', 'Licença Prévia', 5, 'anos', 'Concedida na fase preliminar do planejamento do empreendimento ou atividade, aprovando sua localização e concepção, atestando a viabilidade ambiental e estabelecendo os requisitos básicos e condicionantes a serem atendidos nas próximas fases de sua implementação.'),
('LI', 'Licença de Instalação', 6, 'anos', 'Autoriza a instalação do empreendimento ou atividade de acordo com as especificações constantes dos planos, programas e projetos aprovados, incluindo as medidas de controle ambiental e demais condicionantes.'),
('LO', 'Licença de Operação', 4, 'anos', 'Autoriza a operação da atividade ou empreendimento, após a verificação do efetivo cumprimento do que consta das licenças anteriores, com as medidas de controle ambiental e condicionantes determinados para a operação.'),
('AA', 'Autorização Ambiental', 2, 'anos', 'Ato administrativo pelo qual o órgão ambiental autoriza a localização, instalação, ampliação e a operação de empreendimentos e atividades utilizadoras de recursos ambientais consideradas efetiva ou potencialmente poluidoras.'),
('RE', 'Renovação de Licença', 4, 'anos', 'Renovação de licença ambiental já concedida, mantendo as mesmas condições da licença original ou com modificações, se necessário.'),
('LOT', 'Licença de Operação para Teste', 1, 'anos', 'Autoriza a operação de sistemas de controle de poluição do ar para teste, pelo prazo de até 240 dias.'),
('LAU', 'Licença Ambiental Única', 6, 'anos', 'Licença que engloba as fases de LP, LI e LO em um único documento, para atividades de menor potencial poluidor.'),
('LAS', 'Licença Ambiental Simplificada', 4, 'anos', 'Procedimento administrativo simplificado para licenciamento de atividades de baixo potencial poluidor.'),
('AAF', 'Autorização Ambiental de Funcionamento', 4, 'anos', 'Autorização para funcionamento de atividades de baixo potencial poluidor e degradador do meio ambiente.'),
('AOUT', 'Autorização de Outorga', 10, 'anos', 'Autorização para uso de recursos hídricos superficiais e subterrâneos.'),
('CA', 'Certidão Ambiental', 2, 'anos', 'Documento que certifica a regularidade ambiental de um empreendimento ou atividade.'),
('DLA', 'Declaração de Licença Ambiental', 3, 'anos', 'Declaração para atividades de mínimo potencial poluidor que dispensam licenciamento ambiental.')
ON CONFLICT (abbreviation) DO NOTHING;