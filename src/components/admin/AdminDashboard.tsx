import React, { useState } from 'react';
import AdminLayout from './AdminLayout';
import GenericCRUD from './GenericCRUD';
import GenericForm from './GenericForm';
import BillingConfigurationForm from './BillingConfigurationForm';
import ActivityForm from './ActivityForm';

// Form field configurations for each entity
const entityConfigs = {
  'property-types': {
    title: 'Tipos de Imóvel',
    tableName: 'property_types',
    columns: [
      { key: 'name', label: 'Nome', type: 'text' as const },
      { key: 'description', label: 'Descrição', type: 'text' as const }
    ],
    formFields: [
      { key: 'name', label: 'Nome', type: 'text' as const, required: true, placeholder: 'Ex: Rural, Urbano, Linear' },
      { key: 'description', label: 'Descrição', type: 'textarea' as const, placeholder: 'Descrição detalhada do tipo de imóvel' }
    ]
  },
  'process-types': {
    title: 'Tipos de Processo',
    tableName: 'process_types',
    columns: [
      { key: 'name', label: 'Nome', type: 'text' as const },
      { key: 'abbreviation', label: 'Sigla', type: 'text' as const },
      { key: 'description', label: 'Descrição', type: 'text' as const },
      { 
        key: 'default_deadline_days', 
        label: 'Prazo (dias)', 
        type: 'number' as const,
        render: (value: number) => value ? `${value} dias` : '-'
      },
      { key: 'display_order', label: 'Ordem', type: 'number' as const }
    ],
    formFields: [
      { key: 'name', label: 'Nome do Tipo de Processo', type: 'text' as const, required: true, placeholder: 'Ex: Licença Prévia, Autorização Ambiental' },
      { key: 'abbreviation', label: 'Sigla/Abreviação', type: 'text' as const, placeholder: 'Ex: LP, AA, RE' },
      { key: 'description', label: 'Descrição', type: 'textarea' as const, placeholder: 'Descrição detalhada do tipo de processo' },
      { key: 'default_deadline_days', label: 'Prazo Padrão (dias)', type: 'number' as const, placeholder: 'Ex: 180, 120, 90' },
      { key: 'display_order', label: 'Ordem de Exibição', type: 'number' as const, placeholder: 'Ex: 1, 2, 3...' }
    ]
  },
  'enterprise-sizes': {
    title: 'Porte do Empreendimento',
    tableName: 'enterprise_sizes',
    columns: [
      { key: 'name', label: 'Nome', type: 'text' as const },
      { key: 'description', label: 'Descrição', type: 'text' as const }
    ],
    formFields: [
      { key: 'name', label: 'Nome', type: 'text' as const, required: true, placeholder: 'Ex: Pequeno, Médio, Grande' },
      { key: 'description', label: 'Descrição', type: 'textarea' as const, placeholder: 'Descrição do porte do empreendimento' }
    ]
  },
  'pollution-potentials': {
    title: 'Potencial Poluidor',
    tableName: 'pollution_potentials',
    columns: [
      { key: 'name', label: 'Nome', type: 'text' as const },
      { key: 'description', label: 'Descrição', type: 'text' as const }
    ],
    formFields: [
      { key: 'name', label: 'Nome', type: 'text' as const, required: true, placeholder: 'Ex: Baixo, Médio, Alto' },
      { key: 'description', label: 'Descrição', type: 'textarea' as const, placeholder: 'Descrição do potencial poluidor' }
    ]
  },
  'reference-units': {
    title: 'Unidades de Referência',
    tableName: 'reference_units',
    columns: [
      { key: 'code', label: 'Código', type: 'text' as const },
      { key: 'name', label: 'Nome', type: 'text' as const },
      { key: 'description', label: 'Descrição', type: 'text' as const }
    ],
    formFields: [
      { key: 'code', label: 'Código', type: 'text' as const, required: true, placeholder: 'Ex: UPF, UFIR, SM' },
      { key: 'name', label: 'Nome', type: 'text' as const, required: true, placeholder: 'Ex: Unidade Padrão Fiscal' },
      { key: 'description', label: 'Descrição', type: 'textarea' as const, placeholder: 'Descrição da unidade de referência' }
    ]
  },
  'license-types': {
    title: 'Tipos de Licença',
    tableName: 'license_types',
    columns: [
      { key: 'abbreviation', label: 'Sigla', type: 'text' as const },
      { key: 'name', label: 'Nome', type: 'text' as const },
      { key: 'validity_period', label: 'Prazo', type: 'number' as const },
      { key: 'time_unit', label: 'Unidade', type: 'text' as const }
    ],
    formFields: [
      { key: 'abbreviation', label: 'Sigla/Abreviação', type: 'text' as const, required: true, placeholder: 'Ex: LP, LI, LO' },
      { key: 'name', label: 'Tipo da Licença', type: 'text' as const, required: true, placeholder: 'Ex: Licença Prévia' },
      { key: 'validity_period', label: 'Prazo de Validade', type: 'number' as const, required: true, placeholder: 'Ex: 5' },
      { 
        key: 'time_unit', 
        label: 'Unidade de Tempo', 
        type: 'select' as const, 
        required: true,
        options: [
          { value: 'meses', label: 'Meses' },
          { value: 'anos', label: 'Anos' }
        ]
      },
      { key: 'description', label: 'Descrição', type: 'textarea' as const, placeholder: 'Descrição do tipo de licença' }
    ]
  },
  'study-types': {
    title: 'Tipos de Estudo',
    tableName: 'study_types',
    columns: [
      { key: 'abbreviation', label: 'Sigla', type: 'text' as const },
      { key: 'name', label: 'Nome', type: 'text' as const },
      { key: 'description', label: 'Descrição', type: 'text' as const }
    ],
    formFields: [
      { key: 'abbreviation', label: 'Sigla/Abreviação', type: 'text' as const, required: true, placeholder: 'Ex: EIA, RIMA, RAP' },
      { key: 'name', label: 'Nome do Estudo', type: 'text' as const, required: true, placeholder: 'Ex: Estudo de Impacto Ambiental' },
      { key: 'description', label: 'Descrição', type: 'textarea' as const, placeholder: 'Descrição do tipo de estudo' }
    ]
  },
  'billing-configurations': {
    title: 'Configuração de Cobrança',
    tableName: 'billing_configurations',
    columns: [
      { 
        key: 'activities', 
        label: 'Atividade', 
        type: 'text' as const,
        render: (value: any) => value ? `${value.code} - ${value.name}` : '-'
      },
      { 
        key: 'license_types', 
        label: 'Tipo de Licença', 
        type: 'text' as const,
        render: (value: any) => value ? `${value.abbreviation} - ${value.name}` : '-'
      },
      { 
        key: 'reference_units', 
        label: 'Unidade Ref.', 
        type: 'text' as const,
        render: (value: any) => value ? value.code : '-'
      },
      { 
        key: 'unit_value', 
        label: 'Valor Base', 
        type: 'number' as const,
        render: (value: number) => value ? `R$ ${value.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}` : '-'
      },
      { 
        key: 'multiplication_factor', 
        label: 'Fator', 
        type: 'number' as const,
        render: (value: number) => value ? `${value}x` : '-'
      },
      { 
        key: 'is_exempt', 
        label: 'Isenção', 
        type: 'boolean' as const,
        render: (value: boolean) => value ? (
          <span className="inline-flex px-2 py-1 text-xs font-medium bg-yellow-100 text-yellow-800 rounded-full">
            Isento
          </span>
        ) : (
          <span className="inline-flex px-2 py-1 text-xs font-medium bg-green-100 text-green-800 rounded-full">
            Cobrável
          </span>
        )
      }
    ],
    formFields: [
      { 
        key: 'activity_id', 
        label: 'Atividade', 
        type: 'select' as const, 
        required: true,
        options: [] // Will be populated dynamically
      },
      { 
        key: 'license_type_id', 
        label: 'Tipo de Licença', 
        type: 'select' as const, 
        required: true,
        options: [] // Will be populated dynamically
      },
      { 
        key: 'reference_unit_id', 
        label: 'Unidade de Referência', 
        type: 'select' as const, 
        required: true,
        options: [] // Will be populated dynamically
      },
      { 
        key: 'unit_value', 
        label: 'Valor Base (R$)', 
        type: 'decimal' as const, 
        required: true, 
        placeholder: 'Ex: 150.00' 
      },
      { 
        key: 'multiplication_factor', 
        label: 'Fator de Multiplicação', 
        type: 'decimal' as const, 
        placeholder: 'Ex: 2.5 (padrão: 1.0)' 
      },
      { 
        key: 'is_exempt', 
        label: 'Isenção de Taxa', 
        type: 'checkbox' as const 
      },
      { 
        key: 'revenue_destination', 
        label: 'Destinação da Receita', 
        type: 'select' as const,
        options: [
          { value: 'estado', label: 'Estado (100%)' },
          { value: 'municipio', label: 'Município (100%)' },
          { value: 'particionado', label: 'Particionado (Estado/Município)' }
        ]
      },
      { 
        key: 'municipality_percentage', 
        label: 'Percentual Município (%)', 
        type: 'decimal' as const, 
        placeholder: 'Ex: 30.0 (apenas se particionado)' 
      },
      { 
        key: 'state_percentage', 
        label: 'Percentual Estado (%)', 
        type: 'decimal' as const, 
        placeholder: 'Ex: 70.0 (apenas se particionado)' 
      },
      { 
        key: 'observations', 
        label: 'Observações', 
        type: 'textarea' as const, 
        placeholder: 'Observações sobre a configuração de cobrança' 
      }
    ]
  },
  'activities': {
    title: 'Atividades',
    tableName: 'activities',
    columns: [
      { key: 'code', label: 'Código', type: 'number' as const },
      { key: 'name', label: 'Nome', type: 'text' as const },
      { 
        key: 'enterprise_sizes', 
        label: 'Porte', 
        type: 'text' as const,
        render: (value: any) => value?.name || '-'
      },
      { 
        key: 'pollution_potentials', 
        label: 'Potencial Poluidor', 
        type: 'text' as const,
        render: (value: any) => value?.name || '-'
      },
      { key: 'measurement_unit', label: 'Unidade', type: 'text' as const },
      { 
        key: 'range_start', 
        label: 'Faixa Inicial', 
        type: 'number' as const,
        render: (value: number) => value ? value.toLocaleString('pt-BR') : '-'
      },
      { 
        key: 'range_end', 
        label: 'Faixa Final', 
        type: 'number' as const,
        render: (value: number) => value ? value.toLocaleString('pt-BR') : '-'
      }
    ],
    formFields: [] // Will use custom form
  },
  'documentation-templates': {
    title: 'Documentação',
    tableName: 'documentation_templates',
    columns: [
      { key: 'name', label: 'Nome', type: 'text' as const },
      { key: 'description', label: 'Descrição', type: 'text' as const },
      { key: 'document_types', label: 'Tipos', type: 'array' as const },
      { 
        key: 'template_file_name', 
        label: 'Modelo', 
        type: 'text' as const,
        render: (value: string) => value ? (
          <span className="text-blue-600 text-sm">📎 {value}</span>
        ) : (
          <span className="text-gray-400 text-sm">Sem modelo</span>
        )
      }
    ],
    formFields: [
      { key: 'name', label: 'Nome do Documento', type: 'text' as const, required: true, placeholder: 'Ex: Requerimento de Licença' },
      { key: 'description', label: 'Descrição', type: 'textarea' as const, required: true, placeholder: 'Descrição detalhada do documento' },
      { 
        key: 'document_types', 
        label: 'Tipos de Documento', 
        type: 'multiselect' as const, 
        required: true,
        options: [
          { value: 'Word', label: 'Word' },
          { value: 'PDF', label: 'PDF' },
          { value: 'Imagem', label: 'Imagem' },
          { value: 'Zip', label: 'Zip' },
          { value: 'Excel', label: 'Excel' }
        ]
      },
      { 
        key: 'template_file', 
        label: 'Upload de Modelo (Opcional)', 
        type: 'file' as const, 
        accept: '.doc,.docx,.pdf,.jpg,.jpeg,.png,.xlsx,.xls'
      }
    ]
  }
};

