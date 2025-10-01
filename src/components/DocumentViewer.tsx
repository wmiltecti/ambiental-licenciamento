import React from 'react';
import { DocumentService } from '../services/documentService';
import { X, Download, FileText, Image, File } from 'lucide-react';

interface DocumentViewerProps {
  isOpen: boolean;
  onClose: () => void;
  document: {
    id: string;
    name: string;
    file_type?: string;
    file_size?: number;
    uploaded_at: string;
    file_path?: string;
  } | null;
}

export default function DocumentViewer({ isOpen, onClose, document }: DocumentViewerProps) {
  const [content, setContent] = React.useState<string>('');
  const [loading, setLoading] = React.useState(false);
  const [downloading, setDownloading] = React.useState(false);

  // Carregar conteúdo quando o documento muda
  React.useEffect(() => {
    if (document && isOpen) {
      loadDocumentContent();
    }
  }, [document, isOpen]);

  const loadDocumentContent = async () => {
    if (!document) return;
    
    setLoading(true);
    try {
      const documentContent = await DocumentService.getDocumentContent(document);
      setContent(documentContent);
    } catch (error) {
      console.error('Error loading document content:', error);
      setContent('Erro ao carregar o conteúdo do documento.');
    } finally {
      setLoading(false);
    }
  };

  const handleDownload = async () => {
    if (!document) return;
    
    setDownloading(true);
    try {
      await DocumentService.downloadDocument(document);
    } catch (error) {
      console.error('Error downloading document:', error);
      alert('Erro ao baixar documento: ' + (error as Error).message);
    } finally {
      setDownloading(false);
    }
  };

  if (!isOpen || !document) return null;

  const getFileIcon = (fileType: string) => {
    if (fileType?.startsWith('image/')) {
      return <Image className="w-6 h-6 text-blue-600" />;
    } else if (fileType?.includes('pdf')) {
      return <FileText className="w-6 h-6 text-red-600" />;
    } else if (fileType?.includes('word') || fileType?.includes('document')) {
      return <FileText className="w-6 h-6 text-blue-600" />;
    } else {
      return <File className="w-6 h-6 text-gray-600" />;
    }
  };

  const renderDocumentContent = () => {
    if (loading) {
      return (
        <div className="flex items-center justify-center h-96 bg-gray-100 rounded-lg">
          <div className="text-center">
            <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
            <p className="text-gray-600">Carregando documento...</p>
          </div>
        </div>
      );
    }

    const fileType = document.file_type || '';
    
    if (fileType.startsWith('image/')) {
      return (
        <div className="flex items-center justify-center h-96 bg-gray-100 rounded-lg">
          <div className="text-center">
            <Image className="w-16 h-16 text-blue-400 mx-auto mb-4" />
            <p className="text-lg font-medium text-gray-900">Imagem: {document.name}</p>
            <p className="text-sm text-gray-500 mt-2">{document.file_name}</p>
            <div className="mt-4 p-4 bg-gray-50 rounded-lg border max-w-md mx-auto">
              <p className="text-sm text-gray-700 whitespace-pre-line">{content}</p>
            </div>
            <button 
              onClick={handleDownload}
              disabled={downloading}
              className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2 mx-auto disabled:opacity-50"
            >
              <Download className="w-4 h-4" />
              {downloading ? 'Baixando...' : 'Baixar Imagem'}
            </button>
          </div>
        </div>
      );
    } else if (fileType.includes('pdf')) {
      return (
        <div className="h-96 bg-gray-50 rounded-lg p-6 overflow-y-auto">
          <div className="text-center mb-6">
            <FileText className="w-16 h-16 text-red-400 mx-auto mb-4" />
            <p className="text-lg font-medium text-gray-900">Documento PDF</p>
            <p className="text-sm text-gray-500">{document.file_name}</p>
          </div>
          <div className="bg-white p-4 rounded-lg border shadow-sm">
            <p className="text-sm text-gray-700 whitespace-pre-line leading-relaxed">{content}</p>
          </div>
        </div>
      );
    } else if (fileType.includes('text') || document.name.endsWith('.txt')) {
      return (
        <div className="h-96 bg-gray-50 rounded-lg p-6 overflow-y-auto">
          <div className="text-center mb-6">
            <FileText className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <p className="text-lg font-medium text-gray-900">Arquivo de Texto</p>
            <p className="text-sm text-gray-500">{document.file_name}</p>
          </div>
          <div className="bg-white p-4 rounded-lg border shadow-sm font-mono text-sm">
            <pre className="text-gray-800 whitespace-pre-wrap leading-relaxed">{content}</pre>
          </div>
        </div>
      );
    } else {
      return (
        <div className="flex items-center justify-center h-96 bg-gray-100 rounded-lg">
          <div className="text-center">
            <File className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <p className="text-lg font-medium text-gray-900">Arquivo: {document.file_name}</p>
            <p className="text-sm text-gray-500 mt-2">{document.file_name}</p>
            <p className="text-xs text-gray-400 mt-1">Tipo: {document.file_type}</p>
            <div className="mt-4 p-4 bg-gray-50 rounded-lg border max-w-md mx-auto">
              <p className="text-sm text-gray-700 whitespace-pre-line">{content}</p>
            </div>
            <button 
              onClick={handleDownload}
              disabled={downloading}
              className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2 mx-auto disabled:opacity-50"
            >
              <Download className="w-4 h-4" />
              {downloading ? 'Baixando...' : 'Baixar Arquivo'}
            </button>
          </div>
        </div>
      );
    }
  };

  const formatFileSize = (bytes?: number) => {
    if (!bytes) return 'Tamanho desconhecido';
    const mb = bytes / (1024 * 1024);
    return `${mb.toFixed(2)} MB`;
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 bg-gray-50">
          <div className="flex items-center space-x-3">
            {getFileIcon(document.file_type || '')}
            <div>
              <h2 className="text-xl font-bold text-gray-900">{document.file_name}</h2>
              <div className="flex items-center space-x-4 text-sm text-gray-500">
                <span>{document.file_type || 'Tipo desconhecido'}</span>
                <span>{formatFileSize(document.file_size)}</span>
                <span>Enviado em {new Date(document.uploaded_at).toLocaleDateString('pt-BR')}</span>
              </div>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <button
              onClick={handleDownload}
              disabled={downloading}
              className="p-2 text-gray-600 hover:text-gray-800 hover:bg-gray-200 rounded-lg transition-colors"
              title="Baixar documento"
            >
              {downloading ? (
                <div className="w-5 h-5 border-2 border-gray-600 border-t-transparent rounded-full animate-spin" />
              ) : (
                <Download className="w-5 h-5" />
              )}
            </button>
            <button
              onClick={onClose}
              className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-200 rounded-lg transition-colors"
              title="Fechar"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-6">
          {renderDocumentContent()}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between p-6 border-t border-gray-200 bg-gray-50">
          <div className="text-sm text-gray-600">
            <p>ID do documento: {document.id}</p>
          </div>
          <div className="flex space-x-3">
            <button
              onClick={handleDownload}
              disabled={downloading}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2 transition-colors"
            >
              {downloading ? (
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <Download className="w-4 h-4" />
              )}
              {downloading ? 'Baixando...' : 'Baixar'}
            </button>
            <button
              onClick={onClose}
              className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
            >
              Fechar
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}