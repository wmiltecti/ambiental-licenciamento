import React, { useState, useEffect } from 'react';
import { X, Save, Upload, Trash2 } from 'lucide-react';
import { supabase } from '../../lib/supabase';

interface FormField {
  key: string;
  label: string;
  type: 'text' | 'number' | 'textarea' | 'select' | 'multiselect' | 'checkbox' | 'file' | 'decimal';
  required?: boolean;
  options?: { value: string; label: string }[];
  placeholder?: string;
  accept?: string; // For file inputs
  multiple?: boolean; // For multiselect
}

interface GenericFormProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  tableName: string;
  fields: FormField[];
  item?: any;
  onSave: () => void;
}

export default function GenericForm({
  isOpen,
  onClose,
  title,
  tableName,
  fields,
  item,
  onSave
}: GenericFormProps) {
  const [formData, setFormData] = useState<any>({});
  const [loading, setLoading] = useState(false);
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);

  useEffect(() => {
    if (item) {
      setFormData(item);
    } else {
      // Initialize form with default values
      const defaultData: any = {};
      fields.forEach(field => {
        if (field.type === 'checkbox') {
          defaultData[field.key] = false;
        } else if (field.type === 'multiselect') {
          defaultData[field.key] = [];
        } else {
          defaultData[field.key] = '';
        }
      });
      setFormData(defaultData);
    }
  }, [item, fields]);

  if (!isOpen) return null;

  const handleInputChange = (key: string, value: any) => {
    setFormData(prev => ({ ...prev, [key]: value }));
  };

  const handleFileUpload = (key: string, file: File | null) => {
    setUploadedFile(file);
    if (file) {
      handleInputChange(key, file.name);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      let finalData = { ...formData };

      // Handle file upload if present
      if (uploadedFile) {
        try {
          const fileName = `${Date.now()}-${uploadedFile.name}`;
          const filePath = `templates/${fileName}`;
          
          const { data: uploadData, error: uploadError } = await supabase.storage
            .from('documents')
            .upload(filePath, uploadedFile, {
              cacheControl: '3600',
              upsert: false
            });
          
          if (uploadError) {
            throw uploadError;
          }
          
          finalData = {
            ...finalData,
            template_file_path: uploadData.path,
            template_file_name: uploadedFile.name,
            template_file_size: uploadedFile.size,
            template_file_type: uploadedFile.type
          };
        } catch (uploadError) {
          console.error('Error uploading file:', uploadError);
          throw new Error('Erro no upload do arquivo: ' + uploadError.message);
        }
      }

      if (item?.id) {
        const { data, error } = await supabase
          .from(tableName)
          .update(finalData)
          .eq('id', item.id)
          .select()
          .single();
        
        if (error) {
          throw error;
        }
        
        console.log('Item updated successfully:', data);
      } else {
        const { data, error } = await supabase
          .from(tableName)
          .insert(finalData)
          .select()
          .single();
        
        if (error) {
          throw error;
        }
        
        console.log('Item created successfully:', data);
      }

      alert(item?.id ? 'Item atualizado com sucesso!' : 'Item criado com sucesso!');
      onSave(); // This will trigger the refresh
      onClose();
    } catch (error) {
      console.error('Error saving item:', error);
      alert('Erro ao salvar item: ' + (error as Error).message);
    } finally {
      setLoading(false);
    }
  };

  const renderField = (field: FormField) => {
    const value = formData[field.key] || '';

    switch (field.type) {
      case 'textarea':
        return (
          <textarea
            value={value}
            onChange={(e) => handleInputChange(field.key, e.target.value)}
            className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            placeholder={field.placeholder}
            rows={4}
            required={field.required}
          />
        );

      case 'number':
      case 'decimal':
        return (
          <input
            type="number"
            value={value}
            onChange={(e) => handleInputChange(field.key, field.type === 'decimal' ? parseFloat(e.target.value) : parseInt(e.target.value))}
            className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            placeholder={field.placeholder}
            step={field.type === 'decimal' ? '0.01' : '1'}
            min="0"
            required={field.required}
          />
        );

      case 'select':
        return (
          <select
            value={value}
            onChange={(e) => handleInputChange(field.key, e.target.value)}
            className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            required={field.required}
          >
            <option value="">Selecione...</option>
            {field.options?.map(option => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        );

      case 'multiselect':
        return (
          <div className="space-y-2 max-h-40 overflow-y-auto border border-gray-300 rounded-lg p-3">
            {field.options?.map(option => (
              <label key={option.value} className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  checked={Array.isArray(value) && value.includes(option.value)}
                  onChange={(e) => {
                    const currentArray = Array.isArray(value) ? value : [];
                    if (e.target.checked) {
                      handleInputChange(field.key, [...currentArray, option.value]);
                    } else {
                      handleInputChange(field.key, currentArray.filter(v => v !== option.value));
                    }
                  }}
                  className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                <span className="text-sm text-gray-700">{option.label}</span>
              </label>
            ))}
          </div>
        );

      case 'checkbox':
        return (
          <label className="flex items-center space-x-2">
            <input
              type="checkbox"
              checked={!!value}
              onChange={(e) => handleInputChange(field.key, e.target.checked)}
              className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
            />
            <span className="text-sm text-gray-700">Sim</span>
          </label>
        );

      case 'file':
        return (
          <div className="space-y-2">
            <div className="flex items-center space-x-2">
              <input
                type="file"
                onChange={(e) => handleFileUpload(field.key, e.target.files?.[0] || null)}
                className="hidden"
                id={`file-${field.key}`}
                accept={field.accept}
              />
              <label
                htmlFor={`file-${field.key}`}
                className="bg-gray-100 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-200 cursor-pointer flex items-center gap-2 transition-colors"
              >
                <Upload className="w-4 h-4" />
                Selecionar Arquivo
              </label>
              {uploadedFile && (
                <button
                  type="button"
                  onClick={() => {
                    setUploadedFile(null);
                    handleInputChange(field.key, '');
                  }}
                  className="text-red-500 hover:text-red-700 p-1"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              )}
            </div>
            {(uploadedFile || value) && (
              <p className="text-sm text-gray-600">
                Arquivo: {uploadedFile?.name || value}
              </p>
            )}
          </div>
        );

      default:
        return (
          <input
            type="text"
            value={value}
            onChange={(e) => handleInputChange(field.key, e.target.value)}
            className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            placeholder={field.placeholder}
            required={field.required}
          />
        );
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h2 className="text-xl font-bold text-gray-900">{title}</h2>
          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-6 overflow-y-auto max-h-[calc(90vh-140px)]">
          {fields.map((field) => (
            <div key={field.key}>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                {field.label}
                {field.required && <span className="text-red-500 ml-1">*</span>}
              </label>
              {renderField(field)}
            </div>
          ))}
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