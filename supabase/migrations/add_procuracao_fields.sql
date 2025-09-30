/*
  # Add Procuration File Fields to Process Collaborators

  1. Schema Changes
    - Add procuracao_file_id (text) - unique identifier for the file
    - Add procuracao_storage_path (text) - full storage path in bucket
    - Add procuracao_file_metadata (jsonb) - file metadata (size, type, etc.)

  2. Indexes
    - Add index on procuracao_file_id for faster lookups

  ## Notes
  - Fields are nullable to support existing records
  - Metadata stored as JSONB for flexibility
*/

-- Add procuracao file fields to process_collaborators
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'process_collaborators' AND column_name = 'procuracao_file_id'
  ) THEN
    ALTER TABLE process_collaborators ADD COLUMN procuracao_file_id text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'process_collaborators' AND column_name = 'procuracao_storage_path'
  ) THEN
    ALTER TABLE process_collaborators ADD COLUMN procuracao_storage_path text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'process_collaborators' AND column_name = 'procuracao_file_metadata'
  ) THEN
    ALTER TABLE process_collaborators ADD COLUMN procuracao_file_metadata jsonb;
  END IF;
END $$;

-- Add indexes for better performance
CREATE INDEX IF NOT EXISTS idx_process_collaborators_procuracao
ON process_collaborators(procuracao_file_id)
WHERE procuracao_file_id IS NOT NULL;

-- Add comment to explain the columns
COMMENT ON COLUMN process_collaborators.procuracao_file_id IS 'Unique identifier for the procuration file upload';
COMMENT ON COLUMN process_collaborators.procuracao_storage_path IS 'Full storage path in the docs bucket';
COMMENT ON COLUMN process_collaborators.procuracao_file_metadata IS 'File metadata including size, type, upload date, etc.';
