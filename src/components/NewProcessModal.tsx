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

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

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
.