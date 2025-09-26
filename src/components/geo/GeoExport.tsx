import React, { useState } from 'react';
import { Download, FileText, Map, Image, X } from 'lucide-react';

interface GeoExportProps {
  isOpen: boolean;
  onClose: () => void;
  data: any[];
}

export default function GeoExport({ isOpen, onClose, data }: GeoExportProps) {
  const [exportFormat, setExportFormat] = useState('csv');
  const [includeFields, setIncludeFields] = useState({
    coordinates: true,
    name: true,
    type: true,
    status: true,
    details: false
  });
  const [exporting, setExporting] = useState(false);

  if (!isOpen) return null;

  const exportFormats = [
    { id: 'csv', name: 'CSV', icon: FileText, description: 'Planilha compatível com Excel' },
    { id: 'json', name: 'JSON', icon: FileText, description: 'Formato de dados estruturados' },
    { id: 'geojson', name: 'GeoJSON', icon: Map, description: 'Formato padrão para dados geográficos' },
    { id: 'kml', name: 'KML', icon: Map, description: 'Compatível com Google Earth' }
  ];

  const handleExport = async () => {
    setExporting(true);
    
    try {
      let content = '';
      let filename = '';
      let mimeType = '';

      switch (exportFormat) {
        case 'csv':
          content = generateCSV();
          filename = 'dados_geo.csv';
          mimeType = 'text/csv';
          break;
        case 'json':
          content = generateJSON();
          filename = 'dados_geo.json';
          mimeType = 'application/json';
          break;
        case 'geojson':
          content = generateGeoJSON();
          filename = 'dados_geo.geojson';
          mimeType = 'application/geo+json';
          break;
        case 'kml':
          content = generateKML();
          filename = 'dados_geo.kml';
          mimeType = 'application/vnd.google-earth.kml+xml';
          break;
      }

      // Create and download file
      const blob = new Blob([content], { type: mimeType });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      onClose();
    } catch (error) {
      console.error('Error exporting data:', error);
      alert('Erro ao exportar dados: ' + (error as Error).message);
    } finally {
      setExporting(false);
    }
  };

  const generateCSV = () => {
    const headers = [];
    if (includeFields.name) headers.push('nome');
    if (includeFields.coordinates) headers.push('latitude', 'longitude');
    if (includeFields.type) headers.push('tipo');
    if (includeFields.status) headers.push('status');
    if (includeFields.details) headers.push('detalhes');

    const rows = data.map(point => {
      const row = [];
      if (includeFields.name) row.push(point.name || '');
      if (includeFields.coordinates) row.push(point.latitude, point.longitude);
      if (includeFields.type) row.push(point.type || '');
      if (includeFields.status) row.push(point.status || '');
      if (includeFields.details) row.push(JSON.stringify(point.data || {}));
      return row.join(',');
    });

    return [headers.join(','), ...rows].join('\n');
  };

  const generateJSON = () => {
    const exportData = data.map(point => {
      const item: any = {};
      if (includeFields.name) item.name = point.name;
      if (includeFields.coordinates) {
        item.latitude = point.latitude;
        item.longitude = point.longitude;
      }
      if (includeFields.type) item.type = point.type;
      if (includeFields.status) item.status = point.status;
      if (includeFields.details) item.details = point.data;
      return item;
    });

    return JSON.stringify(exportData, null, 2);
  };

  const generateGeoJSON = () => {
    const features = data.map(point => ({
      type: 'Feature',
      geometry: {
        type: 'Point',
        coordinates: [point.longitude, point.latitude]
      },
      properties: {
        ...(includeFields.name && { name: point.name }),
        ...(includeFields.type && { type: point.type }),
        ...(includeFields.status && { status: point.status }),
        ...(includeFields.details && { details: point.data })
      }
    }));

    return JSON.stringify({
      type: 'FeatureCollection',
      features
    }, null, 2);
  };

  const generateKML = () => {
    const placemarks = data.map(point => `
    <Placemark>
      <name>${point.name || 'Ponto'}</name>
      <description>${point.status || ''}</description>
      <Point>
        <coordinates>${point.longitude},${point.latitude},0</coordinates>
      </Point>
    </Placemark>`).join('');

    return `<?xml version="1.0" encoding="UTF-8"?>
<kml xmlns="http://www.opengis.net/kml/2.2">
  <Document>
    <name>Dados Georreferenciados</name>
    <description>Exportado do Sistema de Licenciamento Ambiental</description>
    ${placemarks}
  </Document>
</kml>`;
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div className="flex items-center space-x-3">
            <Download className="w-6 h-6 text-blue-600" />
            <h2 className="text-xl font-bold text-gray-900">Exportar Dados Georreferenciados</h2>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Format Selection */}
          <div>
            <h3 className="text-lg font-medium text-gray-900 mb-4">Formato de Exportação</h3>
            <div className="grid grid-cols-2 gap-3">
              {exportFormats.map((format) => {
                const Icon = format.icon;
                return (
                  <button
                    key={format.id}
                    onClick={() => setExportFormat(format.id)}
                    className={`p-4 border rounded-lg text-left transition-colors ${
                      exportFormat === format.id
                        ? 'border-blue-500 bg-blue-50'
                        : 'border-gray-300 hover:border-gray-400'
                    }`}
                  >
                    <div className="flex items-center space-x-3 mb-2">
                      <Icon className="w-5 h-5 text-gray-600" />
                      <span className="font-medium text-gray-900">{format.name}</span>
                    </div>
                    <p className="text-sm text-gray-600">{format.description}</p>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Field Selection */}
          <div>
            <h3 className="text-lg font-medium text-gray-900 mb-4">Campos a Incluir</h3>
            <div className="space-y-3">
              {Object.entries(includeFields).map(([field, checked]) => {
                const labels = {
                  coordinates: 'Coordenadas (Latitude/Longitude)',
                  name: 'Nome do Ponto',
                  type: 'Tipo (Processo/Empresa)',
                  status: 'Status',
                  details: 'Detalhes Completos'
                };
                
                return (
                  <label key={field} className="flex items-center space-x-3">
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={(e) => setIncludeFields(prev => ({
                        ...prev,
                        [field]: e.target.checked
                      }))}
                      className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                    <span className="text-sm text-gray-700">
                      {labels[field as keyof typeof labels]}
                    </span>
                  </label>
                );
              })}
            </div>
          </div>

          {/* Preview */}
          <div className="bg-gray-50 rounded-lg p-4">
            <h4 className="font-medium text-gray-900 mb-2">Resumo da Exportação</h4>
            <div className="text-sm text-gray-600 space-y-1">
              <p>• <strong>{data.length}</strong> pontos serão exportados</p>
              <p>• Formato: <strong>{exportFormats.find(f => f.id === exportFormat)?.name}</strong></p>
              <p>• Campos incluídos: <strong>{Object.values(includeFields).filter(Boolean).length}</strong></p>
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
            onClick={handleExport}
            disabled={exporting || data.length === 0}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center gap-2 transition-colors"
          >
            {exporting ? (
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              <Download className="w-4 h-4" />
            )}
            {exporting ? 'Exportando...' : 'Exportar'}
          </button>
        </div>
      </div>
    </div>
  );
}