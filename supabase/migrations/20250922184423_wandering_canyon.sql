/*
  # Fix RLS Infinite Recursion

  This migration fixes the infinite recursion detected in policies for:
  - license_processes table
  - process_collaborators table
  
  The issue occurs when policies reference each other in a circular manner.
  This script removes problematic policies and creates simple, non-recursive ones.
*/

-- Remove problematic policies that cause infinite recursion
DROP POLICY IF EXISTS "processes_select_own_or_collaborated" ON license_processes;
DROP POLICY IF EXISTS "processes_update_own_or_editor" ON license_processes;
DROP POLICY IF EXISTS "Users can view collaborators of their processes" ON process_collaborators;
DROP POLICY IF EXISTS "collaborators_insert_by_owner" ON process_collaborators;
DROP POLICY IF EXISTS "Collaborators can view processes" ON license_processes;
DROP POLICY IF EXISTS "Collaborators can update processes" ON license_processes;

-- Create simple, non-recursive policies for license_processes
CREATE POLICY "Users can manage their own processes" ON license_processes
  FOR ALL TO authenticated USING (uid() = user_id);

-- Create simple, non-recursive policies for process_collaborators
CREATE POLICY "Users can view their own collaborations" ON process_collaborators
  FOR SELECT TO authenticated USING (uid() = user_id);

CREATE POLICY "Users can update their own collaboration status" ON process_collaborators
  FOR UPDATE TO authenticated USING (uid() = user_id);

CREATE POLICY "Process owners can manage collaborators" ON process_collaborators
  FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM license_processes WHERE id = process_collaborators.process_id AND user_id = uid()));