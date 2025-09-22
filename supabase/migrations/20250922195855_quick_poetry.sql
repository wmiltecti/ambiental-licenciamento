/*
  # Fix collaboration and RLS policies

  This migration fixes RLS policies and adds necessary indexes for the collaboration system.
  It only operates on existing tables to avoid reference errors.

  1. Updates
     - Improved RLS policies for process_collaborators
     - Added performance indexes
     - Fixed foreign key constraints

  2. Security
     - Enhanced RLS policies for collaboration access
     - Proper user permission checking
*/

-- Add missing indexes for better performance on collaboration queries
CREATE INDEX IF NOT EXISTS idx_process_collaborators_user_id ON process_collaborators(user_id);
CREATE INDEX IF NOT EXISTS idx_process_collaborators_process_id ON process_collaborators(process_id);

-- Ensure foreign key relationships exist for process_collaborators
DO $$
BEGIN
  -- Check if foreign key from process_collaborators to users exists
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'process_collaborators_user_id_fkey' 
    AND table_name = 'process_collaborators'
  ) THEN
    -- Add foreign key constraint if it doesn't exist
    ALTER TABLE process_collaborators 
    ADD CONSTRAINT process_collaborators_user_id_fkey 
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;
  END IF;
END $$;

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

-- Update policy for process_collaborators updates
DROP POLICY IF EXISTS "collaborators_update_by_owner_or_self" ON process_collaborators;
CREATE POLICY "collaborators_update_by_owner_or_self" 
ON process_collaborators
FOR UPDATE 
TO authenticated
USING (
  -- Process owner can update any collaborator
  EXISTS (
    SELECT 1 FROM license_processes 
    WHERE license_processes.id = process_collaborators.process_id 
    AND license_processes.user_id = auth.uid()
  )
  OR
  -- Users can update their own collaboration status
  user_id = auth.uid()
)
WITH CHECK (
  -- Same conditions for the updated row
  EXISTS (
    SELECT 1 FROM license_processes 
    WHERE license_processes.id = process_collaborators.process_id 
    AND license_processes.user_id = auth.uid()
  )
  OR
  user_id = auth.uid()
);

-- Add delete policy for process_collaborators
DROP POLICY IF EXISTS "collaborators_delete_by_owner" ON process_collaborators;
CREATE POLICY "collaborators_delete_by_owner" 
ON process_collaborators
FOR DELETE 
TO authenticated
USING (
  -- Only process owners can delete collaborators
  EXISTS (
    SELECT 1 FROM license_processes 
    WHERE license_processes.id = process_collaborators.process_id 
    AND license_processes.user_id = auth.uid()
  )
  OR
  -- Users can remove themselves
  user_id = auth.uid()
);