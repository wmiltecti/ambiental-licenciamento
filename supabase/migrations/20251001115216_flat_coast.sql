/*
  # Fix All RLS Infinite Recursion Errors

  This migration completely removes all problematic RLS policies that cause infinite recursion
  and replaces them with simple, non-recursive policies.

  ## Changes Made
  1. Drop all existing policies on license_processes and process_collaborators
  2. Create new simple policies without circular references
  3. Ensure proper access control without recursion

  ## Security
  - Users can only access their own processes
  - Process owners can manage collaborators
  - Collaborators can access processes based on their permission level
*/

-- First, drop ALL existing policies to start fresh
DROP POLICY IF EXISTS "Users can manage their own processes" ON license_processes;
DROP POLICY IF EXISTS "Users can view their own processes or collaborated processes" ON license_processes;
DROP POLICY IF EXISTS "Collaborators can view processes" ON license_processes;
DROP POLICY IF EXISTS "Collaborators can update processes" ON license_processes;
DROP POLICY IF EXISTS "Collaborators can update processes with editor permission" ON license_processes;
DROP POLICY IF EXISTS "license_processes_select_own" ON license_processes;
DROP POLICY IF EXISTS "license_processes_insert_own" ON license_processes;
DROP POLICY IF EXISTS "license_processes_update_own" ON license_processes;
DROP POLICY IF EXISTS "license_processes_delete_own" ON license_processes;
DROP POLICY IF EXISTS "processes_select_own_or_collaborated" ON license_processes;
DROP POLICY IF EXISTS "processes_update_own_or_editor" ON license_processes;

-- Drop all process_collaborators policies
DROP POLICY IF EXISTS "Collaborators can view their own collaboration" ON process_collaborators;
DROP POLICY IF EXISTS "Process owners can manage collaborators" ON process_collaborators;
DROP POLICY IF EXISTS "Users can update their own collaboration status" ON process_collaborators;
DROP POLICY IF EXISTS "Users can view collaborators of their processes" ON process_collaborators;
DROP POLICY IF EXISTS "Users can view their own collaborations" ON process_collaborators;
DROP POLICY IF EXISTS "collaborators_delete_by_owner" ON process_collaborators;
DROP POLICY IF EXISTS "collaborators_delete_policy" ON process_collaborators;
DROP POLICY IF EXISTS "collaborators_insert_by_owner" ON process_collaborators;
DROP POLICY IF EXISTS "collaborators_update_by_owner_or_self" ON process_collaborators;
DROP POLICY IF EXISTS "collaborators_update_own_status" ON process_collaborators;
DROP POLICY IF EXISTS "process_collaborators_delete_own" ON process_collaborators;
DROP POLICY IF EXISTS "process_collaborators_insert_own" ON process_collaborators;
DROP POLICY IF EXISTS "process_collaborators_manage_as_owner" ON process_collaborators;
DROP POLICY IF EXISTS "process_collaborators_select_own" ON process_collaborators;
DROP POLICY IF EXISTS "process_collaborators_update_own" ON process_collaborators;

-- Create simple, non-recursive policies for license_processes
CREATE POLICY "license_processes_owner_full_access" ON license_processes
  FOR ALL TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Create simple, non-recursive policies for process_collaborators
CREATE POLICY "process_collaborators_owner_manages" ON process_collaborators
  FOR ALL TO authenticated
  USING (
    invited_by = auth.uid() OR 
    user_id = auth.uid()
  )
  WITH CHECK (
    invited_by = auth.uid() OR 
    user_id = auth.uid()
  );

-- Allow collaborators to view processes they have access to (separate policy to avoid recursion)
CREATE POLICY "license_processes_collaborator_view" ON license_processes
  FOR SELECT TO authenticated
  USING (
    user_id = auth.uid() OR
    id IN (
      SELECT process_id 
      FROM process_collaborators 
      WHERE user_id = auth.uid() 
      AND status = 'accepted'
    )
  );

-- Allow collaborators with editor/admin permissions to update processes
CREATE POLICY "license_processes_collaborator_edit" ON license_processes
  FOR UPDATE TO authenticated
  USING (
    user_id = auth.uid() OR
    id IN (
      SELECT process_id 
      FROM process_collaborators 
      WHERE user_id = auth.uid() 
      AND status = 'accepted' 
      AND permission_level IN ('editor', 'admin')
    )
  )
  WITH CHECK (
    user_id = auth.uid() OR
    id IN (
      SELECT process_id 
      FROM process_collaborators 
      WHERE user_id = auth.uid() 
      AND status = 'accepted' 
      AND permission_level IN ('editor', 'admin')
    )
  );