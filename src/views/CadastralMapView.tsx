import React, { useState, useEffect } from 'react';
import { api } from '../services/api.js';
import { LandRecord } from '../types.js';
import { ConfidenceBadge } from '../components/ConfidenceBadge.js';
import { StatusBadge } from '../components/StatusBadge.js';
import { RecordDetailModal } from './RecordDetailModal.js';
import {
  MapPin,
  Layers,
  Info,
  ExternalLink,
  Building,
  Eye,
  CheckCircle2,
  AlertTriangle,
  Compass
} from 'lucide-react';
import { MapContainer, TileLayer, Marker, Popup, Polygon, useMap } from 'react-leaflet';
import L from 'leaflet';

// Leaflet view controller helper
const MapViewController: React.FC<{ center: [number, number]; zoom: number }> = ({ center, zoom }) => {
  const map = useMap();
  useEffect(() => {
    map.flyTo(center, zoom, { duration: 1.2 });
  }, [center, zoom, map]);
  return null;
};

// Leaflet default icon fix
const defaultIcon = L.icon({
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
});

interface CadastralMapViewProps {
  onNavigate: (tab: any, params?: any) => void;
}

export const CadastralMapView: React.FC<CadastralMapViewProps> = ({ onNavigate }) => {
  const [records, setRecords] = useState<LandRecord[]>([]);
  const [selectedRecord, setSelectedRecord] = useState<LandRecord | null>(null);
  const [activeParcel, setActiveParcel] = useState<LandRecord | null>(null);
  const [mapCenter, setMapCenter] = useState<[number, number]>([20.5937, 78.9629]); // India Centroid
  const [zoom, setZoom] = useState<number>(5);

  useEffect(() => {
    api.getRecords().then((res) => {
      if (res.success && res.data) {
        setRecords(res.data);
        if (res.data.length > 0) {
          setActiveParcel(res.data[0]);
        }
      }
    });
  }, []);

  const handleSelectParcel = (rec: LandRecord) => {
    setActiveParcel(rec);
    if (rec.latitude && rec.longitude) {
      setMapCenter([rec.latitude, rec.longitude]);
      setZoom(15);
    }
  };

  return (
    <div className="space-y-4">
      {/* Title & Mandatory Mock Data Disclaimer */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <Compass className="w-6 h-6 text-blue-600" />
            <span>GIS Cadastral Spatial Parcel Viewer</span>
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Geospatial parcel boundary overlay integrated with AI-digitized land records.
          </p>
        </div>

        <div className="px-3 py-1.5 rounded-xl bg-amber-50 border border-amber-300 text-amber-900 text-xs font-bold flex items-center gap-2">
          <Info className="w-4 h-4 text-amber-600 shrink-0" />
          <span>GIS DEMO / SIMULATED PARCEL DATA</span>
        </div>
      </div>

      {/* Main Map Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        {/* Left Side: Parcel Selector (Col 4) */}
        <div className="lg:col-span-4 bg-white rounded-2xl border border-slate-200 p-4 shadow-xs flex flex-col justify-between max-h-[340px] sm:max-h-[400px] lg:max-h-[620px]">
          <div className="overflow-hidden flex flex-col">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-3 shrink-0">
              <span className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
                <Layers className="w-4 h-4 text-blue-600" />
                <span>Digitized Parcels ({records.length})</span>
              </span>
              <span className="text-[11px] text-slate-500">Click to pan map</span>
            </div>

            <div className="space-y-2.5 overflow-y-auto max-h-[220px] sm:max-h-[280px] lg:max-h-[460px] pr-1">
              {records.map((rec) => {
                const isSelected = activeParcel?.id === rec.id;
                return (
                  <button
                    key={rec.id}
                    onClick={() => handleSelectParcel(rec)}
                    className={`w-full text-left p-3 rounded-xl border transition-all ${
                      isSelected
                        ? 'bg-blue-50 border-blue-500 shadow-xs ring-1 ring-blue-400'
                        : 'bg-slate-50 border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <div className="font-bold text-xs text-slate-900 truncate">{rec.ownerName}</div>
                        <div className="text-[10px] text-slate-500 truncate">
                          {rec.village}, {rec.district} ({rec.state})
                        </div>
                      </div>
                      <ConfidenceBadge score={rec.overallConfidence} size="sm" />
                    </div>

                    <div className="mt-2 pt-2 border-t border-slate-200 flex items-center justify-between text-[11px] gap-2">
                      <span className="font-mono text-slate-700 truncate">
                        Survey: {rec.surveyNumber || rec.khasraNumber}
                      </span>
                      <span className="font-bold text-slate-900 shrink-0">
                        {rec.plotArea} {rec.plotAreaUnit}
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {activeParcel && (
            <div className="pt-3 border-t border-slate-100 flex items-center justify-between gap-2 mt-2 shrink-0">
              <span className="text-xs text-slate-600 font-medium truncate max-w-[160px] sm:max-w-[200px]">
                {activeParcel.ownerName}
              </span>
              <button
                onClick={() => setSelectedRecord(activeParcel)}
                className="px-3 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold flex items-center gap-1 shrink-0"
              >
                <Eye className="w-3.5 h-3.5" />
                <span>Open Dossier</span>
              </button>
            </div>
          )}
        </div>

        {/* Right Side: Leaflet Map Container (Col 8) */}
        <div className="lg:col-span-8 bg-slate-950 rounded-2xl overflow-hidden border border-slate-800 shadow-md relative min-h-[380px] sm:min-h-[460px] lg:min-h-[580px] h-[380px] sm:h-[460px] lg:h-[620px]">
          <MapContainer
            center={mapCenter}
            zoom={zoom}
            scrollWheelZoom={true}
            style={{ height: '100%', width: '100%' }}
          >
            <MapViewController center={mapCenter} zoom={zoom} />
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />

            {records.map((rec) => {
              if (!rec.latitude || !rec.longitude) return null;
              const isSelected = activeParcel?.id === rec.id;

              return (
                <React.Fragment key={rec.id}>
                  <Marker
                    position={[rec.latitude, rec.longitude]}
                    icon={defaultIcon}
                    eventHandlers={{
                      click: () => setActiveParcel(rec),
                    }}
                  >
                    <Popup>
                      <div className="p-1 space-y-1 text-xs">
                        <div className="font-bold text-slate-900">{rec.ownerName}</div>
                        <div className="text-[11px] text-slate-600">
                          Survey: {rec.surveyNumber} • {rec.plotArea} {rec.plotAreaUnit}
                        </div>
                        <div className="text-[11px] text-slate-600">
                          {rec.village}, {rec.district}
                        </div>
                        <div className="pt-1">
                          <button
                            onClick={() => setSelectedRecord(rec)}
                            className="text-blue-600 font-bold hover:underline"
                          >
                            View Record Details &rarr;
                          </button>
                        </div>
                      </div>
                    </Popup>
                  </Marker>

                  {rec.polygonBoundary && rec.polygonBoundary.length > 0 && (
                    <Polygon
                      positions={rec.polygonBoundary}
                      pathOptions={{
                        color: isSelected ? '#2563eb' : '#059669',
                        fillColor: isSelected ? '#3b82f6' : '#10b981',
                        fillOpacity: isSelected ? 0.45 : 0.25,
                        weight: isSelected ? 3 : 1.5,
                      }}
                    />
                  )}
                </React.Fragment>
              );
            })}
          </MapContainer>

          {/* Floating Map Legend */}
          <div className="absolute bottom-3 right-3 sm:bottom-4 sm:right-4 z-[1000] bg-white/95 backdrop-blur-xs p-2.5 sm:p-3 rounded-xl border border-slate-200 shadow-lg text-[10px] sm:text-xs space-y-1 sm:space-y-1.5 max-w-[180px] sm:max-w-none">
            <div className="font-bold text-slate-900 text-[10px] sm:text-[11px] uppercase tracking-wider">
              Cadastral Legend
            </div>
            <div className="flex items-center gap-1.5 sm:gap-2">
              <span className="w-2.5 h-2.5 sm:w-3 sm:h-3 rounded-xs bg-emerald-500/40 border border-emerald-600 inline-block shrink-0" />
              <span className="text-slate-700">Verified Land Parcel</span>
            </div>
            <div className="flex items-center gap-1.5 sm:gap-2">
              <span className="w-2.5 h-2.5 sm:w-3 sm:h-3 rounded-xs bg-blue-500/40 border border-blue-600 inline-block shrink-0" />
              <span className="text-slate-700">Selected / Active Parcel</span>
            </div>
          </div>
        </div>
      </div>

      {selectedRecord && (
        <RecordDetailModal
          record={selectedRecord}
          onClose={() => setSelectedRecord(null)}
          onNavigateToVerifier={(recordId) => {
            setSelectedRecord(null);
            onNavigate('verification', { taskId: recordId });
          }}
        />
      )}
    </div>
  );
};
