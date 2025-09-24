import React, { useState, useEffect } from 'react';
import { X, Save, Calculator, AlertTriangle } from 'lucide-react';
import { supabase } from '../../lib/supabase';

interface BillingConfigurationFormProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  item?: any;
  onSave: () => void;
}

interface Activity {
  id: string;
  code: number;
  name: string;
  enterprise_sizes?: { name: string };
  pollution_potentials?: { name: string };
  measurement_unit?: string;
  range_start?: number;
  range_end?: number;
}

interface LicenseType {
  id: string;
  abbreviation: string;
  name: string;
}

interface ReferenceUnit {
  id: string;
  code: string;
  name: string;
}

export default function BillingConfigurationForm({
  isOpen,
  onClose,
  title,
  item,
  onSave
}: BillingConfigurationFormProps) {
  const [formData, setFormData] = useState<any>({
    activity_id: '',
    license_type_id: '',
    reference_unit_id: '',
    unit_value: '',
    multiplication_factor: '1.0',
    is_exempt: false,
    revenue_destination: 'estado',
    municipality_percentage: '0',
    state_percentage: '100',
    observations: ''
  });
  
  const [loading, setLoading] = useState(false);
  const [activities, setActivities] = useState<Activity[]>([]);
  const [licenseTypes, setLicenseTypes] = useState<LicenseType[]>([]);
  const [referenceUnits, setReferenceUnits] = useState<ReferenceUnit[]>([]);
  const [selectedActivity, setSelectedActivity] = useState<Activity | null>(null);
  const [calculatedValue, setCalculatedValue] = useState<number>(0);

  useEffect(() => {
    if (isOpen) {
      loadDropdownData();
    }
  }, [isOpen]);

  useEffect(() => {
    if (item) {
      setFormData({
        activity_id: item.activity_id || '',
        license_type_id: item.license_type_id || '',
        reference_unit_id: item.reference_unit_id || '',
        unit_value: item.unit_value?.toString() || '',
        multiplication_factor: item.multiplication_factor?.toString() || '1.0',
        is_exempt: item.is_exempt || false,
        revenue_destination: item.revenue_destination || 'estado',
        municipality_percentage: item.municipality_percentage?.toString() || '0',
        state_percentage: item.state_percentage?.toString() || '100',
        observations: item.observations || ''
      });
    } else {
      setFormData({
        activity_id: '',
        license_type_id: '',
        reference_unit_id: '',
        unit_value: '',
        multiplication_factor: '1.0',
        is_exempt: false,
        revenue_destination: 'estado',
        municipality_percentage: '0',
        state_percentage: '100',
        observations: ''
      });
    }
  }, [item]);

  // Calculate final value when unit_value or multiplication_factor changes
  useEffect(() => {
    const unitValue = parseFloat(formData.unit_value) || 0;
    const factor = parseFloat(formData.multiplication_factor) || 1;
    setCalculatedValue(unitValue * factor);
  }, [formData.unit_value, formData.multiplication_factor]);

  // Update percentages when revenue_destination changes
  useEffect(() => {
    if (formData.revenue_destination === 'estado') {
      setFormData(prev => ({
        ...prev,
        municipality_percentage: '0',
        state_percentage: '100'
      }));
    } else if (formData.revenue_destination === 'municipio') {
      setFormData(prev => ({
        ...prev,
        municipality_percentage: '100',
        state_percentage: '0'
      }));
    }
  }, [formData.revenue_destination, setFormData]);

  const loadDropdownData = async () => {
    try {
      // Load activities with relationships
      const { data: activitiesData, error: activitiesError } = await supabase
        .from('activities')
        .select(`
          id, code, name, measurement_unit, range_start, range_end,
          enterprise_sizes(name),
          pollution_potentials(name)
        `)
        .eq('is_active', true)
        .order('code');

      if (activitiesError) throw activitiesError;
      setActivities(activitiesData || []);

      // Load license types
      const { data: licenseTypesData, error: licenseTypesError } = await supabase
        .from('license_types')
        .select('id, abbreviation, name')
        .eq('is_active', true)
        .order('abbreviation');

      if (licenseTypesError) throw licenseTypesError;
      setLicenseTypes(licenseTypesData || []);

      // Load reference units
      const { data: referenceUnitsData, error: referenceUnitsError } = await supabase
        .from('reference_units')
        .select('id, code, name')
        .eq('is_active', true)
        .order('code');

      if (referenceUnitsError) throw referenceUnitsError;
      setReferenceUnits(referenceUnitsData || []);

    } catch (error) {
      console.error('Error loading dropdown data:', error);
      alert('Erro ao carregar dados: ' + (error as Error).message);
    }
  };

  const handleActivityChange = (activityId: string) => {
    const activity = activities.find(a => a.id === activityId);
    setSelectedActivity(activity || null);
    setFormData(prev => ({ ...prev, activity_id: activityId }));
  };

  const handleInputChange = (field: string, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const validateForm = () => {
    if (!formData.activity_id) {
      alert('Selecione uma atividade');
      return false;
    }
    if (!formData.license_type_id) {
      alert('Selecione um tipo de licença');
      return false;
    }
    if (!formData.reference_unit_id) {
      alert('Selecione uma unidade de referência');
      return false;
    }
    if (!formData.unit_value || parseFloat(formData.unit_value) <= 0) {
      alert('Informe um valor base válido');
      return false;
    }
    
    // Validate percentages for partitioned revenue
    if (formData.revenue_destination === 'particionado') {
      const municipalityPerc = parseFloat(formData.municipality_percentage) || 0;
      const statePerc = parseFloat(formData.state_percentage) || 0;
      
      if (municipalityPerc + statePerc !== 100) {
        alert('A soma dos percentuais deve ser igual a 100%');
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
      const submitData = {
        activity_id: formData.activity_id,
        license_type_id: formData.license_type_id,
        reference_unit_id: formData.reference_unit_id,
        unit_value: parseFloat(formData.unit_value),
        multiplication_factor: parseFloat(formData.multiplication_factor) || 1.0,
        is_exempt: formData.is_exempt,
        revenue_destination: formData.revenue_destination,
        municipality_percentage: parseFloat(formData.municipality_percentage) || 0,
        state_percentage: parseFloat(formData.state_percentage) || 100,
        observations: formData.observations || null
      };

      if (item?.id) {
        const { error } = await supabase
          .from('billing_configurations')
          .update(submitData)
          .eq('id', item.id);
        
        if (error) throw error;
        alert('Configuração atualizada com sucesso!');
      } else {
        const { error } = await supabase
          .from('billing_configurations')
          .insert(submitData);
        
        if (error) {
          if (error.code === '23505') { // Unique constraint violation
            throw new Error('Já existe uma configuração para esta combinação de atividade, tipo de licença e características.');
          }
          throw error;
        }
        alert('Configuração criada com sucesso!');
      }

      onSave();
      onClose();
    } catch (error) {
      console.error('Error saving billing configuration:', error);
      alert('Erro ao salvar configuração: ' + (error as Error).message);
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
            <Calculator className="w-6 h-6 text-blue-600" />
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
          {/* Main Configuration */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Activity Selection */}
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Atividade <span className="text-red-500">*</span>
              </label>
              <select
                value={formData.activity_id}
                onChange={(e) => handleActivityChange(e.target.value)}
                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                required
              >
                <option value="">Selecione uma atividade...</option>
                {activities.map(activity => (
                  <option key={activity.id} value={activity.id}>
                    {activity.code} - {activity.name}
                    {activity.enterprise_sizes && ` (${activity.enterprise_sizes.name})`}
                    {activity.pollution_potentials && ` - ${activity.pollution_potentials.name}`}
                  </option>
                ))}
              </select>
            </div>

            {/* License Type */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Tipo de Licença <span className="text-red-500">*</span>
              </label>
              <select
                value={formData.license_type_id}
                onChange={(e) => handleInputChange('license_type_id', e.target.value)}
                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                required
              >
                <option value="">Selecione um tipo...</option>
                {licenseTypes.map(type => (
                  <option key={type.id} value={type.id}>
                    {type.abbreviation} - {type.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Reference Unit */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Unidade de Referência <span className="text-red-500">*</span>
              </label>
              <select
                value={formData.reference_unit_id}
                onChange={(e) => handleInputChange('reference_unit_id', e.target.value)}
                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                required
              >
                <option value="">Selecione uma unidade...</option>
                {referenceUnits.map(unit => (
                  <option key={unit.id} value={unit.id}>
                    {unit.code} - {unit.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Unit Value */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Valor Base (R$) <span className="text-red-500">*</span>
              </label>
              <input
                type="number"
                step="0.01"
                min="0"
                value={formData.unit_value}
                onChange={(e) => handleInputChange('unit_value', e.target.value)}
                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="Ex: 150.00"
                required
              />
            </div>

            {/* Multiplication Factor */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Fator de Multiplicação
              </label>
              <input
                type="number"
                step="0.01"
                min="0"
                value={formData.multiplication_factor}
                onChange={(e) => handleInputChange('multiplication_factor', e.target.value)}
                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="Ex: 2.5"
              />
            </div>
          </div>

          {/* Calculated Value Display */}
          {calculatedValue > 0 && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <div className="flex items-center space-x-2">
                <Calculator className="w-5 h-5 text-blue-600" />
                <span className="font-medium text-blue-900">
                  Valor Final Calculado: R$ {calculatedValue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </span>
              </div>
              <p className="text-sm text-blue-700 mt-1">
                {formData.unit_value} × {formData.multiplication_factor} = {calculatedValue.toFixed(2)}
              </p>
            </div>
          )}

          {/* Activity Details */}
          {selectedActivity && (
            <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
              <h4 className="font-medium text-gray-900 mb-3">Detalhes da Atividade Selecionada</h4>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                <div>
                  <span className="font-medium text-gray-700">Porte:</span>
                  <p className="text-gray-600">{selectedActivity.enterprise_sizes?.name || 'N/A'}</p>
                </div>
                <div>
                  <span className="font-medium text-gray-700">Potencial Poluidor:</span>
                  <p className="text-gray-600">{selectedActivity.pollution_potentials?.name || 'N/A'}</p>
                </div>
                <div>
                  <span className="font-medium text-gray-700">Unidade de Medida:</span>
                  <p className="text-gray-600">{selectedActivity.measurement_unit || 'N/A'}</p>
                </div>
                <div>
                  <span className="font-medium text-gray-700">Faixa:</span>
                  <p className="text-gray-600">
                    {selectedActivity.range_start && selectedActivity.range_end 
                      ? `${selectedActivity.range_start} - ${selectedActivity.range_end}`
                      : 'N/A'
                    }
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Revenue Configuration */}
          <div className="space-y-4">
            <h4 className="font-medium text-gray-900">Configuração de Receita</h4>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Destinação da Receita
              </label>
              <select
                value={formData.revenue_destination}
                onChange={(e) => handleInputChange('revenue_destination', e.target.value)}
                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="estado">Estado (100%)</option>
                <option value="municipio">Município (100%)</option>
                <option value="particionado">Particionado (Estado/Município)</option>
              </select>
            </div>

            {formData.revenue_destination === 'particionado' && (
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Percentual Município (%)
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    min="0"
                    max="100"
                    value={formData.municipality_percentage}
                    onChange={(e) => {
                      const value = parseFloat(e.target.value) || 0;
                      handleInputChange('municipality_percentage', e.target.value);
                      handleInputChange('state_percentage', (100 - value).toString());
                    }}
                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Percentual Estado (%)
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    min="0"
                    max="100"
                    value={formData.state_percentage}
                    onChange={(e) => {
                      const value = parseFloat(e.target.value) || 0;
                      handleInputChange('state_percentage', e.target.value);
                      handleInputChange('municipality_percentage', (100 - value).toString());
                    }}
                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
              </div>
            )}
          </div>

          {/* Additional Options */}
          <div className="space-y-4">
            <div className="flex items-center space-x-3">
              <input
                type="checkbox"
                id="is_exempt"
                checked={formData.is_exempt}
                onChange={(e) => handleInputChange('is_exempt', e.target.checked)}
                className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              />
              <label htmlFor="is_exempt" className="text-sm font-medium text-gray-700">
                Isenção de Taxa
              </label>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Observações
              </label>
              <textarea
                value={formData.observations}
                onChange={(e) => handleInputChange('observations', e.target.value)}
                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                rows={3}
                placeholder="Observações sobre a configuração de cobrança..."
              />
            </div>
          </div>

          {/* Warning about duplicates */}
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
            <div className="flex items-start space-x-2">
              <AlertTriangle className="w-5 h-5 text-yellow-600 mt-0.5" />
              <div>
                <h4 className="font-medium text-yellow-900">Atenção</h4>
                <p className="text-sm text-yellow-800 mt-1">
                  Não é permitido criar configurações duplicadas para a mesma combinação de 
                  atividade, tipo de licença, porte e potencial poluidor.
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