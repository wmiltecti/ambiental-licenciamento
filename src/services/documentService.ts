import { supabase } from '../lib/supabase';
import type { Database } from '../lib/supabase';

type Document = Database['public']['Tables']['process_documents']['Row'];
type DocumentInsert = Database['public']['Tables']['process_documents']['Insert'];

export interface DocumentWithUser extends Document {
  users?: {
    id: string;
    name: string;
    email: string;
    avatar?: string;
  };
}

export class DocumentService {
  static async getProcessDocuments(processId: string): Promise<DocumentWithUser[]> {
    if (!processId) {
      throw new Error('Process ID is required');
    }

    const { data, error } = await supabase
      .from('process_documents')
      .select('*')
      .eq('process_id', processId)
      .order('uploaded_at', { ascending: false });

    if (error) {
      console.error('Error fetching documents:', error);
      console.error('Error details:', { error, processId });
      throw error;
    }

    console.log('Documents loaded:', data?.length || 0);

    // Add mock user data since we don't have user relation in documents table
    return data.map(doc => ({
      ...doc,
      users: {
        id: 'user',
        name: 'Usuário',
        email: 'usuario@email.com',
        avatar: 'U'
      }
    }));
  }

  static async uploadDocument(
    processId: string,
    file: File,
    userId: string
  ): Promise<Document> {
    console.log('Uploading document:', { processId, fileName: file.name, fileSize: file.size, fileType: file.type });
    
    // Validate inputs
    if (!processId) {
      throw new Error('Process ID is required');
    }
    if (!file) {
      throw new Error('File is required');
    }
    if (!userId) {
      throw new Error('User ID is required');
    }

    // PRODUCTION: Upload to Supabase Storage
    const filePath = `${userId}/${processId}/${Date.now()}-${file.name}`;
    
    try {
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('documents')
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: false
        });

      if (uploadError) {
        console.error('Storage upload error:', uploadError);
        throw new Error(`Erro no upload: ${uploadError.message}`);
      }

      console.log('File uploaded to storage:', uploadData.path);
      
      // Save metadata to database
      const newDocument: DocumentInsert = {
        user_id: userId,
        process_id: processId,
        file_name: file.name,
        file_size: file.size,
        file_type: file.type || 'application/octet-stream',
        file_path: uploadData.path,
        uploaded_at: new Date().toISOString()
      };

      const { data, error } = await supabase
        .from('process_documents')
        .insert(newDocument)
        .select()
        .single();

      if (error) {
        // If database insert fails, clean up the uploaded file
        await supabase.storage
          .from('documents')
          .remove([uploadData.path]);
        
        console.error('Error saving document metadata:', error);
        throw error;
      }

