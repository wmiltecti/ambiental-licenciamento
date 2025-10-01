
import React, { useState } from 'react';
import { X, Upload, Calendar, Building2, FileText, MapPin, Zap } from 'lucide-react';

interface NewProcessModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (processData: any) => Promise<void> | void;
}

type Impacto = 'baixo' | 'medio' | 'alto';

interface ProcessFormData {
  licenseType: string;
  company: string;
  cnpj: string;
  activity: string;
  location: string;
  state: string;
  city: string;
  description: string;
  estimatedValue: string;
  area: string;
  coordinates: string;
  environmentalImpact: Impacto;
  documents: File[];
}

export default function NewProcessModal({ isOpen, onClose, onSubmit }: NewProcessModalProps) {
  const [formData, setFormData] = useState<ProcessFormData>({
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

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [currentStep, setCurrentStep] = useState(1);
  const totalSteps = 4;

  // Test data for each step
  const testData = {
    step1: {
      licenseType: 'LP',
      environmentalImpact: 'medio' as Impacto,
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
      default:
        break;
    }
  };

  if (!isOpen) return null;

  const handleInputChange = (field: keyof ProcessFormData, value: string) => {
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

  const validateStep = (step: number) => {
    const e: Record<string, string> = {};
    if (step === 1) {
      if (!formData.licenseType) e.licenseType = 'Tipo de licença é obrigatório.';
      if (!formData.environmentalImpact) e.environmentalImpact = 'Impacto ambiental é obrigatório.';
      if (!formData.company?.trim()) e.company = 'Razão social é obrigatória.';
      if (!formData.cnpj?.trim()) e.cnpj = 'CNPJ é obrigatório.';
      if (!formData.activity?.trim()) e.activity = 'Atividade é obrigatória.';
    }
    if (step === 2) {
      if (!formData.state) e.state = 'Estado é obrigatório.';
      if (!formData.city?.trim()) e.city = 'Município é obrigatório.';
      if (!formData.location?.trim()) e.location = 'Endereço completo é obrigatório.';
    }
    if (step === 3) {
      if (!formData.description?.trim()) e.description = 'Descrição detalhada é obrigatória.';
    }
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const nextStep = () => {
    if (!validateStep(currentStep)) return;
    if (currentStep < totalSteps) setCurrentStep(s => s + 1);
  };

  const prevStep = () => {
    if (currentStep > 1) setCurrentStep(s => s - 1);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (currentStep < totalSteps) {
      nextStep();
      return;
    }
    try {
      setIsSubmitting(true);
      await onSubmit(formData);
      alert('✅ Processo criado com sucesso! Você será redirecionado para a lista de processos.');
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
    } catch (error) {
      console.error('Erro ao criar processo:', error);
      alert('❌ Erro ao criar processo: ' + (error as Error).message);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Minimal placeholder UI so this file compiles independently.
  // Replace with your actual JSX for steps and footer.
  return (
    <div className="fixed inset-0 bg-black/30 flex items-center justify-center">
      <form onSubmit={handleSubmit} className="bg-white rounded-xl p-6 w-[720px] max-w-[95vw]">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold">Novo Processo ({currentStep}/{totalSteps})</h2>
          <button type="button" onClick={onClose} className="p-2 rounded hover:bg-gray-100">
            <X size={20} />
          </button>
        </div>

        {/* Step content placeholder */}
        <div className="space-y-3">
          {currentStep === 1 && (
            <div>
              <p className="font-medium mb-2">Etapa 1 — Dados do empreendimento</p>
              <button type="button" className="text-sm underline" onClick={() => fillTestData(1)}>Preencher com exemplo</button>
            </div>
          )}
          {currentStep === 2 && (
            <div>
              <p className="font-medium mb-2">Etapa 2 — Localização</p>
              <button type="button" className="text-sm underline" onClick={() => fillTestData(2)}>Preencher com exemplo</button>
            </div>
          )}
          {currentStep === 3 && (
            <div>
              <p className="font-medium mb-2">Etapa 3 — Descrição</p>
              <button type="button" className="text-sm underline" onClick={() => fillTestData(3)}>Preencher com exemplo</button>
              {errors.description && <p className="mt-1 text-sm text-red-600">{errors.description}</p>}
            </div>
          )}
          {currentStep === 4 && (
            <div>
              <p className="font-medium mb-2">Etapa 4 — Documentos</p>
              <input type="file" multiple onChange={(e) => handleFileUpload(e.target.files)} />
            </div>
          )}
        </div>

        <div className="mt-6 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <button type="button" onClick={prevStep} className="px-4 py-2 rounded bg-gray-100 hover:bg-gray-200">
              Voltar
            </button>
            <button type="button" onClick={() => fillTestData(currentStep)} className="px-3 py-2 rounded bg-gray-50 hover:bg-gray-100 text-sm">
              Auto-preencher etapa
            </button>
          </div>
          <div className="flex items-center gap-3">
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
                disabled={isSubmitting}
                className="px-8 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-medium text-lg shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-200 disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {isSubmitting ? '⏳ Criando processo...' : '🎯 Finalizar Cadastro do Processo'}
              </button>
            )}
          </div>
        </div>
      </form>
    </div>
  );
}
