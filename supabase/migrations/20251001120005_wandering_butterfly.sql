/*
  # Fix collaboration RLS policies

  1. Security Updates
    - Enable RLS on collaboration_invites table
    - Add proper policies for collaboration_invites
    - Fix existing policies to avoid permission issues

  2. Policy Changes
    - Allow users to view their own invites by email
    - Allow process owners to manage invites for their processes
    - Ensure proper access control without circular dependencies
*/

-- Enable RLS on collaboration_invites if not already enabled
ALTER TABLE collaboration_invites ENABLE ROW LEVEL SECURITY;

-- Drop existing problematic policies
DROP POLICY IF EXISTS "Authenticated users can view their own invites" ON collaboration_invites;
DROP POLICY IF EXISTS "Invited users can view their invites" ON collaboration_invites;
DROP POLICY IF EXISTS "Process owners can manage invites" ON collaboration_invites;

-- Create new, simplified policies for collaboration_invites
CREATE POLICY "Users can view invites sent to their email"
  ON collaboration_invites
  FOR SELECT
  TO authenticated
  USING (invited_email = (SELECT email FROM auth.users WHERE id = auth.uid()));

CREATE POLICY "Process owners can manage their process invites"
  ON collaboration_invites
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM license_processes 
      WHERE license_processes.id = collaboration_invites.process_id 
      AND license_processes.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM license_processes 
      WHERE license_processes.id = collaboration_invites.process_id 
      AND license_processes.user_id = auth.uid()
    )
  );

-- Ensure activity_logs has proper policies
DROP POLICY IF EXISTS "Authenticated users can insert activity logs" ON activity_logs;
DROP POLICY IF EXISTS "Process participants can view activity logs" ON activity_logs;

CREATE POLICY "Users can insert activity logs for accessible processes"
  ON activity_logs
  FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.uid() = user_id AND (
      EXISTS (
        SELECT 1 FROM license_processes 
        WHERE license_processes.id = activity_logs.process_id 
        AND license_processes.user_id = auth.uid()
      ) OR
      EXISTS (
        SELECT 1 FROM process_collaborators 
        WHERE process_collaborators.process_id = activity_logs.process_id 
        AND process_collaborators.user_id = auth.uid() 
        AND process_collaborators.status = 'accepted'
      )
    )
  );

CREATE POLICY "Users can view activity logs for accessible processes"
  ON activity_logs
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM license_processes 
      WHERE license_processes.id = activity_logs.process_id 
      AND license_processes.user_id = auth.uid()
    ) OR
    EXISTS (
      SELECT 1 FROM process_collaborators 
      WHERE process_collaborators.process_id = activity_logs.process_id 
      AND process_collaborators.user_id = auth.uid() 
      AND process_collaborators.status = 'accepted'
    )
  );