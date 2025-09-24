import React, { useState } from 'react';
import { 
  Settings, 
  Building, 
  Scale, 
  AlertTriangle, 
  FileText, 
  BookOpen, 
  Activity, 
  Calculator,
  FileCheck,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';

interface AdminLayoutProps {
  children: React.ReactNode;
  activeSection: string;
  onSectionChange: (section: string) => void;
}

const adminSections = [
  { id: 'property-types', name: 'Tipos de Imóvel', icon: Building },
  { id: 'process-types', name: 'Tipos de Processo', icon: FileText },
  { id: 'license-types', name: 'Tipos de Licença', icon: FileCheck },
  { id: 'activities', name: 'Atividades', icon: Activity },
  { id: 'enterprise-sizes', name: 'Porte do Empreendimento', icon: Scale },
  { id: 'pollution-potentials', name: 'Potencial Poluidor', icon: AlertTriangle },
  { id: 'reference-units', name: 'Unidades de Referência', icon: Calculator },
  { id: 'study-types', name: 'Tipos de Estudo', icon: BookOpen },
  { id: 'documentation-templates', name: 'Documentação', icon: FileText },
  { id: 'billing-configurations', name: 'Configuração de Cobrança', icon: Calculator }
];

export default function AdminLayout({ children, activeSection, onSectionChange }: AdminLayoutProps) {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  return (
    <div className="flex h-full">
      {/* Admin Sidebar */}
      <div className={`bg-white border-r border-gray-200 transition-all duration-300 ${
        sidebarCollapsed ? 'w-16' : 'w-64'
      }`}>
        <div className="p-4 border-b border-gray-200">
          <div className="flex items-center justify-between">
            {!sidebarCollapsed && (
              <div className="flex items-center space-x-2">
                <Settings className="w-6 h-6 text-blue-600" />
                <h2 className="text-lg font-semibold text-gray-900">Administração</h2>
              </div>
            )}
            <button
              onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
              className="p-1 text-gray-400 hover:text-gray-600 transition-colors"
            >
              {sidebarCollapsed ? (
                <ChevronRight className="w-4 h-4" />
              ) : (
                <ChevronLeft className="w-4 h-4" />
              )}
            </button>
          </div>
        </div>

        <nav className="p-2">
          {adminSections.map((section) => {
            const Icon = section.icon;
            return (
              <button
                key={section.id}
                onClick={() => onSectionChange(section.id)}
                className={`w-full flex items-center px-3 py-2 rounded-lg text-sm font-medium transition-colors mb-1 ${
                  activeSection === section.id
                    ? 'bg-blue-100 text-blue-700 border border-blue-200'
                    : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
                }`}
                title={sidebarCollapsed ? section.name : undefined}
              >
                <Icon className="w-5 h-5 flex-shrink-0" />
                {!sidebarCollapsed && (
                  <span className="ml-3 truncate">{section.name}</span>
                )}
              </button>
            );
          })}
        </nav>
      </div>

      {/* Main Content */}
      <div className="flex-1 overflow-hidden">
        {children}
      </div>
    </div>
  );
}