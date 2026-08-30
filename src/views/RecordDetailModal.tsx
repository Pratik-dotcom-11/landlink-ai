import React, { useState, useEffect } from 'react';
import { LandRecord, ExtractedField, DocumentItem } from '../types.js';
import { ConfidenceBadge } from '../components/ConfidenceBadge.js';
import { StatusBadge } from '../components/StatusBadge.js';
import { DocumentViewer } from '../components/DocumentViewer.js';
import { api } from '../services/api.js';
import {
  X,
  FileText,
  CheckCircle2,
  AlertTriangle,
  MapPin,
  Calendar,
  Layers,
  User,
  ShieldCheck,
  Building,
  Download,
  Share2,
  Printer
} from 'lucide-react';

interface RecordDetailModalProps {
  record: LandRecord | null;
  onClose: () => void;
  onNavigateToVerifier?: (recordId: string) => void;
}

export const RecordDetailModal: React.FC<RecordDetailModalProps> = ({
  record,
  onClose,
  onNavigateToVerifier,
}) => {
  const [activeTab, setActiveTab] = useState<'fields' | 'validation' | 'cadastral' | 'document'>('fields');
  const [docItem, setDocItem] = useState<DocumentItem | null>(null);
  const [docLoading, setDocLoading] = useState(false);
  const [docError, setDocError] = useState<string | null>(null);

  useEffect(() => {
    if (record?.documentId) {
      setDocLoading(true);
      setDocError(null);
      api.getDocumentById(record.documentId)
        .then((res) => {
          if (res.success && res.data) {
            setDocItem(res.data);
          } else {
            setDocError(res.error || 'Document could not be retrieved.');
          }
        })
        .catch((e) => {
          setDocError(e.message || 'Error fetching document');
        })
        .finally(() => {
          setDocLoading(false);
        });
    }
  }, [record?.documentId]);

  if (!record) return null;

  const handleExportJSON = () => {
    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(record, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute('href', dataStr);
    downloadAnchor.setAttribute('download', `${record.id}_cadastral_record.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto animate-in fade-in">
      <div className="bg-white w-full max-w-4xl rounded-2xl shadow-2xl border border-slate-200 overflow-hidden my-8 max-h-[90vh] flex flex-col">
        {/* Modal Header */}
        <div className="bg-slate-900 text-white p-5 flex items-center justify-between border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-600 flex items-center justify-center text-white shadow-md">
              <Layers className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold tracking-tight">{record.ownerName}</h3>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-800 text-slate-300">
                  {record.id}
                </span>
              </div>
              <p className="text-xs text-slate-400">
                {record.village}, {record.district}, {record.state} • {record.documentType}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <ConfidenceBadge score={record.overallConfidence} size="md" />
            <StatusBadge status={record.status} size="md" />
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 ml-2"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Navigation Sub-Tabs */}
        <div className="px-6 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
          <div className="flex items-center gap-4 text-xs font-bold">
            <button
              onClick={() => setActiveTab('fields')}
              className={`py-3 border-b-2 transition-all ${
                activeTab === 'fields'
                  ? 'border-blue-600 text-blue-700 font-extrabold'
                  : 'border-transparent text-slate-500 hover:text-slate-800'
              }`}
            >
              Extracted Cadastral Fields ({Object.keys(record.fields).length})
            </button>
            <button
              onClick={() => setActiveTab('validation')}
              className={`py-3 border-b-2 transition-all ${
                activeTab === 'validation'
                  ? 'border-blue-600 text-blue-700 font-extrabold'
                  : 'border-transparent text-slate-500 hover:text-slate-800'
              }`}
            >
              Rule Validation Engine Checks
            </button>
            <button
              onClick={() => setActiveTab('cadastral')}
              className={`py-3 border-b-2 transition-all ${
                activeTab === 'cadastral'
                  ? 'border-blue-600 text-blue-700 font-extrabold'
                  : 'border-transparent text-slate-500 hover:text-slate-800'
              }`}
            >
              GIS Spatial Polygon &amp; Mutation
            </button>
            <button
              onClick={() => setActiveTab('document')}
              className={`py-3 border-b-2 transition-all flex items-center gap-1.5 ${
                activeTab === 'document'
                  ? 'border-blue-600 text-blue-700 font-extrabold'
                  : 'border-transparent text-slate-500 hover:text-slate-800'
              }`}
            >
              <FileText className="w-3.5 h-3.5" />
              <span>Original Scanned Deed</span>
            </button>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleExportJSON}
              className="px-2.5 py-1 rounded-lg border border-slate-300 hover:bg-white text-slate-700 text-xs font-semibold flex items-center gap-1"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Export JSON</span>
            </button>
          </div>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1">
          {activeTab === 'fields' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
              {Object.entries(record.fields).map(([key, rawField]) => {
                const field = rawField as ExtractedField;
                return (
                  <div
                    key={key}
                    className="p-3 rounded-xl bg-slate-50 border border-slate-200 flex flex-col justify-between"
                  >
                    <div className="flex items-center justify-between text-xs mb-1">
                      <span className="font-semibold text-slate-500">{field.label}</span>
                      <ConfidenceBadge score={field.confidence} size="sm" />
                    </div>
                    <div className="font-bold text-slate-900 text-sm">{String(field.value || '—')}</div>
                    {field.originalValue && (
                      <div className="text-[10px] text-slate-400 mt-1 font-mono">
                        Original OCR: {String(field.originalValue)}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {activeTab === 'validation' && (
            <div className="space-y-4">
              <div className="p-4 rounded-xl bg-blue-50/60 border border-blue-200 text-xs text-blue-900">
                <p className="font-bold">Automated Cadastral Validation Engine Summary</p>
                <p className="text-[11px] text-blue-700 mt-0.5">
                  Calculated against state cadastral business rules, survey format heuristics, and district boundary records.
                </p>
              </div>

              <div className="space-y-2">
                {record.validationResults?.map((rule, idx) => (
                  <div
                    key={`${rule.ruleCode || 'rule'}-${idx}-${rule.fieldKey || ''}`}
                    className="p-3 rounded-xl border border-slate-200 bg-white flex items-center justify-between text-xs"
                  >
                    <div className="flex items-center gap-2.5">
                      {rule.status === 'PASS' ? (
                        <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                      ) : rule.status === 'WARNING' ? (
                        <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0" />
                      ) : (
                        <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
                      )}
                      <div>
                        <span className="font-bold text-slate-800">{rule.rule || rule.ruleCode}</span>
                        <p className="text-[11px] text-slate-500">{rule.message}</p>
                      </div>
                    </div>

                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded uppercase ${
                        rule.status === 'PASS'
                          ? 'bg-emerald-100 text-emerald-800'
                          : rule.status === 'WARNING'
                          ? 'bg-amber-100 text-amber-800'
                          : 'bg-rose-100 text-rose-800'
                      }`}
                    >
                      {rule.status}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeTab === 'cadastral' && (
            <div className="space-y-4 text-xs">
              <div className="p-4 rounded-xl bg-slate-900 text-white space-y-2">
                <div className="font-bold text-amber-300 uppercase tracking-wider text-[11px]">
                  GIS Coordinates &amp; Cadastral Parcel Bounds (Demo Simulation)
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-[11px]">
                  <div>
                    <span className="text-slate-400">Centroid Latitude:</span>
                    <p className="font-mono font-bold">{record.latitude?.toFixed(5) || '18.52043'}</p>
                  </div>
                  <div>
                    <span className="text-slate-400">Centroid Longitude:</span>
                    <p className="font-mono font-bold">{record.longitude?.toFixed(5) || '73.85674'}</p>
                  </div>
                  <div>
                    <span className="text-slate-400">Plot Dimension:</span>
                    <p className="font-mono font-bold">{record.plotArea} {record.plotAreaUnit}</p>
                  </div>
                </div>
              </div>

              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-2">
                <span className="font-bold text-slate-900">Mutation &amp; Registration History</span>
                <p className="text-slate-600">{record.mutationDetails}</p>
                <div className="text-[11px] text-slate-400 pt-2 border-t border-slate-200">
                  Registration Number: <span className="font-mono font-bold text-slate-700">{record.registrationNumber}</span>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'document' && (
            <div className="min-h-[460px] h-[520px] flex flex-col">
              <DocumentViewer
                documentItem={docItem}
                fileDataUrl={docItem?.fileDataUrl}
                filename={docItem?.filename || `Cadastral_Deed_${record.id}`}
                fileType={docItem?.fileType || 'pdf'}
                documentId={record.documentId}
                language={record.documentLanguage || docItem?.language}
                loading={docLoading}
                error={docError}
                onRetry={() => {
                  if (record.documentId) {
                    setDocLoading(true);
                    api.getDocumentById(record.documentId)
                      .then((res) => {
                        if (res.success && res.data) setDocItem(res.data);
                      })
                      .finally(() => setDocLoading(false));
                  }
                }}
                className="h-full"
              />
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="bg-slate-50 p-4 border-t border-slate-200 flex items-center justify-between">
          <div className="text-[11px] text-slate-500">
            Created: {new Date(record.createdAt).toLocaleString('en-IN')}
          </div>

          <div className="flex items-center gap-2">
            {record.status === 'PENDING_VERIFICATION' && onNavigateToVerifier && (
              <button
                onClick={() => onNavigateToVerifier(record.id)}
                className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-bold shadow-xs"
              >
                Open in Verification Workspace
              </button>
            )}
            <button
              onClick={onClose}
              className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold"
            >
              Close Dossier
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
