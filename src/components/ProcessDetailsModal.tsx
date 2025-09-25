import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { DocumentService } from '../services/documentService';
import { CommentService } from '../services/commentService';
import { CollaborationService } from '../services/collaborationService';
import DocumentViewer from './DocumentViewer';
import CollaborationPanel from './CollaborationPanel';
import { X, FileText, Calendar, User, MapPin, Building2, Clock, CheckCircle, AlertTriangle, MessageSquare, Upload } from 'lucide-react';

interface ProcessDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  process: any;
  onUpdateProcess: (processId: string, updates: any) => void;
}

export default function ProcessDetailsModal({ isOpen, onClose, process, onUpdateProcess }: ProcessDetailsModalProps) {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('details');
  const [newComment, setNewComment] = useState('');
  const [newStatus, setNewStatus] = useState(process?.status || '');
  const [documents, setDocuments] = useState<any[]>([]);
  const [uploading, setUploading] = useState(false);
  const [comments, setComments] = useState<any[]>([]);
  const [loadingComments, setLoadingComments] = useState(false);
  const [addingComment, setAddingComment] = useState(false);
  const [showDocumentViewer, setShowDocumentViewer] = useState(false);
  const [selectedDocument, setSelectedDocument] = useState<any>(null);
  const [userPermission, setUserPermission] = useState<'owner' | 'admin' | 'editor' | 'viewer' | null>(null);

  const handleViewDocument = (document: any) => {
    console.log('Viewing document:', document);
    setSelectedDocument(document);
    setShowDocumentViewer(true);
  };

  // Load documents when modal opens
  React.useEffect(() => {
    if (process?.id && isOpen) {
      loadDocuments();
      loadUserPermission();
      loadComments();
    }
  }, [process?.id, isOpen]);

  const loadDocuments = async () => {
    if (!process?.id) {
      console.error('No process ID available for loading documents');
      return;
    }

    try {
      console.log('📂 Loading documents for process:', process.id);
      const docs = await DocumentService.getProcessDocuments(process.id);
      console.log('✅ Documents loaded from database:', {
        processId: process.id,
        count: docs.length,
        documents: docs.map(d => ({ id: d.id, name: d.name }))
      });
      setDocuments(docs);
    } catch (error) {
      console.error('❌ Error loading documents:', error);
      console.error('Load error details:', { 
        processId: process.id, 
        error: error.message 
      });
      setDocuments([]); // Reset documents on error
    }
  };

  const loadUserPermission = async () => {
    if (!process?.id) return;
    
    try {
      const permission = await CollaborationService.getUserPermission(process.id);
      setUserPermission(permission);
    } catch (error) {
      console.error('Error loading user permission:', error);
      setUserPermission(null);
    }
  };

  const loadComments = async () => {
    if (!process?.id) return;
    
    setLoadingComments(true);
    try {
      const commentsData = await CommentService.getProcessComments(process.id);
      setComments(commentsData);
    } catch (error) {
      console.error('Error loading comments:', error);
      setComments([]);
    } finally {
      setLoadingComments(false);
    }
  };

  const handleFileUpload = async (files: FileList) => {
    if (!files.length) return;
    
    if (!process?.id) {
      console.error('No process ID available');
      alert('Erro: ID do processo não encontrado');
      return;
    }

    if (!user?.id) {
      console.error('No user ID available');
      alert('Erro: Usuário não autenticado');
      return;
    }

    console.log('Starting file upload:', { 
      processId: process.id, 
      userId: user.id, 
      fileCount: files.length 
    });

    setUploading(true);
    try {
      for (const file of Array.from(files)) {
        console.log('Uploading file:', { 
          name: file.name, 
          size: file.size, 
          type: file.type || 'unknown' 
        });
        
        try {
          await DocumentService.uploadDocument(process.id, file, user.id);
          console.log('File uploaded successfully:', file.name);
        } catch (fileError) {
          console.error('Error uploading file:', file.name, fileError);
          throw new Error(`Erro ao fazer upload de ${file.name}: ${fileError.message}`);
        }
      }
      
      console.log('All files uploaded, reloading documents...');
      await loadDocuments(); // Reload documents after upload
      alert('Documentos enviados com sucesso!');
    } catch (error) {
      console.error('Error uploading documents:', error);
      alert('Erro ao fazer upload dos documentos: ' + (error as Error).message);
    } finally {
      setUploading(false);
      console.log('Upload process completed');
    }
  };

  const handleDeleteDocument = async (documentId: string) => {
    if (!documentId) {
      console.error('Document ID is required for deletion');
      alert('Erro: ID do documento não encontrado');
      return;
    }

    const documentToDelete = documents.find(doc => doc.id === documentId);
    const confirmMessage = `Tem certeza que deseja excluir o documento "${documentToDelete?.name || 'documento'}"?`;
    
    if (!window.confirm(confirmMessage)) {
      console.log('User cancelled document deletion');
      return;
    }

    console.log('🗑️ User confirmed deletion of document:', { 
      id: documentId, 
      name: documentToDelete?.name,
      currentDocsCount: documents.length 
    });
    
    try {
      console.log('📞 Calling DocumentService.deleteDocument...');
      await DocumentService.deleteDocument(documentId);
      console.log('✅ Document deleted from database, updating local state...');
      
      // Update local state immediately
      setDocuments(prevDocs => {
        const updatedDocs = prevDocs.filter(doc => doc.id !== documentId);
        console.log('📝 Local state updated:', {
          before: prevDocs.length,
          after: updatedDocs.length,
          removedId: documentId
        });
        return updatedDocs;
      });
      
      // Wait a moment then reload from database to ensure consistency
      console.log('🔄 Reloading documents from database for verification...');
      setTimeout(async () => {
        try {
          await loadDocuments();
          console.log('✅ Documents reloaded successfully');
        } catch (reloadError) {
          console.error('❌ Error reloading documents:', reloadError);
        }
      }, 500);
      
      console.log('✅ Document deletion completed successfully');
      alert('Documento excluído com sucesso!');
    } catch (error) {
      console.error('❌ Error deleting document:', error);
      console.error('Delete error details:', { 
        documentId, 
        documentName: documentToDelete?.name,
        error: error.message 
      });
      alert('Erro ao excluir documento: ' + (error as Error).message);
      
      // Reload documents to ensure UI is in sync with database
      console.log('🔄 Reloading documents after error...');
      await loadDocuments();
    }
  };

  if (!isOpen || !process) return null;
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'aprovado': return 'text-green-700 bg-green-100 border-green-200';
      case 'rejeitado': return 'text-red-700 bg-red-100 border-red-200';
      case 'em_analise': return 'text-blue-700 bg-blue-100 border-blue-200';
      case 'submitted': return 'text-yellow-700 bg-yellow-100 border-yellow-200';
      case 'documentacao_pendente': return 'text-orange-700 bg-orange-100 border-orange-200';
      default: return 'text-gray-700 bg-gray-100 border-gray-200';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'aprovado': return 'Aprovada';
      case 'rejeitado': return 'Rejeitada';
      case 'em_analise': return 'Em Análise';
      case 'submitted': return 'Submetida';
      case 'documentacao_pendente': return 'Documentação Pendente';
      default: return status;
    }
  };

  const getLicenseTypeName = (type: string) => {
    switch (type) {
      case 'LP': return 'Licença Prévia';
      case 'LI': return 'Licença de Instalação';
      case 'LO': return 'Licença de Operação';
      default: return type;
    }
  };

  const handleStatusUpdate = () => {
    if (newStatus !== process.status) {
      const progressMap = {
        'submitted': 25,
        'em_analise': 50,
        'documentacao_pendente': 75,
        'aprovado': 100,
        'rejeitado': 100
      };
      
      onUpdateProcess(process.id, {
        status: newStatus,
        progress: progressMap[newStatus as keyof typeof progressMap] || process.progress
      });
    }
  };

  const handleAddComment = async () => {
    if (!newComment.trim() || !user?.id || !process?.id) return;
    
    setAddingComment(true);
    try {
      await CommentService.addComment(process.id, user.id, newComment);
      setNewComment('');
      await loadComments(); // Reload comments after adding
    } catch (error) {
      console.error('Error adding comment:', error);
      alert('Erro ao adicionar comentário: ' + (error as Error).message);
    } finally {
      setAddingComment(false);
    }
  };

  const handleDeleteComment = async (commentId: string) => {
    if (!confirm('Tem certeza que deseja excluir este comentário?')) return;
    
    try {
      await CommentService.deleteComment(commentId);
      await loadComments(); // Reload comments after deleting
    } catch (error) {
      console.error('Error deleting comment:', error);
      alert('Erro ao excluir comentário: ' + (error as Error).message);
    }
  };

  const tabs = [
    { id: 'details', name: 'Detalhes', icon: FileText },
    { id: 'timeline', name: 'Cronograma', icon: Clock },
    { id: 'documents', name: 'Documentos', icon: Upload },
    { id: 'comments', name: 'Comentários', icon: MessageSquare },
    { id: 'collaboration', name: 'Colaboradores', icon: User }
  ];

  const renderDetails = () => (
    <div className="space-y-6">
      {/* User Permission Badge */}
      {userPermission && (
        <div className="mb-4">
          <span className={`inline-flex px-3 py-1 text-sm font-medium rounded-full ${
            userPermission === 'owner' ? 'bg-purple-100 text-purple-800' :
            userPermission === 'admin' ? 'bg-blue-100 text-blue-800' :
            userPermission === 'editor' ? 'bg-green-100 text-green-800' :
            'bg-gray-100 text-gray-800'
          }`}>
            {userPermission === 'owner' ? '👑 Proprietário' :
             userPermission === 'admin' ? '🛡️ Administrador' :
             userPermission === 'editor' ? '✏️ Editor' :
             '👁️ Visualizador'}
          </span>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Número do Processo</label>
            <p className="text-lg font-semibold text-gray-900">{process.protocol_number}</p>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Tipo de Licença</label>
            <span className="inline-flex px-3 py-1 text-sm font-medium bg-blue-100 text-blue-800 rounded-full">
              {getLicenseTypeName(process.license_type)}
            </span>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Status Atual</label>
            <div className="flex items-center space-x-3">
              <span className={`inline-flex px-3 py-1 text-sm font-medium rounded-full border ${getStatusColor(process.status)}`}>
                {getStatusText(process.status)}
              </span>
              {(userPermission === 'owner' || userPermission === 'admin' || userPermission === 'editor') && (
                <>
                  <select
                    value={newStatus}
                    onChange={(e) => setNewStatus(e.target.value)}
                    className="text-sm border border-gray-300 rounded px-2 py-1"
                  >
                    <option value="submitted">Submetida</option>
                    <option value="em_analise">Em Análise</option>
                    <option value="documentacao_pendente">Documentação Pendente</option>
                    <option value="aprovado">Aprovada</option>
                    <option value="rejeitado">Rejeitada</option>
                  </select>
                  <button
                    onClick={handleStatusUpdate}
                    className="px-3 py-1 bg-green-600 text-white text-sm rounded hover:bg-green-700"
                  >
                    Atualizar
                  </button>
                </>
              )}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Progresso</label>
            <div className="w-full bg-gray-200 rounded-full h-3">
              <div 
                className="bg-green-600 h-3 rounded-full transition-all duration-300"
                style={{ width: `${process.progress || 0}%` }}
              ></div>
            </div>
            <p className="text-sm text-gray-500 mt-1">{process.progress || 0}% concluído</p>
          </div>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Empresa</label>
            <p className="text-gray-900">{process.companies?.name}</p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Atividade</label>
            <p className="text-gray-900">{process.activity}</p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Analista Responsável</label>
            <p className="text-gray-900">{process.analyst_name || 'Não atribuído'}</p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Data de Submissão</label>
            <p className="text-gray-900">{process.submit_date ? new Date(process.submit_date).toLocaleDateString('pt-BR') : 'N/A'}</p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Data Esperada</label>
            <p className="text-gray-900">{process.expected_date ? new Date(process.expected_date).toLocaleDateString('pt-BR') : 'N/A'}</p>
          </div>
        </div>
      </div>

      {process.project_description && (
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Descrição do Empreendimento</label>
          <div className="bg-gray-50 p-4 rounded-lg">
            <p className="text-gray-900">{process.project_description}</p>
          </div>
        </div>
      )}

      {process.municipality && (
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Localização</label>
          <div className="bg-gray-50 p-4 rounded-lg">
            <p className="text-gray-900">{process.municipality}</p>
            <p className="text-sm text-gray-600 mt-1">{process.companies?.city} - {process.companies?.state}</p>
          </div>
        </div>
      )}
    </div>
  );

  const renderTimeline = () => (
    <div className="space-y-4">
      <div className="flow-root">
        <ul className="-mb-8">
          <li>
            <div className="relative pb-8">
              <div className="absolute top-4 left-4 -ml-px h-full w-0.5 bg-gray-200"></div>
              <div className="relative flex space-x-3">
                <div>
                  <span className="h-8 w-8 rounded-full bg-green-500 flex items-center justify-center ring-8 ring-white">
                    <CheckCircle className="h-5 w-5 text-white" />
                  </span>
                </div>
                <div className="min-w-0 flex-1 pt-1.5 flex justify-between space-x-4">
                  <div>
                    <p className="text-sm text-gray-500">Processo criado</p>
                  </div>
                  <div className="text-right text-sm whitespace-nowrap text-gray-500">
                    {new Date(process.submit_date).toLocaleDateString('pt-BR')}
                  </div>
                </div>
              </div>
            </div>
          </li>
          
          {process.status !== 'submitted' && (
            <li>
              <div className="relative pb-8">
                <div className="absolute top-4 left-4 -ml-px h-full w-0.5 bg-gray-200"></div>
                <div className="relative flex space-x-3">
                  <div>
                    <span className="h-8 w-8 rounded-full bg-blue-500 flex items-center justify-center ring-8 ring-white">
                      <Clock className="h-5 w-5 text-white" />
                    </span>
                  </div>
                  <div className="min-w-0 flex-1 pt-1.5 flex justify-between space-x-4">
                    <div>
                      <p className="text-sm text-gray-500">Análise iniciada</p>
                    </div>
                    <div className="text-right text-sm whitespace-nowrap text-gray-500">
                      {new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toLocaleDateString('pt-BR')}
                    </div>
                  </div>
                </div>
              </div>
            </li>
          )}

          {(process.status === 'aprovado' || process.status === 'rejeitado') && (
            <li>
              <div className="relative">
                <div className="relative flex space-x-3">
                  <div>
                    <span className={`h-8 w-8 rounded-full flex items-center justify-center ring-8 ring-white ${
                      process.status === 'aprovado' ? 'bg-green-500' : 'bg-red-500'
                    }`}>
                      {process.status === 'aprovado' ? (
                        <CheckCircle className="h-5 w-5 text-white" />
                      ) : (
                        <AlertTriangle className="h-5 w-5 text-white" />
                      )}
                    </span>
                  </div>
                  <div className="min-w-0 flex-1 pt-1.5 flex justify-between space-x-4">
                    <div>
                      <p className="text-sm text-gray-500">
                        Processo {process.status === 'aprovado' ? 'aprovado' : 'rejeitado'}
                      </p>
                    </div>
                    <div className="text-right text-sm whitespace-nowrap text-gray-500">
                      {new Date().toLocaleDateString('pt-BR')}
                    </div>
                  </div>
                </div>
              </div>
            </li>
          )}
        </ul>
      </div>
    </div>
  );

  const renderDocuments = () => (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-medium text-gray-900">Documentos do Processo</h3>
        {(userPermission === 'owner' || userPermission === 'admin' || userPermission === 'editor') && (
          <label className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 flex items-center gap-2 cursor-pointer">
            <Upload className="w-4 h-4" />
            {uploading ? 'Enviando...' : 'Adicionar Documento'}
            <input
              type="file"
              multiple
              onChange={(e) => e.target.files && handleFileUpload(e.target.files)}
              className="hidden"
              accept=".pdf,.doc,.docx,.jpg,.jpeg,.png,.txt"
            />
          </label>
        )}
      </div>

      {/* Upload Area */}
      {(userPermission === 'owner' || userPermission === 'admin' || userPermission === 'editor') && (
        <div 
          className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-green-400 transition-colors"
          onDrop={(e) => {
            e.preventDefault();
            const files = e.dataTransfer.files;
            if (files.length > 0) {
              handleFileUpload(files);
            }
          }}
          onDragOver={(e) => e.preventDefault()}
          onDragEnter={(e) => e.preventDefault()}
        >
          <Upload className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <div className="space-y-2">
            <p className="text-lg font-medium text-gray-900">Arraste arquivos aqui</p>
            <p className="text-sm text-gray-500">
              ou clique no botão acima para selecionar
            </p>
            <p className="text-xs text-gray-400">
              Formatos aceitos: PDF, DOC, DOCX, JPG, PNG, TXT
            </p>
          </div>
        </div>
      )}

      {/* Documents List */}
      {documents.length > 0 ? (
        <div className="space-y-3">
          <h4 className="font-medium text-gray-900">Documentos Anexados ({documents.length})</h4>
          <div className="grid grid-cols-1 gap-3">
            {documents.map((doc) => (
              <div key={doc.id} className="border border-gray-200 rounded-lg p-4 hover:bg-gray-50">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <FileText className="w-8 h-8 text-gray-400" />
                    <div className="flex-1">
                      <p className="text-sm font-medium text-gray-900">{doc.name}</p>
                      <div className="flex items-center space-x-4 text-xs text-gray-500">
                        <span>{doc.file_type || 'Arquivo'}</span>
                        {doc.file_size && (
                          <span>{(doc.file_size / 1024 / 1024).toFixed(2)} MB</span>
                        )}
                        <span>
                          Enviado em {new Date(doc.uploaded_at).toLocaleDateString('pt-BR')}
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <button 
                      className="text-green-600 hover:text-green-700 text-sm px-3 py-1 border border-green-300 rounded hover:bg-green-50"
                      onClick={() => handleViewDocument(doc)}
                     type="button"
                    >
                      Visualizar
                    </button>
                    <button 
                      className="text-blue-600 hover:text-blue-700 text-sm px-3 py-1 border border-blue-300 rounded hover:bg-blue-50"
                      onClick={async () => {
                        try {
                          await DocumentService.downloadDocument(doc);
                        } catch (error) {
                          console.error('Error downloading document:', error);
                          alert('Erro ao baixar documento: ' + (error as Error).message);
                        }
                      }}
                      type="button"
                    >
                      Baixar
                    </button>
                    <button 
                      onClick={() => handleDeleteDocument(doc.id)}
                      type="button"
                      disabled={!(userPermission === 'owner' || userPermission === 'admin' || userPermission === 'editor')}
                      className={`text-sm px-3 py-1 border rounded ${
                        (userPermission === 'owner' || userPermission === 'admin' || userPermission === 'editor')
                          ? 'text-red-600 hover:text-red-700 border-red-300 hover:bg-red-50'
                          : 'text-gray-400 border-gray-200 cursor-not-allowed'
                      }`}
                    >
                      Excluir
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div className="text-center py-8">
          <FileText className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <p className="text-gray-500">Nenhum documento anexado ainda</p>
          <p className="text-sm text-gray-400 mt-1">
            Adicione documentos usando o botão acima ou arrastando arquivos
          </p>
        </div>
      )}

      {/* Required Documents Checklist */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <h4 className="font-medium text-blue-900 mb-3">Documentos Obrigatórios</h4>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
          {[
            'Requerimento de Licença',
            'Certidão Municipal',
            'Publicação do Pedido',
            'Estudo de Impacto Ambiental',
            'Planta de Localização',
            'Memorial Descritivo'
          ].map((requiredDoc, index) => {
            const hasDoc = documents.some(doc => 
              doc.name.toLowerCase().includes(requiredDoc.toLowerCase().split(' ')[0])
            );
            return (
              <div key={index} className="flex items-center space-x-2">
                <div className={`w-4 h-4 rounded-full flex items-center justify-center ${
                  hasDoc ? 'bg-green-500' : 'bg-gray-300'
                }`}>
                  {hasDoc && <CheckCircle className="w-3 h-3 text-white" />}
                </div>
                <span className={`text-sm ${hasDoc ? 'text-green-700' : 'text-gray-600'}`}>
                  {requiredDoc}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {uploading && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <div className="flex items-center space-x-3">
            <div className="w-5 h-5 border-2 border-yellow-600 border-t-transparent rounded-full animate-spin"></div>
            <p className="text-yellow-800">Enviando documentos...</p>
          </div>
        </div>
      )}
    </div>
  );

  const renderComments = () => (
    <div className="space-y-4">
      {loadingComments ? (
        <div className="flex items-center justify-center py-8">
          <div className="w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
          <span className="ml-3 text-gray-600">Carregando comentários...</span>
        </div>
      ) : (
        <div className="space-y-4">
          {comments.length > 0 ? (
            comments.map((comment) => (
              <div key={comment.id} className="bg-gray-50 p-4 rounded-lg">
                <div className="flex items-start space-x-3">
                  <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center">
                    <span className="text-white text-sm font-medium">
                      {comment.user_profiles?.name?.charAt(0).toUpperCase() || 
                       comment.user_profiles?.email?.charAt(0).toUpperCase() || 'U'}
                    </span>
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <p className="text-sm font-medium text-gray-900">
                          {comment.user_profiles?.name || comment.user_profiles?.email || 'Usuário'}
                        </p>
                        <p className="text-xs text-gray-500">
                          {new Date(comment.created_at).toLocaleDateString('pt-BR', {
                            day: '2-digit',
                            month: '2-digit',
                            year: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit'
                          })}
                        </p>
                        {comment.updated_at !== comment.created_at && (
                          <p className="text-xs text-gray-400">(editado)</p>
                        )}
                      </div>
                      {comment.user_id === user?.id && (
                        <button
                          onClick={() => handleDeleteComment(comment.id)}
                          className="text-red-500 hover:text-red-700 text-xs px-2 py-1 rounded hover:bg-red-50"
                        >
                          Excluir
                        </button>
                      )}
                    </div>
                    <p className="text-sm text-gray-700 mt-1">{comment.comment}</p>
                  </div>
                </div>
              </div>
            ))
          ) : (
            <div className="text-center py-8 text-gray-500">
              <MessageSquare className="w-12 h-12 text-gray-300 mx-auto mb-3" />
              <p>Nenhum comentário ainda</p>
              <p className="text-sm text-gray-400 mt-1">Seja o primeiro a comentar neste processo</p>
            </div>
          )}
        </div>
      )}

      <div className="border-t pt-4">
        <div className="flex space-x-3">
          <div className="w-8 h-8 bg-green-600 rounded-full flex items-center justify-center">
            <span className="text-white text-sm font-medium">
              {user?.user_metadata?.name?.charAt(0).toUpperCase() || 
               user?.email?.charAt(0).toUpperCase() || 'U'}
            </span>
          </div>
          <div className="flex-1">
            <textarea
              value={newComment}
              onChange={(e) => setNewComment(e.target.value)}
              placeholder="Adicionar comentário..."
              className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
              rows={3}
              disabled={addingComment}
            />
            <div className="mt-2 flex justify-end">
              <button
                onClick={handleAddComment}
                disabled={addingComment || !newComment.trim()}
                className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                {addingComment ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    Adicionando...
                  </>
                ) : (
                  'Adicionar Comentário'
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  const renderCollaboration = () => (
    <CollaborationPanel 
      processId={process.id} 
      userPermission={userPermission}
    />
  );

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-6xl max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Detalhes do Processo</h2>
           <p className="text-sm text-gray-500">{process.protocol_number} - {process.companies?.name}</p>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Tabs */}
        <div className="border-b border-gray-200">
          <nav className="flex space-x-8 px-6">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`py-4 px-1 border-b-2 font-medium text-sm flex items-center space-x-2 ${
                    activeTab === tab.id
                      ? 'border-green-500 text-green-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  <span>{tab.name}</span>
                </button>
              );
            })}
          </nav>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto max-h-[60vh]">
          {activeTab === 'details' && renderDetails()}
          {activeTab === 'timeline' && renderTimeline()}
          {activeTab === 'documents' && renderDocuments()}
          {activeTab === 'comments' && renderComments()}
          {activeTab === 'collaboration' && renderCollaboration()}
        </div>
      </div>

      {/* Document Viewer Modal */}
      <DocumentViewer
        isOpen={showDocumentViewer}
        onClose={() => {
          console.log('Closing document viewer');
          setShowDocumentViewer(false);
          setSelectedDocument(null);
        }}
        document={selectedDocument}
      />
    </div>
  );
}