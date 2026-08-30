import React, { useState, useEffect } from 'react';
import { api } from '../services/api.js';
import { LandRecord } from '../types.js';
import { ConfidenceBadge } from '../components/ConfidenceBadge.js';
import { StatusBadge } from '../components/StatusBadge.js';
import { RecordDetailModal } from './RecordDetailModal.js';
import {
  Database,
  Search,
  Filter,
  Download,
  Eye,
  CheckSquare,
  MapPin,
  FileSpreadsheet,
  Layers,
  Sparkles,
  ExternalLink
} from 'lucide-react';

interface LandRecordsViewProps {
  initialRecordId?: string;
  onNavigate: (tab: any, params?: any) => void;
}

export const LandRecordsView: React.FC<LandRecordsViewProps> = ({
  initialRecordId,
  onNavigate,
}) => {
  const [records, setRecords] = useState<LandRecord[]>([]);
  const [filteredRecords, setFilteredRecords] = useState<LandRecord[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [stateFilter, setStateFilter] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [selectedRecord, setSelectedRecord] = useState<LandRecord | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchRecords = async () => {
    setLoading(true);
    try {
      const res = await api.getRecords();
      if (res.success && res.data) {
        setRecords(res.data);
        if (initialRecordId) {
          const rec = res.data.find((r) => r.id === initialRecordId || r.documentId === initialRecordId);
          if (rec) setSelectedRecord(rec);
        }
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRecords();
  }, [initialRecordId]);

  useEffect(() => {
    let result = records;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      result = result.filter(
        (r) =>
          r.ownerName.toLowerCase().includes(q) ||
          r.surveyNumber.toLowerCase().includes(q) ||
          r.khasraNumber.toLowerCase().includes(q) ||
          r.khataNumber.toLowerCase().includes(q) ||
          r.village.toLowerCase().includes(q) ||
          r.district.toLowerCase().includes(q) ||
          r.id.toLowerCase().includes(q)
      );
    }
    if (stateFilter !== 'ALL') {
      result = result.filter((r) => r.state === stateFilter);
    }
    if (statusFilter !== 'ALL') {
      result = result.filter((r) => r.status === statusFilter);
    }
    setFilteredRecords(result);
  }, [records, searchQuery, stateFilter, statusFilter]);

  const handleExportCSV = () => {
    if (records.length === 0) return;
    const headers = [
      'Record_ID',
      'Owner_Name',
      'Father_Guardian',
      'Survey_Number',
      'Khasra_Number',
      'Khata_Number',
      'Plot_Area',
      'Unit',
      'Village',
      'District',
      'State',
      'Confidence',
      'Status',
    ];
    const rows = records.map((r) => [
      r.id,
      `"${r.ownerName}"`,
      `"${r.fatherGuardianName}"`,
      r.surveyNumber,
      r.khasraNumber,
      r.khataNumber,
      r.plotArea,
      r.plotAreaUnit,
      `"${r.village}"`,
      `"${r.district}"`,
      `"${r.state}"`,
      (r.overallConfidence * 100).toFixed(1) + '%',
      r.status,
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `DoLR_Cadastral_Records_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    link.remove();
  };

  const handleExportAllJSON = () => {
    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(records, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute('href', dataStr);
    downloadAnchor.setAttribute('download', `DoLR_Cadastral_Registry_${Date.now()}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  return (
    <div className="space-y-6">
      {/* Title Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <Database className="w-6 h-6 text-blue-600" />
            <span>Cadastral Land Records Registry</span>
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            Standardized digital repository of verified &amp; auto-approved land ownership records.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleExportCSV}
            className="px-3.5 py-2 rounded-xl border border-slate-300 hover:bg-slate-50 text-slate-700 text-xs font-bold flex items-center gap-1.5 shadow-xs transition-all"
          >
            <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
            <span>Export CSV</span>
          </button>
          <button
            onClick={handleExportAllJSON}
            className="px-3.5 py-2 rounded-xl border border-slate-300 hover:bg-slate-50 text-slate-700 text-xs font-bold flex items-center gap-1.5 shadow-xs transition-all"
          >
            <Download className="w-4 h-4 text-blue-600" />
            <span>Export JSON</span>
          </button>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
        {/* Search */}
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search by owner name, survey/khasra number, khata, village, or ID..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2 rounded-xl text-xs border border-slate-200 focus:ring-2 focus:ring-blue-500 bg-slate-50/50"
          />
        </div>

        {/* Filters */}
        <div className="flex items-center gap-2.5">
          <div className="flex items-center gap-1.5 text-xs text-slate-600">
            <Filter className="w-3.5 h-3.5 text-slate-400" />
            <span>State:</span>
            <select
              value={stateFilter}
              onChange={(e) => setStateFilter(e.target.value)}
              className="px-2.5 py-1.5 rounded-lg text-xs font-semibold border border-slate-200 bg-white"
            >
              <option value="ALL">All States</option>
              <option value="Maharashtra">Maharashtra</option>
              <option value="West Bengal">West Bengal</option>
              <option value="Madhya Pradesh">Madhya Pradesh</option>
              <option value="Uttar Pradesh">Uttar Pradesh</option>
              <option value="Rajasthan">Rajasthan</option>
            </select>
          </div>

          <div className="flex items-center gap-1.5 text-xs text-slate-600">
            <span>Status:</span>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-2.5 py-1.5 rounded-lg text-xs font-semibold border border-slate-200 bg-white"
            >
              <option value="ALL">All Statuses</option>
              <option value="AUTO_APPROVED">Auto-Approved</option>
              <option value="VERIFIED">Verified &amp; Approved</option>
              <option value="PENDING_VERIFICATION">Needs Verification</option>
              <option value="REJECTED">Rejected</option>
            </select>
          </div>
        </div>
      </div>

      {/* Records Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 uppercase text-[10px] font-bold tracking-wider">
              <tr>
                <th className="py-3.5 px-4">Landowner / Record ID</th>
                <th className="py-3.5 px-4">Survey / Khasra</th>
                <th className="py-3.5 px-4">Khata No</th>
                <th className="py-3.5 px-4">Plot Area</th>
                <th className="py-3.5 px-4">Village, District, State</th>
                <th className="py-3.5 px-4">Confidence</th>
                <th className="py-3.5 px-4">Status</th>
                <th className="py-3.5 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
              {filteredRecords.map((rec) => (
                <tr key={rec.id} className="hover:bg-slate-50/80 transition-colors">
                  <td className="py-3.5 px-4">
                    <div className="font-bold text-slate-900">{rec.ownerName}</div>
                    <div className="text-[10px] text-slate-400 font-mono">{rec.id}</div>
                  </td>
                  <td className="py-3.5 px-4 font-mono font-bold text-slate-800">
                    {rec.surveyNumber || rec.khasraNumber}
                  </td>
                  <td className="py-3.5 px-4 font-mono text-slate-700">{rec.khataNumber}</td>
                  <td className="py-3.5 px-4 font-semibold text-slate-900">
                    {rec.plotArea} {rec.plotAreaUnit}
                  </td>
                  <td className="py-3.5 px-4">
                    <div className="text-slate-900 font-medium">{rec.village}</div>
                    <div className="text-[10px] text-slate-500">{rec.district}, {rec.state}</div>
                  </td>
                  <td className="py-3.5 px-4">
                    <ConfidenceBadge score={rec.overallConfidence} size="sm" />
                  </td>
                  <td className="py-3.5 px-4">
                    <StatusBadge status={rec.status} size="sm" />
                  </td>
                  <td className="py-3.5 px-4 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <button
                        onClick={() => setSelectedRecord(rec)}
                        className="px-2.5 py-1.5 rounded-lg border border-slate-200 hover:bg-slate-100 text-slate-700 text-xs font-semibold flex items-center gap-1"
                        title="View Full Cadastral Dossier"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        <span>Dossier</span>
                      </button>

                      {rec.status === 'PENDING_VERIFICATION' && (
                        <button
                          onClick={() => onNavigate('verification', { taskId: rec.id })}
                          className="p-1.5 rounded-lg bg-amber-50 text-amber-700 border border-amber-200 hover:bg-amber-100"
                          title="Open in Verifier Workspace"
                        >
                          <CheckSquare className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {filteredRecords.length === 0 && (
            <div className="p-8 text-center text-slate-500 text-xs">
              No matching land records found.
            </div>
          )}
        </div>
      </div>

      {/* Record Detail Modal */}
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
