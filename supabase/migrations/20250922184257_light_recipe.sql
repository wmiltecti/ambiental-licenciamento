/*
  # Create core schema for Environmental Licensing System

  1. New Tables
    - `companies` - Company information and registration
    - `license_processes` - Main licensing processes table
    - `process_documents` - Document attachments for processes
    - `process_collaborators` - User collaboration on processes
    - `process_activities` - Activity log for processes
    - `process_comments` - Comments and notes on processes

  2. Security
    - Enable RLS on all tables
    - Add policies for authenticated users to manage their own data
    - Add policies for collaboration features

  3. Functions and Triggers
    - Auto-generate protocol numbers
    - Update timestamps automatically
*/

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Companies table
CREATE TABLE IF NOT EXISTS companies (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  name text NOT NULL,
  cnpj text,
  email text NOT NULL,
  phone text,
  address text,
  city text,
  state text,
  postal_code text,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- License processes table
CREATE TABLE IF NOT EXISTS license_processes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  company_id uuid REFERENCES companies(id) ON DELETE CASCADE NOT NULL,
  protocol_number text UNIQUE,
  license_type text NOT NULL CHECK (license_type IN ('LP', 'LI', 'LO')),
  activity text NOT NULL,
  municipality text,
  project_description text,
  status text DEFAULT 'submitted' CHECK (status IN ('submitted', 'em_analise', 'documentacao_pendente', 'aprovado', 'rejeitado')),
  progress integer DEFAULT 0 CHECK (progress >= 0 AND progress <= 100),
  analyst_name text,
  submit_date date DEFAULT CURRENT_DATE,
  expected_date date,
  approval_date date,
  expiry_date date,
  notes text,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Process documents table
CREATE TABLE IF NOT EXISTS process_documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  process_id uuid REFERENCES license_processes(id) ON DELETE CASCADE NOT NULL,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  file_name text NOT NULL,
  file_path text NOT NULL,
  file_size integer,
  file_type text,
  document_type text,
  description text,
  is_required boolean DEFAULT false,
  uploaded_at timestamptz DEFAULT now()
);

-- Process collaborators table
CREATE TABLE IF NOT EXISTS process_collaborators (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  process_id uuid REFERENCES license_processes(id) ON DELETE CASCADE NOT NULL,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  invited_by uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  permission_level text DEFAULT 'viewer' CHECK (permission_level IN ('viewer', 'editor', 'admin')),
  status text DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'rejected')),
  invited_at timestamptz DEFAULT now(),
  responded_at timestamptz,
  UNIQUE(process_id, user_id)
);

-- Process activities table
CREATE TABLE IF NOT EXISTS process_activities (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  process_id uuid REFERENCES license_processes(id) ON DELETE CASCADE NOT NULL,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  activity_type text NOT NULL,
  description text NOT NULL,
  metadata jsonb,
  created_at timestamptz DEFAULT now()
);

-- Process comments table
CREATE TABLE IF NOT EXISTS process_comments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  process_id uuid REFERENCES license_processes(id) ON DELETE CASCADE NOT NULL,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  content text NOT NULL,
  is_internal boolean DEFAULT false,
  parent_id uuid REFERENCES process_comments(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Function to generate protocol numbers
CREATE OR REPLACE FUNCTION generate_protocol_number()
RETURNS text AS $$
DECLARE
  year_suffix text;
  sequence_num integer;
  protocol text;
BEGIN
  year_suffix := EXTRACT(YEAR FROM CURRENT_DATE)::text;
  
  -- Get next sequence number for this year
  SELECT COALESCE(MAX(CAST(SUBSTRING(protocol_number FROM '^(\d+)') AS integer)), 0) + 1
  INTO sequence_num
  FROM license_processes
  WHERE protocol_number ~ ('^[0-9]+/' || year_suffix || '$');
  
  protocol := LPAD(sequence_num::text, 6, '0') || '/' || year_suffix;
  
  RETURN protocol;
END;
$$ LANGUAGE plpgsql;

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers for updated_at
CREATE TRIGGER update_companies_updated_at
  BEFORE UPDATE ON companies
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_license_processes_updated_at
  BEFORE UPDATE ON license_processes
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_process_comments_updated_at
  BEFORE UPDATE ON process_comments
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Trigger to auto-generate protocol numbers
CREATE OR REPLACE FUNCTION set_protocol_number()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.protocol_number IS NULL THEN
    NEW.protocol_number := generate_protocol_number();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_license_process_protocol
  BEFORE INSERT ON license_processes
  FOR EACH ROW EXECUTE FUNCTION set_protocol_number();

-- Enable Row Level Security
ALTER TABLE companies ENABLE ROW LEVEL SECURITY;
ALTER TABLE license_processes ENABLE ROW LEVEL SECURITY;
ALTER TABLE process_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE process_collaborators ENABLE ROW LEVEL SECURITY;
ALTER TABLE process_activities ENABLE ROW LEVEL SECURITY;
ALTER TABLE process_comments ENABLE ROW LEVEL SECURITY;

-- RLS Policies for companies
CREATE POLICY "Users can manage their own companies"
  ON companies
  FOR ALL
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- RLS Policies for license_processes
CREATE POLICY "Users can manage their own processes"
  ON license_processes
  FOR ALL
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Collaborators can view processes"
  ON license_processes
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM process_collaborators
      WHERE process_collaborators.process_id = license_processes.id
      AND process_collaborators.user_id = auth.uid()
      AND process_collaborators.status = 'accepted'
    )
  );

