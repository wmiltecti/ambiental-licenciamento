/*
  # Core Database Schema for Environmental Licensing System

  1. New Tables
    - `companies` - Company information
    - `license_processes` - Main licensing processes table
    - `process_documents` - Documents attached to processes
    - `process_movements` - Process status changes and movements
    - `user_profiles` - Extended user profile information
    - `process_comments` - Comments on processes

  2. Security
    - Enable RLS on all tables
    - Add policies for authenticated users
    - Ensure proper access control

  3. Core Functionality
    - Basic CRUD operations for all entities
    - User authentication and profiles
    - Document management
    - Process tracking
*/

-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Companies table
CREATE TABLE IF NOT EXISTS companies (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  name text NOT NULL,
  cnpj text NOT NULL,
  email text NOT NULL,
  phone text,
  address text,
  city text NOT NULL,
  state text NOT NULL,
  cep text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- License processes table
CREATE TABLE IF NOT EXISTS license_processes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  company_id uuid REFERENCES companies(id) ON DELETE CASCADE,
  protocol_number text UNIQUE DEFAULT ('PROC-' || extract(year from now()) || '-' || lpad(nextval('protocol_sequence')::text, 6, '0')),
  license_type text NOT NULL CHECK (license_type IN ('LP', 'LI', 'LO')),
  activity text NOT NULL,
  municipality text NOT NULL,
  project_description text,
  status text DEFAULT 'submitted' CHECK (status IN ('submitted', 'em_analise', 'documentacao_pendente', 'aprovado', 'rejeitado')),
  analyst_name text,
  analyst_organ text,
  submit_date date DEFAULT CURRENT_DATE,
  expected_date date,
  approval_date date,
  progress integer DEFAULT 0 CHECK (progress >= 0 AND progress <= 100),
  coordinates text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create sequence for protocol numbers
CREATE SEQUENCE IF NOT EXISTS protocol_sequence START 1;

-- Process documents table
CREATE TABLE IF NOT EXISTS process_documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  process_id uuid NOT NULL REFERENCES license_processes(id) ON DELETE CASCADE,
  name text NOT NULL,
  file_path text,
  file_size integer,
  file_type text,
  uploaded_at timestamptz DEFAULT now()
);

-- Process movements table
CREATE TABLE IF NOT EXISTS process_movements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  process_id uuid REFERENCES license_processes(id) ON DELETE CASCADE,
  status text NOT NULL,
  description text,
  analyst_name text,
  movement_date timestamptz DEFAULT now()
);

-- User profiles table
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

-- Process comments table
CREATE TABLE IF NOT EXISTS process_comments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  process_id uuid NOT NULL REFERENCES license_processes(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  comment text NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable RLS on all tables
ALTER TABLE companies ENABLE ROW LEVEL SECURITY;
ALTER TABLE license_processes ENABLE ROW LEVEL SECURITY;
ALTER TABLE process_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE process_movements ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE process_comments ENABLE ROW LEVEL SECURITY;

-- RLS Policies for companies
CREATE POLICY "Users can manage their own companies" ON companies
  FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- RLS Policies for license_processes
CREATE POLICY "Users can manage their own processes" ON license_processes
  FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- RLS Policies for process_documents
CREATE POLICY "Users can manage their own documents" ON process_documents
  FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- RLS Policies for process_movements
CREATE POLICY "Users can view movements of their processes" ON process_movements
  FOR SELECT TO authenticated USING (
    EXISTS (SELECT 1 FROM license_processes WHERE id = process_movements.process_id AND user_id = auth.uid())
  );

CREATE POLICY "Users can insert movements for their processes" ON process_movements
  FOR INSERT TO authenticated WITH CHECK (
    EXISTS (SELECT 1 FROM license_processes WHERE id = process_movements.process_id AND user_id = auth.uid())
  );

-- RLS Policies for user_profiles
CREATE POLICY "Users can manage their own profile" ON user_profiles
  FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- RLS Policies for process_comments
CREATE POLICY "Users can view comments on their processes" ON process_comments
  FOR SELECT TO authenticated USING (
    EXISTS (SELECT 1 FROM license_processes WHERE id = process_comments.process_id AND user_id = auth.uid())
  );

CREATE POLICY "Users can create comments on their processes" ON process_comments
  FOR INSERT TO authenticated WITH CHECK (
    auth.uid() = user_id AND
    EXISTS (SELECT 1 FROM license_processes WHERE id = process_comments.process_id AND user_id = auth.uid())
  );

CREATE POLICY "Users can update their own comments" ON process_comments
  FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own comments" ON process_comments
  FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- Function to create user profile automatically
CREATE OR REPLACE FUNCTION create_user_profile()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.user_profiles (user_id, name, email, role)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1)),
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'role', 'analista')
  );
  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    -- Log error but don't fail the user creation
    RAISE WARNING 'Error creating user profile: %', SQLERRM;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to create user profile automatically
DROP TRIGGER IF EXISTS create_user_profile_trigger ON auth.users;
CREATE TRIGGER create_user_profile_trigger
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION create_user_profile();

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers for updated_at
CREATE TRIGGER update_companies_updated_at BEFORE UPDATE ON companies FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_license_processes_updated_at BEFORE UPDATE ON license_processes FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_user_profiles_updated_at BEFORE UPDATE ON user_profiles FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_process_comments_updated_at BEFORE UPDATE ON process_comments FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_companies_user_id ON companies(user_id);
CREATE INDEX IF NOT EXISTS idx_license_processes_user_id ON license_processes(user_id);
CREATE INDEX IF NOT EXISTS idx_license_processes_company_id ON license_processes(company_id);
CREATE INDEX IF NOT EXISTS idx_license_processes_status ON license_processes(status);
CREATE INDEX IF NOT EXISTS idx_process_documents_process_id ON process_documents(process_id);
CREATE INDEX IF NOT EXISTS idx_process_documents_user_id ON process_documents(user_id);
CREATE INDEX IF NOT EXISTS idx_process_movements_process_id ON process_movements(process_id);
CREATE INDEX IF NOT EXISTS idx_user_profiles_user_id ON user_profiles(user_id);
CREATE INDEX IF NOT EXISTS idx_process_comments_process_id ON process_comments(process_id);
CREATE INDEX IF NOT EXISTS idx_process_comments_user_id ON process_comments(user_id);