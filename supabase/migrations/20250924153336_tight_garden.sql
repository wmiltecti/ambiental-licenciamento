/*
  # User Profiles and Collaboration System

  1. New Tables
    - `user_profiles` - User profile information with name, role, organization
    - `process_collaborators` - Collaboration relationships between users and processes
    - `collaboration_invites` - Pending invitations for collaboration
    - `activity_logs` - Activity tracking for processes

  2. Security
    - Enable RLS on all new tables
    - Add policies for user access control
    - Update existing policies for collaboration support

  3. Functions and Triggers
    - Auto-create user profiles on signup
    - Log process changes automatically
    - Activity logging function
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

-- Políticas para user_profiles (com verificação de existência)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'user_profiles' 
    AND policyname = 'Users can view their own profile'
  ) THEN
    CREATE POLICY "Users can view their own profile"
      ON user_profiles FOR SELECT
      TO authenticated
      USING (auth.uid() = user_id);
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'user_profiles' 
    AND policyname = 'Users can update their own profile'
  ) THEN
    CREATE POLICY "Users can update their own profile"
      ON user_profiles FOR UPDATE
      TO authenticated
      USING (auth.uid() = user_id);
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'user_profiles' 
    AND policyname = 'Users can insert their own profile'
  ) THEN
    CREATE POLICY "Users can insert their own profile"
      ON user_profiles FOR INSERT
      TO authenticated
      WITH CHECK (auth.uid() = user_id);
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'user_profiles' 
    AND policyname = 'System can create user profiles'
  ) THEN
    CREATE POLICY "System can create user profiles"
      ON user_profiles FOR INSERT
      TO service_role
      WITH CHECK (true);
  END IF;
END $$;

-- Políticas para process_collaborators (com verificação de existência)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'process_collaborators' 
    AND policyname = 'Process owners can manage collaborators'
  ) THEN
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
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'process_collaborators' 
    AND policyname = 'Collaborators can view their own collaboration'
  ) THEN
    CREATE POLICY "Collaborators can view their own collaboration"
      ON process_collaborators FOR SELECT
      TO authenticated
      USING (auth.uid() = user_id);
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'process_collaborators' 
    AND policyname = 'Users can update their own collaboration status'
  ) THEN
    CREATE POLICY "Users can update their own collaboration status"
      ON process_collaborators FOR UPDATE
      TO authenticated
      USING (auth.uid() = user_id)
      WITH CHECK (auth.uid() = user_id);
  END IF;
END $$;

-- Políticas para collaboration_invites (com verificação de existência)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'collaboration_invites' 
    AND policyname = 'Process owners can manage invites'
  ) THEN
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
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'collaboration_invites' 
    AND policyname = 'Invited users can view their invites'
  ) THEN
    CREATE POLICY "Invited users can view their invites"
      ON collaboration_invites FOR SELECT
      TO authenticated
      USING (
        invited_email = (
          SELECT email FROM auth.users WHERE id = auth.uid()
        )
      );
  END IF;
END $$;

-- Políticas para activity_logs (com verificação de existência)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'activity_logs' 
    AND policyname = 'Process participants can view activity logs'
  ) THEN
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
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'activity_logs' 
    AND policyname = 'Authenticated users can insert activity logs'
  ) THEN
    CREATE POLICY "Authenticated users can insert activity logs"
      ON activity_logs FOR INSERT
      TO authenticated
      WITH CHECK (auth.uid() = user_id);
  END IF;
END $$;

-- Atualizar políticas de license_processes para incluir colaboradores (com verificação)
DO $$
BEGIN
  -- Drop existing policy if it exists
  IF EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'license_processes' 
    AND policyname = 'Users can view their own processes'
  ) THEN
    DROP POLICY "Users can view their own processes" ON license_processes;
  END IF;
  
  -- Create new policy if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'license_processes' 
    AND policyname = 'Users can view their own processes or collaborated processes'
  ) THEN
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
  END IF;
END $$;

-- Política para edição por colaboradores (com verificação)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'license_processes' 
    AND policyname = 'Collaborators can update processes with editor permission'
  ) THEN
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
  END IF;
END $$;

-- Atualizar políticas de process_documents para incluir colaboradores (com verificação)
DO $$
BEGIN
  -- Drop existing policy if it exists
  IF EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'process_documents' 
    AND policyname = 'Users can view their own documents'
  ) THEN
    DROP POLICY "Users can view their own documents" ON process_documents;
  END IF;
  
  -- Create new policy if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'process_documents' 
    AND policyname = 'Users can view documents of their processes or collaborated processes'
  ) THEN
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
  END IF;
END $$;

-- Política para upload de documentos por colaboradores (com verificação)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'process_documents' 
    AND policyname = 'Collaborators can upload documents with editor permission'
  ) THEN
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
  END IF;
END $$;

-- Função para criar perfil automaticamente (com verificação)
CREATE OR REPLACE FUNCTION create_user_profile()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO user_profiles (user_id, name, email, role)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1)),
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'role', 'analista')
  )
  ON CONFLICT (user_id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger para criar perfil automaticamente (com verificação)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger 
    WHERE tgname = 'create_user_profile_trigger'
  ) THEN
    CREATE TRIGGER create_user_profile_trigger
      AFTER INSERT ON auth.users
      FOR EACH ROW
      EXECUTE FUNCTION create_user_profile();
  END IF;
END $$;

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

-- Trigger para log automático de mudanças em processos (com verificação)
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

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger 
    WHERE tgname = 'log_process_changes_trigger'
  ) THEN
    CREATE TRIGGER log_process_changes_trigger
      AFTER UPDATE ON license_processes
      FOR EACH ROW
      EXECUTE FUNCTION log_process_changes();
  END IF;
END $$;

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_process_collaborators_process_id ON process_collaborators(process_id);
CREATE INDEX IF NOT EXISTS idx_process_collaborators_user_id ON process_collaborators(user_id);
CREATE INDEX IF NOT EXISTS idx_collaboration_invites_email ON collaboration_invites(invited_email);
CREATE INDEX IF NOT EXISTS idx_process_comments_process_id ON process_comments(process_id);
CREATE INDEX IF NOT EXISTS idx_process_comments_user_id ON process_comments(user_id);
CREATE INDEX IF NOT EXISTS idx_process_comments_created_at ON process_comments(created_at DESC);