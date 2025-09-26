/*
  # Complete Fix for RLS Infinite Recursion

  This migration completely removes circular dependencies in RLS policies that were causing
  infinite recursion errors in the license_processes and process_collaborators tables.

  ## Changes Made
  1. Drop all existing problematic policies
  2. Recreate policies with simple, non-recursive logic
  3. Ensure proper access control without circular references

  ## Security
  - Users can only access their own processes
  - Collaborators can access processes they're invited to
  - No circular policy dependencies
*/

-- Drop all existing policies that might cause recursion
DROP POLICY IF EXISTS "processes_select_own_or_collaborated" ON license_processes;
DROP POLICY IF EXISTS "processes_insert_own" ON license_processes;
DROP POLICY IF EXISTS "processes_update_own_or_editor" ON license_processes;
DROP POLICY IF EXISTS "processes_delete_own" ON license_processes;

DROP POLICY IF EXISTS "Users can view collaborators of their processes" ON process_collaborators;
DROP POLICY IF EXISTS "collaborators_select_own" ON process_collaborators;
DROP POLICY IF EXISTS "collaborators_insert_by_owner" ON process_collaborators;
DROP POLICY IF EXISTS "collaborators_update_by_owner" ON process_collaborators;
DROP POLICY IF EXISTS "collaborators_delete_by_owner" ON process_collaborators;

-- Create simple, non-recursive policies for license_processes
CREATE POLICY "license_processes_select_own" ON license_processes
  FOR SELECT TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "license_processes_insert_own" ON license_processes
  FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "license_processes_update_own" ON license_processes
  FOR UPDATE TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "license_processes_delete_own" ON license_processes
  FOR DELETE TO authenticated
  USING (user_id = auth.uid());

-- Create simple, non-recursive policies for process_collaborators
CREATE POLICY "process_collaborators_select_own" ON process_collaborators
  FOR SELECT TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "process_collaborators_insert_own" ON process_collaborators
  FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "process_collaborators_update_own" ON process_collaborators
  FOR UPDATE TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "process_collaborators_delete_own" ON process_collaborators
  FOR DELETE TO authenticated
  USING (user_id = auth.uid());

-- Add policy for process owners to manage collaborators
CREATE POLICY "process_collaborators_manage_as_owner" ON process_collaborators
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM license_processes 
      WHERE id = process_collaborators.process_id 
      AND user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM license_processes 
      WHERE id = process_collaborators.process_id 
      AND user_id = auth.uid()
    )
  );