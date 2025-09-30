import React, { useState, useRef } from 'react';
import { Upload, FileText, AlertCircle, CheckCircle, X, Download, Trash2 } from 'lucide-react';
import { UploadService } from '../services/uploadService';

interface ProcurationUploadProps {
  processId: string;
  collaboratorId: string;
  existingFile?: {
    storagePath: string;
    metadata?: {
      filename: string;
      fileSize: number;
      fileType: string;
      uploadedAt: string;
    };
  };
  onUploadComplete?: (storagePath: string, fileId: string) => void;
  onDelete?: () => void;
}

export default function ProcurationUpload({
  processId,
  collaboratorId,
  existingFile,
  onUploadComplete,
  onDelete,
}: ProcurationUploadProps) {
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [downloadUrl, setDownloadUrl] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = event.target.files?.[0];
    if (!selectedFile) return;

    const validation = UploadService.validateFile(selectedFile);
    if (!validation.valid) {
      setError(validation.error || 'Arquivo inválido');
      return;
    }

    setFile(selectedFile);
    setError(null);
    setSuccess(false);
  };

  const handleUpload = async () => {
    if (!file) {
      setError('Selecione um arquivo primeiro');
      return;
    }

    setUploading(true);
    setError(null);
    setSuccess(false);
    setUploadProgress(0);

    try {
      const progressInterval = setInterval(() => {
        setUploadProgress((prev) => {
          if (prev >= 90) {
            clearInterval(progressInterval);
            return prev;
          }
          return prev + 10;
        });
      }, 200);

      const result = await UploadService.uploadFile(processId, file);

      clearInterval(progressInterval);
      setUploadProgress(100);

      if (!result.success) {
        throw new Error(result.error || 'Upload falhou');
      }

      await UploadService.saveProcurationFile(
        collaboratorId,
        result.storagePath!,
        result.fileId!,
        {
          filename: file.name,
          fileSize: file.size,
          fileType: file.type,
          uploadedAt: new Date().toISOString(),
        }
      );

      setSuccess(true);
      setFile(null);

      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }

      if (onUploadComplete) {
        onUploadComplete(result.storagePath!, result.fileId!);
      }

      setTimeout(() => {
        setSuccess(false);
        setUploadProgress(0);
      }, 3000);
    } catch (err) {
      console.error('Upload error:', err);
      setError(
        err instanceof Error
          ? err.message
          : 'Erro ao fazer upload. Tente novamente.'
      );
      setUploadProgress(0);
    } finally {
      setUploading(false);
    }
  };

  const handleDownload = async () => {
    if (!existingFile) return;

    try {
      const url = await UploadService.getFileDownloadUrl(
        existingFile.storagePath
      );
      setDownloadUrl(url);
      window.open(url, '_blank');
    } catch (err) {
      console.error('Download error:', err);
      setError('Erro ao baixar arquivo');
    }
  };

  const handleDelete = async () => {
    if (!existingFile) return;

    if (!confirm('Tem certeza que deseja excluir este arquivo?')) {
      return;
    }

    try {
      await UploadService.deleteFile(existingFile.storagePath);

      await UploadService.saveProcurationFile(
        collaboratorId,
        '',
        '',
        {
          filename: '',
          fileSize: 0,
          fileType: '',
          uploadedAt: '',
        }
      );

      if (onDelete) {
        onDelete();
      }

      setSuccess(true);
      setTimeout(() => setSuccess(false), 2000);
    } catch (err) {
      console.error('Delete error:', err);
      setError('Erro ao excluir arquivo');
    }
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
  };

  return (
    <div className="space-y-4">
      <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 hover:border-green-500 transition-colors">
        {existingFile ? (
          <div className="space-y-4">
            <div className="flex items-center justify-between p-4 bg-green-50 border border-green-200 rounded-lg">
              <div className="flex items-center space-x-3">
                <div className="p-2 bg-green-100 rounded-lg">
                  <FileText className="w-6 h-6 text-green-600" />
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-900">
                    {existingFile.metadata?.filename || 'Arquivo de procuração'}
                  </p>
                  <p className="text-xs text-gray-500">
                    {existingFile.metadata?.fileSize
                      ? formatFileSize(existingFile.metadata.fileSize)
                      : 'Tamanho desconhecido'}
                  </p>
                  {existingFile.metadata?.uploadedAt && (
                    <p className="text-xs text-gray-500">
                      Enviado em:{' '}
                      {new Date(
                        existingFile.metadata.uploadedAt
                      ).toLocaleDateString('pt-BR')}
                    </p>
                  )}
                </div>
              </div>
              <div className="flex items-center space-x-2">
                <button
                  onClick={handleDownload}
                  className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                  title="Baixar arquivo"
                >
                  <Download className="w-5 h-5" />
                </button>
                <button
                  onClick={handleDelete}
                  className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                  title="Excluir arquivo"
                >
                  <Trash2 className="w-5 h-5" />
                </button>
              </div>
            </div>
          </div>
        ) : (
          <div className="text-center">
            <div className="mx-auto w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center mb-4">
              <Upload className="w-6 h-6 text-gray-600" />
            </div>
            <h3 className="text-sm font-medium text-gray-900 mb-2">
              Upload de Procuração
            </h3>
            <p className="text-xs text-gray-500 mb-4">
              PDF, imagem ou documento Word (máx. 50MB)
            </p>

            <input
              ref={fileInputRef}
              type="file"
              onChange={handleFileSelect}
              accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
              className="hidden"
              id="procuration-upload"
            />

            <label
              htmlFor="procuration-upload"
              className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-lg shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 cursor-pointer transition-colors"
            >
              <FileText className="w-4 h-4 mr-2" />
              Selecionar Arquivo
            </label>

            {file && (
              <div className="mt-4 p-3 bg-gray-50 rounded-lg">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center space-x-2">
                    <FileText className="w-4 h-4 text-gray-600" />
                    <span className="text-sm text-gray-900">{file.name}</span>
                  </div>
                  <button
                    onClick={() => {
                      setFile(null);
                      if (fileInputRef.current) {
                        fileInputRef.current.value = '';
                      }
                    }}
                    className="text-gray-400 hover:text-gray-600"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
                <p className="text-xs text-gray-500">
                  {formatFileSize(file.size)}
                </p>
                <button
                  onClick={handleUpload}
                  disabled={uploading}
                  className="mt-3 w-full bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors text-sm font-medium"
                >
                  {uploading ? 'Enviando...' : 'Fazer Upload'}
                </button>
              </div>
            )}
          </div>
        )}

        {uploading && uploadProgress > 0 && (
          <div className="mt-4">
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div
                className="bg-green-600 h-2 rounded-full transition-all duration-300"
                style={{ width: `${uploadProgress}%` }}
              />
            </div>
            <p className="text-xs text-gray-500 mt-1 text-center">
              {uploadProgress}% enviado
            </p>
          </div>
        )}

        {error && (
          <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg flex items-start space-x-2">
            <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-medium text-red-900">Erro no upload</p>
              <p className="text-xs text-red-700 mt-1">{error}</p>
            </div>
          </div>
        )}

        {success && (
          <div className="mt-4 p-3 bg-green-50 border border-green-200 rounded-lg flex items-start space-x-2">
            <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-medium text-green-900">
                Sucesso!
              </p>
              <p className="text-xs text-green-700 mt-1">
                Arquivo enviado com sucesso
              </p>
            </div>
          </div>
        )}
      </div>

      <div className="text-xs text-gray-500">
        <p className="font-medium mb-1">Tipos de arquivo aceitos:</p>
        <ul className="list-disc list-inside space-y-1">
          <li>PDF (.pdf)</li>
          <li>Imagens (.jpg, .jpeg, .png)</li>
          <li>Documentos Word (.doc, .docx)</li>
        </ul>
        <p className="mt-2">Tamanho máximo: 50MB</p>
      </div>
    </div>
  );
}
