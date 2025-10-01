import { supabase } from '../lib/supabase';
import type { Database } from '../lib/supabase';

export interface Collaborator {
  id: string;
  user_id: string;
  permission_level: 'viewer' | 'editor' | 'admin';
  status: 'pending' | 'accepted' | 'declined' | 'revoked';
  invited_at: string;
  accepted_at?: string;
  user_profiles?: {
    name: string;
    email: string;
    organization?: string;
  };
}

export interface CollaborationInvite {
  id: string;
  process_id: string;
  invited_email: string;
  permission_level: 'viewer' | 'editor' | 'admin';
  status: 'pending' | 'accepted' | 'expired' | 'revoked';
  expires_at: string;
  created_at: string;
}

export interface ActivityLog {
  id: string;
  process_id: string;
  user_id?: string;
  action: string;
  description?: string;
  metadata?: any;
  created_at: string;
  user_profiles?: {
    name: string;
    email: string;
  };
}

export class CollaborationService {
  // Obter colaboradores de um processo
  static async getProcessCollaborators(processId: string): Promise<Collaborator[]> {
    // First, get the collaborators
    const { data: collaborators, error } = await supabase
      .from('process_collaborators')
      .select('*')
      .eq('process_id', processId)
      .eq('status', 'accepted')
      .order('invited_at', { ascending: false });

    if (error) {
      console.error('Error fetching collaborators:', error);
      throw error;
    }

    if (!collaborators || collaborators.length === 0) {
      return [];
    }

    // Get unique user IDs
    const userIds = [...new Set(collaborators.map(c => c.user_id))];

    // Fetch user profiles separately
    const { data: profiles, error: profilesError } = await supabase
      .from('user_profiles')
      .select('user_id, name, email, organization')
      .in('user_id', userIds);

    if (profilesError) {
      console.error('Error fetching user profiles:', profilesError);
      // Return collaborators without profile data if profiles fail
      return collaborators.map(c => ({ ...c, user_profiles: undefined }));
    }

    // Merge profiles with collaborators
    const profilesMap = new Map(profiles?.map(p => [p.user_id, p]) || []);
    
    return collaborators.map(collaborator => ({
      ...collaborator,
      user_profiles: profilesMap.get(collaborator.user_id)
    }));
  }

  // Convidar colaborador
  static async inviteCollaborator(
    processId: string,
    email: string,
    permissionLevel: 'viewer' | 'editor' | 'admin'
  ): Promise<CollaborationInvite> {
    // Verificar se o usuário já é colaborador
    const { data: existingCollaborator } = await supabase
      .from('process_collaborators')
      .select('id')
      .eq('process_id', processId)
      .eq('user_id', (await supabase.from('user_profiles').select('user_id').eq('email', email).single()).data?.user_id)
      .single();

    if (existingCollaborator) {
      throw new Error('Usuário já é colaborador deste processo');
    }

    // Criar convite
    const { data, error } = await supabase
      .from('collaboration_invites')
      .insert({
        process_id: processId,
        invited_email: email,
        permission_level: permissionLevel
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating invite:', error);
      throw error;
    }

    // Log da atividade
    await this.logActivity(processId, 'collaborator_invited', `Colaborador convidado: ${email}`);

    return data;
  }

  // Aceitar convite
  static async acceptInvite(inviteId: string): Promise<void> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');

    // Buscar convite
    const { data: invite, error: inviteError } = await supabase
      .from('collaboration_invites')
      .select('*')
      .eq('id', inviteId)
      .eq('invited_email', user.email)
      .eq('status', 'pending')
      .single();

    if (inviteError || !invite) {
      throw new Error('Convite não encontrado ou expirado');
    }

    // Verificar se não expirou
    if (new Date(invite.expires_at) < new Date()) {
      throw new Error('Convite expirado');
    }

    // Criar colaboração
    const { error: collabError } = await supabase
      .from('process_collaborators')
      .insert({
        process_id: invite.process_id,
        user_id: user.id,
        invited_by: invite.invited_by,
        permission_level: invite.permission_level,
        status: 'accepted',
        accepted_at: new Date().toISOString()
      });

    if (collabError) {
      console.error('Error creating collaboration:', collabError);
      throw collabError;
    }

    // Marcar convite como aceito
    await supabase
      .from('collaboration_invites')
      .update({ status: 'accepted' })
      .eq('id', inviteId);

    // Log da atividade
    await this.logActivity(invite.process_id, 'collaborator_joined', `${user.email} aceitou o convite`);
  }

