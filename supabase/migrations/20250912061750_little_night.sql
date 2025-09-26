/*
  # Sistema de Colaboração e Compartilhamento

  1. New Tables
    - `process_collaborators` - Gerencia quem pode acessar cada processo
    - `user_profiles` - Perfis de usuário com informações adicionais
    - `collaboration_invites` - Convites de colaboração pendentes
    - `activity_logs` - Log de atividades para auditoria

  2. Security
    - RLS habilitado em todas as tabelas
    - Políticas para proprietários e colaboradores
    - Diferentes níveis de permissão (viewer, editor, admin)

  3. Features
    - Compartilhamento por email
    - Níveis de permissão granulares
    - Histórico de atividades
    - Notificações de colaboração
*/

-- Tabela de perfis de usuário
CREATE TABLE IF NOT EXISTS user_profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  name text NOT NULL,
  email text NOT NULL,
  role text DEFAULT 'analista',
  organization text,
  phone text,
  avatar_url text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(user_id)
);

-- Tabela de colaboradores de processo
CREATE TABLE IF NOT EXISTS process_collaborators (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  process_id uuid REFERENCES license_processes(id) ON DELETE CASCADE,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  invited_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  permission_level text NOT NULL CHECK (permission_level IN ('viewer', 'editor', 'admin')),
  invited_at timestamptz DEFAULT now(),
  accepted_at timestamptz,
  status text DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'declined', 'revoked')),
  UNIQUE(process_id, user_id)
);

-- Tabela de convites de colaboração
CREATE TABLE IF NOT EXISTS collaboration_invites (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  process_id uuid REFERENCES license_processes(id) ON DELETE CASCADE,
  invited_email text NOT NULL,
  invited_by uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  permission_level text NOT NULL CHECK (permission_level IN ('viewer', 'editor', 'admin')),
  invite_token text UNIQUE DEFAULT gen_random_uuid()::text,
  expires_at timestamptz DEFAULT (now() + interval '7 days'),
  status text DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'expired', 'revoked')),
  created_at timestamptz DEFAULT now()
);

-- Tabela de log de atividades
CREATE TABLE IF NOT EXISTS activity_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  process_id uuid REFERENCES license_processes(id) ON DELETE CASCADE,
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  action text NOT NULL,
  description text,
  metadata jsonb,
  created_at timestamptz DEFAULT now()
);

-- Habilitar RLS
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE process_collaborators ENABLE ROW LEVEL SECURITY;
ALTER TABLE collaboration_invites ENABLE ROW LEVEL SECURITY;
ALTER TABLE activity_logs ENABLE ROW LEVEL SECURITY;

-- Políticas para user_profiles
CREATE POLICY "Users can view their own profile"
  ON user_profiles FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own profile"
  ON user_profiles FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own profile"
  ON user_profiles FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Políticas para process_collaborators
CREATE POLICY "Process owners can manage collaborators"
  ON process_collaborators FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM license_processes 
      WHERE id = process_collaborators.process_id 
      AND user_id = auth.uid()
    )
  );

CREATE POLICY "Collaborators can view their own collaboration"
  ON process_collaborators FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- Políticas para collaboration_invites
CREATE POLICY "Process owners can manage invites"
  ON collaboration_invites FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM license_processes 
      WHERE id = collaboration_invites.process_id 
      AND user_id = auth.uid()
    )
  );

CREATE POLICY "Invited users can view their invites"
  ON collaboration_invites FOR SELECT
  TO authenticated
  USING (
    invited_email = (
      SELECT email FROM auth.users WHERE id = auth.uid()
    )
  );

-- Políticas para activity_logs
CREATE POLICY "Process participants can view activity logs"
  ON activity_logs FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM license_processes 
      WHERE id = activity_logs.process_id 
      AND user_id = auth.uid()
    ) OR
    EXISTS (
      SELECT 1 FROM process_collaborators 
      WHERE process_id = activity_logs.process_id 
      AND user_id = auth.uid() 
      AND status = 'accepted'
    )
  );

CREATE POLICY "Authenticated users can insert activity logs"
  ON activity_logs FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Atualizar políticas de license_processes para incluir colaboradores
DROP POLICY IF EXISTS "Users can view their own processes" ON license_processes;
CREATE POLICY "Users can view their own processes or collaborated processes"
  ON license_processes FOR SELECT
  TO authenticated
  USING (
    auth.uid() = user_id OR
    EXISTS (
      SELECT 1 FROM process_collaborators 
      WHERE process_id = license_processes.id 
      AND user_id = auth.uid() 
      AND status = 'accepted'
    )
  );

-- Política para edição por colaboradores
CREATE POLICY "Collaborators can update processes with editor permission"
  ON license_processes FOR UPDATE
  TO authenticated
  USING (
    auth.uid() = user_id OR
    EXISTS (
      SELECT 1 FROM process_collaborators 
      WHERE process_id = license_processes.id 
      AND user_id = auth.uid() 
      AND status = 'accepted'
      AND permission_level IN ('editor', 'admin')
    )
  );

-- Atualizar políticas de process_documents para incluir colaboradores
DROP POLICY IF EXISTS "Users can view their own documents" ON process_documents;
CREATE POLICY "Users can view documents of their processes or collaborated processes"
  ON process_documents FOR SELECT
  TO authenticated
  USING (
    auth.uid() = user_id OR
    EXISTS (
      SELECT 1 FROM license_processes lp
      JOIN process_collaborators pc ON lp.id = pc.process_id
      WHERE lp.id = process_documents.process_id
      AND pc.user_id = auth.uid()
      AND pc.status = 'accepted'
    )
  );

-- Política para upload de documentos por colaboradores
CREATE POLICY "Collaborators can upload documents with editor permission"
  ON process_documents FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.uid() = user_id OR
    EXISTS (
      SELECT 1 FROM license_processes lp
      JOIN process_collaborators pc ON lp.id = pc.process_id
      WHERE lp.id = process_documents.process_id
      AND pc.user_id = auth.uid()
      AND pc.status = 'accepted'
      AND pc.permission_level IN ('editor', 'admin')
    )
  );

-- Função para criar perfil automaticamente
CREATE OR REPLACE FUNCTION create_user_profile()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO user_profiles (user_id, name, email, role)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1)),
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'role', 'analista')
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger para criar perfil automaticamente
DROP TRIGGER IF EXISTS create_user_profile_trigger ON auth.users;
CREATE TRIGGER create_user_profile_trigger
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION create_user_profile();

-- Função para log de atividades
CREATE OR REPLACE FUNCTION log_activity(
  p_process_id uuid,
  p_action text,
  p_description text DEFAULT NULL,
  p_metadata jsonb DEFAULT NULL
)
RETURNS void AS $$
BEGIN
  INSERT INTO activity_logs (process_id, user_id, action, description, metadata)
  VALUES (p_process_id, auth.uid(), p_action, p_description, p_metadata);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger para log automático de mudanças em processos
CREATE OR REPLACE FUNCTION log_process_changes()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'UPDATE' THEN
    IF OLD.status != NEW.status THEN
      PERFORM log_activity(
        NEW.id,
        'status_changed',
        'Status alterado de ' || OLD.status || ' para ' || NEW.status,
        jsonb_build_object('old_status', OLD.status, 'new_status', NEW.status)
      );
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS log_process_changes_trigger ON license_processes;
CREATE TRIGGER log_process_changes_trigger
  AFTER UPDATE ON license_processes
  FOR EACH ROW
  EXECUTE FUNCTION log_process_changes();