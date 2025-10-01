import React, { useState } from 'react';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { ProcessService } from './services/processService';
import NewProcessModal from './components/NewProcessModal';
import ProcessDetailsModal from './components/ProcessDetailsModal';
import LoginModal from './components/LoginModal';
import AdminDashboard from './components/admin/AdminDashboard';
import { 
  FileText, 
  TrendingUp, 
  AlertTriangle,
  CheckCircle,
  Clock,
  Plus,
  Filter,
  Search,
  Bell,
  Settings,
  Home,
  Building2,
  FileCheck,
  BarChart3,
  Shield,
  LogOut,
  MapPin,
  Menu,
  ChevronLeft
} from 'lucide-react';
import GeoVisualization from './components/geo/GeoVisualization';

function AppContent() {
  const { user, userMetadata, signOut, loading, isConfigured } = useAuth();
  const [activeTab, setActiveTab] = useState('dashboard');
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [showNewProcessModal, setShowNewProcessModal] = useState(false);
  const [showProcessDetails, setShowProcessDetails] = useState(false);
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [selectedProcess, setSelectedProcess] = useState(null);
  const [processes, setProcesses] = useState<any[]>([]);
  const [stats, setStats] = useState({
    total: 0,
    pending: 0,
    analysis: 0,
    approved: 0,
    rejected: 0
  });

  // Load processes when user is authenticated
  React.useEffect(() => {
    if (user && isConfigured) {
      loadProcesses();
      loadStats();
    }
  }, [user, searchTerm, filterStatus, isConfigured]);

  const loadProcesses = async () => {
    try {
      const data = await ProcessService.getProcesses({
        status: filterStatus,
        search: searchTerm
      });
      setProcesses(data);
    } catch (error) {
      console.error('Error loading processes:', error);
      setProcesses([]);
    }
  };

  const loadStats = async () => {
    try {
      const statsData = await ProcessService.getProcessStats();
      setStats(statsData);
    } catch (error) {
      console.error('Error loading stats:', error);
      setStats({
        total: 0,
        pending: 0,
        analysis: 0,
        approved: 0,
        rejected: 0
      });
    }
  };

  const handleNewProcess = async (processData: any) => {
    try {
      const createdProcess = await ProcessService.createProcess(processData);
      loadProcesses();
      loadStats();
      return createdProcess; // Retornar o processo criado para que o modal possa usar o ID
    } catch (error) {
      console.error('Error creating process:', error);
      throw error; // Re-throw para que o modal possa tratar o erro
    }
  };

  const handleProcessClick = (process: any) => {
    const processWithDefaults = {
      ...process,
      companies: process.companies || {
        name: 'Empresa não informada',
        city: 'N/A',
        state: 'N/A'
      }
    };
    
    setSelectedProcess(processWithDefaults);
    setShowProcessDetails(true);
  };

  const handleUpdateProcess = async (processId: string, updates: any) => {
    try {
      await ProcessService.updateProcess(processId, updates);
      loadProcesses();
      loadStats();
      if (selectedProcess && selectedProcess.id === processId) {
        setSelectedProcess(prev => prev ? { 
          ...prev, 
          ...updates,
          updated_at: new Date().toISOString()
        } : null);
      }
    } catch (error) {
      console.error('Error updating process:', error);
      alert('Erro ao atualizar processo: ' + (error as Error).message);
    }
  };

  const handleSignOut = async () => {
    try {
      await signOut();
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };

  // Show loading screen
  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-green-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">Carregando sistema...</p>
        </div>
      </div>
    );
  }

  // Show configuration error if Supabase is not configured
  if (!isConfigured) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center max-w-2xl mx-4">
          <div className="w-16 h-16 bg-red-600 rounded-full flex items-center justify-center mx-auto mb-6">
            <AlertTriangle className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Sistema Não Configurado</h1>
          <p className="text-gray-600 mb-4">
            As variáveis de ambiente do Supabase não estão configuradas corretamente.
          </p>
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 text-left">
            <h3 className="font-medium text-blue-900 mb-3">📋 Passo a passo para configurar:</h3>
            <ol className="text-sm text-blue-800 space-y-2">
              <li><strong>1.</strong> Acesse <a href="https://supabase.com/dashboard" target="_blank" className="text-blue-600 underline">https://supabase.com/dashboard</a></li>
              <li><strong>2.</strong> Crie um novo projeto ou selecione um existente</li>
              <li><strong>3.</strong> Vá em Settings → API</li>
              <li><strong>4.</strong> Copie a "Project URL" e "anon public" key</li>
              <li><strong>5.</strong> Clique no botão "Connect to Supabase" no canto superior direito desta tela</li>
              <li><strong>6.</strong> Cole suas credenciais reais do Supabase</li>
            </ol>
          </div>
          <button
            onClick={() => window.location.reload()}
            className="mt-6 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            🔄 Recarregar após configurar
          </button>
        </div>
      </div>
    );
  }

  // Show login screen if not authenticated
  if (!user) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 bg-green-600 rounded-full flex items-center justify-center mx-auto mb-6">
            <Shield className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Sistema de Licenciamento Ambiental</h1>
          <p className="text-gray-600 mb-8">Faça login para acessar o sistema</p>
          <button
            onClick={() => setShowLoginModal(true)}
            className="bg-green-600 text-white px-6 py-3 rounded-lg hover:bg-green-700 transition-colors"
          >
            Fazer Login
          </button>
        </div>
        <LoginModal
          isOpen={showLoginModal}
          onClose={() => setShowLoginModal(false)}
        />
      </div>
    );
  }

  // Helper functions
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'aprovado': return 'text-green-700 bg-green-100 border-green-200';
      case 'rejeitado': return 'text-red-700 bg-red-100 border-red-200';
      case 'em_analise': return 'text-blue-700 bg-blue-100 border-blue-200';
      case 'submitted': return 'text-yellow-700 bg-yellow-100 border-yellow-200';
      case 'documentacao_pendente': return 'text-orange-700 bg-orange-100 border-orange-200';
      default: return 'text-gray-700 bg-gray-100 border-gray-200';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'aprovado': return 'Aprovada';
      case 'rejeitado': return 'Rejeitada';
      case 'em_analise': return 'Em Análise';
      case 'submitted': return 'Submetida';
      case 'documentacao_pendente': return 'Documentação Pendente';
      default: return status;
    }
  };

  const getLicenseTypeName = (type: string) => {
    switch (type) {
      case 'LP': return 'Licença Prévia';
      case 'LI': return 'Licença de Instalação';
      case 'LO': return 'Licença de Operação';
      default: return type;
    }
  };

  const filteredLicenses = processes.filter(license => {
    const matchesSearch = license.companies?.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         license.activity.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesFilter = filterStatus === 'all' || license.status === filterStatus;
    return matchesSearch && matchesFilter;
  });

  const navigation = [
    { id: 'dashboard', name: 'Dashboard', icon: Home },
    { id: 'processes', name: 'Processos', icon: FileText },
    { id: 'companies', name: 'Empresas', icon: Building2 },
    { id: 'reports', name: 'Relatórios', icon: BarChart3 },
    { id: 'compliance', name: 'Conformidade', icon: Shield },
    { id: 'geo', name: 'Visualização Geo', icon: MapPin },
    { id: 'admin', name: 'Administração', icon: Settings }
  ];

  const renderDashboard = () => (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
        <div className="flex space-x-3">
          <button 
            className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 transition-colors"
            onClick={() => setShowNewProcessModal(true)}
          >
            <Plus className="w-5 h-5" />
            Novo Processo
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200 hover:shadow-md transition-shadow">
          <div className="flex items-center">
            <div className="p-2 bg-blue-100 rounded-lg">
              <FileText className="w-6 h-6 text-blue-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Total de Processos</p>
              <p className="text-2xl font-bold text-gray-900">{stats.total}</p>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200 hover:shadow-md transition-shadow">
          <div className="flex items-center">
            <div className="p-2 bg-yellow-100 rounded-lg">
              <Clock className="w-6 h-6 text-yellow-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Pendentes</p>
              <p className="text-2xl font-bold text-gray-900">{stats.pending}</p>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200 hover:shadow-md transition-shadow">
          <div className="flex items-center">
            <div className="p-2 bg-blue-100 rounded-lg">
              <TrendingUp className="w-6 h-6 text-blue-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Em Análise</p>
              <p className="text-2xl font-bold text-gray-900">{stats.analysis}</p>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200 hover:shadow-md transition-shadow">
          <div className="flex items-center">
            <div className="p-2 bg-green-100 rounded-lg">
              <CheckCircle className="w-6 h-6 text-green-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Aprovadas</p>
              <p className="text-2xl font-bold text-gray-900">{stats.approved}</p>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200 hover:shadow-md transition-shadow">
          <div className="flex items-center">
            <div className="p-2 bg-red-100 rounded-lg">
              <AlertTriangle className="w-6 h-6 text-red-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Rejeitadas</p>
              <p className="text-2xl font-bold text-gray-900">{stats.rejected}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Recent Activity */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200">
        <div className="p-6 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-gray-900">Atividade Recente</h2>
        </div>
        <div className="p-6">
          <div className="space-y-4">
            {processes.slice(0, 3).map((license) => (
              <div 
                key={license.id} 
                className="flex items-center space-x-4 p-4 bg-gray-50 rounded-lg hover:bg-gray-100 cursor-pointer transition-colors"
                onClick={() => handleProcessClick(license)}
              >
                <div className="flex-shrink-0">
                  <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
                    <FileText className="w-5 h-5 text-green-600" />
                  </div>
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium text-gray-900">{license.companies?.name}</p>
                  <p className="text-sm text-gray-500">{getLicenseTypeName(license.license_type)} - {license.activity}</p>
                </div>
                <div className="flex-shrink-0">
                  <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full border ${getStatusColor(license.status)}`}>
                    {getStatusText(license.status)}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );

  const renderProcesses = () => (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold text-gray-900">Processos de Licenciamento</h1>
        <button 
          className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 transition-colors"
          onClick={() => setShowNewProcessModal(true)}
        >
          <Plus className="w-5 h-5" />
          Novo Processo
        </button>
      </div>

      {/* Filters */}
      <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1">
            <div className="relative">
              <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
              <input
                type="text"
                placeholder="Buscar por empresa ou atividade..."
                className="pl-10 w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-gray-400" />
            <select
              className="p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
            >
              <option value="all">Todos os Status</option>
              <option value="submitted">Submetida</option>
              <option value="em_analise">Em Análise</option>
              <option value="documentacao_pendente">Documentação Pendente</option>
              <option value="aprovado">Aprovada</option>
              <option value="rejeitado">Rejeitada</option>
            </select>
          </div>
        </div>
      </div>

      {/* Process List */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200">
        <div className="p-6 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-gray-900">Lista de Processos</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Processo</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Empresa</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Tipo</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Progresso</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Analista</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Prazo</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredLicenses.map((license) => (
                <tr 
                  key={license.id} 
                  className="hover:bg-gray-50 cursor-pointer transition-colors"
                  onClick={() => handleProcessClick(license)}
                >
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-900">{license.protocol_number}</div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="text-sm text-gray-900">{license.companies?.name}</div>
                    <div className="text-sm text-gray-500">{license.activity}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="inline-flex px-2 py-1 text-xs font-medium bg-blue-100 text-blue-800 rounded-full">
                      {getLicenseTypeName(license.license_type)}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full border ${getStatusColor(license.status)}`}>
                      {getStatusText(license.status)}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div 
                        className="bg-green-600 h-2 rounded-full transition-all duration-300"
                        style={{ width: `${license.progress || 0}%` }}
                      ></div>
                    </div>
                    <span className="text-xs text-gray-500">{license.progress || 0}%</span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {license.analyst_name || 'Não atribuído'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">{license.expected_date ? new Date(license.expected_date).toLocaleDateString('pt-BR') : 'N/A'}</div>
                    <div className="text-xs text-gray-500">
                      {license.expected_date ? Math.ceil((new Date(license.expected_date).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)) : 0} dias
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );

  const renderContent = () => {
    switch (activeTab) {
      case 'dashboard': return renderDashboard();
      case 'processes': return renderProcesses();
      case 'companies': return (
        <div className="text-center py-12">
          <Building2 className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <h2 className="text-2xl font-semibold text-gray-900 mb-2">Cadastro de Empresas</h2>
          <p className="text-gray-600">Módulo em desenvolvimento</p>
        </div>
      );
      case 'reports': return (
        <div className="text-center py-12">
          <BarChart3 className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <h2 className="text-2xl font-semibold text-gray-900 mb-2">Relatórios Gerenciais</h2>
          <p className="text-gray-600">Módulo em desenvolvimento</p>
        </div>
      );
      case 'compliance': return (
        <div className="text-center py-12">
          <Shield className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <h2 className="text-2xl font-semibold text-gray-900 mb-2">Monitoramento de Conformidade</h2>
          <p className="text-gray-600">Módulo em desenvolvimento</p>
        </div>
      );
      case 'geo': return (
        <GeoVisualization 
          processes={processes} 
          companies={[]} 
        />
      );
      case 'admin': return <AdminDashboard />;
      default: return renderDashboard();
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Sidebar */}
      <div className={`fixed inset-y-0 left-0 bg-white shadow-lg z-50 transition-all duration-300 ${
        sidebarCollapsed ? 'w-16' : 'w-64'
      }`}>
        <div className="flex flex-col h-full">
          {/* Logo */}
          <div className="flex items-center px-6 py-4 border-b border-gray-200">
            <div className="flex items-center justify-between w-full">
              <div className="flex items-center">
                <div className="w-8 h-8 bg-green-600 rounded-lg flex items-center justify-center">
                  <Shield className="w-5 h-5 text-white" />
                </div>
                {!sidebarCollapsed && (
                  <div className="ml-3">
                    <h1 className="text-lg font-bold text-gray-900">SisLicAmb</h1>
                    <p className="text-xs text-gray-500">Sistema de Licenciamento</p>
                  </div>
                )}
              </div>
              <button
                onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
                className="p-1 text-gray-400 hover:text-gray-600 transition-colors"
                title={sidebarCollapsed ? 'Expandir menu' : 'Recolher menu'}
              >
                {sidebarCollapsed ? (
                  <Menu className="w-5 h-5" />
                ) : (
                  <ChevronLeft className="w-5 h-5" />
                )}
              </button>
            </div>
          </div>

          {/* Navigation */}
          <nav className="flex-1 px-4 py-6 space-y-2">
            {navigation.map((item) => {
              const Icon = item.icon;
              return (
                <button
                  key={item.id}
                  onClick={() => setActiveTab(item.id)}
                  className={`w-full flex items-center px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                    activeTab === item.id
                      ? 'bg-green-100 text-green-700 border border-green-200'
                      : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
                  }`}
                  title={sidebarCollapsed ? item.name : undefined}
                >
                  <Icon className="w-5 h-5 flex-shrink-0 mr-3" />
                  {!sidebarCollapsed && item.name}
                </button>
              );
            })}
          </nav>

          {/* User Profile */}
          <div className="px-4 py-4 border-t border-gray-200">
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <div className="w-8 h-8 bg-green-600 rounded-full flex items-center justify-center">
                  <span className="text-white text-sm font-medium">
                    {userMetadata?.name?.charAt(0).toUpperCase() || user?.email?.charAt(0).toUpperCase() || 'U'}
                  </span>
                </div>
                {!sidebarCollapsed && (
                  <div className="ml-3">
                    <p className="text-sm font-medium text-gray-900">{userMetadata?.name || user?.email}</p>
                    <p className="text-xs text-gray-500">{userMetadata?.role || 'Usuário'}</p>
                  </div>
                )}
              </div>
              <button
                onClick={handleSignOut}
                className="p-1 text-gray-400 hover:text-gray-600 transition-colors"
                title={sidebarCollapsed ? "Sair" : "Sair"}
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className={`transition-all duration-300 ${sidebarCollapsed ? 'ml-16' : 'ml-64'}`}>
        {/* Header */}
        <header className="bg-white shadow-sm border-b border-gray-200">
          <div className="px-6 py-4 flex justify-between items-center">
            <div className="flex items-center space-x-4">
              <h2 className="text-sm text-gray-500">
                Sistema de Licenciamento Ambiental - Baseado na Legislação Brasileira
              </h2>
            </div>
            <div className="flex items-center space-x-4">
              <button className="p-2 text-gray-400 hover:text-gray-600 transition-colors">
                <Bell className="w-5 h-5" />
              </button>
              <button className="p-2 text-gray-400 hover:text-gray-600 transition-colors">
                <Settings className="w-5 h-5" />
              </button>
            </div>
          </div>
        </header>

        {/* Content */}
        <main className="p-6">
          {renderContent()}
        </main>
      </div>

      {/* Modals */}
      <NewProcessModal
        isOpen={showNewProcessModal}
        onClose={() => setShowNewProcessModal(false)}
        onSubmit={handleNewProcess}
      />

      <ProcessDetailsModal
        isOpen={showProcessDetails}
        onClose={() => setShowProcessDetails(false)}
        process={selectedProcess}
        onUpdateProcess={handleUpdateProcess}
      />
    </div>
  );
}

function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}

export default App;