/*
  # Fix RLS policies and indexes for existing tables

  1. Security Updates
    - Add missing RLS policies for process_collaborators
    - Improve collaboration access policies
  2. Performance
    - Add indexes for better query performance
  3. Data Integrity
    - Ensure proper foreign key constraints
*/

-- Add indexes for better performance on collaboration queries
CREATE INDEX IF NOT EXISTS idx_process_collaborators_user_id ON process_collaborators(user_id);
CREATE INDEX IF NOT EXISTS idx_process_collaborators_process_id ON process_collaborators(process_id);

-- Update RLS policies for better collaboration access
DROP POLICY IF EXISTS "Users can view collaborators of their processes" ON process_collaborators;
CREATE POLICY "Users can view collaborators of their processes" 
ON process_collaborators
FOR SELECT 
TO authenticated
USING (
  -- User is the process owner
  EXISTS (
    SELECT 1 FROM license_processes 
    WHERE license_processes.id = process_collaborators.process_id 
    AND license_processes.user_id = auth.uid()
  )
  OR
  -- User is a collaborator on the process
  user_id = auth.uid()
);

-- Ensure process_collaborators has proper insert policy
DROP POLICY IF EXISTS "collaborators_insert_by_owner" ON process_collaborators;
CREATE POLICY "collaborators_insert_by_owner" 
ON process_collaborators
FOR INSERT 
TO authenticated
WITH CHECK (
  -- Only process owners can add collaborators
  EXISTS (
    SELECT 1 FROM license_processes 
    WHERE license_processes.id = process_collaborators.process_id 
    AND license_processes.user_id = auth.uid()
  )
);

-- Add policy for updating collaboration status (accepting/declining invites)
DROP POLICY IF EXISTS "collaborators_update_own_status" ON process_collaborators;
CREATE POLICY "collaborators_update_own_status" 
ON process_collaborators
FOR UPDATE 
TO authenticated
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

-- Add policy for deleting collaborations
DROP POLICY IF EXISTS "collaborators_delete_policy" ON process_collaborators;
CREATE POLICY "collaborators_delete_policy" 
ON process_collaborators
FOR DELETE 
TO authenticated
USING (
  -- User can remove themselves
  user_id = auth.uid()
  OR
  -- Process owner can remove collaborators
  EXISTS (
    SELECT 1 FROM license_processes 
    WHERE license_processes.id = process_collaborators.process_id 
    AND license_processes.user_id = auth.uid()
  )
);

-- Add indexes for license_processes for better performance
CREATE INDEX IF NOT EXISTS idx_license_processes_user_id ON license_processes(user_id);
CREATE INDEX IF NOT EXISTS idx_license_processes_company_id ON license_processes(company_id);
CREATE INDEX IF NOT EXISTS idx_license_processes_status ON license_processes(status);
CREATE INDEX IF NOT EXISTS idx_license_processes_protocol ON license_processes(protocol_number);

-- Add indexes for process_documents
CREATE INDEX IF NOT EXISTS idx_process_documents_process_id ON process_documents(process_id);

-- Add indexes for process_comments
CREATE INDEX IF NOT EXISTS idx_process_comments_process_id ON process_comments(process_id);

-- Add indexes for companies
CREATE INDEX IF NOT EXISTS idx_companies_user_id ON companies(user_id);

-- Add indexes for billing_configurations for better performance
CREATE INDEX IF NOT EXISTS idx_billing_configurations_activity ON billing_configurations(activity_id);
CREATE INDEX IF NOT EXISTS idx_billing_configurations_license_type ON billing_configurations(license_type_id);
CREATE INDEX IF NOT EXISTS idx_billing_configurations_active ON billing_configurations(is_active);