      console.log('Document uploaded successfully:', data);
      return data;
      
    } catch (error) {
      console.error('Upload error:', error);
      throw error;
    }
  }

  static async deleteDocument(documentId: string): Promise<void> {
    if (!documentId) {
      throw new Error('Document ID is required for deletion');
    }

    console.log('🗑️ Starting document deletion for ID:', documentId);
    
    // Get current user
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      console.error('❌ User not authenticated:', userError);
      throw new Error('Usuário não autenticado');
    }
    
    console.log('✅ User authenticated:', user.id);
    
    // First, get the document with file path for storage cleanup
    const { data: existingDoc, error: checkError } = await supabase
      .from('process_documents')
      .select('id, file_name, user_id, file_path')
      .eq('id', documentId)
      .single();
    
    if (checkError) {
      console.error('❌ Error checking document existence:', checkError);
      if (checkError.code === 'PGRST116') {
        throw new Error('Documento não encontrado no banco de dados');
      }
      throw new Error(`Erro ao verificar documento: ${checkError.message}`);
    }
    
    if (!existingDoc) {
      console.error('❌ Document not found in database:', documentId);
      throw new Error('Documento não encontrado no banco de dados');
    }
    
    console.log('✅ Document found:', { 
      id: existingDoc.id, 
      name: existingDoc.file_name, 
      owner: existingDoc.user_id,
      currentUser: user.id,
      filePath: existingDoc.file_path
    });
    
    // Check if user owns the document
    if (existingDoc.user_id !== user.id) {
      console.error('❌ User does not own this document');
      throw new Error('Você não tem permissão para excluir este documento');
    }
    
    try {
      // PRODUCTION: Delete from storage first
      if (existingDoc.file_path) {
        console.log('🗑️ Deleting file from storage:', existingDoc.file_path);
        const { error: storageError } = await supabase.storage
          .from('documents')
          .remove([existingDoc.file_path]);
        
        if (storageError) {
          console.error('❌ Error deleting from storage:', storageError);
          // Continue with database deletion even if storage fails
        } else {
          console.log('✅ File deleted from storage');
        }
      }
      
      // Delete from database
      console.log('🔄 Attempting to delete document from database...');
      const { error } = await supabase
        .from('process_documents')
        .delete()
        .eq('id', documentId);

      if (error) {
        console.error('❌ Error deleting document from database:', error);
        throw new Error(`Erro ao excluir documento: ${error.message}`);
      }
      
      console.log('✅ Delete operation completed, verifying...');
      
      // Verify deletion was successful
      const { data: verifyDoc, error: verifyError } = await supabase
        .from('process_documents')
        .select('id')
        .eq('id', documentId)
        .maybeSingle();
      
      if (verifyError) {
        console.error('❌ Error verifying deletion:', verifyError);
        throw new Error(`Erro ao verificar exclusão: ${verifyError.message}`);
      }
      
      if (verifyDoc) {
        console.error('❌ Document still exists after deletion attempt:', documentId);
        throw new Error('Documento não foi excluído do banco de dados');
      }
      
      console.log('✅ Document successfully deleted and verified:', documentId);
      
    } catch (error) {
      console.error('❌ Error in deletion process:', error);
      throw error;
    }
  }

  static async downloadDocument(fileData: any): Promise<void> {
    try {
      console.log('Starting download for:', fileData);
      
      // PRODUCTION: Download from Supabase Storage
      if (fileData.file_path) {
        const { data, error } = await supabase.storage
          .from('documents')
          .download(fileData.file_path);
        
        if (error) {
          console.error('Storage download error:', error);
          throw new Error(`Erro ao baixar arquivo: ${error.message}`);
        }
        
        // Create download link
        const url = URL.createObjectURL(data);
        const link = document.createElement('a');
        link.href = url;
        link.download = fileData.file_name;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
        
        console.log('Document downloaded successfully:', fileData.name);
        return;
      }
      
      // Fallback: If no file_path, show error
      throw new Error('Caminho do arquivo não encontrado');
      
    } catch (error) {
      console.error('Error downloading document:', error);
      throw error;
    }
  }

  static async getDocumentContent(fileData: any): Promise<string> {
    console.log('Getting document content for:', fileData);
    
    try {
      // PRODUCTION: For text files, try to download and read content
      if (fileData.file_path && (fileData.file_type?.includes('text') || fileData.name.endsWith('.txt'))) {
        try {
          const { data, error } = await supabase.storage
            .from('documents')
            .download(fileData.file_path);
          
          if (!error && data) {
            const text = await data.text();
            return text;
          }
        } catch (downloadError) {
          console.log('Could not download for preview, showing metadata');
        }
      }
      
      // For other file types or if download fails, show metadata
      if (fileData.file_type?.includes('text') || fileData.file_name.endsWith('.txt')) {
        return `Documento: ${fileData.file_name}
Tipo: ${fileData.file_type}
Tamanho: ${fileData.file_size ? (fileData.file_size / 1024).toFixed(2) + ' KB' : 'N/A'}
Enviado em: ${new Date(fileData.uploaded_at).toLocaleString('pt-BR')}

Para visualizar o conteúdo completo, faça o download do arquivo.

ID do documento: ${fileData.id}
Processo: ${fileData.process_id}`;
      } else if (fileData.file_type?.includes('pdf')) {
        return `Documento PDF: ${fileData.file_name}

INFORMAÇÕES DO ARQUIVO:
- Nome: ${fileData.file_name}
- Tipo: ${fileData.file_type}
- Tamanho: ${fileData.file_size ? (fileData.file_size / 1024).toFixed(2) + ' KB' : 'N/A'}
- Data: ${new Date(fileData.uploaded_at).toLocaleString('pt-BR')}

Este é um documento PDF real enviado pelo usuário.
Para visualizar o conteúdo completo, faça o download do arquivo.

ID: ${fileData.id}
Processo: ${fileData.process_id}`;
      } else if (fileData.file_type?.includes('image/')) {
        return `Imagem: ${fileData.file_name}
Tipo: ${fileData.file_type}
Tamanho: ${fileData.file_size ? (fileData.file_size / 1024).toFixed(2) + ' KB' : 'N/A'}

Esta é uma imagem real enviada pelo usuário.
Para visualizar a imagem, faça o download do arquivo.

Informações do arquivo:
- ID: ${fileData.id}
- Processo: ${fileData.process_id}
- Enviado em: ${new Date(fileData.uploaded_at).toLocaleString('pt-BR')}`;
      } else {
        return `Arquivo: ${fileData.file_name}
Tipo: ${fileData.file_type || 'Desconhecido'}
Tamanho: ${fileData.file_size ? (fileData.file_size / 1024).toFixed(2) + ' KB' : 'N/A'}

Este arquivo foi enviado pelo usuário.
Para acessar o conteúdo, faça o download do arquivo.

Informações do documento:
- ID: ${fileData.id}
- Processo: ${fileData.process_id}
- Enviado em: ${new Date(fileData.uploaded_at).toLocaleString('pt-BR')}`;
      }
    } catch (error) {
      console.error('Error getting document content:', error);
      return `Erro ao carregar conteúdo do documento: ${error.message}`;
    }
  }
}