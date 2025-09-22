/*
  # Fix RLS Infinite Recursion

  1. Problem
    - Circular dependency between license_processes and process_collaborators policies
    - Both tables reference each other causing infinite recursion

  2. Solution
    - Drop existing problematic policies
    - Create simple, non-recursive policies
    - Ensure process_collaborators policy doesn't query license_processes
    - Allow license_processes policy to safely query process_collaborators

  3. Security
    - Maintain same access control logic
    - Users can only see their own processes or collaborated processes
    - Collaborators can only see their own collaboration entries
*/

-- Ensure RLS is enabled
ALTER TABLE public.license_processes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.process_collaborators ENABLE ROW LEVEL SECURITY;

-- Drop all existing policies that might cause recursion
DROP POLICY IF EXISTS "Users can view their own processes or collaborated processes" ON public.license_processes;
DROP POLICY IF EXISTS "Collaborators can update processes with editor permission" ON public.license_processes;
DROP POLICY IF EXISTS "Users can create their own processes" ON public.license_processes;
DROP POLICY IF EXISTS "Users can update their own processes" ON public.license_processes;
DROP POLICY IF EXISTS "Collaborators can view their own collaboration" ON public.process_collaborators;
DROP POLICY IF EXISTS "Process owners can manage collaborators" ON public.process_collaborators;

-- Create simple, non-recursive policy for process_collaborators first
-- This policy MUST NOT reference license_processes to avoid recursion
CREATE POLICY "collaborators_select_own" 
ON public.process_collaborators FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "collaborators_insert_by_owner" 
ON public.process_collaborators FOR INSERT
TO authenticated
WITH CHECK (
  -- Allow if the user is inserting their own collaboration
  auth.uid() = user_id OR
  -- Allow if the user owns the process (check directly without policy recursion)
  EXISTS (
    SELECT 1 FROM public.license_processes 
    WHERE id = process_id AND user_id = auth.uid()
  )
);

CREATE POLICY "collaborators_update_by_owner" 
ON public.process_collaborators FOR UPDATE
TO authenticated
USING (
  -- Allow if user owns the process
  EXISTS (
    SELECT 1 FROM public.license_processes 
    WHERE id = process_id AND user_id = auth.uid()
  )
);

CREATE POLICY "collaborators_delete_by_owner" 
ON public.process_collaborators FOR DELETE
TO authenticated
USING (
  -- Allow if user owns the process
  EXISTS (
    SELECT 1 FROM public.license_processes 
    WHERE id = process_id AND user_id = auth.uid()
  )
);

-- Now create policies for license_processes that can safely reference process_collaborators
CREATE POLICY "processes_select_own_or_collaborated" 
ON public.license_processes FOR SELECT
TO authenticated
USING (
  -- User owns the process
  auth.uid() = user_id OR
  -- User is an accepted collaborator (safe to query now)
  EXISTS (
    SELECT 1 FROM public.process_collaborators
    WHERE process_id = license_processes.id
      AND user_id = auth.uid()
      AND status = 'accepted'
  )
);

CREATE POLICY "processes_insert_own" 
ON public.license_processes FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "processes_update_own_or_editor" 
ON public.license_processes FOR UPDATE
TO authenticated
USING (
  -- User owns the process
  auth.uid() = user_id OR
  -- User is an editor/admin collaborator
  EXISTS (
    SELECT 1 FROM public.process_collaborators
    WHERE process_id = license_processes.id
      AND user_id = auth.uid()
      AND status = 'accepted'
      AND permission_level IN ('editor', 'admin')
  )
);

CREATE POLICY "processes_delete_own" 
ON public.license_processes FOR DELETE
TO authenticated
USING (auth.uid() = user_id);