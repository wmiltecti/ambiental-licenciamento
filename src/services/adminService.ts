import { supabase } from '../lib/supabase';

// Types for admin entities
export interface PropertyType {
  id: string;
  name: string;
  description?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface EnterpriseSize {
  id: string;
  name: string;
  description?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface PollutionPotential {
  id: string;
  name: string;
  description?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface ReferenceUnit {
  id: string;
  code: string;
  name: string;
  description?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface LicenseType {
  id: string;
  abbreviation: string;
  name: string;
  validity_period: number;
  time_unit: 'meses' | 'anos';
  description?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface StudyType {
  id: string;
  abbreviation: string;
  name: string;
  description?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface DocumentationTemplate {
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
}

export interface Activity {
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
  enterprise_sizes?: EnterpriseSize;
  pollution_potentials?: PollutionPotential;
  license_types?: LicenseType[];
  documentation_templates?: DocumentationTemplate[];
}

export interface BillingConfiguration {
  id: string;
  activity_id?: string;
  enterprise_size_id?: string;
  pollution_potential_id?: string;
  measurement_unit?: string;
  quantity_range_start?: number;
  quantity_range_end?: number;
  license_type_id?: string;
  reference_unit_id?: string;
  unit_value: number;
  multiplication_factor: number;
  is_exempt: boolean;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  activities?: Activity;
  enterprise_sizes?: EnterpriseSize;
  pollution_potentials?: PollutionPotential;
  license_types?: LicenseType;
  reference_units?: ReferenceUnit;
}

export interface BillingConfigurationWithRelations extends BillingConfiguration {
  activities?: {
    id: string;
    code: number;
    name: string;
    enterprise_sizes?: { name: string };
    pollution_potentials?: { name: string };
  };
  license_types?: {
    id: string;
    abbreviation: string;
    name: string;
  };
  reference_units?: {
    id: string;
    code: string;
    name: string;
  };
  enterprise_sizes?: {
    id: string;
    name: string;
  };
  pollution_potentials?: {
    id: string;
    name: string;
  };
}

// Generic CRUD service class
export class AdminService {
  // Generic methods for all entities
  static async getAll<T>(tableName: string, includeInactive = false): Promise<T[]> {
    let query = supabase.from(tableName).select('*');
    
    if (!includeInactive) {
      query = query.eq('is_active', true);
    }
    
    const { data, error } = await query.order('created_at', { ascending: false });
    
    if (error) {
      console.error(`Error fetching ${tableName}:`, error);
      throw error;
    }
    
    return data || [];
  }

  static async getById<T>(tableName: string, id: string): Promise<T | null> {
    const { data, error } = await supabase
      .from(tableName)
      .select('*')
      .eq('id', id)
      .single();
    
    if (error) {
      console.error(`Error fetching ${tableName} by id:`, error);
      throw error;
    }
    
    return data;
  }

  static async create<T>(tableName: string, item: Partial<T>): Promise<T> {
    const { data, error } = await supabase
      .from(tableName)
      .insert(item)
      .select()
      .single();
    
    if (error) {
      console.error(`Error creating ${tableName}:`, error);
      throw error;
    }
    
    return data;
  }

  static async update<T>(tableName: string, id: string, updates: Partial<T>): Promise<T> {
    const { data, error } = await supabase
      .from(tableName)
      .update(updates)
      .eq('id', id)
      .select()
      .single();
    
    if (error) {
      console.error(`Error updating ${tableName}:`, error);
      throw error;
    }
    
    return data;
  }

  static async delete(tableName: string, id: string): Promise<void> {
    const { error } = await supabase
      .from(tableName)
      .delete()
      .eq('id', id);
    
    if (error) {
      console.error(`Error deleting ${tableName}:`, error);
      throw error;
    }
  }

  static async toggleActive(tableName: string, id: string, isActive: boolean): Promise<void> {
    const { error } = await supabase
      .from(tableName)
      .update({ is_active: isActive })
      .eq('id', id);
    
    if (error) {
      console.error(`Error toggling ${tableName} active status:`, error);
      throw error;
    }
  }

  // Specific methods for complex entities

  // Activities with relationships
  static async getActivities(includeInactive = false): Promise<Activity[]> {
    let query = supabase
      .from('activities')
      .select(`
        *,
        enterprise_sizes(id, name),
        pollution_potentials(id, name)
      `);
    
    if (!includeInactive) {
      query = query.eq('is_active', true);
    }
    
    const { data, error } = await query.order('code', { ascending: true });
    
    if (error) {
      console.error('Error fetching activities:', error);
      throw error;
    }
    
    return data || [];
  }

  static async getActivityById(id: string): Promise<Activity | null> {
    const { data, error } = await supabase
      .from('activities')
      .select(`
        *,
        enterprise_sizes(id, name),
        pollution_potentials(id, name)
      `)
      .eq('id', id)
      .single();
    
    if (error) {
      console.error('Error fetching activity by id:', error);
      throw error;
    }
    
    return data;
  }

  // Activity relationships
  static async getActivityLicenseTypes(activityId: string): Promise<LicenseType[]> {
    const { data, error } = await supabase
      .from('activity_license_types')
      .select(`
        license_types(*)
      `)
      .eq('activity_id', activityId);
    
    if (error) {
      console.error('Error fetching activity license types:', error);
      throw error;
    }
    
    return data?.map(item => item.license_types).filter(Boolean) || [];
  }

  static async getActivityDocuments(activityId: string): Promise<DocumentationTemplate[]> {
    const { data, error } = await supabase
      .from('activity_documents')
      .select(`
        documentation_templates(*),
        is_required
      `)
      .eq('activity_id', activityId);
    
    if (error) {
      console.error('Error fetching activity documents:', error);
      throw error;
    }
    
    return data?.map(item => ({
      ...item.documentation_templates,
      is_required: item.is_required
    })).filter(Boolean) || [];
  }

  static async updateActivityLicenseTypes(activityId: string, licenseTypeIds: string[]): Promise<void> {
    // Remove existing relationships
    await supabase
      .from('activity_license_types')
      .delete()
      .eq('activity_id', activityId);
    
    // Add new relationships
    if (licenseTypeIds.length > 0) {
      const relationships = licenseTypeIds.map(licenseTypeId => ({
        activity_id: activityId,
        license_type_id: licenseTypeId
      }));
      
      const { error } = await supabase
        .from('activity_license_types')
        .insert(relationships);
      
      if (error) {
        console.error('Error updating activity license types:', error);
        throw error;
      }
    }
  }

  static async updateActivityDocuments(
    activityId: string, 
    documents: { id: string; is_required: boolean }[]
  ): Promise<void> {
    // Remove existing relationships
    await supabase
      .from('activity_documents')
      .delete()
      .eq('activity_id', activityId);
    
    // Add new relationships
    if (documents.length > 0) {
      const relationships = documents.map(doc => ({
        activity_id: activityId,
        documentation_template_id: doc.id,
        is_required: doc.is_required
      }));
      
      const { error } = await supabase
        .from('activity_documents')
        .insert(relationships);
      
      if (error) {
        console.error('Error updating activity documents:', error);
        throw error;
      }
    }
  }

  // Billing configurations with relationships
  static async getBillingConfigurations(includeInactive = false): Promise<BillingConfiguration[]> {
    let query = supabase
      .from('billing_configurations')
      .select(`
        *,
        activities(id, code, name, enterprise_sizes(name), pollution_potentials(name)),
        license_types(id, abbreviation, name),
        reference_units(id, code, name),
        enterprise_sizes(id, name),
        pollution_potentials(id, name)
      `);
    
    if (!includeInactive) {
      query = query.eq('is_active', true);
    }
    
    const { data, error } = await query.order('created_at', { ascending: false });
    
    if (error) {
      console.error('Error fetching billing configurations:', error);
      throw error;
    }
    
    return data || [];
  }

  static async getBillingConfigurationById(id: string): Promise<BillingConfigurationWithRelations | null> {
    const { data, error } = await supabase
      .from('billing_configurations')
      .select(`
        *,
        activities(id, code, name, enterprise_sizes(name), pollution_potentials(name)),
        license_types(id, abbreviation, name),
        reference_units(id, code, name),
        enterprise_sizes(id, name),
        pollution_potentials(id, name)
      `)
      .eq('id', id)
      .single();
    
    if (error) {
      console.error('Error fetching billing configuration by id:', error);
      throw error;
    }
    
    return data;
  }

  // File upload for documentation templates
  static async uploadTemplate(file: File): Promise<{ path: string; name: string; size: number; type: string }> {
    const fileName = `${Date.now()}-${file.name}`;
    const filePath = `templates/${fileName}`;
    
    const { data, error } = await supabase.storage
      .from('documents')
      .upload(filePath, file, {
        cacheControl: '3600',
        upsert: false
      });
    
    if (error) {
      console.error('Error uploading template:', error);
      throw error;
    }
    
    return {
      path: data.path,
      name: file.name,
      size: file.size,
      type: file.type
    };
  }

  static async deleteTemplate(filePath: string): Promise<void> {
    const { error } = await supabase.storage
      .from('documents')
      .remove([filePath]);
    
    if (error) {
      console.error('Error deleting template:', error);
      throw error;
    }
  }

  // Search functionality
  static async search<T>(
    tableName: string, 
    searchTerm: string, 
    searchFields: string[] = ['name']
  ): Promise<T[]> {
    let query = supabase.from(tableName).select('*');
    
    // Build OR conditions for search
    const orConditions = searchFields.map(field => `${field}.ilike.%${searchTerm}%`).join(',');
    query = query.or(orConditions);
    
    const { data, error } = await query
      .eq('is_active', true)
      .order('created_at', { ascending: false });
    
    if (error) {
      console.error(`Error searching ${tableName}:`, error);
      throw error;
    }
    
    return data || [];
  }
}