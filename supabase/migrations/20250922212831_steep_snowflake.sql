/*
  # Create process comments table

  1. New Tables
    - `process_comments`
      - `id` (uuid, primary key)
      - `process_id` (uuid, foreign key to license_processes)
      - `user_id` (uuid, foreign key to auth.users)
      - `comment` (text, required)
      - `created_at` (timestamp)
      - `updated_at` (timestamp)

  2. Security
    - Enable RLS on `process_comments` table
    - Add policies for CRUD operations based on process ownership and collaboration

  3. Performance
    - Add indexes for process_id, user_id, and created_at
    - Add trigger for automatic updated_at timestamp
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
DROP POLICY IF EXISTS "Users can create comments on owned or collaborated processes" ON process_comments;
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
DROP POLICY IF EXISTS "Users can view comments on owned or collaborated processes" ON process_comments;
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
DROP POLICY IF EXISTS "Users can update their own comments" ON process_comments;
CREATE POLICY "Users can update their own comments"
  ON process_comments
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Usuários podem deletar seus próprios comentários
DROP POLICY IF EXISTS "Users can delete their own comments" ON process_comments;
CREATE POLICY "Users can delete their own comments"
  ON process_comments
  FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Trigger para atualizar updated_at (com verificação se já existe)
DO $$
BEGIN
  -- Criar função se não existir
  IF NOT EXISTS (
    SELECT 1 FROM pg_proc 
    WHERE proname = 'update_process_comments_updated_at'
  ) THEN
    CREATE OR REPLACE FUNCTION update_process_comments_updated_at()
    RETURNS TRIGGER AS $func$
    BEGIN
      NEW.updated_at = now();
      RETURN NEW;
    END;
    $func$ LANGUAGE plpgsql;
  END IF;

  -- Remover trigger se existir e recriar
  DROP TRIGGER IF EXISTS update_process_comments_updated_at ON process_comments;
  
  CREATE TRIGGER update_process_comments_updated_at
    BEFORE UPDATE ON process_comments
    FOR EACH ROW
    EXECUTE FUNCTION update_process_comments_updated_at();
END $$;

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_process_comments_process_id ON process_comments(process_id);
CREATE INDEX IF NOT EXISTS idx_process_comments_user_id ON process_comments(user_id);
CREATE INDEX IF NOT EXISTS idx_process_comments_created_at ON process_comments(created_at DESC);