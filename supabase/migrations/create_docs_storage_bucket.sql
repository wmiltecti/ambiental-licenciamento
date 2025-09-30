/*
  # Create Private 'docs' Storage Bucket with RLS Policies

  1. Storage Bucket
    - Creates 'docs' bucket (private)
    - File size limit: 50MB
    - Allowed MIME types: PDF, images, Word documents

  2. Storage Policies
    - Users can upload files to their own process folders
    - Users can view/download files from their own processes
    - Users can delete files from their own processes
    - Process owner validation through license_processes table

  ## Security
  - All operations validate process ownership via auth.uid()
  - Private bucket ensures no public access
  - RLS policies enforce access control at database level
*/

-- Create storage bucket if not exists
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'docs',
  'docs',
  false,
  52428800,
  ARRAY['application/pdf', 'image/jpeg', 'image/jpg', 'image/png', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document']
)
ON CONFLICT (id) DO UPDATE SET
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can upload files to own processes" ON storage.objects;
DROP POLICY IF EXISTS "Users can view files from own processes" ON storage.objects;
DROP POLICY IF EXISTS "Users can update files in own processes" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete files from own processes" ON storage.objects;

-- Policy: Users can upload files to their own process folders
CREATE POLICY "Users can upload files to own processes"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'docs' AND
  (storage.foldername(name))[1] IN (
    SELECT id::text FROM license_processes WHERE user_id = auth.uid()
  )
);

-- Policy: Users can view/download files from their own processes
CREATE POLICY "Users can view files from own processes"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'docs' AND
  (storage.foldername(name))[1] IN (
    SELECT id::text FROM license_processes WHERE user_id = auth.uid()
  )
);

-- Policy: Users can update files in their own processes
CREATE POLICY "Users can update files in own processes"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'docs' AND
  (storage.foldername(name))[1] IN (
    SELECT id::text FROM license_processes WHERE user_id = auth.uid()
  )
);

-- Policy: Users can delete files from their own processes
CREATE POLICY "Users can delete files from own processes"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'docs' AND
  (storage.foldername(name))[1] IN (
    SELECT id::text FROM license_processes WHERE user_id = auth.uid()
  )
);
