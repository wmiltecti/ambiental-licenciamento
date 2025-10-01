import React, { useState } from 'react';
import { X, Upload, Calendar, Building2, FileText, MapPin, Zap } from 'lucide-react';

interface NewProcessModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (processData: any) => void;
}

export default function NewProcessModal({ isOpen, onClose, onSubmit }: NewProcessModalProps) {
  const [formData, setFormData] = useState({
    licenseType: 'LP',
    company: '',
    cnpj: '',
    activity: '',
    location: '',
    state: '',
    city: '',
    description: '',
    estimatedValue: '',
    area: '',
    coordinates: '',
    environmentalImpact: 'baixo',
    documents: [] as File[]
  });

  const [currentStep, setCurrentStep] = useState(1);
  const totalSteps = 4;

  // Test data for each step
  const testData = {
    step1: {
      licenseType: 'LP',
      environmentalImpact: 'medio',
      company: 'Mineração São Paulo Ltda',
      cnpj: '12.345.678/0001-90',
      activity: 'Extração de areia e cascalho'
    },
    step2: {
      state: 'SP',
      city: 'Campinas',
      location: 'Rodovia Dom Pedro I, km 143, Distrito Industrial',
      area: '25.5',
      coordinates: '-22.9056, -47.0608'
    },
    step3: {
      description: 'Empreendimento destinado à extração de areia e cascalho para construção civil, com capacidade de produção de 50.000 m³/mês. O projeto contempla área de lavra de 25,5 hectares, com sistema de drenagem e controle de particulados. Inclui instalação de britador, peneiras e sistema de lavagem do material extraído.',
      estimatedValue: '2500000'
    }
  };

  const fillTestData = (step: number) => {
    switch (step) {
      case 1:
        setFormData(prev => ({ ...prev, ...testData.step1 }));
        break;
      case 2:
        setFormData(prev => ({ ...prev, ...testData.step2 }));
        break;
      case 3:
        setFormData(prev => ({ ...prev, ...testData.step3 }));
        break;
    }
  };

  if (!isOpen) return null;

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleFileUpload = (files: FileList | null) => {
    if (files) {
      setFormData(prev => ({
        ...prev,
        documents: [...prev.documents, ...Array.from(files)]
      }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    await onSubmit(formData);
    onClose();
    setFormData({
      licenseType: 'LP',
      company: '',
      cnpj: '',
      activity: '',
      location: '',
      state: '',
      city: '',
      description: '',
      estimatedValue: '',
      area: '',
      coordinates: '',
      environmentalImpact: 'baixo',
      documents: []
    });
    setCurrentStep(1);
  };

  const nextStep = () => {
    if (currentStep < totalSteps) setCurrentStep(currentStep + 1);
  };

  const prevStep = () => {
    if (currentStep > 1) setCurrentStep(currentStep - 1);
  };

  const renderStep1 = () => (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-gray-900">Informações Básicas</h3>
        <button
          type="button"
          onClick={() => fillTestData(1)}
          className="px-3 py-1 bg-purple-600 text-white text-sm rounded-lg hover:bg-purple-700 transition-colors flex items-center gap-2"
          title="Preencher com dados de teste"
        >
          <Zap className="w-4 h-4" />
          Dados de Teste
        </button>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Tipo de Licença *
          </label>
          <select
            value={formData.licenseType}
            onChange={(e) => handleInputChange('licenseType', e.target.value)}
            className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
            required
          >
            <option value="LP">Licença Prévia (LP)</option>
            <option value="LI">Licença de Instalação (LI)</option>
            <option value="LO">Licença de Operação (LO)</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Impacto Ambiental *
          </label>
          <select
            value={formData.environmentalImpact}
            onChange={(e) => handleInputChange('environmentalImpact', e.target.value)}
            className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
            required
          >
            <option value="baixo">Baixo Impacto</option>
            <option value="medio">Médio Impacto</option>
            <option value="alto">Alto Impacto</option>
          </select>
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Razão Social da Empresa *
        </label>
        <input
          type="text"
          value={formData.company}
          onChange={(e) => handleInputChange('company', e.target.value)}
          className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
          placeholder="Digite a razão social da empresa"
          required
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          CNPJ *
        </label>
        <input
          type="text"
          value={formData.cnpj}
          onChange={(e) => handleInputChange('cnpj', e.target.value)}
          className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
          placeholder="00.000.000/0000-00"
          required
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Atividade/Empreendimento *
        </label>
        <input
          type="text"
          value={formData.activity}
          onChange={(e) => handleInputChange('activity', e.target.value)}
          className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
          placeholder="Descreva a atividade principal"
          required
        />
      </div>
    </div>
  );

  const renderStep2 = () => (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-gray-900">Localização do Empreendimento</h3>
        <button
          type="button"
          onClick={() => fillTestData(2)}
          className="px-3 py-1 bg-purple-600 text-white text-sm rounded-lg hover:bg-purple-700 transition-colors flex items-center gap-2"
          title="Preencher com dados de teste"
        >
          <Zap className="w-4 h-4" />
          Dados de Teste
        </button>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Estado *
          </label>
          <select
            value={formData.state}
            onChange={(e) => handleInputChange('state', e.target.value)}
            className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
            required
          >
            <option value="">Selecione o estado</option>
            <option value="AC">Acre</option>
            <option value="AL">Alagoas</option>
            <option value="AP">Amapá</option>
            <option value="AM">Amazonas</option>
            <option value="BA">Bahia</option>
            <option value="CE">Ceará</option>
            <option value="DF">Distrito Federal</option>
            <option value="ES">Espírito Santo</option>
            <option value="GO">Goiás</option>
            <option value="MA">Maranhão</option>
            <option value="MT">Mato Grosso</option>
            <option value="MS">Mato Grosso do Sul</option>
            <option value="MG">Minas Gerais</option>
            <option value="PA">Pará</option>
            <option value="PB">Paraíba</option>
            <option value="PR">Paraná</option>
            <option value="PE">Pernambuco</option>
            <option value="PI">Piauí</option>
            <option value="RJ">Rio de Janeiro</option>
            <option value="RN">Rio Grande do Norte</option>
            <option value="RS">Rio Grande do Sul</option>
            <option value="RO">Rondônia</option>
            <option value="RR">Roraima</option>
            <option value="SC">Santa Catarina</option>
            <option value="SP">São Paulo</option>
            <option value="SE">Sergipe</option>
            <option value="TO">Tocantins</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Município *
          </label>
          <input
            type="text"
            value={formData.city}
            onChange={(e) => handleInputChange('city', e.target.value)}
            className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
            placeholder="Digite o município"
            required
          />
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Endereço Completo *
        </label>
        <textarea
          value={formData.location}
          onChange={(e) => handleInputChange('location', e.target.value)}
          className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
          rows={3}
          placeholder="Endereço completo do empreendimento"
          required
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Área Total (hectares)
          </label>
          <input
            type="number"
            value={formData.area}
            onChange={(e) => handleInputChange('area', e.target.value)}
            className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
            placeholder="0.00"
            step="0.01"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Coordenadas GPS
          </label>
          <input
            type="text"
            value={formData.coordinates}
            onChange={(e) => handleInputChange('coordinates', e.target.value)}
            className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
            placeholder="Latitude, Longitude"
          />
        </div>
      </div>
    </div>
  );

  const renderStep3 = () => (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-gray-900">Detalhes do Projeto</h3>
        <button
          type="button"
          onClick={() => fillTestData(3)}
          className="px-3 py-1 bg-purple-600 text-white text-sm rounded-lg hover:bg-purple-700 transition-colors flex items-center gap-2"
          title="Preencher com dados de teste"
        >
          <Zap className="w-4 h-4" />
          Dados de Teste
        </button>
      </div>
      
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Descrição Detalhada do Empreendimento *
        </label>
        <textarea
          value={formData.description}
          onChange={(e) => handleInputChange('description', e.target.value)}
          className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
          rows={5}
          placeholder="Descreva detalhadamente o empreendimento, suas características, processos produtivos, tecnologias utilizadas, etc."
          required
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Valor Estimado do Investimento (R$)
        </label>
        <input
          type="number"
          value={formData.estimatedValue}
          onChange={(e) => handleInputChange('estimatedValue', e.target.value)}
          className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
          placeholder="0.00"
          step="0.01"
        />
      </div>

      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <h4 className="font-medium text-blue-900 mb-2">Informações Importantes</h4>
        <ul className="text-sm text-blue-800 space-y-1">
          <li>• Licença Prévia (LP): Concedida na fase preliminar do planejamento</li>
          <li>• Licença de Instalação (LI): Autoriza a instalação do empreendimento</li>
          <li>• Licença de Operação (LO): Autoriza a operação da atividade</li>
        </ul>
      </div>
    </div>
  );

  const renderStep4 = () => (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-gray-900">Documentação</h3>
        <div className="bg-blue-50 border border-blue-200 rounded-lg px-3 py-1">
          <span className="text-xs text-blue-700 flex items-center gap-1">
            <Zap className="w-3 h-3" />
            Etapa final - sem dados de teste
          </span>
        </div>
      </div>
      
      <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-green-400 transition-colors">
        <Upload className="w-12 h-12 text-gray-400 mx-auto mb-4" />
        <div className="space-y-2">
          <p className="text-lg font-medium text-gray-900">Anexar Documentos</p>
          <p className="text-sm text-gray-500">
            Arraste e solte os arquivos aqui ou clique para selecionar
          </p>
          <input
            type="file"
            multiple
            onChange={(e) => handleFileUpload(e.target.files)}
            className="hidden"
            id="file-upload"
            accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
          />
          <label
            htmlFor="file-upload"
            className="inline-flex items-center px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 cursor-pointer transition-colors"
          >
            Selecionar Arquivos
          </label>
        </div>
      </div>

      {formData.documents.length > 0 && (
        <div className="space-y-2">
          <h4 className="font-medium text-gray-900">Documentos Anexados:</h4>
          {formData.documents.map((file, index) => (
            <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
              <div className="flex items-center">
                <FileText className="w-5 h-5 text-gray-400 mr-2" />
                <span className="text-sm text-gray-900">{file.name}</span>
              </div>
              <button
                onClick={() => {
                  setFormData(prev => ({
                    ...prev,
                    documents: prev.documents.filter((_, i) => i !== index)
                  }));
                }}
                className="text-red-500 hover:text-red-700"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          ))}
        </div>
      )}

      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
        <h4 className="font-medium text-yellow-900 mb-2">Documentos Obrigatórios</h4>
        <ul className="text-sm text-yellow-800 space-y-1">
          <li>• Requerimento de licença ambiental</li>
          <li>• Certidão da Prefeitura Municipal</li>
          <li>• Cópia da publicação do pedido de licença</li>
          <li>• Estudos ambientais (conforme o caso)</li>
          <li>• Planta de situação e localização</li>
          <li>• Memorial descritivo do empreendimento</li>
        </ul>
      </div>
    </div>
  );

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Novo Processo de Licenciamento</h2>
            <p className="text-sm text-gray-500">Passo {currentStep} de {totalSteps}</p>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Progress Bar */}
        <div className="px-6 py-4 bg-gray-50">
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div 
              className="bg-green-600 h-2 rounded-full transition-all duration-300"
              style={{ width: `${(currentStep / totalSteps) * 100}%` }}
            ></div>
          </div>
        </div>

        {/* Content */}
        <form onSubmit={handleSubmit} className="flex flex-col h-full">
          <div className="flex-1 p-6 overflow-y-auto">
            {currentStep === 1 && renderStep1()}
            {currentStep === 2 && renderStep2()}
            {currentStep === 3 && renderStep3()}
            {currentStep === 4 && renderStep4()}
          </div>

          {/* Footer */}
          <div className="flex items-center justify-between p-6 border-t border-gray-200 bg-gray-50">
            <button
              type="button"
              onClick={prevStep}
              disabled={currentStep === 1}
              className="px-4 py-2 text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              Anterior
            </button>
            
            <div className="flex space-x-3">
              {currentStep < totalSteps ? (
                <button
                  type="button"
                  onClick={nextStep}
                  className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                >
                  Próximo
                </button>
              ) : (
                <button
                  type="submit"
                  className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                >
                  Criar Processo
                </button>
              )}
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}