import React, { useState } from 'react';
import { Settings, MapPin, Layers, Palette, Download, Upload, Save, X } from 'lucide-react';

interface GeoSettingsProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (settings: any) => void;
  currentSettings: any;
}

export default function GeoSettings({ isOpen, onClose, onSave, currentSettings }: GeoSettingsProps) {
  const [settings, setSettings] = useState({
    defaultZoom: 10,
    defaultCenter: { lat: -23.5505, lng: -46.6333 }, // São Paulo
    mapStyle: 'satellite',
    showClusters: true,
    clusterRadius: 50,
    pointSize: 8,
    showLabels: true,
    autoRefresh: false,
    refreshInterval: 30,
    colorScheme: 'status',
    ...currentSettings
  });

  if (!isOpen) return null;

  const handleSave = () => {
    onSave(settings);
    onClose();
  };

  const mapStyles = [
    { id: 'satellite', name: 'Satélite', preview: '🛰️' },
    { id: 'street', name: 'Ruas', preview: '🗺️' },
    { id: 'terrain', name: 'Terreno', preview: '🏔️' },
    { id: 'hybrid', name: 'Híbrido', preview: '🌍' }
  ];

  const colorSchemes = [
    { id: 'status', name: 'Por Status', description: 'Cores baseadas no status do processo' },
    { id: 'type', name: 'Por Tipo', description: 'Cores baseadas no tipo de licença' },
    { id: 'date', name: 'Por Data', description: 'Cores baseadas na data de criação' },
    { id: 'custom', name: 'Personalizado', description: 'Esquema de cores personalizado' }
  ];

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div className="flex items-center space-x-3">
            <Settings className="w-6 h-6 text-blue-600" />
            <h2 className="text-xl font-bold text-gray-900">Configurações do Mapa</h2>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6 overflow-y-auto max-h-[calc(90vh-140px)]">
          {/* Map Display */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium text-gray-900 flex items-center gap-2">
              <MapPin className="w-5 h-5" />
              Visualização do Mapa
            </h3>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Zoom Padrão
                </label>
                <input
                  type="range"
                  min="1"
                  max="20"
                  value={settings.defaultZoom}
                  onChange={(e) => setSettings(prev => ({ ...prev, defaultZoom: parseInt(e.target.value) }))}
                  className="w-full"
                />
                <div className="text-xs text-gray-500 mt-1">Nível: {settings.defaultZoom}</div>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Tamanho dos Pontos
                </label>
                <input
                  type="range"
                  min="4"
                  max="16"
                  value={settings.pointSize}
                  onChange={(e) => setSettings(prev => ({ ...prev, pointSize: parseInt(e.target.value) }))}
                  className="w-full"
                />
                <div className="text-xs text-gray-500 mt-1">{settings.pointSize}px</div>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Estilo do Mapa
              </label>
              <div className="grid grid-cols-2 gap-3">
                {mapStyles.map((style) => (
                  <button
                    key={style.id}
                    onClick={() => setSettings(prev => ({ ...prev, mapStyle: style.id }))}
                    className={`p-3 border rounded-lg text-left transition-colors ${
                      settings.mapStyle === style.id
                        ? 'border-blue-500 bg-blue-50'
                        : 'border-gray-300 hover:border-gray-400'
                    }`}
                  >
                    <div className="flex items-center space-x-2">
                      <span className="text-lg">{style.preview}</span>
                      <span className="text-sm font-medium">{style.name}</span>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Clustering */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium text-gray-900 flex items-center gap-2">
              <Layers className="w-5 h-5" />
              Agrupamento de Pontos
            </h3>
            
            <div className="flex items-center space-x-3">
              <input
                type="checkbox"
                id="showClusters"
                checked={settings.showClusters}
                onChange={(e) => setSettings(prev => ({ ...prev, showClusters: e.target.checked }))}
                className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              />
              <label htmlFor="showClusters" className="text-sm font-medium text-gray-700">
                Agrupar pontos próximos
              </label>
            </div>

            {settings.showClusters && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Raio de Agrupamento
                </label>
                <input
                  type="range"
                  min="20"
                  max="100"
                  value={settings.clusterRadius}
                  onChange={(e) => setSettings(prev => ({ ...prev, clusterRadius: parseInt(e.target.value) }))}
                  className="w-full"
                />
                <div className="text-xs text-gray-500 mt-1">{settings.clusterRadius}px</div>
              </div>
            )}
          </div>

          {/* Colors */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium text-gray-900 flex items-center gap-2">
              <Palette className="w-5 h-5" />
              Esquema de Cores
            </h3>
            
            <div className="space-y-3">
              {colorSchemes.map((scheme) => (
                <label
                  key={scheme.id}
                  className={`flex items-start p-3 border rounded-lg cursor-pointer transition-colors ${
                    settings.colorScheme === scheme.id
                      ? 'border-blue-500 bg-blue-50'
                      : 'border-gray-300 hover:border-gray-400'
                  }`}
                >
                  <input
                    type="radio"
                    name="colorScheme"
                    value={scheme.id}
                    checked={settings.colorScheme === scheme.id}
                    onChange={(e) => setSettings(prev => ({ ...prev, colorScheme: e.target.value }))}
                    className="mt-1 text-blue-600 focus:ring-blue-500"
                  />
                  <div className="ml-3">
                    <div className="text-sm font-medium text-gray-900">{scheme.name}</div>
                    <div className="text-xs text-gray-500">{scheme.description}</div>
                  </div>
                </label>
              ))}
            </div>
          </div>

          {/* Labels and Auto-refresh */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium text-gray-900">Outras Opções</h3>
            
            <div className="space-y-3">
              <div className="flex items-center space-x-3">
                <input
                  type="checkbox"
                  id="showLabels"
                  checked={settings.showLabels}
                  onChange={(e) => setSettings(prev => ({ ...prev, showLabels: e.target.checked }))}
                  className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                <label htmlFor="showLabels" className="text-sm font-medium text-gray-700">
                  Mostrar rótulos dos pontos
                </label>
              </div>

              <div className="flex items-center space-x-3">
                <input
                  type="checkbox"
                  id="autoRefresh"
                  checked={settings.autoRefresh}
                  onChange={(e) => setSettings(prev => ({ ...prev, autoRefresh: e.target.checked }))}
                  className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                <label htmlFor="autoRefresh" className="text-sm font-medium text-gray-700">
                  Atualização automática
                </label>
              </div>

              {settings.autoRefresh && (
                <div className="ml-6">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Intervalo (segundos)
                  </label>
                  <select
                    value={settings.refreshInterval}
                    onChange={(e) => setSettings(prev => ({ ...prev, refreshInterval: parseInt(e.target.value) }))}
                    className="w-32 p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value={15}>15s</option>
                    <option value={30}>30s</option>
                    <option value={60}>1min</option>
                    <option value={300}>5min</option>
                  </select>
                </div>
              )}
            </div>
          </div>

          {/* Center Coordinates */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium text-gray-900">Centro Padrão do Mapa</h3>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Latitude
                </label>
                <input
                  type="number"
                  step="0.000001"
                  value={settings.defaultCenter.lat}
                  onChange={(e) => setSettings(prev => ({ 
                    ...prev, 
                    defaultCenter: { ...prev.defaultCenter, lat: parseFloat(e.target.value) }
                  }))}
                  className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Longitude
                </label>
                <input
                  type="number"
                  step="0.000001"
                  value={settings.defaultCenter.lng}
                  onChange={(e) => setSettings(prev => ({ 
                    ...prev, 
                    defaultCenter: { ...prev.defaultCenter, lng: parseFloat(e.target.value) }
                  }))}
                  className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex justify-end space-x-3 p-6 border-t border-gray-200 bg-gray-50">
          <button
            onClick={onClose}
            className="px-4 py-2 text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
          >
            Cancelar
          </button>
          <button
            onClick={handleSave}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2"
          >
            <Save className="w-4 h-4" />
            Salvar Configurações
          </button>
        </div>
      </div>
    </div>
  );
}