  // Remover colaborador
  static async removeCollaborator(processId: string, userId: string): Promise<void> {
    const { error } = await supabase
      .from('process_collaborators')
      .update({ status: 'revoked' })
      .eq('process_id', processId)
      .eq('user_id', userId);

    if (error) {
      console.error('Error removing collaborator:', error);
      throw error;
    }

    // Log da atividade
    await this.logActivity(processId, 'collaborator_removed', 'Colaborador removido');
  }

  // Alterar permissão de colaborador
  static async updateCollaboratorPermission(
    processId: string,
    userId: string,
    newPermission: 'viewer' | 'editor' | 'admin'
  ): Promise<void> {
    const { error } = await supabase
      .from('process_collaborators')
      .update({ permission_level: newPermission })
      .eq('process_id', processId)
      .eq('user_id', userId);

    if (error) {
      console.error('Error updating collaborator permission:', error);
      throw error;
    }

    // Log da atividade
    await this.logActivity(processId, 'permission_changed', `Permissão alterada para: ${newPermission}`);
  }

  // Obter convites pendentes do usuário
  static async getUserInvites(): Promise<CollaborationInvite[]> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');

    const { data, error } = await supabase
      .from('collaboration_invites')
      .select('*')
      .eq('invited_email', user.email)
      .eq('status', 'pending')
      .gt('expires_at', new Date().toISOString())
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching invites:', error);
      throw error;
    }

    return data || [];
  }

  // Obter log de atividades
  static async getActivityLog(processId: string): Promise<ActivityLog[]> {
    const { data, error } = await supabase
      .from('activity_logs')
      .select(`
        *,
        user_profiles(name, email)
      `)
      .eq('process_id', processId)
      .order('created_at', { ascending: false })
      .limit(50);

    if (error) {
      console.error('Error fetching activity log:', error);
      throw error;
    }

    return data || [];
  }

  // Verificar permissão do usuário em um processo
  static async getUserPermission(processId: string): Promise<'owner' | 'admin' | 'editor' | 'viewer' | null> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return null;

    // Verificar se é o proprietário
    const { data: process } = await supabase
      .from('license_processes')
      .select('user_id')
      .eq('id', processId)
      .single();

    if (process?.user_id === user.id) {
      return 'owner';
    }

    // Verificar colaboração
    const { data: collaboration } = await supabase
      .from('process_collaborators')
      .select('permission_level')
      .eq('process_id', processId)
      .eq('user_id', user.id)
      .eq('status', 'accepted')
      .single();

    return collaboration?.permission_level || null;
  }

  // Log de atividade
  static async logActivity(
    processId: string,
    action: string,
    description?: string,
    metadata?: any
  ): Promise<void> {
    const { error } = await supabase.rpc('log_activity', {
      p_process_id: processId,
      p_action: action,
      p_description: description,
      p_metadata: metadata
    });

    if (error) {
      console.error('Error logging activity:', error);
    }
  }

  // Obter processos onde o usuário é colaborador
  static async getCollaboratedProcesses(): Promise<any[]> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');

    const { data, error } = await supabase
      .from('license_processes')
      .select(`
        *,
        companies(*),
        process_collaborators!inner(permission_level)
      `)
      .eq('process_collaborators.user_id', user.id)
      .eq('process_collaborators.status', 'accepted')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching collaborated processes:', error);
      throw error;
    }

    return data || [];
  }
}