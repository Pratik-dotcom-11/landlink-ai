import React, { useState, useEffect } from 'react';
import { api } from '../services/api.js';
import { DocumentItem } from '../types.js';
import { StatusBadge } from '../components/StatusBadge.js';
import { DocumentViewer } from '../components/DocumentViewer.js';
import {
  FileText,
  Search,
  Filter,
  Sparkles,
  CheckCircle2,
  Clock,
  Eye,
  RefreshCw,
  PlusCircle,
  FileCheck,
  Languages,
  X
} from 'lucide-react';

interface DocumentsListViewProps {
  onNavigate: (tab: any, params?: any) => void;
  initialDocumentId?: string;
}

export const DocumentsListView: React.FC<DocumentsListViewProps> = ({ onNavigate, initialDocumentId }) => {
  const [documents, setDocuments] = useState<DocumentItem[]>([]);
  const [filteredDocs, setFilteredDocs] = useState<DocumentItem[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [languageFilter, setLanguageFilter] = useState('ALL');
  const [loading, setLoading] = useState(true);
  const [processingDocId, setProcessingDocId] = useState<string | null>(null);
  const [previewDoc, setPreviewDoc] = useState<DocumentItem | null>(null);

  const fetchDocuments = async () => {
    setLoading(true);
    try {
      const res = await api.getDocuments();
      if (res.success && res.data) {
        setDocuments(res.data);
        if (initialDocumentId) {
          const match = res.data.find(d => d.id === initialDocumentId);
          if (match) setPreviewDoc(match);
        }
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDocuments();
  }, [initialDocumentId]);

  useEffect(() => {
    let result = documents;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      result = result.filter(
        (d) =>
          d.filename.toLowerCase().includes(q) ||
          d.id.toLowerCase().includes(q) ||
          d.uploadedByName.toLowerCase().includes(q)
      );
    }
    if (statusFilter !== 'ALL') {
      result = result.filter((d) => d.status === statusFilter);
    }
    if (languageFilter !== 'ALL') {
      result = result.filter((d) => d.language === languageFilter);
    }
    setFilteredDocs(result);
  }, [documents, searchQuery, statusFilter, languageFilter]);

  const handleProcess = async (doc: DocumentItem) => {
    setProcessingDocId(doc.id);
    try {
      const res = await api.processDocument(doc.id);
      if (res.success && res.data) {
        fetchDocuments();
        if (res.data.record.status === 'PENDING_VERIFICATION') {
          onNavigate('verification', { taskId: res.data.record.id });
        } else {
          onNavigate('records', { recordId: res.data.record.id });
        }
      }
    } catch (e) {
      console.error(e);
    } finally {
      setProcessingDocId(null);
    }
  };

  return (
    <div className="space-y-6">
      {/* Title Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <FileText className="w-6 h-6 text-blue-600" />
            <span>Cadastral Document Ingestion Repository</span>
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            Repository of scanned PDFs, RoR records, Porcha, and Khasra deeds uploaded for digitization.
          </p>
        </div>

        <button
          onClick={() => onNavigate('upload')}
          className="px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold flex items-center gap-2 shadow-xs transition-all self-start"
        >
          <PlusCircle className="w-4 h-4" />
          <span>Upload New Record</span>
        </button>
      </div>

      {/* Filter Toolbar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
        {/* Search */}
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search by filename, document ID, or uploader..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2 rounded-xl text-xs border border-slate-200 focus:ring-2 focus:ring-blue-500 bg-slate-50/50"
          />
        </div>

        {/* Dropdowns */}
        <div className="flex items-center gap-2.5">
          <div className="flex items-center gap-1.5 text-xs text-slate-600">
            <Filter className="w-3.5 h-3.5 text-slate-400" />
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
              <option value="UPLOADED">Uploaded</option>
            </select>
          </div>

          <div className="flex items-center gap-1.5 text-xs text-slate-600">
            <Languages className="w-3.5 h-3.5 text-slate-400" />
            <span>Script:</span>
            <select
              value={languageFilter}
              onChange={(e) => setLanguageFilter(e.target.value)}
              className="px-2.5 py-1.5 rounded-lg text-xs font-semibold border border-slate-200 bg-white"
            >
              <option value="ALL">All Languages</option>
              <option value="English">English</option>
              <option value="Hindi">Hindi</option>
              <option value="Bengali">Bengali</option>
              <option value="Marathi">Marathi</option>
            </select>
          </div>
        </div>
      </div>

      {/* Documents Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 uppercase text-[10px] font-bold tracking-wider">
              <tr>
                <th className="py-3.5 px-4">Document / File</th>
                <th className="py-3.5 px-4">Language / Script</th>
                <th className="py-3.5 px-4">Status</th>
                <th className="py-3.5 px-4">Uploaded By</th>
                <th className="py-3.5 px-4">Processing Time</th>
                <th className="py-3.5 px-4">Upload Date</th>
                <th className="py-3.5 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
              {filteredDocs.map((doc) => (
                <tr key={doc.id} className="hover:bg-slate-50/80 transition-colors">
                  <td className="py-3.5 px-4">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
                        <FileText className="w-4 h-4" />
                      </div>
                      <div>
                        <div className="font-bold text-slate-900 truncate max-w-[220px]">
                          {doc.filename}
                        </div>
                        <div className="text-[10px] text-slate-400 font-mono">{doc.id}</div>
                      </div>
                    </div>
                  </td>
                  <td className="py-3.5 px-4">
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 text-[11px] font-semibold">
                      {doc.language}
                    </span>
                  </td>
                  <td className="py-3.5 px-4">
                    <StatusBadge status={doc.status} size="sm" />
                  </td>
                  <td className="py-3.5 px-4">
                    <div className="text-slate-900">{doc.uploadedByName}</div>
                  </td>
                  <td className="py-3.5 px-4 font-mono text-[11px] text-slate-500">
                    {doc.processingTimeMs ? `${(doc.processingTimeMs / 1000).toFixed(2)}s` : '—'}
                  </td>
                  <td className="py-3.5 px-4 text-slate-500 text-[11px]">
                    {new Date(doc.createdAt).toLocaleDateString('en-IN', {
                      day: '2-digit',
                      month: 'short',
                      year: 'numeric',
                    })}
                  </td>
                  <td className="py-3.5 px-4 text-right">
                    <div className="flex items-center justify-end gap-2">
                      {doc.status === 'UPLOADED' && (
                        <button
                          onClick={() => handleProcess(doc)}
                          disabled={processingDocId === doc.id}
                          className="px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold flex items-center gap-1.5 shadow-xs"
                        >
                          {processingDocId === doc.id ? (
                            <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                          ) : (
                            <Sparkles className="w-3.5 h-3.5" />
                          )}
                          <span>Run OCR/AI</span>
                        </button>
                      )}

                      {doc.status === 'PENDING_VERIFICATION' && (
                        <button
                          onClick={() => onNavigate('verification', { taskId: doc.recordId || doc.id })}
                          className="px-3 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-bold flex items-center gap-1 shadow-xs"
                        >
                          <Clock className="w-3.5 h-3.5" />
                          <span>Verify</span>
                        </button>
                      )}

                      <button
                        onClick={() => setPreviewDoc(doc)}
                        className="p-1.5 rounded-lg border border-slate-200 hover:bg-slate-100 text-slate-600"
                        title="Preview Document File"
                      >
                        <FileText className="w-4 h-4" />
                      </button>

                      {doc.recordId && (
                        <button
                          onClick={() => onNavigate('records', { recordId: doc.recordId })}
                          className="p-1.5 rounded-lg border border-slate-200 hover:bg-slate-100 text-slate-600"
                          title="View Extracted Record"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {filteredDocs.length === 0 && (
            <div className="p-8 text-center text-slate-500 text-xs">
              No matching documents found.
            </div>
          )}
        </div>
      </div>

      {/* Document Quick Preview Modal */}
      {previewDoc && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-2xl border border-slate-200 w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95">
            <div className="px-5 py-3.5 bg-slate-900 text-white flex items-center justify-between border-b border-slate-800">
              <div className="flex items-center gap-2">
                <FileText className="w-5 h-5 text-blue-400" />
                <span className="font-bold text-sm">{previewDoc.filename}</span>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-800 text-slate-300">
                  {previewDoc.id}
                </span>
              </div>
              <button
                onClick={() => setPreviewDoc(null)}
                className="p-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-4 flex-1 min-h-[500px]">
              <DocumentViewer
                documentItem={previewDoc}
                fileDataUrl={previewDoc.fileDataUrl}
                filename={previewDoc.filename}
                fileType={previewDoc.fileType}
                documentId={previewDoc.id}
                language={previewDoc.language}
                className="h-[520px]"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
