/*
  # Add INSERT policy for process_movements table

  1. Security
    - Enable authenticated users to insert process movements (comments)
    - Only allow if user owns the process or is an accepted editor/admin collaborator
    - Maintains data security while enabling comment functionality

  2. Changes
    - Add INSERT policy for process_movements table
    - Allow process owners to add comments
    - Allow accepted collaborators with editor/admin permissions to add comments
*/

-- Enable RLS for process_movements if not already enabled
ALTER TABLE process_movements ENABLE ROW LEVEL SECURITY;

-- Policy to allow authenticated users to insert movements/comments
-- if they own the process or are an editor/admin collaborator
CREATE POLICY "Authenticated users can insert process movements if owner or collaborator" ON process_movements
FOR INSERT TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM public.license_processes
    WHERE id = process_movements.process_id AND user_id = auth.uid()
  )
  OR
  EXISTS (
    SELECT 1
    FROM public.process_collaborators
    WHERE
      process_id = process_movements.process_id AND
      user_id = auth.uid() AND
      (permission_level = 'editor' OR permission_level = 'admin') AND
      status = 'accepted'
  )
);