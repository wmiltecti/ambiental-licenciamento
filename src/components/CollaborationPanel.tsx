import React, { useState, useEffect } from 'react';
import { CollaborationService, type Collaborator, type CollaborationInvite } from '../services/collaborationService';
import { Users, UserPlus, Mail, Shield, Trash2, Edit3, Eye, Crown, AlertCircle, Check, X, FileText } from 'lucide-react';
import ProcurationUpload from './ProcurationUpload';

interface CollaborationPanelProps {
  processId: string;
  userPermission: 'owner' | 'admin' | 'editor' | 'viewer' | null;
}

export default function CollaborationPanel({ processId, userPermission }: CollaborationPanelProps) {
  const [collaborators, setCollaborators] = useState<Collaborator[]>([]);
  const [invites, setInvites] = useState<CollaborationInvite[]>([]);
  const [showInviteForm, setShowInviteForm] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [invitePermission, setInvitePermission] = useState<'viewer' | 'editor' | 'admin'>('viewer');
  const [loading, setLoading] = useState(false);
  const [selectedCollaboratorForUpload, setSelectedCollaboratorForUpload] = useState<string | null>(null);

  useEffect(() => {
    if (processId) {
      loadCollaborators();
      loadInvites();
    }
  }, [processId]);

  const loadCollaborators = async () => {
    try {
      const data = await CollaborationService.getProcessCollaborators(processId);
      setCollaborators(data);
    } catch (error) {
      console.error('Error loading collaborators:', error);
    }
  };

  const loadInvites = async () => {
    try {
      const data = await CollaborationService.getUserInvites();
      setInvites(data.filter(invite => invite.process_id === processId));
    } catch (error) {
      console.error('Error loading invites:', error);
    }
  };

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inviteEmail.trim()) return;

    setLoading(true);
    try {
      await CollaborationService.inviteCollaborator(processId, inviteEmail, invitePermission);
      setInviteEmail('');
      setShowInviteForm(false);
      loadInvites();
      alert('Convite enviado com sucesso!');
    } catch (error) {
      console.error('Error sending invite:', error);
      alert('Erro ao enviar convite: ' + (error as Error).message);
    } finally {
      setLoading(false);
    }
  };

  const handleRemoveCollaborator = async (userId: string) => {
    if (!confirm('Tem certeza que deseja remover este colaborador?')) return;

    try {
      await CollaborationService.removeCollaborator(processId, userId);
      loadCollaborators();
      alert('Colaborador removido com sucesso!');
    } catch (error) {
      console.error('Error removing collaborator:', error);
      alert('Erro ao remover colaborador: ' + (error as Error).message);
    }
  };

  const handleUpdatePermission = async (userId: string, newPermission: 'viewer' | 'editor' | 'admin') => {
    try {
      await CollaborationService.updateCollaboratorPermission(processId, userId, newPermission);
      loadCollaborators();
      alert('Permissão atualizada com sucesso!');
    } catch (error) {
      console.error('Error updating permission:', error);
      alert('Erro ao atualizar permissão: ' + (error as Error).message);
    }
  };

  const getPermissionIcon = (permission: string) => {
    switch (permission) {
      case 'admin': return <Crown className="w-4 h-4 text-purple-600" />;
      case 'editor': return <Edit3 className="w-4 h-4 text-blue-600" />;
      case 'viewer': return <Eye className="w-4 h-4 text-gray-600" />;
      default: return <Shield className="w-4 h-4 text-gray-400" />;
    }
  };

  const getPermissionText = (permission: string) => {
    switch (permission) {
      case 'admin': return 'Administrador';
      case 'editor': return 'Editor';
      case 'viewer': return 'Visualizador';
      default: return permission;
    }
  };

  const getPermissionColor = (permission: string) => {
    switch (permission) {
      case 'admin': return 'bg-purple-100 text-purple-800 border-purple-200';
      case 'editor': return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'viewer': return 'bg-gray-100 text-gray-800 border-gray-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const canManageCollaborators = userPermission === 'owner' || userPermission === 'admin';

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <Users className="w-6 h-6 text-blue-600" />
          <h3 className="text-lg font-semibold text-gray-900">Colaboradores</h3>
          <span className="bg-blue-100 text-blue-800 text-sm px-2 py-1 rounded-full">
            {collaborators.length}
          </span>
        </div>
        {canManageCollaborators && (
          <button
            onClick={() => setShowInviteForm(true)}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 flex items-center gap-2 transition-colors"
          >
            <UserPlus className="w-4 h-4" />
            Convidar
          </button>
        )}
      </div>

      {/* Invite Form */}
      {showInviteForm && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <form onSubmit={handleInvite} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Email do Colaborador
              </label>
              <input
                type="email"
                value={inviteEmail}
                onChange={(e) => setInviteEmail(e.target.value)}
                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="email@exemplo.com"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Nível de Permissão
              </label>
              <select
                value={invitePermission}
                onChange={(e) => setInvitePermission(e.target.value as 'viewer' | 'editor' | 'admin')}
                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="viewer">Visualizador - Apenas visualizar</option>
                <option value="editor">Editor - Visualizar e editar</option>
                <option value="admin">Administrador - Controle total</option>
              </select>
            </div>
            <div className="flex space-x-3">
              <button
                type="submit"
                disabled={loading}
                className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center gap-2"
              >
                {loading ? (
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  <Mail className="w-4 h-4" />
                )}
                Enviar Convite
              </button>
              <button
                type="button"
                onClick={() => setShowInviteForm(false)}
                className="bg-gray-300 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-400"
              >
                Cancelar
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Permission Levels Info */}
      <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
        <h4 className="font-medium text-gray-900 mb-3">Níveis de Permissão</h4>
        <div className="space-y-2 text-sm">
          <div className="flex items-center space-x-2">
            <Crown className="w-4 h-4 text-purple-600" />
            <span className="font-medium">Proprietário:</span>
            <span className="text-gray-600">Controle total, pode gerenciar colaboradores</span>
          </div>
          <div className="flex items-center space-x-2">
            <Crown className="w-4 h-4 text-purple-600" />
            <span className="font-medium">Administrador:</span>
            <span className="text-gray-600">Pode editar e gerenciar colaboradores</span>
          </div>
          <div className="flex items-center space-x-2">
            <Edit3 className="w-4 h-4 text-blue-600" />
            <span className="font-medium">Editor:</span>
            <span className="text-gray-600">Pode visualizar e editar o processo</span>
          </div>
          <div className="flex items-center space-x-2">
            <Eye className="w-4 h-4 text-gray-600" />
            <span className="font-medium">Visualizador:</span>
            <span className="text-gray-600">Apenas visualizar o processo</span>
          </div>
        </div>
      </div>

      {/* Collaborators List */}
      {collaborators.length > 0 ? (
        <div className="space-y-3">
          <h4 className="font-medium text-gray-900">Colaboradores Ativos</h4>
          {collaborators.map((collaborator) => (
            <div key={collaborator.id} className="bg-white border border-gray-200 rounded-lg p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                    <span className="text-blue-600 font-medium">
                      {collaborator.user_profiles?.name?.charAt(0).toUpperCase() || 'U'}
                    </span>
                  </div>
                  <div>
                    <p className="font-medium text-gray-900">
                      {collaborator.user_profiles?.name || 'Usuário'}
                    </p>
                    <p className="text-sm text-gray-500">
                      {collaborator.user_profiles?.email}
                    </p>
                    {collaborator.user_profiles?.organization && (
                      <p className="text-xs text-gray-400">
                        {collaborator.user_profiles.organization}
                      </p>
                    )}
                  </div>
                </div>
                <div className="flex items-center space-x-3">
                  <div className="flex items-center space-x-2">
                    {getPermissionIcon(collaborator.permission_level)}
                    <span className={`px-2 py-1 text-xs font-medium rounded-full border ${getPermissionColor(collaborator.permission_level)}`}>
                      {getPermissionText(collaborator.permission_level)}
                    </span>
                  </div>
                  {canManageCollaborators && (
                    <div className="flex items-center space-x-1">
                      <select
                        value={collaborator.permission_level}
                        onChange={(e) => handleUpdatePermission(collaborator.user_id, e.target.value as 'viewer' | 'editor' | 'admin')}
                        className="text-xs border border-gray-300 rounded px-2 py-1"
                      >
                        <option value="viewer">Visualizador</option>
                        <option value="editor">Editor</option>
                        <option value="admin">Administrador</option>
                      </select>
                      <button
                        onClick={() => handleRemoveCollaborator(collaborator.user_id)}
                        className="p-1 text-red-500 hover:text-red-700 hover:bg-red-50 rounded"
                        title="Remover colaborador"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  )}
                </div>
              </div>
              <div className="mt-3 flex items-center justify-between border-t pt-3">
                <div className="text-xs text-gray-500">
                  Colaborando desde {new Date(collaborator.accepted_at || collaborator.invited_at).toLocaleDateString('pt-BR')}
                </div>
                <button
                  onClick={() => setSelectedCollaboratorForUpload(
                    selectedCollaboratorForUpload === collaborator.id ? null : collaborator.id
                  )}
                  className="flex items-center gap-1 text-sm text-blue-600 hover:text-blue-700"
                >
                  <FileText className="w-4 h-4" />
                  {collaborator.procuracao_storage_path ? 'Ver Procuração' : 'Adicionar Procuração'}
                </button>
              </div>

              {selectedCollaboratorForUpload === collaborator.id && (
                <div className="mt-4 pt-4 border-t">
                  <h5 className="text-sm font-medium text-gray-900 mb-3">
                    Procuração do Colaborador
                  </h5>
                  <ProcurationUpload
                    processId={processId}
                    collaboratorId={collaborator.id}
                    existingFile={collaborator.procuracao_storage_path ? {
                      storagePath: collaborator.procuracao_storage_path,
                      metadata: collaborator.procuracao_file_metadata as any
                    } : undefined}
                    onUploadComplete={() => {
                      loadCollaborators();
                      setSelectedCollaboratorForUpload(null);
                    }}
                    onDelete={() => {
                      loadCollaborators();
                      setSelectedCollaboratorForUpload(null);
                    }}
                  />
                </div>
              )}
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-8 bg-gray-50 rounded-lg border border-gray-200">
          <Users className="w-12 h-12 text-gray-400 mx-auto mb-3" />
          <p className="text-gray-600">Nenhum colaborador ainda</p>
          <p className="text-sm text-gray-500 mt-1">
            Convide pessoas para colaborar neste processo
          </p>
        </div>
      )}

      {/* Pending Invites */}
      {invites.length > 0 && (
        <div className="space-y-3">
          <h4 className="font-medium text-gray-900 flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-orange-500" />
            Convites Pendentes
          </h4>
          {invites.map((invite) => (
            <div key={invite.id} className="bg-orange-50 border border-orange-200 rounded-lg p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium text-gray-900">Convite para: {invite.invited_email}</p>
                  <p className="text-sm text-gray-600">
                    Permissão: {getPermissionText(invite.permission_level)}
                  </p>
                  <p className="text-xs text-gray-500">
                    Expira em: {new Date(invite.expires_at).toLocaleDateString('pt-BR')}
                  </p>
                </div>
                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => CollaborationService.acceptInvite(invite.id).then(() => {
                      loadCollaborators();
                      loadInvites();
                    })}
                    className="bg-green-600 text-white px-3 py-1 rounded text-sm hover:bg-green-700 flex items-center gap-1"
                  >
                    <Check className="w-3 h-3" />
                    Aceitar
                  </button>
                  <button className="bg-red-600 text-white px-3 py-1 rounded text-sm hover:bg-red-700 flex items-center gap-1">
                    <X className="w-3 h-3" />
                    Recusar
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}