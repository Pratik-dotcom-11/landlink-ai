import React, { useState } from 'react';
import { api } from '../services/api.js';
import { LandRecord } from '../types.js';
import { ConfidenceBadge } from '../components/ConfidenceBadge.js';
import { StatusBadge } from '../components/StatusBadge.js';
import { RecordDetailModal } from './RecordDetailModal.js';
import {
  Search,
  SlidersHorizontal,
  RotateCcw,
  Eye,
  CheckCircle2,
  MapPin,
  Building,
  User,
  Hash,
  Sparkles
} from 'lucide-react';

interface CadastralSearchViewProps {
  onNavigate: (tab: any, params?: any) => void;
}

export const CadastralSearchView: React.FC<CadastralSearchViewProps> = ({ onNavigate }) => {
  const [filters, setFilters] = useState({
    q: '',
    ownerName: '',
    surveyNumber: '',
    khasraNumber: '',
    khataNumber: '',
    village: '',
    district: '',
    state: '',
    registrationNumber: '',
  });

  const [results, setResults] = useState<LandRecord[]>([]);
  const [totalFound, setTotalFound] = useState<number | null>(null);
  const [isSearching, setIsSearching] = useState(false);
  const [selectedRecord, setSelectedRecord] = useState<LandRecord | null>(null);

  const handleInputChange = (field: string, value: string) => {
    setFilters((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const executeSearch = async () => {
    setIsSearching(true);
    try {
      // Filter out empty keys
      const params: Record<string, string> = {};
      for (const [k, v] of Object.entries(filters)) {
        const valStr = String(v ?? '').trim();
        if (valStr) params[k] = valStr;
      }

      const res = await api.searchRecords(params);
      if (res.success && res.data) {
        setResults(res.data.results);
        setTotalFound(res.data.total);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsSearching(false);
    }
  };

  const handleReset = () => {
    setFilters({
      q: '',
      ownerName: '',
      surveyNumber: '',
      khasraNumber: '',
      khataNumber: '',
      village: '',
      district: '',
      state: '',
      registrationNumber: '',
    });
    setResults([]);
    setTotalFound(null);
  };

  return (
    <div className="space-y-6">
      {/* Title */}
      <div>
        <h2 className="text-xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
          <Search className="w-6 h-6 text-blue-600" />
          <span>Advanced Multi-Parameter Cadastral Search Engine</span>
        </h2>
        <p className="text-xs text-slate-500 mt-1">
          Query digitized land parcels across revenue boundaries using survey numbers, owner details, or registration IDs.
        </p>
      </div>

      {/* Search Filter Card */}
      <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <SlidersHorizontal className="w-4 h-4 text-blue-600" />
            <span className="text-xs font-bold text-slate-900 uppercase tracking-wider">
              Cadastral Query Filters
            </span>
          </div>
          <button
            onClick={handleReset}
            className="text-xs text-slate-500 hover:text-slate-800 font-semibold flex items-center gap-1"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Reset Fields</span>
          </button>
        </div>

        {/* Global Text Query */}
        <div>
          <label className="text-xs font-bold text-slate-700 block mb-1">
            Omni-Search Keyword (Any field, owner, or landmark)
          </label>
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="e.g. Deshmukh, Wagholi, Survey 214/1A, Pune..."
              value={filters.q}
              onChange={(e) => handleInputChange('q', e.target.value)}
              className="w-full pl-9 pr-4 py-2.5 rounded-xl text-xs border border-slate-300 focus:ring-2 focus:ring-blue-500 bg-slate-50/50"
            />
          </div>
        </div>

        {/* Parameterized Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 pt-2">
          <div>
            <label className="text-[11px] font-semibold text-slate-600 block mb-1">
              Landowner Name
            </label>
            <input
              type="text"
              placeholder="e.g. Ramesh Chandra"
              value={filters.ownerName}
              onChange={(e) => handleInputChange('ownerName', e.target.value)}
              className="w-full px-3 py-1.5 rounded-lg text-xs border border-slate-300"
            />
          </div>

          <div>
            <label className="text-[11px] font-semibold text-slate-600 block mb-1">
              Survey / Plot Number
            </label>
            <input
              type="text"
              placeholder="e.g. 214/1A or P-184"
              value={filters.surveyNumber}
              onChange={(e) => handleInputChange('surveyNumber', e.target.value)}
              className="w-full px-3 py-1.5 rounded-lg text-xs border border-slate-300"
            />
          </div>

          <div>
            <label className="text-[11px] font-semibold text-slate-600 block mb-1">
              Khasra Number
            </label>
            <input
              type="text"
              placeholder="e.g. 184/2"
              value={filters.khasraNumber}
              onChange={(e) => handleInputChange('khasraNumber', e.target.value)}
              className="w-full px-3 py-1.5 rounded-lg text-xs border border-slate-300"
            />
          </div>

          <div>
            <label className="text-[11px] font-semibold text-slate-600 block mb-1">
              Khata / Account Number
            </label>
            <input
              type="text"
              placeholder="e.g. 101"
              value={filters.khataNumber}
              onChange={(e) => handleInputChange('khataNumber', e.target.value)}
              className="w-full px-3 py-1.5 rounded-lg text-xs border border-slate-300"
            />
          </div>

          <div>
            <label className="text-[11px] font-semibold text-slate-600 block mb-1">
              Village / Mouza
            </label>
            <input
              type="text"
              placeholder="e.g. Wagholi or Rampur"
              value={filters.village}
              onChange={(e) => handleInputChange('village', e.target.value)}
              className="w-full px-3 py-1.5 rounded-lg text-xs border border-slate-300"
            />
          </div>

          <div>
            <label className="text-[11px] font-semibold text-slate-600 block mb-1">
              District
            </label>
            <input
              type="text"
              placeholder="e.g. Pune or Indore"
              value={filters.district}
              onChange={(e) => handleInputChange('district', e.target.value)}
              className="w-full px-3 py-1.5 rounded-lg text-xs border border-slate-300"
            />
          </div>

          <div>
            <label className="text-[11px] font-semibold text-slate-600 block mb-1">
              State
            </label>
            <select
              value={filters.state}
              onChange={(e) => handleInputChange('state', e.target.value)}
              className="w-full px-3 py-1.5 rounded-lg text-xs border border-slate-300 bg-white"
            >
              <option value="">All States</option>
              <option value="Maharashtra">Maharashtra</option>
              <option value="West Bengal">West Bengal</option>
              <option value="Madhya Pradesh">Madhya Pradesh</option>
              <option value="Uttar Pradesh">Uttar Pradesh</option>
              <option value="Rajasthan">Rajasthan</option>
            </select>
          </div>

          <div>
            <label className="text-[11px] font-semibold text-slate-600 block mb-1">
              Registration Number
            </label>
            <input
              type="text"
              placeholder="e.g. REG-MH-2023-8821"
              value={filters.registrationNumber}
              onChange={(e) => handleInputChange('registrationNumber', e.target.value)}
              className="w-full px-3 py-1.5 rounded-lg text-xs border border-slate-300"
            />
          </div>
        </div>

        <div className="pt-2 flex justify-end">
          <button
            onClick={executeSearch}
            disabled={isSearching}
            className="w-full sm:w-auto px-6 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold flex items-center justify-center gap-2 shadow-md hover:scale-[1.02] active:scale-[0.98] transition-all min-h-[42px]"
          >
            <Search className="w-4 h-4" />
            <span>Search Cadastral Registry</span>
          </button>
        </div>
      </div>

      {/* Results Section */}
      {totalFound !== null && (
        <div className="space-y-4">
          <div className="flex items-center justify-between text-xs font-semibold text-slate-700">
            <span>
              Found <strong className="text-slate-900">{totalFound}</strong> matching land record(s)
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {results.map((rec) => (
              <div
                key={rec.id}
                className="bg-white rounded-2xl border border-slate-200 p-4 shadow-xs hover:border-blue-300 transition-all flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <div>
                      <h4 className="font-bold text-slate-900 text-sm">{rec.ownerName}</h4>
                      <p className="text-[10px] font-mono text-slate-400">{rec.id}</p>
                    </div>
                    <ConfidenceBadge score={rec.overallConfidence} size="sm" />
                  </div>

                  <div className="space-y-1.5 text-xs py-2 border-y border-slate-100 my-2">
                    <div className="flex items-center justify-between">
                      <span className="text-slate-500">Survey / Khasra:</span>
                      <span className="font-mono font-bold text-slate-800">
                        {rec.surveyNumber || rec.khasraNumber}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-slate-500">Khata No:</span>
                      <span className="font-mono font-semibold text-slate-700">{rec.khataNumber}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-slate-500">Plot Area:</span>
                      <span className="font-bold text-slate-900">
                        {rec.plotArea} {rec.plotAreaUnit}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-slate-500">Location:</span>
                      <span className="text-slate-800 font-medium">
                        {rec.village}, {rec.district}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-between pt-2">
                  <StatusBadge status={rec.status} size="sm" />
                  <button
                    onClick={() => setSelectedRecord(rec)}
                    className="px-3 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold flex items-center gap-1"
                  >
                    <Eye className="w-3.5 h-3.5" />
                    <span>View Dossier</span>
                  </button>
                </div>
              </div>
            ))}
          </div>

          {results.length === 0 && (
            <div className="p-8 text-center bg-white rounded-2xl border border-slate-200 text-slate-500 text-xs">
              No land records matched the specified query criteria. Try broadening your search.
            </div>
          )}
        </div>
      )}

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
