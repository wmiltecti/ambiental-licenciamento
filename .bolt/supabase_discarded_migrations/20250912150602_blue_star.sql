/*
  # Criar tabela de comentários de processos

  1. Nova Tabela
    - `process_comments`
      - `id` (uuid, primary key)
      - `process_id` (uuid, foreign key para license_processes)
      - `user_id` (uuid, foreign key para auth.users)
      - `comment` (text, conteúdo do comentário)
      - `created_at` (timestamp)
      - `updated_at` (timestamp)

  2. Segurança
    - Habilitar RLS na tabela `process_comments`
    - Políticas para usuários autenticados poderem criar, ler, atualizar e deletar seus próprios comentários
    - Políticas para colaboradores do processo poderem ver comentários
*/

-- Criar tabela de comentários
CREATE TABLE IF NOT EXISTS process_comments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  process_id uuid NOT NULL REFERENCES license_processes(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  comment text NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Habilitar RLS
ALTER TABLE process_comments ENABLE ROW LEVEL SECURITY;

-- Políticas RLS para comentários
-- Usuários podem criar comentários em processos que possuem ou colaboram
CREATE POLICY "Users can create comments on owned or collaborated processes"
  ON process_comments
  FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.uid() = user_id AND (
      EXISTS (
        SELECT 1 FROM license_processes 
        WHERE id = process_comments.process_id AND user_id = auth.uid()
      ) OR
      EXISTS (
        SELECT 1 FROM process_collaborators 
        WHERE process_id = process_comments.process_id 
        AND user_id = auth.uid() 
        AND status = 'accepted'
      )
    )
  );

-- Usuários podem ver comentários de processos que possuem ou colaboram
CREATE POLICY "Users can view comments on owned or collaborated processes"
  ON process_comments
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM license_processes 
      WHERE id = process_comments.process_id AND user_id = auth.uid()
    ) OR
    EXISTS (
      SELECT 1 FROM process_collaborators 
      WHERE process_id = process_comments.process_id 
      AND user_id = auth.uid() 
      AND status = 'accepted'
    )
  );

-- Usuários podem atualizar seus próprios comentários
CREATE POLICY "Users can update their own comments"
  ON process_comments
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Usuários podem deletar seus próprios comentários
CREATE POLICY "Users can delete their own comments"
  ON process_comments
  FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Trigger para atualizar updated_at
CREATE OR REPLACE FUNCTION update_process_comments_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_process_comments_updated_at
  BEFORE UPDATE ON process_comments
  FOR EACH ROW
  EXECUTE FUNCTION update_process_comments_updated_at();

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_process_comments_process_id ON process_comments(process_id);
CREATE INDEX IF NOT EXISTS idx_process_comments_user_id ON process_comments(user_id);
CREATE INDEX IF NOT EXISTS idx_process_comments_created_at ON process_comments(created_at DESC);