/*
  # Fix RLS Infinite Recursion Error

  This migration fixes the "infinite recursion detected in policy for relation license_processes" error
  by removing problematic RLS policies and creating simplified, non-recursive versions.

  1. Remove Problematic Policies
    - Drop policies that cause circular dependencies
    - Remove complex policies with subqueries that reference the same table

  2. Create Simple RLS Policies
    - Simple ownership-based policies for license_processes
    - Direct user_id checks without complex joins
    - Separate policies for process_collaborators management

  3. Security
    - Maintain data isolation between users
    - Ensure users can only access their own data
    - Allow collaboration features without recursion
*/

-- Remove policies that cause recursion
DROP POLICY IF EXISTS "processes_select_own_or_collaborated" ON license_processes;
DROP POLICY IF EXISTS "processes_update_own_or_editor" ON license_processes;
DROP POLICY IF EXISTS "Users can view collaborators of their processes" ON process_collaborators;
DROP POLICY IF EXISTS "collaborators_insert_by_owner" ON process_collaborators;

-- Create simple, non-recursive policies for license_processes
CREATE POLICY "license_processes_select_own" ON license_processes
  FOR SELECT TO authenticated USING (user_id = auth.uid());

CREATE POLICY "license_processes_insert_own" ON license_processes
  FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());

CREATE POLICY "license_processes_update_own" ON license_processes
  FOR UPDATE TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

CREATE POLICY "license_processes_delete_own" ON license_processes
  FOR DELETE TO authenticated USING (user_id = auth.uid());

-- Create simple policies for process_collaborators
CREATE POLICY "process_collaborators_select_own" ON process_collaborators
  FOR SELECT TO authenticated USING (user_id = auth.uid());

CREATE POLICY "process_collaborators_manage_as_owner" ON process_collaborators
  FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM license_processes WHERE id = process_collaborators.process_id AND user_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM license_processes WHERE id = process_collaborators.process_id AND user_id = auth.uid()));