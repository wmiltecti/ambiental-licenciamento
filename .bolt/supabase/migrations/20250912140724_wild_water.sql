/*
  # Fix collaboration permissions and relationships

  1. Security Updates
    - Add missing RLS policy for collaboration_invites
    - Fix user access to their own invites
    - Ensure proper foreign key relationships

  2. Table Updates
    - Verify all foreign key constraints exist
    - Add missing indexes for performance
*/

-- Add missing RLS policy for collaboration_invites
DROP POLICY IF EXISTS "Authenticated users can view their own invites" ON collaboration_invites;
CREATE POLICY "Authenticated users can view their own invites" 
ON collaboration_invites
FOR SELECT 
TO authenticated
USING (
  invited_email = (
    SELECT email FROM auth.users WHERE id = auth.uid()
  )
);

-- Ensure foreign key relationships exist
DO $$
BEGIN
  -- Check if foreign key from process_collaborators to user_profiles exists
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'process_collaborators_user_id_fkey' 
    AND table_name = 'process_collaborators'
  ) THEN
    -- Add foreign key constraint if it doesn't exist
    ALTER TABLE process_collaborators 
    ADD CONSTRAINT process_collaborators_user_id_fkey 
    FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
  END IF;
END $$;

-- Add index for better performance on collaboration queries
CREATE INDEX IF NOT EXISTS idx_process_collaborators_user_id ON process_collaborators(user_id);
CREATE INDEX IF NOT EXISTS idx_process_collaborators_process_id ON process_collaborators(process_id);
CREATE INDEX IF NOT EXISTS idx_collaboration_invites_email ON collaboration_invites(invited_email);

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