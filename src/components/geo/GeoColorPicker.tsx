import React from 'react';
import { X, Palette, Check } from 'lucide-react';

interface GeoColorPickerProps {
  isOpen: boolean;
  onClose: () => void;
  currentColor: string;
  onColorChange: (color: string) => void;
  layerName: string;
}

export default function GeoColorPicker({ 
  isOpen, 
  onClose, 
  currentColor, 
  onColorChange, 
  layerName 
}: GeoColorPickerProps) {
  // Predefined colors similar to QGIS
  const predefinedColors = [
    '#3B82F6', // Blue
    '#10B981', // Green  
    '#8B5CF6', // Purple
    '#F59E0B', // Orange
    '#EF4444', // Red
    '#06B6D4', // Cyan
    '#84CC16', // Lime
    '#F97316', // Orange-600
    '#EC4899', // Pink
    '#6366F1', // Indigo
    '#14B8A6', // Teal
    '#A855F7', // Violet
    '#22C55E', // Green-500
    '#F43F5E', // Rose
    '#0EA5E9', // Sky
    '#8B5A2B', // Brown
    '#6B7280', // Gray
    '#DC2626', // Red-600
    '#059669', // Emerald
    '#7C3AED', // Violet-600
    '#F59E0B', // Amber
    '#EF4444', // Red-500
    '#8B5CF6', // Purple-500
    '#06B6D4'  // Cyan-500
  ];

  const [customColor, setCustomColor] = React.useState(currentColor);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-md">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200">
          <div className="flex items-center space-x-3">
            <Palette className="w-5 h-5 text-purple-600" />
            <div>
              <h3 className="text-lg font-semibold text-gray-900">Alterar Cor da Camada</h3>
              <p className="text-sm text-gray-500">{layerName}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div className="p-4 space-y-6">
          {/* Current Color Preview */}
          <div className="flex items-center space-x-3 p-3 bg-gray-50 rounded-lg">
            <div
              className="w-8 h-8 rounded border-2 border-white shadow-sm"
              style={{ backgroundColor: currentColor }}
            />
            <div>
              <p className="text-sm font-medium text-gray-900">Cor Atual</p>
              <p className="text-xs text-gray-500 font-mono">{currentColor}</p>
            </div>
          </div>

          {/* Predefined Colors */}
          <div>
            <h4 className="text-sm font-medium text-gray-900 mb-3">Cores Predefinidas</h4>
            <div className="grid grid-cols-8 gap-2">
              {predefinedColors.map((color) => (
                <button
                  key={color}
                  onClick={() => onColorChange(color)}
                  className="relative w-8 h-8 rounded border-2 border-gray-200 hover:border-gray-400 transition-colors"
                  style={{ backgroundColor: color }}
                  title={color}
                >
                  {currentColor === color && (
                    <div className="absolute inset-0 flex items-center justify-center">
                      <Check className="w-4 h-4 text-white drop-shadow-lg" />
                    </div>
                  )}
                </button>
              ))}
            </div>
          </div>

          {/* Custom Color */}
          <div>
            <h4 className="text-sm font-medium text-gray-900 mb-3">Cor Personalizada</h4>
            <div className="flex items-center space-x-3">
              <input
                type="color"
                value={customColor}
                onChange={(e) => setCustomColor(e.target.value)}
                className="w-12 h-10 border border-gray-300 rounded cursor-pointer"
              />
              <div className="flex-1">
                <input
                  type="text"
                  value={customColor}
                  onChange={(e) => setCustomColor(e.target.value)}
                  className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 font-mono text-sm"
                  placeholder="#000000"
                />
              </div>
              <button
                onClick={() => onColorChange(customColor)}
                className="px-3 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors text-sm"
              >
                Aplicar
              </button>
            </div>
          </div>

          {/* Color Preview */}
          <div className="bg-gray-50 rounded-lg p-4">
            <h4 className="text-sm font-medium text-gray-900 mb-3">Visualização</h4>
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2">
                <div
                  className="w-6 h-6 rounded border-2 border-white shadow-sm"
                  style={{ backgroundColor: customColor }}
                />
                <span className="text-sm text-gray-700">Nova cor</span>
              </div>
              <div className="text-gray-400">→</div>
              <div className="flex items-center space-x-2">
                <div
                  className="w-4 h-4 border-2"
                  style={{ 
                    backgroundColor: customColor,
                    borderColor: customColor,
                    opacity: 0.6
                  }}
                />
                <span className="text-sm text-gray-700">Como aparecerá no mapa</span>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex justify-end space-x-3 p-4 border-t border-gray-200 bg-gray-50">
          <button
            onClick={onClose}
            className="px-4 py-2 text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
          >
            Cancelar
          </button>
          <button
            onClick={() => onColorChange(customColor)}
            className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors flex items-center gap-2"
          >
            <Palette className="w-4 h-4" />
            Aplicar Cor
          </button>
        </div>
      </div>
    </div>
  );
}