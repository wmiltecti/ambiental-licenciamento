import React, { useState } from 'react';
import { Upload, FileText, MapPin, AlertCircle, CheckCircle, X } from 'lucide-react';

interface GeoUploadProps {
  isOpen: boolean;
  onClose: () => void;
  onUpload: (data: any[], fileName: string) => void;
}

export default function GeoUpload({ isOpen, onClose, onUpload }: GeoUploadProps) {
  const [dragActive, setDragActive] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadResult, setUploadResult] = useState<{
    success: boolean;
    message: string;
    count?: number;
  } | null>(null);

  if (!isOpen) return null;

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFiles(e.dataTransfer.files);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    e.preventDefault();
    if (e.target.files && e.target.files[0]) {
      handleFiles(e.target.files);
    }
  };

  const parseCSV = (text: string): any[] => {
    const lines = text.split('\n');
    const headers = lines[0].split(',').map(h => h.trim().toLowerCase());
    
    const latIndex = headers.findIndex(h => h.includes('lat'));
    const lngIndex = headers.findIndex(h => h.includes('lng') || h.includes('lon'));
    const nameIndex = headers.findIndex(h => h.includes('name') || h.includes('nome'));
    
    if (latIndex === -1 || lngIndex === -1) {
      throw new Error('Colunas de latitude e longitude não encontradas');
    }

    return lines.slice(1)
      .filter(line => line.trim())
      .map((line, index) => {
        const values = line.split(',');
        const lat = parseFloat(values[latIndex]);
        const lng = parseFloat(values[lngIndex]);
        
        if (isNaN(lat) || isNaN(lng)) return null;
        
        return {
          id: `csv-${index}`,
          name: values[nameIndex] || `Ponto ${index + 1}`,
          latitude: lat,
          longitude: lng,
          type: 'imported',
          data: Object.fromEntries(headers.map((h, i) => [h, values[i]]))
        };
      })
      .filter(Boolean);
  };

  // Helper function to calculate centroid of a polygon
  const calculatePolygonCentroid = (coordinates: number[][]): { lat: number; lng: number } => {
    let totalLat = 0;
    let totalLng = 0;
    let count = 0;
    
    coordinates.forEach(coord => {
      if (Array.isArray(coord) && coord.length >= 2) {
        totalLng += parseFloat(coord[0]);
        totalLat += parseFloat(coord[1]);
        count++;
      }
    });
    
    if (count === 0) {
      return { lat: 0, lng: 0 };
    }
    
    return {
      lat: totalLat / count,
      lng: totalLng / count
    };
  };

  const parseJSON = (text: string): any[] => {
    const json = JSON.parse(text);
    
    console.log('🔍 UPLOAD DEBUG - JSON Structure:', {
      type: json.type,
      featuresCount: json.features?.length,
      firstFeature: json.features?.[0]
    });
    
    if (json.type === 'FeatureCollection') {
      // GeoJSON
      console.log('📍 UPLOAD DEBUG - Processing FeatureCollection with', json.features?.length, 'features');
      
      if (!json.features || !Array.isArray(json.features)) {
        console.error('❌ No features array found');
        return [];
      }
      
      // Log first few features for debugging
      console.log('🔍 First feature sample:', json.features[0]);
      
      const processedFeatures = json.features.map((feature: any, index: number) => {
        if (!feature.geometry) {
          console.warn('❌ Feature without geometry at index:', index);
          return null;
        }

        // Validate geometry coordinates
        if (!feature.geometry.coordinates || !Array.isArray(feature.geometry.coordinates)) {
          console.warn('❌ Feature with invalid coordinates at index:', index);
          return null;
        }
        console.log(`🔍 Processing feature ${index}:`, {
          type: feature.geometry.type,
          properties: feature.properties,
          coordinatesLength: feature.geometry.coordinates?.length
        });

        // Return the complete feature structure for polygon rendering
        if (feature.geometry.type === 'Point') {
          const coords = feature.geometry.coordinates;
          if (!Array.isArray(coords) || coords.length < 2 || isNaN(coords[0]) || isNaN(coords[1])) {
            console.warn('❌ Invalid Point coordinates at index:', index);
            return null;
          }
          
          return {
            id: feature.id || `point-${index}`,
            name: feature.properties?.municipio || 
                  feature.properties?.name || 
                  feature.properties?.Nome || 
                  `Ponto ${index + 1}`,
            type: 'Point',
            coordinates: feature.geometry.coordinates,
            properties: feature.properties || {},
            data: feature.properties || {}
          };
        } else if (feature.geometry.type === 'Polygon') {
          const coords = feature.geometry.coordinates;
          if (!Array.isArray(coords) || coords.length === 0 || !Array.isArray(coords[0])) {
            console.warn('❌ Invalid Polygon coordinates at index:', index);
            return null;
          }
          
          return {
            id: feature.id || `polygon-${index}`,
            name: feature.properties?.municipio || 
                  feature.properties?.name || 
                  feature.properties?.Nome || 
                  `Polígono ${index + 1}`,
            type: 'Polygon',
            coordinates: feature.geometry.coordinates,
            properties: feature.properties || {},
            data: feature.properties || {}
          };
        } else if (feature.geometry.type === 'MultiPolygon') {
          const coords = feature.geometry.coordinates;
          if (!Array.isArray(coords) || coords.length === 0) {
            console.warn('❌ Invalid MultiPolygon coordinates at index:', index);
            return null;
          }
          
          console.log('🔶 MultiPolygon found for:', feature.properties?.municipio);
          return {
            id: feature.id || `multipolygon-${index}`,
            name: feature.properties?.municipio || 
                  feature.properties?.name || 
                  feature.properties?.Nome || 
                  `Multi-Polígono ${index + 1}`,
            type: 'MultiPolygon',
            coordinates: feature.geometry.coordinates,
            properties: feature.properties || {},
            data: feature.properties || {}
          };
        } else {
          console.warn('❌ Unsupported geometry type:', feature.geometry.type);
          return null;
        }
      }).filter(Boolean);
      
      console.log('🎯 Final processed features:', {
        total: processedFeatures.length,
        points: processedFeatures.filter(f => f.type === 'Point').length,
        polygons: processedFeatures.filter(f => f.type === 'Polygon').length,
        multiPolygons: processedFeatures.filter(f => f.type === 'MultiPolygon').length
      });
      return processedFeatures;
      
    } else if (Array.isArray(json)) {
      // Array of objects
      console.log('📋 Processing simple array with', json.length, 'items');
      // Handle simple array format - convert to point features
      return json.map((item: any, index: number) => ({
        id: item.id || `json-${index}`,
        name: item.name || item.Nome || `Item ${index + 1}`,
        type: 'Point',
        coordinates: [item.longitude || item.lng, item.latitude || item.lat],
        properties: item,
        data: item
      })).filter(item => 
        !isNaN(item.coordinates[0]) && !isNaN(item.coordinates[1])
      );
      
    } else if (json.latitude || json.lat) {
      // Single object with coordinates
      console.log('📍 Processing single object');
      return [{
        id: json.id || 'json-single',
        name: json.name || json.Nome || 'Ponto Importado',
        type: 'Point',
        coordinates: [json.longitude || json.lng, json.latitude || json.lat],
        properties: json,
        data: json
      }];
    }
    
    console.error('❌ Formato JSON não reconhecido');
    return [];
  };

  const parseKML = (text: string): any[] => {
    const placemarks = text.match(/<Placemark>[\s\S]*?<\/Placemark>/g) || [];
    
    return placemarks.map((placemark, index) => {
      const nameMatch = placemark.match(/<name>(.*?)<\/name>/);
      const coordsMatch = placemark.match(/<coordinates>(.*?)<\/coordinates>/);
      
      if (coordsMatch) {
        const coords = coordsMatch[1].trim().split(',');
        return {
          id: `kml-${index}`,
          name: nameMatch ? nameMatch[1] : `Ponto ${index + 1}`,
          latitude: parseFloat(coords[1]),
          longitude: parseFloat(coords[0]),
          type: 'imported',
          data: { source: 'kml' }
        };
      }
      return null;
    }).filter(Boolean);
  };

  const handleFiles = async (files: FileList) => {
    const file = files[0];
    
    if (!file) return;

    console.log('📁 UPLOAD DEBUG - File selected:', {
      name: file.name,
      size: file.size,
      type: file.type
    });

    // Validate file type
    const validTypes = ['.csv', '.json', '.geojson', '.kml'];
    const fileExtension = '.' + file.name.split('.').pop()?.toLowerCase();
    
    console.log('🔍 UPLOAD DEBUG - File extension:', fileExtension);
    
    if (!validTypes.includes(fileExtension)) {
      setUploadResult({
        success: false,
        message: 'Formato não suportado. Use CSV, JSON, GeoJSON ou KML.'
      });
      return;
    }

    setUploading(true);
    setUploadResult(null);

    try {
      const text = await file.text();
      console.log('📄 UPLOAD DEBUG - File content length:', text.length);
      console.log('📄 UPLOAD DEBUG - First 200 chars:', text.substring(0, 200));
      
      let data: any[] = [];

      switch (fileExtension) {
        case '.csv':
          console.log('🔄 UPLOAD DEBUG - Parsing as CSV');
          data = parseCSV(text);
          break;
        case '.json':
        case '.geojson':
          console.log('🔄 UPLOAD DEBUG - Parsing as JSON/GeoJSON');
          data = parseJSON(text);
          break;
        case '.kml':
          console.log('🔄 UPLOAD DEBUG - Parsing as KML');
          data = parseKML(text);
          break;
      }

      console.log('🎯 UPLOAD DEBUG - Parsed data:', {
        count: data.length,
        sample: data[0]
      });

      if (data.length > 0) {
        onUpload(data, file.name);
        setUploadResult({
          success: true,
          message: 'Arquivo carregado com sucesso!',
          count: data.length
        });
      } else {
        setUploadResult({
          success: false,
          message: 'Nenhum dado georreferenciado encontrado no arquivo.'
        });
      }
    } catch (error) {
      console.error('❌ UPLOAD DEBUG - Error:', error);
      setUploadResult({
        success: false,
        message: 'Erro ao processar arquivo: ' + (error as Error).message
      });
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div className="flex items-center space-x-3">
            <Upload className="w-6 h-6 text-blue-600" />
            <h2 className="text-xl font-bold text-gray-900">Upload de Dados Georreferenciados</h2>
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
      {/* Upload Area */}
      <div
        className={`relative border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
          dragActive
            ? 'border-green-400 bg-green-50'
            : 'border-gray-300 hover:border-green-400 hover:bg-green-50'
        }`}
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
      >
        <input
          type="file"
          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
          onChange={handleChange}
          accept=".csv,.json,.geojson,.kml"
        />
        
        <div className="space-y-4">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto">
            {uploading ? (
              <div className="w-8 h-8 border-2 border-green-600 border-t-transparent rounded-full animate-spin" />
            ) : (
              <Upload className="w-8 h-8 text-green-600" />
            )}
          </div>
          
          <div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              {uploading ? 'Processando arquivo...' : 'Upload de Dados Georreferenciados'}
            </h3>
            <p className="text-gray-600">
              Arraste e solte ou clique para selecionar arquivos
            </p>
            <p className="text-sm text-gray-500 mt-2">
              Formatos suportados: CSV, JSON, GeoJSON, KML
            </p>
          </div>
        </div>
      </div>

      {/* Upload Result */}
      {uploadResult && (
        <div className={`p-4 rounded-lg border ${
          uploadResult.success
            ? 'bg-green-50 border-green-200'
            : 'bg-red-50 border-red-200'
        }`}>
          <div className="flex items-start space-x-3">
            {uploadResult.success ? (
              <CheckCircle className="w-5 h-5 text-green-600 mt-0.5" />
            ) : (
              <AlertCircle className="w-5 h-5 text-red-600 mt-0.5" />
            )}
            <div className="flex-1">
              <p className={`font-medium ${
                uploadResult.success ? 'text-green-900' : 'text-red-900'
              }`}>
                {uploadResult.message}
              </p>
              {uploadResult.success && uploadResult.count && (
                <p className="text-sm text-green-700 mt-1">
                  {uploadResult.count} pontos carregados
                </p>
              )}
            </div>
            <button
              onClick={() => setUploadResult(null)}
              className={`p-1 rounded ${
                uploadResult.success
                  ? 'text-green-400 hover:text-green-600'
                  : 'text-red-400 hover:text-red-600'
              }`}
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Format Examples */}
      <div className="bg-gray-50 rounded-lg p-6">
        <h4 className="font-medium text-gray-900 mb-4 flex items-center gap-2">
          <FileText className="w-4 h-4" />
          Exemplos de Formato
        </h4>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <h5 className="text-sm font-medium text-gray-700 mb-2">CSV</h5>
            <pre className="text-xs bg-white p-3 rounded border text-gray-600">
{`name,latitude,longitude,status
Empresa A,-23.5505,-46.6333,ativo
Processo B,-22.9068,-43.1729,aprovado`}
            </pre>
          </div>
          
          <div>
            <h5 className="text-sm font-medium text-gray-700 mb-2">JSON</h5>
            <pre className="text-xs bg-white p-3 rounded border text-gray-600">
{`[
  {
    "name": "Empresa A",
    "latitude": -23.5505,
    "longitude": -46.6333,
    "status": "ativo"
  }
]`}
            </pre>
          </div>
        </div>
      </div>
        </div>
      </div>
    </div>
  );
}