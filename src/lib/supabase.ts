import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

// Verificação detalhada da configuração
const configStatus = {
  url: supabaseUrl ? 'Configured' : 'Missing',
  key: supabaseAnonKey ? 'Configured' : 'Missing',
  env: import.meta.env.MODE,
  urlPreview: supabaseUrl ? supabaseUrl.substring(0, 30) + '...' : 'Not set',
  keyPreview: supabaseAnonKey ? supabaseAnonKey.substring(0, 20) + '...' : 'Not set'
};

console.log('🔧 Supabase Config Check:', configStatus);

// Check if Supabase is properly configured
if (!supabaseUrl || !supabaseAnonKey) {
  console.error('❌ Supabase não configurado! Verifique as variáveis de ambiente.');
  console.error('📋 Instruções:');
  console.error('1. Copie .env.example para .env');
  console.error('2. Configure VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY');
  console.error('3. Reinicie o servidor de desenvolvimento');
} else {
  console.log('✅ Supabase configuration found');
}

// Verificar se as variáveis são placeholders
const isPlaceholder = (value: string) => {
  return value && (
    value.includes('placeholder') ||
    value.includes('your_') ||
    value.includes('sua_') ||
    value === 'https://placeholder.supabase.co' ||
    value === 'placeholder-key'
  );
};

const hasPlaceholders = isPlaceholder(supabaseUrl || '') || isPlaceholder(supabaseAnonKey || '');

if (hasPlaceholders) {
  console.error('❌ Detectadas variáveis placeholder! Configure com valores reais do Supabase.');
}

export const supabase = createClient(
  supabaseUrl || 'https://placeholder.supabase.co',
  supabaseAnonKey || 'placeholder-key',
  {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
    },
    global: {
      headers: {
        'X-Client-Info': 'supabase-js-web'
      }
    }
  }
);

// Helper function to check if Supabase is configured
export const isSupabaseConfigured = () => {
  const hasValues = !!(supabaseUrl && supabaseAnonKey);
  const notPlaceholders = !hasPlaceholders;
  return hasValues && notPlaceholders;
};

// Test connection function
export const testSupabaseConnection = async () => {
  if (!isSupabaseConfigured()) {
    throw new Error('Supabase não configurado. Verifique as variáveis de ambiente VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY');
  }
  
  try {
    // Teste simples de conexão
    const { data, error } = await supabase.auth.getSession();
    if (error) {
      console.error('Erro na conexão:', error);
      throw new Error(`Erro de conexão: ${error.message}`);
    }
    console.log('✅ Supabase conectado com sucesso');
    return true;
  } catch (err) {
    console.error('❌ Falha na conexão Supabase:', err);
    throw err;
  }
};

