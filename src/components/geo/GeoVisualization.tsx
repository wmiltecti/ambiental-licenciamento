import React, { useState, useEffect } from 'react';
import { MapPin, Layers, Search, Filter, Download, Upload, Eye, Settings, Maximize2, Plus, Trash2, ToggleLeft, ToggleRight, FileText, X, Palette, GripVertical, GripHorizontal } from 'lucide-react';
import { MapContainer, TileLayer, Polygon, Marker, Popup, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import GeoUpload from './GeoUpload';
import GeoSettings from './GeoSettings';
import GeoExport from './GeoExport';
import GeoColorPicker from './GeoColorPicker';
import 'leaflet/dist/leaflet.css';

// Fix for default markers in react-leaflet
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

interface GeoFeature {
  id: string;
  name: string;
  type: 'Point' | 'Polygon' | 'MultiPolygon';
  coordinates: any;
  properties: any;
  layerId: string;
}

interface GeoLayer {
  id: string;
  name: string;
  features: GeoFeature[];
  visible: boolean;
  color: string;
  opacity: number;
  source: 'system' | 'imported';
  uploadedAt?: string;
  featureCount: number;
}

interface GeoVisualizationProps {
  processes?: any[];
  companies?: any[];
}

// Component for handling map clicks
function MapClickHandler({ 
  onRightClick, 
  onMapReady,
  zoomToLayerId,
  layers,
  onZoomComplete
}: { 
  onRightClick: (feature: GeoFeature, latlng: L.LatLng) => void;
  onMapReady: (map: L.Map) => void;
  zoomToLayerId: string | null;
  layers: GeoLayer[];
  onZoomComplete: () => void;
}) {
  const map = useMapEvents({
    ready: () => {
      console.log('🗺️ Map is ready');
      onMapReady(map);
    },
    contextmenu: (e) => {
      // For now, we'll handle right-click on the map itself
      // In a real implementation, we'd need to detect which feature was clicked
      console.log('Right click at:', e.latlng);
    }
  });

  // Handle zoom to layer when zoomToLayerId changes
  React.useEffect(() => {
    if (zoomToLayerId && map) {
      const layer = layers.find(l => l.id === zoomToLayerId);
      if (!layer || layer.features.length === 0) {
        onZoomComplete();
        return;
      }

      console.log('🎯 Zooming to layer:', layer.name, 'with', layer.features.length, 'features');
      
      // Calculate bounds for all features in the layer
      const allLatLngs: L.LatLngExpression[] = [];
      
      layer.features.forEach(feature => {
        if (feature.type === 'Point') {
          const [lng, lat] = feature.coordinates;
          if (!isNaN(lat) && !isNaN(lng)) {
            allLatLngs.push([lat, lng]);
          }
        } else if (feature.type === 'Polygon') {
          const coords = feature.coordinates[0]; // First ring (outer boundary)
          coords.forEach((coord: number[]) => {
            if (!isNaN(coord[1]) && !isNaN(coord[0])) {
              allLatLngs.push([coord[1], coord[0]]); // [lat, lng]
            }
          });
        } else if (feature.type === 'MultiPolygon') {
          feature.coordinates.forEach((polygon: any) => {
            const coords = polygon[0]; // First ring of each polygon
            coords.forEach((coord: number[]) => {
              if (!isNaN(coord[1]) && !isNaN(coord[0])) {
                allLatLngs.push([coord[1], coord[0]]); // [lat, lng]
              }
            });
          });
        }
      });
      
      if (allLatLngs.length === 0) {
        console.warn('❌ No valid coordinates found for layer');
        onZoomComplete();
        return;
      }
      
      console.log('🎯 Fitting bounds for', allLatLngs.length, 'coordinates');
      
      // Create bounds and fit to view
      const bounds = L.latLngBounds(allLatLngs);
      map.fitBounds(bounds, {
        padding: [50, 50],
        maxZoom: 12,
        animate: true,
        duration: 1.0
      });
      
      console.log('✅ Map centered on layer:', layer.name);
      onZoomComplete();
    }
  }, [zoomToLayerId, map, layers]);

  return null;
}

// Component for rendering polygons with right-click support
function PolygonLayer({ 
  feature, 
  color, 
  opacity,
  onRightClick 
}: { 
  feature: GeoFeature; 
  color: string; 
  opacity: number;
  onRightClick: (feature: GeoFeature, latlng: L.LatLng) => void;
}) {
  const convertCoordinates = (coords: any): L.LatLngExpression[][] => {
    if (feature.type === 'MultiPolygon') {
      // MultiPolygon: [[[lng, lat], [lng, lat], ...]]
      return coords[0].map((ring: any) => 
        ring.map((coord: any) => [coord[1], coord[0]] as L.LatLngExpression)
      );
    } else if (feature.type === 'Polygon') {
      // Polygon: [[lng, lat], [lng, lat], ...]
      return coords.map((ring: any) => 
        ring.map((coord: any) => [coord[1], coord[0]] as L.LatLngExpression)
      );
    }
    return [];
  };

  const positions = convertCoordinates(feature.coordinates);

  return (
    <Polygon
      positions={positions}
      pathOptions={{
        color: color,
        weight: 2,
        opacity: 1.0, // Keep border always visible
        fillColor: color,
        fillOpacity: opacity * 0.4
      }}
      eventHandlers={{
        contextmenu: (e) => {
          e.originalEvent.preventDefault();
          onRightClick(feature, e.latlng);
        }
      }}
    >
      <Popup>
        <div className="text-sm">
          <h4 className="font-medium text-gray-900 mb-1">{feature.name}</h4>
          <p className="text-gray-600">Tipo: {feature.type}</p>
          {feature.properties && Object.keys(feature.properties).length > 0 && (
            <div className="mt-2 pt-2 border-t border-gray-200">
              {Object.entries(feature.properties).slice(0, 3).map(([key, value]) => (
                <div key={key} className="text-xs text-gray-500">
                  <strong>{key}:</strong> {String(value)}
                </div>
              ))}
            </div>
          )}
        </div>
      </Popup>
    </Polygon>
  );
}

export default function GeoVisualization({ processes = [], companies = [] }: GeoVisualizationProps) {
  const [layers, setLayers] = useState<GeoLayer[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedFeature, setSelectedFeature] = useState<GeoFeature | null>(null);
  const [showUpload, setShowUpload] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showExport, setShowExport] = useState(false);
  const [showFeatureInfo, setShowFeatureInfo] = useState(false);
  const [showColorPicker, setShowColorPicker] = useState(false);
  const [editingLayerId, setEditingLayerId] = useState<string | null>(null);
  const [contextMenu, setContextMenu] = useState<{
    x: number;
    y: number;
    feature: GeoFeature;
  } | null>(null);
  const [mapSettings, setMapSettings] = useState({
    defaultZoom: 6,
    defaultCenter: { lat: -15.7801, lng: -47.9292 }, // Centro do Brasil
    mapStyle: 'openstreetmap',
    showClusters: true,
    colorScheme: 'status'
  });
  const [zoomToLayerId, setZoomToLayerId] = useState<string | null>(null);
  const [mapInstance, setMapInstance] = useState<L.Map | null>(null);
  const [draggedLayerId, setDraggedLayerId] = useState<string | null>(null);
  const [dragOverLayerId, setDragOverLayerId] = useState<string | null>(null);
  const [sidebarWidth, setSidebarWidth] = useState(320); // 320px = w-80
  const [isResizing, setIsResizing] = useState(false);
  const [startX, setStartX] = useState(0);
  const [startWidth, setStartWidth] = useState(0);

  // Predefined colors for layers (similar to QGIS)
  const layerColors = [
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
    '#7C3AED'  // Violet-600
  ];

  // Get next available color for new layers
  const getNextLayerColor = () => {
    const usedColors = layers.map(l => l.color);
    const availableColor = layerColors.find(color => !usedColors.includes(color));
    return availableColor || layerColors[layers.length % layerColors.length];
  };

  useEffect(() => {
    // Create system layers from processes and companies
    const systemLayers: GeoLayer[] = [];

    if (processes.length > 0) {
      const processFeatures: GeoFeature[] = processes
        .filter(p => p.coordinates)
        .map((p, index) => {
          const [lat, lng] = p.coordinates.split(',').map((coord: string) => parseFloat(coord.trim()));
          if (isNaN(lat) || isNaN(lng)) return null;
          
          return {
            id: p.id,
            name: p.companies?.name || 'Processo',
            type: 'Point' as const,
            coordinates: [lng, lat],
            properties: {
              ...p,
              type: 'process'
            },
            layerId: 'processes'
          };
        })
        .filter(Boolean);

      if (processFeatures.length > 0) {
        systemLayers.push({
          id: 'processes',
          name: 'Processos de Licenciamento',
          features: processFeatures,
          visible: true,
          color: '#3B82F6',
          opacity: 1.0,
          source: 'system',
          featureCount: processFeatures.length
        });
      }
    }

    if (companies.length > 0) {
      const companyFeatures: GeoFeature[] = companies
        .filter(c => c.coordinates)
        .map((c, index) => {
          const [lat, lng] = c.coordinates.split(',').map((coord: string) => parseFloat(coord.trim()));
          if (isNaN(lat) || isNaN(lng)) return null;
          
          return {
            id: c.id,
            name: c.name,
            type: 'Point' as const,
            coordinates: [lng, lat],
            properties: {
              ...c,
              type: 'company'
            },
            layerId: 'companies'
          };
        })
        .filter(Boolean);

      if (companyFeatures.length > 0) {
        systemLayers.push({
          id: 'companies',
          name: 'Empresas Cadastradas',
          features: companyFeatures,
          visible: true,
          color: '#8B5CF6',
          opacity: 1.0,
          source: 'system',
          featureCount: companyFeatures.length
        });
      }
    }

    setLayers(prev => {
      // Keep imported layers, update system layers
      const importedLayers = prev.filter(l => l.source === 'imported');
      return [...systemLayers, ...importedLayers];
    });
  }, [processes, companies]);

  const handleUploadData = (uploadedData: any[], fileName: string) => {
    console.log('🎯 Creating layer from uploaded data:', uploadedData.length, 'features');
    
    const newFeatures: GeoFeature[] = uploadedData.map((item, index) => ({
      id: item.id || `uploaded-${Date.now()}-${index}`,
      name: item.name,
      type: item.type,
      coordinates: item.coordinates,
      properties: item.properties || item.data || {},
      layerId: `layer-${Date.now()}`
    }));
    
    const layerName = fileName.replace(/\.[^/.]+$/, ""); // Remove extension
    
    const newLayer: GeoLayer = {
      id: `layer-${Date.now()}`,
      name: layerName,
      features: newFeatures,
      visible: true,
      color: getNextLayerColor(),
      opacity: 1.0,
      source: 'imported',
      uploadedAt: new Date().toISOString(),
      featureCount: newFeatures.length
    };

    console.log('✅ New layer created:', newLayer.name, 'with', newLayer.featureCount, 'features');
    setLayers(prev => [...prev, newLayer]);
    setShowUpload(false);
    
    // Auto zoom to the newly imported layer
    setTimeout(() => {
      console.log('🎯 Auto-zooming to newly imported layer:', newLayer.name);
      setZoomToLayerId(newLayer.id);
    }, 100); // Small delay to ensure layer is rendered
  };

  const handleToggleLayer = (layerId: string) => {
    setLayers(prev => prev.map(layer => 
      layer.id === layerId 
        ? { ...layer, visible: !layer.visible }
        : layer
    ));
  };

  const handleDeleteLayer = (layerId: string) => {
    if (confirm('Tem certeza que deseja remover esta camada?')) {
      setLayers(prev => prev.filter(layer => layer.id !== layerId));
    }
  };

  const handleChangeLayerColor = (layerId: string) => {
    setEditingLayerId(layerId);
    setShowColorPicker(true);
  };

  const handleColorChange = (newColor: string) => {
    if (editingLayerId) {
      setLayers(prev => prev.map(layer => 
        layer.id === editingLayerId 
          ? { ...layer, color: newColor }
          : layer
      ));
    }
    setShowColorPicker(false);
    setEditingLayerId(null);
  };

  const handleOpacityChange = (layerId: string, newOpacity: number) => {
    setLayers(prev => prev.map(layer => 
      layer.id === layerId 
        ? { ...layer, opacity: newOpacity }
        : layer
    ));
  };

  const handleDragStart = (e: React.DragEvent, layerId: string) => {
    setDraggedLayerId(layerId);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/html', layerId);
  };

  const handleDragOver = (e: React.DragEvent, layerId: string) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    setDragOverLayerId(layerId);
  };

  const handleDragLeave = () => {
    setDragOverLayerId(null);
  };

  const handleDrop = (e: React.DragEvent, targetLayerId: string) => {
    e.preventDefault();
    
    if (!draggedLayerId || draggedLayerId === targetLayerId) {
      setDraggedLayerId(null);
      setDragOverLayerId(null);
      return;
    }

    console.log('🔄 Reordering layers:', { from: draggedLayerId, to: targetLayerId });

    setLayers(prev => {
      const newLayers = [...prev];
      const draggedIndex = newLayers.findIndex(l => l.id === draggedLayerId);
      const targetIndex = newLayers.findIndex(l => l.id === targetLayerId);
      
      if (draggedIndex === -1 || targetIndex === -1) return prev;
      
      // Remove dragged layer and insert at target position
      const [draggedLayer] = newLayers.splice(draggedIndex, 1);
      newLayers.splice(targetIndex, 0, draggedLayer);
      
      console.log('✅ Layers reordered. New order:', newLayers.map(l => l.name));
      return newLayers;
    });

    setDraggedLayerId(null);
    setDragOverLayerId(null);
  };

  const handleSaveSettings = (newSettings: any) => {
    setMapSettings(newSettings);
    localStorage.setItem('geoMapSettings', JSON.stringify(newSettings));
  };

  const handleZoomToLayer = (layerId: string) => {
    const layer = layers.find(l => l.id === layerId);
    if (!layer || layer.features.length === 0) return;

    console.log('🎯 Zooming to layer:', layer.name, 'with', layer.features.length, 'features');

    // Store the layer ID to zoom to
    setZoomToLayerId(layerId);
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    setIsResizing(true);
    setStartX(e.clientX);
    setStartWidth(sidebarWidth);
    e.preventDefault();
  };

  const handleMouseMove = React.useCallback((e: MouseEvent) => {
    if (!isResizing) return;
    
    const deltaX = e.clientX - startX;
    const newWidth = Math.max(200, Math.min(600, startWidth + deltaX)); // Min 200px, Max 600px
    setSidebarWidth(newWidth);
  }, [isResizing, startX, startWidth]);

  const handleMouseUp = React.useCallback(() => {
    setIsResizing(false);
  }, []);

  React.useEffect(() => {
    if (isResizing) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      document.body.style.cursor = 'col-resize';
      document.body.style.userSelect = 'none';
      
      return () => {
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
        document.body.style.cursor = '';
        document.body.style.userSelect = '';
      };
    }
  }, [isResizing, handleMouseMove, handleMouseUp]);

  const handleFeatureRightClick = (feature: GeoFeature, latlng: L.LatLng) => {
    // Get mouse position from the map event
    const mapContainer = document.querySelector('.leaflet-container');
    if (mapContainer) {
      const rect = mapContainer.getBoundingClientRect();
      setContextMenu({
        x: rect.left + 200, // Approximate position
        y: rect.top + 200,
        feature
      });
    }
  };

  const handleZoomToFeature = (feature: GeoFeature) => {
    // Get map instance
    if (!mapInstance) return;
    
    const map = mapInstance;
    
    // Calculate bounds for the feature
    let bounds: L.LatLngBounds;

    if (feature.type === 'Point') {
      const [lng, lat] = feature.coordinates;
      bounds = L.latLngBounds([lat, lng], [lat, lng]).pad(0.01);
    } else if (feature.type === 'Polygon') {
      const coords = feature.coordinates[0]; // First ring
      const latLngs = coords.map((coord: number[]) => [coord[1], coord[0]] as L.LatLngExpression);
      bounds = L.latLngBounds(latLngs);
    } else if (feature.type === 'MultiPolygon') {
      const allCoords: L.LatLngExpression[] = [];
      feature.coordinates.forEach((polygon: any) => {
        polygon[0].forEach((coord: number[]) => {
          allCoords.push([coord[1], coord[0]] as L.LatLngExpression);
        });
      });
      bounds = L.latLngBounds(allCoords);
    } else {
      return;
    }
    
    // Fit bounds with proper centering
    map.fitBounds(bounds, { 
      padding: [30, 30],
      maxZoom: 15
    });
    
    setContextMenu(null);
  };

  const handleShowFeatureInfo = (feature: GeoFeature) => {
    setSelectedFeature(feature);
    setShowFeatureInfo(true);
    setContextMenu(null);
  };

  // Close context menu when clicking elsewhere
  React.useEffect(() => {
    const handleClickOutside = () => setContextMenu(null);
    if (contextMenu) {
      document.addEventListener('click', handleClickOutside);
      return () => document.removeEventListener('click', handleClickOutside);
    }
  }, [contextMenu]);

  // Get all visible features from all layers
  // Reverse the order so first layer in list renders on top
  const visibleFeatures = [...layers].reverse()
    .filter(layer => layer.visible)
    .flatMap(layer => layer.features)
    .filter(feature => 
      !searchTerm || feature.name.toLowerCase().includes(searchTerm.toLowerCase())
    );

  const getTileLayer = () => {
    switch (mapSettings.mapStyle) {
      case 'satellite':
        return (
          <TileLayer
            attribution='&copy; <a href="https://www.esri.com/">Esri</a>'
            url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
          />
        );
      case 'terrain':
        return (
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            url="https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png"
          />
        );
      default:
        return (
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
        );
    }
  };

  return (
    <div className="flex flex-col bg-white h-full">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-gray-200">
        <div className="flex items-center space-x-3">
          <div className="w-8 h-8 bg-green-600 rounded-lg flex items-center justify-center">
            <MapPin className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-gray-900">Visualização Georreferenciada</h1>
            <p className="text-sm text-gray-500">
              {layers.length} camadas • {visibleFeatures.length} features visíveis
            </p>
          </div>
        </div>
        <div className="flex items-center space-x-3">
          <button 
            onClick={() => setShowUpload(true)}
            className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors flex items-center gap-2"
          >
            <Upload className="w-4 h-4" />
            Importar Dados
          </button>
          <button 
            onClick={() => setShowExport(true)}
            className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
            title="Exportar dados"
          >
            <Download className="w-5 h-5" />
          </button>
          <button 
            onClick={() => setShowSettings(true)}
            className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
            title="Configurações"
          >
            <Settings className="w-5 h-5" />
          </button>
        </div>
      </div>

      <div className="flex-1 flex" style={{ height: 'calc(100vh - 80px)' }}>
        {/* Sidebar - Layers Panel */}
        <div 
          className="border-r border-gray-200 flex flex-col bg-gray-50 flex-shrink-0"
          style={{ width: `${sidebarWidth}px` }}
        >
          {/* Search */}
          <div className="p-4 border-b border-gray-200 bg-white">
            <div className="relative">
              <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
              <input
                type="text"
                placeholder="Buscar camadas..."
                className="pl-10 w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          </div>

          {/* Layers Panel */}
          <div className="flex-1 overflow-y-auto">
            <div className="p-4">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-medium text-gray-900 flex items-center gap-2">
                  <Layers className="w-4 h-4" />
                  Camadas ({layers.length})
                </h3>
              </div>

              <div className="space-y-2">
                {layers.map((layer) => (
                  <div
                    key={layer.id}
                    className={`bg-white border rounded-lg p-3 transition-all cursor-move ${
                      draggedLayerId === layer.id 
                        ? 'border-blue-500 shadow-lg opacity-50' 
                        : dragOverLayerId === layer.id
                        ? 'border-green-500 shadow-md'
                        : 'border-gray-200 hover:shadow-sm'
                    }`}
                    draggable
                    onDragStart={(e) => handleDragStart(e, layer.id)}
                    onDragOver={(e) => handleDragOver(e, layer.id)}
                    onDragLeave={handleDragLeave}
                    onDrop={(e) => handleDrop(e, layer.id)}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center space-x-2">
                        <div className="text-gray-400 hover:text-gray-600 cursor-grab active:cursor-grabbing">
                          <GripVertical className="w-4 h-4" />
                        </div>
                        <button
                          onClick={() => handleToggleLayer(layer.id)}
                          className={`transition-colors ${
                            layer.visible ? 'text-green-600' : 'text-gray-400'
                          }`}
                        >
                          {layer.visible ? (
                            <ToggleRight className="w-5 h-5" />
                          ) : (
                            <ToggleLeft className="w-5 h-5" />
                          )}
                        </button>
                        <button
                          onClick={() => handleChangeLayerColor(layer.id)}
                          className="w-4 h-4 rounded border-2 border-white shadow-sm"
                          style={{ backgroundColor: layer.color }}
                          title="Alterar cor da camada"
                        />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center space-x-2 mb-1">
                            <span className="text-xs text-gray-500 w-8">
                              {Math.round(layer.opacity * 100)}%
                            </span>
                            <input
                              type="range"
                              min="0"
                              max="1"
                              step="0.1"
                              value={layer.opacity}
                              onChange={(e) => handleOpacityChange(layer.id, parseFloat(e.target.value))}
                              className="flex-1 h-1 bg-gray-200 rounded-lg appearance-none cursor-pointer opacity-slider"
                              title={`Opacidade: ${Math.round(layer.opacity * 100)}%`}
                            />
                          </div>
                          <div className="flex-1">
                            <p className="text-sm font-medium text-gray-900 truncate">
                              {layer.name}
                            </p>
                            <div className="flex items-center space-x-2 text-xs text-gray-500">
                              <span>{layer.featureCount} features</span>
                              <span>•</span>
                              <span className={`px-1 py-0.5 rounded text-xs ${
                                layer.source === 'system' 
                                  ? 'bg-blue-100 text-blue-700' 
                                  : 'bg-green-100 text-green-700'
                              }`}>
                                {layer.source === 'system' ? 'Sistema' : 'Importada'}
                              </span>
                              <span>•</span>
                              <span className="text-xs text-gray-400">
                                #{layers.indexOf(layer) + 1}
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center space-x-1">
                        <button
                          onClick={() => handleZoomToLayer(layer.id)}
                          className="p-1 text-gray-400 hover:text-blue-600 transition-colors"
                          title="Aproximar camada"
                        >
                          <Search className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleChangeLayerColor(layer.id)}
                          className="p-1 text-gray-400 hover:text-purple-600 transition-colors"
                          title="Alterar cor"
                        >
                          <Palette className="w-4 h-4" />
                        </button>
                        {layer.source === 'imported' && (
                          <button
                            onClick={() => handleDeleteLayer(layer.id)}
                            className="p-1 text-gray-400 hover:text-red-600 transition-colors"
                            title="Remover camada"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </div>

                    {layer.uploadedAt && (
                      <div className="text-xs text-gray-400 mt-1">
                        Importada em {new Date(layer.uploadedAt).toLocaleString('pt-BR')}
                      </div>
                    )}

                    {/* Layer Stats */}
                    <div className="mt-2 pt-2 border-t border-gray-100">
                      <div className="grid grid-cols-2 gap-2 text-xs">
                        <div>
                          <span className="text-gray-500">Tipo:</span>
                          <span className="ml-1 text-gray-700">
                            {layer.features[0]?.type === 'Point' ? 'Pontos' : 
                             layer.features[0]?.type === 'Polygon' ? 'Polígonos' : 
                             layer.features[0]?.type === 'MultiPolygon' ? 'Multi-Polígonos' : 'Misto'}
                          </span>
                        </div>
                        <div>
                          <span className="text-gray-500">Status:</span>
                          <span className={`ml-1 ${layer.visible ? 'text-green-600' : 'text-gray-400'}`}>
                            {layer.visible ? 'Visível' : 'Oculta'}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}

                {layers.length === 0 && (
                  <div className="text-center py-8">
                    <Layers className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                    <p className="text-gray-500 text-sm">Nenhuma camada carregada</p>
                    <p className="text-gray-400 text-xs mt-1">
                      Importe dados para começar
                    </p>
                  </div>
                )}
                
                {layers.length > 1 && (
                  <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                    <div className="flex items-center space-x-2 text-xs text-blue-700">
                      <GripVertical className="w-3 h-3" />
                      <span>Arraste as camadas para reordenar. A primeira da lista fica por cima.</span>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Resizable Divider */}
        <div 
          className={`w-1 bg-gray-300 hover:bg-blue-400 cursor-col-resize flex-shrink-0 relative group transition-colors ${
            isResizing ? 'bg-blue-500' : ''
          }`}
          onMouseDown={handleMouseDown}
        >
          {/* Visual indicator */}
          <div className="absolute inset-y-0 left-0 w-1 bg-current opacity-0 group-hover:opacity-100 transition-opacity" />
          
          {/* Grip icon in the center */}
          <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity">
            <div className="bg-white border border-gray-300 rounded p-1 shadow-sm">
              <GripHorizontal className="w-3 h-3 text-gray-600 rotate-90" />
            </div>
          </div>
          
          {/* Tooltip */}
          <div className="absolute top-1/2 left-2 transform -translate-y-1/2 bg-gray-800 text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none">
            Arraste para redimensionar
          </div>
        </div>

        {/* Map Area */}
        <div className="flex-1 relative">
          {visibleFeatures.length > 0 || layers.length === 0 ? (
            <MapContainer
              center={[mapSettings.defaultCenter.lat, mapSettings.defaultCenter.lng]}
              zoom={mapSettings.defaultZoom}
              style={{ height: '100%', width: '100%', minHeight: 'calc(100vh - 160px)' }}
              className="z-0"
            >
              {/* Base Layer Selector */}
              <div className="absolute top-4 right-4 z-[1000] bg-white rounded-lg shadow-lg border border-gray-200 p-2">
                <div className="text-xs font-medium text-gray-700 mb-2">Camada Base:</div>
                <div className="space-y-1">
                  <button
                    onClick={() => setMapSettings(prev => ({ ...prev, mapStyle: 'openstreetmap' }))}
                    className={`w-full text-left px-2 py-1 text-xs rounded ${
                      mapSettings.mapStyle === 'openstreetmap' 
                        ? 'bg-blue-100 text-blue-700' 
                        : 'text-gray-600 hover:bg-gray-100'
                    }`}
                  >
                    🗺️ OpenStreetMap
                  </button>
                  <button
                    onClick={() => setMapSettings(prev => ({ ...prev, mapStyle: 'satellite' }))}
                    className={`w-full text-left px-2 py-1 text-xs rounded ${
                      mapSettings.mapStyle === 'satellite' 
                        ? 'bg-blue-100 text-blue-700' 
                        : 'text-gray-600 hover:bg-gray-100'
                    }`}
                  >
                    🛰️ Satélite
                  </button>
                </div>
              </div>

              {getTileLayer()}
              
              {/* Render polygons for visible features */}
              {visibleFeatures.map((feature) => {
                const layer = layers.find(l => l.id === feature.layerId);
                if (!layer || !layer.visible) return null;

                if (feature.type === 'Polygon' || feature.type === 'MultiPolygon') {
                  return (
                    <PolygonLayer
                      key={feature.id}
                      feature={feature}
                      color={layer.color}
                      opacity={layer.opacity}
                      onRightClick={handleFeatureRightClick}
                    />
                  );
                } else if (feature.type === 'Point') {
                  const [lng, lat] = feature.coordinates;
                  if (isNaN(lat) || isNaN(lng)) {
                    console.warn('❌ Invalid Point coordinates for rendering:', feature.name, [lat, lng]);
                    return null;
                  }
                  
                  return (
                    <Marker
                      key={feature.id}
                      position={[lat, lng]}
                      eventHandlers={{
                        contextmenu: (e) => {
                          e.originalEvent.preventDefault();
                          handleFeatureRightClick(feature, e.latlng);
                        }
                      }}
                    >
                      <Popup>
                        <div className="text-sm">
                          <h4 className="font-medium text-gray-900 mb-1">{feature.name}</h4>
                          <p className="text-gray-600">Camada: {layer.name}</p>
                          <p className="text-gray-500 text-xs">Coords: {lat.toFixed(4)}, {lng.toFixed(4)}</p>
                          {feature.properties && Object.keys(feature.properties).length > 0 && (
                            <div className="mt-2 pt-2 border-t border-gray-200">
                              {Object.entries(feature.properties).slice(0, 3).map(([key, value]) => (
                                <div key={key} className="text-xs text-gray-500">
                                  <strong>{key}:</strong> {String(value)}
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      </Popup>
                    </Marker>
                  );
                }
                
                return null; // Points will be handled later if needed
              })}

              <MapClickHandler 
                onRightClick={handleFeatureRightClick}
                onMapReady={setMapInstance}
                zoomToLayerId={zoomToLayerId}
                layers={layers}
                onZoomComplete={() => setZoomToLayerId(null)}
              />
            </MapContainer>
          ) : (
            // Empty state when no data
            <div className="w-full bg-gradient-to-br from-green-50 to-blue-50 flex items-center justify-center" style={{ height: 'calc(100vh - 160px)' }}>
              <div className="text-center">
                <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <MapPin className="w-8 h-8 text-green-600" />
                </div>
                <h3 className="text-lg font-medium text-gray-900 mb-2">Mapa Interativo</h3>
                <p className="text-gray-600 mb-4">
                  Importe dados georreferenciados para visualizar no mapa
                </p>
                <button
                  onClick={() => setShowUpload(true)}
                  className="bg-green-600 text-white px-6 py-3 rounded-lg hover:bg-green-700 transition-colors flex items-center gap-2 mx-auto"
                >
                  <Upload className="w-5 h-5" />
                  Importar Dados GeoJSON
                </button>
              </div>
            </div>
          )}

          {/* Context Menu */}
          {contextMenu && (
            <div
              className="absolute bg-white border border-gray-200 rounded-lg shadow-lg py-2 z-[1001]"
              style={{
                left: contextMenu.x,
                top: contextMenu.y,
                minWidth: '180px'
              }}
              onClick={(e) => e.stopPropagation()}
            >
              <button
                onClick={() => handleShowFeatureInfo(contextMenu.feature)}
                className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-100 flex items-center gap-2"
              >
                <FileText className="w-4 h-4" />
                Ver informações
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Stats Bar */}
      <div className="border-t border-gray-200 bg-gray-50 px-6 py-3">
        <div className="flex items-center justify-between text-sm">
          <div className="flex items-center space-x-6">
            {layers.map(layer => (
              <div key={layer.id} className="flex items-center space-x-2">
                <div 
                  className="w-2 h-2 rounded-full" 
                  style={{ backgroundColor: layer.visible ? layer.color : '#D1D5DB' }}
                />
                <span className={layer.visible ? 'text-gray-700' : 'text-gray-400'}>
                  {layer.name}: {layer.featureCount}
                </span>
              </div>
            ))}
          </div>
          <div className="text-gray-500">
            {layers.length} camadas • {visibleFeatures.length} features visíveis
          </div>
        </div>
      </div>

      {/* Feature Info Modal */}
      {showFeatureInfo && selectedFeature && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[80vh] overflow-hidden">
            <div className="flex items-center justify-between p-4 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900">Informações da Feature</h3>
              <button
                onClick={() => setShowFeatureInfo(false)}
                className="p-2 text-gray-400 hover:text-gray-600 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-4 overflow-y-auto max-h-[60vh]">
              <div className="space-y-4">
                <div>
                  <h4 className="font-medium text-gray-900 mb-2">{selectedFeature.name}</h4>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="text-gray-500">Tipo:</span>
                      <span className="ml-2 text-gray-900">{selectedFeature.type}</span>
                    </div>
                    <div>
                      <span className="text-gray-500">ID:</span>
                      <span className="ml-2 text-gray-900 font-mono text-xs">{selectedFeature.id}</span>
                    </div>
                  </div>
                </div>
                
                {selectedFeature.properties && (
                  <div>
                    <h5 className="font-medium text-gray-900 mb-2">Propriedades:</h5>
                    <div className="bg-gray-50 rounded-lg p-3 space-y-2">
                      {Object.entries(selectedFeature.properties).map(([key, value]) => (
                        <div key={key} className="grid grid-cols-3 gap-2 text-sm">
                          <span className="text-gray-500 font-medium">{key}:</span>
                          <span className="col-span-2 text-gray-900 break-words">
                            {typeof value === 'object' ? JSON.stringify(value) : String(value)}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modals */}
      <GeoUpload
        isOpen={showUpload}
        onClose={() => setShowUpload(false)}
        onUpload={handleUploadData}
      />

      <GeoSettings
        isOpen={showSettings}
        onClose={() => setShowSettings(false)}
        onSave={handleSaveSettings}
        currentSettings={mapSettings}
      />

      <GeoExport
        isOpen={showExport}
        onClose={() => setShowExport(false)}
        data={visibleFeatures}
      />

      <GeoColorPicker
        isOpen={showColorPicker}
        onClose={() => {
          setShowColorPicker(false);
          setEditingLayerId(null);
        }}
        currentColor={editingLayerId ? layers.find(l => l.id === editingLayerId)?.color || '#3B82F6' : '#3B82F6'}
        onColorChange={handleColorChange}
        layerName={editingLayerId ? layers.find(l => l.id === editingLayerId)?.name || '' : ''}
      />
    </div>
  );
}