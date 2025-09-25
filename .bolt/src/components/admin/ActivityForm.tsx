import React, { useState, useEffect } from 'react';
import { X, Save, Activity, AlertTriangle, Plus, Trash2 } from 'lucide-react';
import { supabase } from '../../lib/supabase';

interface ActivityFormProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  item?: any;
  onSave: () => void;
}

interface LicenseType {
  id: string;
  abbreviation: string;
  name: string;
}

interface DocumentTemplate {
  id: string;
  name: string;
  description: string;
}

interface EnterpriseSize {
  id: string;
  name: string;
}

interface PollutionPotential {
  id: string;
  name: string;
}

export default function ActivityForm({
  isOpen,
  onClose,
  title,
  item,
  onSave
}: ActivityFormProps) {
  const [formData, setFormData] = useState<any>({
    code: '',
    name: '',
    description: '',
    enterprise_size_id: '',
    pollution_potential_id: '',
    measurement_unit: '',
    range_start: '',
    range_end: '',
    license_types: [],
    documents: []
  });
  
  const [loading, setLoading] = useState(false);
  const [licenseTypes, setLicenseTypes] = useState<LicenseType[]>([]);
  const [documentTemplates, setDocumentTemplates] = useState<DocumentTemplate[]>([]);
  const [enterpriseSizes, setEnterpriseSizes] = useState<EnterpriseSize[]>([]);
  const [pollutionPotentials, setPollutionPotentials] = useState<PollutionPotential[]>([]);

  const measurementUnits = [
    'Unidade',
    'Hectare (ha)',
    'Metro quadrado (m²)',
    'Metro cúbico (m³)',
    'Litro (L)',
    'Quilograma (kg)',
    'Tonelada (t)',
    'Megawatt (MW)',
    'Quilowatt (kW)',
    'Cabeças (animais)',
    'Metros lineares (m)',
    'Quilômetros (km)'
  ];

  useEffect(() => {
    if (isOpen) {
      loadDropdownData();
    }
  }, [isOpen]);

  useEffect(() => {
    if (item) {
      setFormData({
        code: item.code?.toString() || '',
        name: item.name || '',
        description: item.description || '',
        enterprise_size_id: item.enterprise_size_id || '',
        pollution_potential_id: item.pollution_potential_id || '',
        measurement_unit: item.measurement_unit || '',
        range_start: item.range_start?.toString() || '',
        range_end: item.range_end?.toString() || '',
        license_types: [],
        documents: []
      });
      
      if (item.id) {
        loadActivityRelationships(item.id);
      }
    } else {
      setFormData({
        code: '',
        name: '',
        description: '',
        enterprise_size_id: '',
        pollution_potential_id: '',
        measurement_unit: '',
        range_start: '',
        range_end: '',
        license_types: [],
        documents: []
      });
    }
  }, [item]);

  const loadDropdownData = async () => {
    try {
      // Load license types
      const { data: licenseTypesData, error: licenseTypesError } = await supabase
        .from('license_types')
        .select('id, abbreviation, name')
        .eq('is_active', true)
        .order('abbreviation');

      if (licenseTypesError) throw licenseTypesError;
      setLicenseTypes(licenseTypesData || []);

      // Load document templates
      const { data: documentsData, error: documentsError } = await supabase
        .from('documentation_templates')
        .select('id, name, description')
        .eq('is_active', true)
        .order('name');

      if (documentsError) throw documentsError;
      setDocumentTemplates(documentsData || []);

      // Load enterprise sizes
      const { data: enterpriseSizesData, error: enterpriseSizesError } = await supabase
        .from('enterprise_sizes')
        .select('id, name')
        .eq('is_active', true)
        .order('name');

      if (enterpriseSizesError) throw enterpriseSizesError;
      setEnterpriseSizes(enterpriseSizesData || []);

      // Load pollution potentials
      const { data: pollutionPotentialsData, error: pollutionPotentialsError } = await supabase
        .from('pollution_potentials')
        .select('id, name')
        .eq('is_active', true)
        .order('name');

      if (pollutionPotentialsError) throw pollutionPotentialsError;
      setPollutionPotentials(pollutionPotentialsData || []);

    } catch (error) {
      console.error('Error loading dropdown data:', error);
      alert('Erro ao carregar dados: ' + (error as Error).message);
    }
  };

  const loadActivityRelationships = async (activityId: string) => {
    try {
      // Load license types for this activity
      const { data: activityLicenseTypes, error: licenseError } = await supabase
        .from('activity_license_types')
        .select('license_type_id, is_required')
        .eq('activity_id', activityId);

      if (licenseError) throw licenseError;

      // Load documents for this activity
      const { data: activityDocuments, error: documentsError } = await supabase
        .from('activity_documents')
        .select('documentation_template_id, is_required')
        .eq('activity_id', activityId);

      if (documentsError) throw documentsError;

      setFormData(prev => ({
        ...prev,
        license_types: activityLicenseTypes || [],
        documents: activityDocuments || []
      }));

    } catch (error) {
      console.error('Error loading activity relationships:', error);
    }
  };

  const handleInputChange = (field: string, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleLicenseTypeToggle = (licenseTypeId: string) => {
    setFormData(prev => {
      const existingIndex = prev.license_types.findIndex(
        (lt: any) => lt.license_type_id === licenseTypeId
      );
      
      if (existingIndex >= 0) {
        // Remove if exists
        return {
          ...prev,
          license_types: prev.license_types.filter(
            (lt: any) => lt.license_type_id !== licenseTypeId
          )
        };
      } else {
        // Add if doesn't exist
        return {
          ...prev,
          license_types: [
            ...prev.license_types,
            { license_type_id: licenseTypeId, is_required: true }
          ]
        };
      }
    });
  };

  const handleDocumentToggle = (documentId: string) => {
    setFormData(prev => {
      const existingIndex = prev.documents.findIndex(
        (doc: any) => doc.documentation_template_id === documentId
      );
      
      if (existingIndex >= 0) {
        // Remove if exists
        return {
          ...prev,
          documents: prev.documents.filter(
            (doc: any) => doc.documentation_template_id !== documentId
          )
        };
      } else {
        // Add if doesn't exist
        return {
          ...prev,
          documents: [
            ...prev.documents,
            { documentation_template_id: documentId, is_required: true }
          ]
        };
      }
    });
  };

  const handleDocumentRequiredToggle = (documentId: string) => {
    setFormData(prev => ({
      ...prev,
      documents: prev.documents.map((doc: any) =>
        doc.documentation_template_id === documentId
          ? { ...doc, is_required: !doc.is_required }
          : doc
      )
    }));
  };

  const validateForm = () => {
    if (!formData.code) {
      alert('Código da atividade é obrigatório');
      return false;
    }
    if (!formData.name) {
      alert('Nome da atividade é obrigatório');
      return false;
    }
    if (formData.license_types.length === 0) {
      alert('Selecione pelo menos um tipo de licença');
      return false;
    }
    if (!formData.enterprise_size_id) {
      alert('Selecione o porte do empreendimento');
      return false;
    }
    if (!formData.pollution_potential_id) {
      alert('Selecione o potencial poluidor');
      return false;
    }
    
    // Validate range
    if (formData.range_start && formData.range_end) {
      const start = parseFloat(formData.range_start);
      const end = parseFloat(formData.range_end);
      if (start >= end) {
        alert('A faixa inicial deve ser menor que a faixa final');
        return false;
      }
    }
    
    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) return;
    
    setLoading(true);
    try {
      const activityData = {
        code: parseFloat(formData.code),
        name: formData.name,
        description: formData.description || null,
        enterprise_size_id: formData.enterprise_size_id,
        pollution_potential_id: formData.pollution_potential_id,
        measurement_unit: formData.measurement_unit || null,
        range_start: formData.range_start ? parseFloat(formData.range_start) : null,
        range_end: formData.range_end ? parseFloat(formData.range_end) : null
      };

      let activityId: string;

      if (item?.id) {
        // Update existing activity
        const { data, error } = await supabase
          .from('activities')
          .update(activityData)
          .eq('id', item.id)
          .select()
          .single();
        
        if (error) {
          if (error.code === '23505') {
            throw new Error('Já existe uma atividade com este código ou nome.');
          }
          throw error;
        }
        
        activityId = data.id;
        alert('Atividade atualizada com sucesso!');
      } else {
        // Create new activity
        const { data, error } = await supabase
          .from('activities')
          .insert(activityData)
          .select()
          .single();
        
        if (error) {
          if (error.code === '23505') {
            throw new Error('Já existe uma atividade com este código ou nome.');
          }
          throw error;
        }
        
        activityId = data.id;
        alert('Atividade criada com sucesso!');
      }

      // Update license types relationships
      await supabase
        .from('activity_license_types')
        .delete()
        .eq('activity_id', activityId);

      if (formData.license_types.length > 0) {
        const licenseTypeRelations = formData.license_types.map((lt: any) => ({
          activity_id: activityId,
          license_type_id: lt.license_type_id,
          is_required: lt.is_required
        }));

        const { error: licenseError } = await supabase
          .from('activity_license_types')
          .insert(licenseTypeRelations);

        if (licenseError) throw licenseError;
      }

      // Update documents relationships
      await supabase
        .from('activity_documents')
        .delete()
        .eq('activity_id', activityId);

      if (formData.documents.length > 0) {
        const documentRelations = formData.documents.map((doc: any) => ({
          activity_id: activityId,
          documentation_template_id: doc.documentation_template_id,
          is_required: doc.is_required
        }));

        const { error: documentsError } = await supabase
          .from('activity_documents')
          .insert(documentRelations);

        if (documentsError) throw documentsError;
      }

      onSave();
      onClose();
    } catch (error) {
      console.error('Error saving activity:', error);
      alert('Erro ao salvar atividade: ' + (error as Error).message);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div className="flex items-center space-x-3">
            <Activity className="w-6 h-6 text-blue-600" />
            <h2 className="text-xl font-bold text-gray-900">{title}</h2>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-6 overflow-y-auto max-h-[calc(90vh-140px)]">
          {/* Basic Information */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Código da Atividade <span className="text-red-500">*</span>
              </label>
              <input
                type="number"
                step="0.01"
                value={formData.code}
                onChange={(e) => handleInputChange('code', e.target.value)}
                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="Ex: 1.1, 1.56, 2.3"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Nome da Atividade <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => handleInputChange('name', e.target.value)}
                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="Ex: Extração de areia"
                required
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Descrição
            </label>
            <textarea
              value={formData.description}
              onChange={(e) => handleInputChange('description', e.target.value)}
              className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              rows={3}
              placeholder="Descrição detalhada da atividade"
            />
          </div>

          {/* Classification */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Porte do Empreendimento <span className="text-red-500">*</span>
              </label>
              <select
                value={formData.enterprise_size_id}
                onChange={(e) => handleInputChange('enterprise_size_id', e.target.value)}
                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                required
              >
                <option value="">Selecione o porte...</option>
                {enterpriseSizes.map(size => (
                  <option key={size.id} value={size.id}>
                    {size.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Potencial Poluidor <span className="text-red-500">*</span>
              </label>
              <select
                value={formData.pollution_potential_id}
                onChange={(e) => handleInputChange('pollution_potential_id', e.target.value)}
                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                required
              >
                <option value="">Selecione o potencial...</option>
                {pollutionPotentials.map(potential => (
                  <option key={potential.id} value={potential.id}>
                    {potential.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Measurement and Range */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Unidade de Medida
              </label>
              <select
                value={formData.measurement_unit}
                onChange={(e) => handleInputChange('measurement_unit', e.target.value)}
                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="">Selecione a unidade...</option>
                {measurementUnits.map(unit => (
                  <option key={unit} value={unit}>
                    {unit}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Faixa Inicial
              </label>
              <input
                type="number"
                step="0.01"
                value={formData.range_start}
                onChange={(e) => handleInputChange('range_start', e.target.value)}
                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="Ex: 0"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Faixa Final
              </label>
              <input
                type="number"
                step="0.01"
                value={formData.range_end}
                onChange={(e) => handleInputChange('range_end', e.target.value)}
                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="Ex: 1000"
              />
            </div>
          </div>

          {/* License Types */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-3">
              Tipos de Licença Aplicáveis <span className="text-red-500">*</span>
            </label>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {licenseTypes.map(licenseType => {
                const isSelected = formData.license_types.some(
                  (lt: any) => lt.license_type_id === licenseType.id
                );
                return (
                  <label
                    key={licenseType.id}
                    className={`flex items-center p-3 border rounded-lg cursor-pointer transition-colors ${
                      isSelected
                        ? 'border-blue-500 bg-blue-50'
                        : 'border-gray-300 hover:border-gray-400'
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={() => handleLicenseTypeToggle(licenseType.id)}
                      className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                    <div className="ml-3">
                      <span className="text-sm font-medium text-gray-900">
                        {licenseType.abbreviation}
                      </span>
                      <p className="text-xs text-gray-500">{licenseType.name}</p>
                    </div>
                  </label>
                );
              })}
            </div>
          </div>

          {/* Documents */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-3">
              Documentos Exigidos
            </label>
            <div className="space-y-2 max-h-60 overflow-y-auto border border-gray-200 rounded-lg p-3">
              {documentTemplates.map(document => {
                const selectedDoc = formData.documents.find(
                  (doc: any) => doc.documentation_template_id === document.id
                );
                const isSelected = !!selectedDoc;
                
                return (
                  <div
                    key={document.id}
                    className={`flex items-center justify-between p-3 border rounded-lg ${
                      isSelected
                        ? 'border-blue-500 bg-blue-50'
                        : 'border-gray-300'
                    }`}
                  >
                    <label className="flex items-center cursor-pointer flex-1">
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => handleDocumentToggle(document.id)}
                        className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                      />
                      <div className="ml-3 flex-1">
                        <span className="text-sm font-medium text-gray-900">
                          {document.name}
                        </span>
                        <p className="text-xs text-gray-500">{document.description}</p>
                      </div>
                    </label>
                    
                    {isSelected && (
                      <label className="flex items-center ml-3">
                        <input
                          type="checkbox"
                          checked={selectedDoc.is_required}
                          onChange={() => handleDocumentRequiredToggle(document.id)}
                          className="rounded border-gray-300 text-red-600 focus:ring-red-500"
                        />
                        <span className="ml-2 text-xs text-red-600 font-medium">
                          Obrigatório
                        </span>
                      </label>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Warning */}
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
            <div className="flex items-start space-x-2">
              <AlertTriangle className="w-5 h-5 text-yellow-600 mt-0.5" />
              <div>
                <h4 className="font-medium text-yellow-900">Atenção</h4>
                <p className="text-sm text-yellow-800 mt-1">
                  Não é permitido criar atividades com código ou nome duplicados. 
                  Certifique-se de selecionar pelo menos um tipo de licença aplicável.
                </p>
              </div>
            </div>
          </div>
        </form>

        {/* Footer */}
        <div className="flex justify-end space-x-3 p-6 border-t border-gray-200 bg-gray-50">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
          >
            Cancelar
          </button>
          <button
            onClick={handleSubmit}
            disabled={loading}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center gap-2 transition-colors"
          >
            {loading ? (
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              <Save className="w-4 h-4" />
            )}
            {loading ? 'Salvando...' : 'Salvar'}
          </button>
        </div>
      </div>
    </div>
  );
}