export default function AdminDashboard() {
  const [activeSection, setActiveSection] = useState('property-types');
  const [showForm, setShowForm] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [refreshKey, setRefreshKey] = useState(0);

  const currentConfig = entityConfigs[activeSection as keyof typeof entityConfigs];

  const handleCreate = () => {
    setEditingItem(null);
    setShowForm(true);
  };

  const handleEdit = (item: any) => {
    setEditingItem(item);
    setShowForm(true);
  };

  const handleView = (item: any) => {
    // Show item details in a formatted way
    const formatValue = (key: string, value: any) => {
      if (key === 'default_deadline_days' && value) {
        return `${value} dias`;
      }
      if (key === 'is_active') {
        return value ? 'Ativo' : 'Inativo';
      }
      if (key === 'created_at' || key === 'updated_at') {
        return new Date(value).toLocaleString('pt-BR');
      }
      return value || 'Não informado';
    };

    const details = Object.entries(item)
      .filter(([key]) => !['id'].includes(key))
      .map(([key, value]) => {
        const labels: Record<string, string> = {
          name: 'Nome',
          abbreviation: 'Sigla',
          description: 'Descrição',
          default_deadline_days: 'Prazo Padrão',
          display_order: 'Ordem de Exibição',
          is_active: 'Status',
          created_at: 'Criado em',
          updated_at: 'Atualizado em'
        };
        return `${labels[key] || key}: ${formatValue(key, value)}`;
      })
      .join('\n');
    alert(`Detalhes do Item:\n\n${details}`);
  };

  const handleFormSave = () => {
    setShowForm(false);
    setEditingItem(null);
    // Trigger refresh of the data
    setRefreshKey(prev => prev + 1);
  };

  // Special handling for billing configurations
  if (activeSection === 'billing-configurations') {
    return (
      <AdminLayout activeSection={activeSection} onSectionChange={setActiveSection}>
        <div className="p-6 h-full overflow-y-auto">
          <GenericCRUD
            key={`${activeSection}-${refreshKey}`}
            title={currentConfig.title}
            tableName={currentConfig.tableName}
            columns={currentConfig.columns}
            searchFields={['activities.name', 'license_types.name', 'reference_units.code']}
            onCreate={handleCreate}
            onEdit={handleEdit}
            onView={handleView}
          />

          <BillingConfigurationForm
            isOpen={showForm}
            onClose={() => setShowForm(false)}
            title={`${editingItem ? 'Editar' : 'Nova'} ${currentConfig.title}`}
            item={editingItem}
            onSave={handleFormSave}
          />
        </div>
      </AdminLayout>
    );
  }

  // Special handling for activities
  if (activeSection === 'activities') {
    return (
      <AdminLayout activeSection={activeSection} onSectionChange={setActiveSection}>
        <div className="p-6 h-full overflow-y-auto">
          <GenericCRUD
            key={`${activeSection}-${refreshKey}`}
            title={currentConfig.title}
            tableName={currentConfig.tableName}
            columns={currentConfig.columns}
            searchFields={['name', 'code']}
            onCreate={handleCreate}
            onEdit={handleEdit}
            onView={handleView}
          />

          <ActivityForm
            isOpen={showForm}
            onClose={() => setShowForm(false)}
            title={`${editingItem ? 'Editar' : 'Nova'} ${currentConfig.title.slice(0, -1)}`}
            item={editingItem}
            onSave={handleFormSave}
          />
        </div>
      </AdminLayout>
    );
  }

  if (!currentConfig) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Seção não encontrada</h2>
          <p className="text-gray-600">A seção selecionada não está disponível.</p>
        </div>
      </div>
    );
  }

  return (
    <AdminLayout activeSection={activeSection} onSectionChange={setActiveSection}>
      <div className="p-6 h-full overflow-y-auto">
        <GenericCRUD
          key={`${activeSection}-${refreshKey}`}
          title={currentConfig.title}
          tableName={currentConfig.tableName}
          columns={currentConfig.columns}
          searchFields={['name', 'description', 'abbreviation', 'code']}
          onCreate={handleCreate}
          onEdit={handleEdit}
          onView={handleView}
        />

        <GenericForm
          isOpen={showForm}
          onClose={() => setShowForm(false)}
          title={`${editingItem ? 'Editar' : 'Novo'} ${currentConfig.title.slice(0, -1)}`}
          tableName={currentConfig.tableName}
          fields={currentConfig.formFields}
          item={editingItem}
          onSave={handleFormSave}
        />
      </div>
    </AdminLayout>
  );
}