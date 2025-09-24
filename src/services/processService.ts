import { supabase } from '../lib/supabase';
import { isSupabaseConfigured } from '../lib/supabase';
import { CollaborationService } from './collaborationService';
import type { Database } from '../lib/supabase';

// Types based on actual database schema
type Process = Database['public']['Tables']['license_processes']['Row'];
type ProcessInsert = Database['public']['Tables']['license_processes']['Insert'];
type ProcessUpdate = Database['public']['Tables']['license_processes']['Update'];
type Company = Database['public']['Tables']['companies']['Row'];

export interface ProcessWithDetails extends Process {
  companies: Company;
}

export interface ProcessFilters {
  status?: string;
  licenseType?: string;
  search?: string;
}

export class ProcessService {
  static async getProcesses(filters?: ProcessFilters): Promise<ProcessWithDetails[]> {
    try {
      if (!isSupabaseConfigured()) {
        console.warn('Supabase not configured, returning empty processes');
        return [];
      }

      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError) {
        console.warn('Auth error (likely not configured):', userError.message);
        if (userError.message.includes('Failed to fetch') || userError.message.includes('fetch')) {
          console.warn('Connection failed, returning empty processes');
          return [];
        }
        // Don't throw error, just return empty array for better UX
        return [];
      }
      if (!user) {
        console.warn('User not authenticated, returning empty processes');
        return [];
      }

      console.log('🔒 Loading processes for user:', user.id.substring(0, 8) + '...');

      // Get both owned and collaborated processes
      let ownedQuery = supabase
        .from('license_processes')
        .select(`
          *,
          companies(*)
        `)
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      let collaboratedQuery = supabase
        .from('license_processes')
        .select(`
          *,
          companies(*),
          process_collaborators!inner(permission_level)
        `)
        .eq('process_collaborators.user_id', user.id)
        .eq('process_collaborators.status', 'accepted')
        .order('created_at', { ascending: false });

      if (filters?.status && filters.status !== 'all') {
        ownedQuery = ownedQuery.eq('status', filters.status);
        collaboratedQuery = collaboratedQuery.eq('status', filters.status);
      }

      if (filters?.licenseType) {
        ownedQuery = ownedQuery.eq('license_type', filters.licenseType);
        collaboratedQuery = collaboratedQuery.eq('license_type', filters.licenseType);
      }

      const [ownedResult, collaboratedResult] = await Promise.all([
        ownedQuery,
        collaboratedQuery
      ]);
      
      if (ownedResult.error) {
        console.error('Error fetching owned processes:', ownedResult.error);
        if (ownedResult.error.message.includes('Failed to fetch') || ownedResult.error.message.includes('fetch')) {
          console.warn('Database connection failed, returning empty processes');
          return [];
        }
        throw new Error('Erro ao carregar processos próprios: ' + ownedResult.error.message);
      }
      
      if (collaboratedResult.error) {
        console.error('Error fetching collaborated processes:', collaboratedResult.error);
        // Don't throw error for collaborated processes, just log it
        console.warn('Could not load collaborated processes, continuing with owned only');
      }
      
      // Combine and deduplicate processes
      const ownedProcesses = ownedResult.data || [];
      const collaboratedProcesses = collaboratedResult.data || [];
      
      // Mark processes with collaboration info
      const markedOwned = ownedProcesses.map(p => ({ ...p, isOwner: true }));
      const markedCollaborated = collaboratedProcesses.map(p => ({ ...p, isOwner: false }));
      
      // Combine and remove duplicates (in case user owns and collaborates on same process)
      const allProcesses = [...markedOwned];
      collaboratedProcesses.forEach(collab => {
        if (!ownedProcesses.find(owned => owned.id === collab.id)) {
          allProcesses.push({ ...collab, isOwner: false });
        }
      });
      
      console.log('✅ Loaded', ownedProcesses.length, 'owned +', collaboratedProcesses.length, 'collaborated processes');
      
      // Filter by search term if provided
      if (filters?.search) {
        const searchTerm = filters.search.toLowerCase();
        return allProcesses.filter(process => 
          process.companies?.name.toLowerCase().includes(searchTerm) ||
          process.activity.toLowerCase().includes(searchTerm)
        );
      }

      return allProcesses;
    } catch (error) {
      console.error('ProcessService.getProcesses error:', error);
      if (error.message?.includes('Failed to fetch') || error.message?.includes('fetch')) {
        console.warn('Connection error in getProcesses, returning empty array');
        return [];
      }
      throw error;
    }
  }

  static async getProcessById(id: string): Promise<ProcessWithDetails | null> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');

    const { data, error } = await supabase
      .from('license_processes')
      .select(`
        *,
        companies(*)
      `)
      .eq('id', id)
      .eq('user_id', user.id)
      .single();

    if (error) {
      console.error('Error fetching process:', error);
      throw error;
    }

    return data;
  }

  static async createProcess(processData: any): Promise<Process> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');

    // First, create or get the company
    let companyId = processData.companyId;
    
    if (!companyId) {
      const { data: company, error: companyError } = await supabase
        .from('companies')
        .insert({
          user_id: user.id,
          name: processData.company,
          cnpj: processData.cnpj,
          email: processData.email || user.email || '',
          city: processData.city,
          state: processData.state,
          address: processData.location
        })
        .select()
        .single();

      if (companyError) {
        console.error('Error creating company:', companyError);
        throw companyError;
      }
      
      companyId = company.id;
    }

    // Calculate expected date (6 months for LP/LI, 3 years for LO)
    const expectedMonths = processData.licenseType === 'LO' ? 36 : 6;
    const expectedDate = new Date();
    expectedDate.setMonth(expectedDate.getMonth() + expectedMonths);

    const newProcess: ProcessInsert = {
      user_id: user.id,
      company_id: companyId,
      license_type: processData.licenseType,
      activity: processData.activity,
      municipality: processData.city,
      project_description: processData.description,
      status: 'submitted',
      progress: 0,
      submit_date: new Date().toISOString().split('T')[0],
      expected_date: expectedDate.toISOString().split('T')[0]
    };

    const { data, error } = await supabase
      .from('license_processes')
      .insert(newProcess)
      .select()
      .single();

    if (error) {
      console.error('Error creating process:', error);
      throw error;
    }

    return data;
  }

  static async updateProcess(id: string, updates: Partial<ProcessUpdate>): Promise<Process> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');

    console.log('ProcessService.updateProcess called with:', { id, updates, userId: user.id.substring(0, 8) + '...' });

    const updateData = {
      ...updates,
      updated_at: new Date().toISOString()
    };

    console.log('Update data prepared for process:', id);

    const { data, error } = await supabase
      .from('license_processes')
      .update(updateData)
      .eq('id', id)
      .eq('user_id', user.id)
      .select()
      .single();

    if (error) {
      console.error('Error updating process:', error);
      console.error('Error details for process:', id);
      
      // Log activity for collaboration
      if (updates.status) {
        await CollaborationService.logActivity(id, 'status_changed', `Status alterado para: ${updates.status}`);
      }
      throw error;
    }

    if (!data) {
      throw new Error('No process found with the given ID for this user');
    }

    console.log('Process updated successfully:', data);
    return data;
  }

  static async deleteProcess(id: string): Promise<void> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');

    const { error } = await supabase
      .from('license_processes')
      .delete()
      .eq('id', id)
      .eq('user_id', user.id);

    if (error) {
      console.error('Error deleting process:', error);
      throw error;
    }
  }

  static async getProcessStats() {
    try {
      if (!isSupabaseConfigured()) {
        console.warn('Supabase not configured, returning default stats');
        return {
          total: 0,
          pending: 0,
          analysis: 0,
          approved: 0,
          rejected: 0,
          expired: 0
        };
      }

      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError) {
        console.warn('Auth error in getProcessStats (likely not configured):', userError.message);
        if (userError.message.includes('Failed to fetch') || userError.message.includes('fetch')) {
          console.warn('Connection failed, returning default stats');
          return {
            total: 0,
            pending: 0,
            analysis: 0,
            approved: 0,
            rejected: 0,
            expired: 0
          };
        }
        // Don't throw error, just return default stats for better UX
        return {
          total: 0,
          pending: 0,
          analysis: 0,
          approved: 0,
          rejected: 0,
          expired: 0
        };
      }
      if (!user) {
        console.warn('User not authenticated, returning default stats');
        return {
          total: 0,
          pending: 0,
          analysis: 0,
          approved: 0,
          rejected: 0,
          expired: 0
        };
      }

      const { data, error } = await supabase
        .from('license_processes')
        .select('status')
        .eq('user_id', user.id);

      if (error) {
        console.error('Error fetching process stats:', error);
        if (error.message.includes('Failed to fetch') || error.message.includes('fetch')) {
          console.warn('Database connection failed, returning default stats');
          return {
            total: 0,
            pending: 0,
            analysis: 0,
            approved: 0,
            rejected: 0,
            expired: 0
          };
        }
        throw new Error('Erro ao carregar estatísticas: ' + error.message);
      }

      const processData = data || [];
      const stats = {
        total: processData.length,
        pending: processData.filter(p => p.status === 'submitted').length,
        analysis: processData.filter(p => p.status === 'em_analise').length,
        approved: processData.filter(p => p.status === 'aprovado').length,
        rejected: processData.filter(p => p.status === 'rejeitado').length,
        expired: 0 // Will implement expiration logic later
      };

      return stats;
    } catch (error) {
      console.error('ProcessService.getProcessStats error:', error);
      if (error.message?.includes('Failed to fetch') || error.message?.includes('fetch')) {
        console.warn('Connection error in getProcessStats, returning default stats');
        return {
          total: 0,
          pending: 0,
          analysis: 0,
          approved: 0,
          rejected: 0,
          expired: 0
        };
      }
      throw error;
    }
  }
}