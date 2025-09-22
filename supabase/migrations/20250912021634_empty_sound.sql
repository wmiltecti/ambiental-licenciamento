/*
  # Add user_id to process_documents table

  1. Changes
    - Add `user_id` column to `process_documents` table
    - Update existing records to set user_id from related process
    - Add RLS policy for DELETE operations
    - Update existing policies to include user_id checks

  2. Security
    - Enable RLS on `process_documents` table (already enabled)
    - Add DELETE policy for users to delete their own documents
    - Update existing policies to be more secure
*/

-- Add user_id column to process_documents table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'process_documents' AND column_name = 'user_id'
  ) THEN
    ALTER TABLE process_documents ADD COLUMN user_id uuid;
  END IF;
END $$;

-- Update existing records to set user_id from related license_processes
UPDATE process_documents 
SET user_id = lp.user_id 
FROM license_processes lp 
WHERE process_documents.process_id = lp.id 
AND process_documents.user_id IS NULL;

-- Make user_id NOT NULL after updating existing records
ALTER TABLE process_documents ALTER COLUMN user_id SET NOT NULL;

-- Drop existing policies to recreate them with user_id
DROP POLICY IF EXISTS "Users can create documents for their processes" ON process_documents;
DROP POLICY IF EXISTS "Users can view documents of their processes" ON process_documents;

-- Create new policies that use user_id directly
CREATE POLICY "Users can create their own documents"
  ON process_documents
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view their own documents"
  ON process_documents
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own documents"
  ON process_documents
  FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);