CREATE POLICY "Collaborators can update processes"
  ON license_processes
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM process_collaborators
      WHERE process_collaborators.process_id = license_processes.id
      AND process_collaborators.user_id = auth.uid()
      AND process_collaborators.status = 'accepted'
      AND process_collaborators.permission_level IN ('editor', 'admin')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM process_collaborators
      WHERE process_collaborators.process_id = license_processes.id
      AND process_collaborators.user_id = auth.uid()
      AND process_collaborators.status = 'accepted'
      AND process_collaborators.permission_level IN ('editor', 'admin')
    )
  );

-- RLS Policies for process_documents
CREATE POLICY "Users can manage documents for their processes"
  ON process_documents
  FOR ALL
  TO authenticated
  USING (
    auth.uid() = user_id OR
    EXISTS (
      SELECT 1 FROM license_processes
      WHERE license_processes.id = process_documents.process_id
      AND license_processes.user_id = auth.uid()
    ) OR
    EXISTS (
      SELECT 1 FROM process_collaborators
      WHERE process_collaborators.process_id = process_documents.process_id
      AND process_collaborators.user_id = auth.uid()
      AND process_collaborators.status = 'accepted'
    )
  )
  WITH CHECK (
    auth.uid() = user_id OR
    EXISTS (
      SELECT 1 FROM license_processes
      WHERE license_processes.id = process_documents.process_id
      AND license_processes.user_id = auth.uid()
    ) OR
    EXISTS (
      SELECT 1 FROM process_collaborators
      WHERE process_collaborators.process_id = process_documents.process_id
      AND process_collaborators.user_id = auth.uid()
      AND process_collaborators.status = 'accepted'
      AND process_collaborators.permission_level IN ('editor', 'admin')
    )
  );

-- RLS Policies for process_collaborators
CREATE POLICY "Process owners can manage collaborators"
  ON process_collaborators
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM license_processes
      WHERE license_processes.id = process_collaborators.process_id
      AND license_processes.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM license_processes
      WHERE license_processes.id = process_collaborators.process_id
      AND license_processes.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can view their own collaborations"
  ON process_collaborators
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own collaboration status"
  ON process_collaborators
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- RLS Policies for process_activities
CREATE POLICY "Users can view activities for accessible processes"
  ON process_activities
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM license_processes
      WHERE license_processes.id = process_activities.process_id
      AND license_processes.user_id = auth.uid()
    ) OR
    EXISTS (
      SELECT 1 FROM process_collaborators
      WHERE process_collaborators.process_id = process_activities.process_id
      AND process_collaborators.user_id = auth.uid()
      AND process_collaborators.status = 'accepted'
    )
  );

CREATE POLICY "Users can create activities for accessible processes"
  ON process_activities
  FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.uid() = user_id AND (
      EXISTS (
        SELECT 1 FROM license_processes
        WHERE license_processes.id = process_activities.process_id
        AND license_processes.user_id = auth.uid()
      ) OR
      EXISTS (
        SELECT 1 FROM process_collaborators
        WHERE process_collaborators.process_id = process_activities.process_id
        AND process_collaborators.user_id = auth.uid()
        AND process_collaborators.status = 'accepted'
      )
    )
  );

-- RLS Policies for process_comments
CREATE POLICY "Users can manage comments for accessible processes"
  ON process_comments
  FOR ALL
  TO authenticated
  USING (
    auth.uid() = user_id OR
    EXISTS (
      SELECT 1 FROM license_processes
      WHERE license_processes.id = process_comments.process_id
      AND license_processes.user_id = auth.uid()
    ) OR
    EXISTS (
      SELECT 1 FROM process_collaborators
      WHERE process_collaborators.process_id = process_comments.process_id
      AND process_collaborators.user_id = auth.uid()
      AND process_collaborators.status = 'accepted'
    )
  )
  WITH CHECK (
    auth.uid() = user_id AND (
      EXISTS (
        SELECT 1 FROM license_processes
        WHERE license_processes.id = process_comments.process_id
        AND license_processes.user_id = auth.uid()
      ) OR
      EXISTS (
        SELECT 1 FROM process_collaborators
        WHERE process_collaborators.process_id = process_comments.process_id
        AND process_collaborators.user_id = auth.uid()
        AND process_collaborators.status = 'accepted'
      )
    )
  );

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_companies_user_id ON companies(user_id);
CREATE INDEX IF NOT EXISTS idx_license_processes_user_id ON license_processes(user_id);
CREATE INDEX IF NOT EXISTS idx_license_processes_company_id ON license_processes(company_id);
CREATE INDEX IF NOT EXISTS idx_license_processes_status ON license_processes(status);
CREATE INDEX IF NOT EXISTS idx_license_processes_protocol ON license_processes(protocol_number);
CREATE INDEX IF NOT EXISTS idx_process_documents_process_id ON process_documents(process_id);
CREATE INDEX IF NOT EXISTS idx_process_collaborators_process_id ON process_collaborators(process_id);
CREATE INDEX IF NOT EXISTS idx_process_collaborators_user_id ON process_collaborators(user_id);
CREATE INDEX IF NOT EXISTS idx_process_activities_process_id ON process_activities(process_id);
CREATE INDEX IF NOT EXISTS idx_process_comments_process_id ON process_comments(process_id);