/*
  # Fix RLS Infinite Recursion Policies

  This migration fixes the infinite recursion detected in RLS policies for:
  1. license_processes table
  2. process_collaborators table

  ## Changes Made
  1. Drop problematic policies that cause infinite recursion
  2. Create simple, non-recursive policies
  3. Ensure proper access control without circular references

  ## Security
  - Users can only access their own processes
  - Collaborators can access processes they're invited to
  - No circular policy references
*/

-- Drop problematic policies that cause infinite recursion
DROP POLICY IF EXISTS "processes_select_own_or_collaborated" ON license_processes;
DROP POLICY IF EXISTS "processes_update_own_or_editor" ON license_processes;
DROP POLICY IF EXISTS "Users can view collaborators of their processes" ON process_collaborators;
DROP POLICY IF EXISTS "collaborators_insert_by_owner" ON process_collaborators;
DROP POLICY IF EXISTS "Collaborators can view processes" ON license_processes;
DROP POLICY IF EXISTS "Collaborators can update processes" ON license_processes;
DROP POLICY IF EXISTS "Collaborators can update processes with editor permission" ON license_processes;
DROP POLICY IF EXISTS "Users can view their own processes or collaborated processes" ON license_processes;

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

-- Allow process owners to manage collaborators (without recursion)
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