import { supabase } from '../lib/supabase';

interface SignedUrlResponse {
  uploadUrl: string;
  storagePath: string;
  fileId: string;
}

interface UploadResult {
  success: boolean;
  storagePath?: string;
  fileId?: string;
  error?: string;
}

export class UploadService {
  static async getSignedUploadUrl(
    processId: string,
    filename: string,
    contentType: string
  ): Promise<SignedUrlResponse> {
    try {
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      const session = await supabase.auth.getSession();

      if (!session.data.session) {
        throw new Error('User not authenticated');
      }

      const response = await fetch(
        `${supabaseUrl}/functions/v1/getSignedUploadUrl`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${session.data.session.access_token}`,
          },
          body: JSON.stringify({
            process_id: processId,
            filename: filename,
            contentType: contentType,
          }),
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to get signed upload URL');
      }

      const data: SignedUrlResponse = await response.json();
      return data;
    } catch (error) {
      console.error('Error getting signed upload URL:', error);
      throw error;
    }
  }

  static async uploadFile(
    processId: string,
    file: File
  ): Promise<UploadResult> {
    try {
      const signedUrlData = await this.getSignedUploadUrl(
        processId,
        file.name,
        file.type
      );

      const uploadResponse = await fetch(signedUrlData.uploadUrl, {
        method: 'PUT',
        body: file,
        headers: {
          'Content-Type': file.type,
          'x-upsert': 'true',
        },
      });

      if (!uploadResponse.ok) {
        throw new Error(`Upload failed: ${uploadResponse.statusText}`);
      }

      return {
        success: true,
        storagePath: signedUrlData.storagePath,
        fileId: signedUrlData.fileId,
      };
    } catch (error) {
      console.error('Upload error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Upload failed',
      };
    }
  }

  static async saveProcurationFile(
    collaboratorId: string,
    storagePath: string,
    fileId: string,
    metadata: {
      filename: string;
      fileSize: number;
      fileType: string;
      uploadedAt: string;
    }
  ): Promise<void> {
    try {
      const { error } = await supabase
        .from('process_collaborators')
        .update({
          procuracao_file_id: fileId,
          procuracao_storage_path: storagePath,
          procuracao_file_metadata: metadata,
        })
        .eq('id', collaboratorId);

      if (error) {
        throw error;
      }
    } catch (error) {
      console.error('Error saving procuration file reference:', error);
      throw error;
    }
  }

  static async getFileDownloadUrl(storagePath: string): Promise<string> {
    try {
      const { data, error } = await supabase.storage
        .from('docs')
        .createSignedUrl(storagePath, 3600);

      if (error) {
        throw error;
      }

      return data.signedUrl;
    } catch (error) {
      console.error('Error getting download URL:', error);
      throw error;
    }
  }

  static async deleteFile(storagePath: string): Promise<void> {
    try {
      const { error } = await supabase.storage
        .from('docs')
        .remove([storagePath]);

      if (error) {
        throw error;
      }
    } catch (error) {
      console.error('Error deleting file:', error);
      throw error;
    }
  }

  static validateFile(file: File): { valid: boolean; error?: string } {
    const maxSize = 50 * 1024 * 1024;
    const allowedTypes = [
      'application/pdf',
      'image/jpeg',
      'image/jpg',
      'image/png',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    ];

    if (file.size > maxSize) {
      return {
        valid: false,
        error: 'O arquivo deve ter no máximo 50MB',
      };
    }

    if (!allowedTypes.includes(file.type)) {
      return {
        valid: false,
        error: 'Tipo de arquivo não permitido. Use PDF, imagens ou documentos Word.',
      };
    }

    return { valid: true };
  }
}