// Database types based on actual schema
export type Database = {
  public: {
    Tables: {
      companies: {
        Row: {
          id: string;
          user_id: string;
          name: string;
          cnpj: string;
          email: string;
          phone?: string;
          address?: string;
          city: string;
          state: string;
          cep?: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          name: string;
          cnpj: string;
          email: string;
          phone?: string;
          address?: string;
          city: string;
          state: string;
          cep?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          name?: string;
          cnpj?: string;
          email?: string;
          phone?: string;
          address?: string;
          city?: string;
          state?: string;
          cep?: string;
          created_at?: string;
          updated_at?: string;
        };
      };
      license_processes: {
        Row: {
          id: string;
          user_id: string;
          company_id: string;
          protocol_number: string;
          license_type: 'LP' | 'LI' | 'LO';
          activity: string;
          municipality: string;
          project_description?: string;
          status: 'submitted' | 'em_analise' | 'documentacao_pendente' | 'aprovado' | 'rejeitado';
          analyst_name?: string;
          analyst_organ?: string;
          submit_date: string;
          expected_date?: string;
          approval_date?: string;
          progress?: number;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          company_id: string;
          protocol_number?: string;
          license_type: 'LP' | 'LI' | 'LO';
          activity: string;
          municipality: string;
          project_description?: string;
          status?: 'submitted' | 'em_analise' | 'documentacao_pendente' | 'aprovado' | 'rejeitado';
          analyst_name?: string;
          analyst_organ?: string;
          submit_date?: string;
          expected_date?: string;
          approval_date?: string;
          progress?: number;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          company_id?: string;
          protocol_number?: string;
          license_type?: 'LP' | 'LI' | 'LO';
          activity?: string;
          municipality?: string;
          project_description?: string;
          status?: 'submitted' | 'em_analise' | 'documentacao_pendente' | 'aprovado' | 'rejeitado';
          analyst_name?: string;
          analyst_organ?: string;
          submit_date?: string;
          expected_date?: string;
          approval_date?: string;
          progress?: number;
          created_at?: string;
          updated_at?: string;
        };
      };
      process_documents: {
        Row: {
          id: string;
          user_id: string;
          process_id: string;
          name: string;
          file_path?: string;
          file_size?: number;
          file_type?: string;
          uploaded_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          process_id: string;
          name: string;
          file_path?: string;
          file_size?: number;
          file_type?: string;
          uploaded_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          process_id?: string;
          name?: string;
          file_path?: string;
          file_size?: number;
          file_type?: string;
          uploaded_at?: string;
        };
      };
      process_movements: {
        Row: {
          id: string;
          process_id: string;
          status: string;
          description?: string;
          analyst_name?: string;
          movement_date: string;
        };
        Insert: {
          id?: string;
          process_id: string;
          status: string;
          description?: string;
          analyst_name?: string;
          movement_date?: string;
        };
        Update: {
          id?: string;
          process_id?: string;
          status?: string;
          description?: string;
          analyst_name?: string;
          movement_date?: string;
        };
      };
      user_profiles: {
        Row: {
          id: string;
          user_id: string;
          name: string;
          email: string;
          role?: string;
          organization?: string;
          phone?: string;
          avatar_url?: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          name: string;
          email: string;
          role?: string;
          organization?: string;
          phone?: string;
          avatar_url?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          name?: string;
          email?: string;
          role?: string;
          organization?: string;
          phone?: string;
          avatar_url?: string;
          created_at?: string;
          updated_at?: string;
        };
      };
      process_collaborators: {
        Row: {
          id: string;
          process_id: string;
          user_id: string;
          invited_by?: string;
          permission_level: 'viewer' | 'editor' | 'admin';
          invited_at: string;
          accepted_at?: string;
          status: 'pending' | 'accepted' | 'declined' | 'revoked';
        };
        Insert: {
          id?: string;
          process_id: string;
          user_id: string;
          invited_by?: string;
          permission_level: 'viewer' | 'editor' | 'admin';
          invited_at?: string;
          accepted_at?: string;
          status?: 'pending' | 'accepted' | 'declined' | 'revoked';
        };
        Update: {
          id?: string;
          process_id?: string;
          user_id?: string;
          invited_by?: string;
          permission_level?: 'viewer' | 'editor' | 'admin';
          invited_at?: string;
          accepted_at?: string;
          status?: 'pending' | 'accepted' | 'declined' | 'revoked';
        };
      };
      collaboration_invites: {
        Row: {
          id: string;
          process_id: string;
          invited_email: string;
          invited_by: string;
          permission_level: 'viewer' | 'editor' | 'admin';
          invite_token: string;
          expires_at: string;
          status: 'pending' | 'accepted' | 'expired' | 'revoked';
          created_at: string;
        };
        Insert: {
          id?: string;
          process_id: string;
          invited_email: string;
          invited_by: string;
          permission_level: 'viewer' | 'editor' | 'admin';
          invite_token?: string;
          expires_at?: string;
          status?: 'pending' | 'accepted' | 'expired' | 'revoked';
          created_at?: string;
        };
        Update: {
          id?: string;
          process_id?: string;
          invited_email?: string;
          invited_by?: string;
          permission_level?: 'viewer' | 'editor' | 'admin';
          invite_token?: string;
          expires_at?: string;
          status?: 'pending' | 'accepted' | 'expired' | 'revoked';
          created_at?: string;
        };
      };
      activity_logs: {
        Row: {
          id: string;
          process_id?: string;
          user_id?: string;
          action: string;
          description?: string;
          metadata?: any;
          created_at: string;
        };
        Insert: {
          id?: string;
          process_id?: string;
          user_id?: string;
          action: string;
          description?: string;
          metadata?: any;
          created_at?: string;
        };
        Update: {
          id?: string;
          process_id?: string;
          user_id?: string;
          action?: string;
          description?: string;
          metadata?: any;
          created_at?: string;
        };
      };
      process_comments: {
        Row: {
          id: string;
          process_id: string;
          user_id: string;
          comment: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          process_id: string;
          user_id: string;
          comment: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          process_id?: string;
          user_id?: string;
          comment?: string;
          created_at?: string;
          updated_at?: string;
        };
      };
      property_types: {
        Row: {
          id: string;
          name: string;
          description?: string;
          is_active: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          description?: string;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          description?: string;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
      };
      enterprise_sizes: {
        Row: {
          id: string;
          name: string;
          description?: string;
          is_active: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          description?: string;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          description?: string;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
      };
      pollution_potentials: {
        Row: {
          id: string;
          name: string;
          description?: string;
          is_active: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          description?: string;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          description?: string;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
      };
      reference_units: {
        Row: {
          id: string;
          code: string;
          name: string;
          description?: string;
          is_active: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          code: string;
          name: string;
          description?: string;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          code?: string;
          name?: string;
          description?: string;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
      };
      license_types: {
        Row: {
          id: string;
          abbreviation: string;
          name: string;
          validity_period: number;
          time_unit: 'meses' | 'anos';
          description?: string;
          is_active: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          abbreviation: string;
          name: string;
          validity_period: number;
          time_unit: 'meses' | 'anos';
          description?: string;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          abbreviation?: string;
          name?: string;
          validity_period?: number;
          time_unit?: 'meses' | 'anos';
          description?: string;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
      };
      study_types: {
        Row: {
          id: string;
          abbreviation: string;
          name: string;
          description?: string;
          is_active: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          abbreviation: string;
          name: string;
          description?: string;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          abbreviation?: string;
          name?: string;
          description?: string;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
      };
      documentation_templates: {
        Row: {
          id: string;
          name: string;
          description: string;
          document_types: string[];
          template_file_path?: string;
          template_file_name?: string;
          template_file_size?: number;
          template_file_type?: string;
          is_active: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          description: string;
          document_types: string[];
          template_file_path?: string;
          template_file_name?: string;
          template_file_size?: number;
          template_file_type?: string;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          description?: string;
          document_types?: string[];
          template_file_path?: string;
          template_file_name?: string;
          template_file_size?: number;
          template_file_type?: string;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
      };
      activities: {
        Row: {
          id: string;
          code: number;
          name: string;
          description?: string;
          enterprise_size_id?: string;
          pollution_potential_id?: string;
          measurement_unit?: string;
          range_start?: number;
          range_end?: number;
          is_active: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          code: number;
          name: string;
          description?: string;
          enterprise_size_id?: string;
          pollution_potential_id?: string;
          measurement_unit?: string;
          range_start?: number;
          range_end?: number;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          code?: number;
          name?: string;
          description?: string;
          enterprise_size_id?: string;
          pollution_potential_id?: string;
          measurement_unit?: string;
          range_start?: number;
          range_end?: number;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
      };
      billing_configurations: {
        Row: {
          id: string;
          activity_id?: string;
          enterprise_size_id?: string;
          pollution_potential_id?: string;
          license_type_id?: string;
          reference_unit_id?: string;
          measurement_unit?: string;
          quantity_range_start?: number;
          quantity_range_end?: number;
          unit_value: number;
          multiplication_factor: number;
          revenue_destination?: string;
          municipality_percentage?: number;
          state_percentage?: number;
          observations?: string;
          additional_variables?: any;
          is_exempt: boolean;
          is_active: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          activity_id?: string;
          enterprise_size_id?: string;
          pollution_potential_id?: string;
          license_type_id?: string;
          reference_unit_id?: string;
          measurement_unit?: string;
          quantity_range_start?: number;
          quantity_range_end?: number;
          unit_value: number;
          multiplication_factor?: number;
          revenue_destination?: string;
          municipality_percentage?: number;
          state_percentage?: number;
          observations?: string;
          additional_variables?: any;
          is_exempt?: boolean;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          activity_id?: string;
          enterprise_size_id?: string;
          pollution_potential_id?: string;
          license_type_id?: string;
          reference_unit_id?: string;
          measurement_unit?: string;
          quantity_range_start?: number;
          quantity_range_end?: number;
          unit_value?: number;
          multiplication_factor?: number;
          revenue_destination?: string;
          municipality_percentage?: number;
          state_percentage?: number;
          observations?: string;
          additional_variables?: any;
          is_exempt?: boolean;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
      };
      activity_license_types: {
        Row: {
          id: string;
          activity_id: string;
          license_type_id: string;
          is_required: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          activity_id: string;
          license_type_id: string;
          is_required?: boolean;
          created_at?: string;
        };
        Update: {
          id?: string;
          activity_id?: string;
          license_type_id?: string;
          is_required?: boolean;
          created_at?: string;
        };
      };
      activity_documents: {
        Row: {
          id: string;
          activity_id: string;
          documentation_template_id: string;
          is_required: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          activity_id: string;
          documentation_template_id: string;
          is_required?: boolean;
          created_at?: string;
        };
        Update: {
          id?: string;
          activity_id?: string;
          documentation_template_id?: string;
          is_required?: boolean;
          created_at?: string;
        };
      };
      process_types: {
        Row: {
          id: string;
          name: string;
          abbreviation?: string;
          description?: string;
          default_deadline_days?: number;
          display_order?: number;
          is_active: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          abbreviation?: string;
          description?: string;
          default_deadline_days?: number;
          display_order?: number;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          abbreviation?: string;
          description?: string;
          default_deadline_days?: number;
          display_order?: number;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
      };
    };
  };
};

// Helper function to get current user ID
export const getCurrentUserId = async () => {
  const { data: { user } } = await supabase.auth.getUser();
  return user?.id;
};