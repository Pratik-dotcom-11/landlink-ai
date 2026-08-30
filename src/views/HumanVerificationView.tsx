import React, { useState, useEffect } from 'react';
import { api } from '../services/api.js';
import { useAuth } from '../context/AuthContext.js';
import { ExtractedField, LandRecord, VerificationTask, DocumentItem } from '../types.js';
import { ConfidenceBadge } from '../components/ConfidenceBadge.js';
import { StatusBadge } from '../components/StatusBadge.js';
import { DocumentViewer } from '../components/DocumentViewer.js';
import {
  CheckSquare,
  CheckCircle2,
  XCircle,
  Save,
  AlertTriangle,
  FileText,
  Clock,
  ShieldCheck,
  Undo2,
  Sparkles,
  Info,
  X,
  AlertCircle
} from 'lucide-react';

const REJECTION_PRESETS = [
  'Document is illegible, torn, degraded, or blurred text',
  'Survey / Khasra number mismatch with Tehsil registry maps',
  'Critical landholder or parcel metadata missing from scan',
  'Plot area calculation / measurement unit discrepancy',
  'Suspected counterfeit, altered, or duplicate cadastral deed',
  'Boundary overlap detected with existing government parcel'
];

interface HumanVerificationViewProps {
  initialTaskId?: string;
  onNavigate: (tab: any, params?: any) => void;
}

export const HumanVerificationView: React.FC<HumanVerificationViewProps> = ({
  initialTaskId,
  onNavigate,
}) => {
  const { user, activeRole } = useAuth();
  const [tasks, setTasks] = useState<VerificationTask[]>([]);
  const [selectedTask, setSelectedTask] = useState<VerificationTask | null>(null);
  const [currentRecord, setCurrentRecord] = useState<LandRecord | null>(null);
  const [currentDocItem, setCurrentDocItem] = useState<DocumentItem | null>(null);
  const [currentDocDataUrl, setCurrentDocDataUrl] = useState<string | null>(null);
  const [docLoading, setDocLoading] = useState(false);
  const [docError, setDocError] = useState<string | null>(null);

  // Verifier State
  const [editedFields, setEditedFields] = useState<Record<string, string>>({});
  const [activeFieldKey, setActiveFieldKey] = useState<string | null>(null);
  const [verifierComments, setVerifierComments] = useState<string>('');
  const [zoomLevel, setZoomLevel] = useState<number>(1);
  const [rotation, setRotation] = useState<number>(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  // Rejection Dialog State
  const [isRejectModalOpen, setIsRejectModalOpen] = useState(false);
  const [selectedRejectReason, setSelectedRejectReason] = useState<string>(REJECTION_PRESETS[0]);
  const [customRejectNotes, setCustomRejectNotes] = useState<string>('');

  // Load pending tasks
  const loadTasks = async () => {
    setLoading(true);
    setErrorMessage(null);
    try {
      const res = await api.getPendingVerification();
      if (res.success && res.data) {
        setTasks(res.data);
        if (res.data.length > 0) {
          const target = initialTaskId
            ? res.data.find((t) => t.id === initialTaskId || t.recordId === initialTaskId) || res.data[0]
            : res.data[0];
          setSelectedTask(target);
          loadRecordDetails(target.recordId);
        } else {
          setSelectedTask(null);
          setCurrentRecord(null);
          setCurrentDocItem(null);
          setCurrentDocDataUrl(null);
        }
      } else {
        setErrorMessage(res.error || 'Failed to load verification tasks.');
      }
    } catch (e: any) {
      console.error('Error loading verification tasks:', e);
      setErrorMessage(e?.message || 'Error loading verification queue.');
    } finally {
      setLoading(false);
    }
  };

  const loadRecordDetails = async (recordId: string) => {
    setDocLoading(true);
    setDocError(null);
    try {
      const res = await api.getRecordById(recordId);
      if (res.success && res.data) {
        const record = res.data;
        setCurrentRecord(record);

        // Prepopulate editable fields
        const fieldMap: Record<string, string> = {};
        for (const [key, f] of Object.entries(record.fields)) {
          fieldMap[key] = String(f.value ?? '');
        }
        setEditedFields(fieldMap);

        // Load document image / PDF
        if (record.documentId) {
          const docRes = await api.getDocumentById(record.documentId);
          if (docRes.success && docRes.data) {
            setCurrentDocItem(docRes.data);
            setCurrentDocDataUrl(docRes.data.fileDataUrl);
          } else {
            console.warn(`Document ${record.documentId} could not be found.`);
            setDocError(docRes.error || 'Document record not found on server.');
          }
        } else {
          setDocError('Record is missing associated document reference.');
        }
      } else {
        setDocError(res.error || 'Record details not found.');
      }
    } catch (e: any) {
      console.error('Failed to load record details:', e);
      setDocError(e.message || 'Failed to load record or document data.');
    } finally {
      setDocLoading(false);
    }
  };

  useEffect(() => {
    loadTasks();
  }, [initialTaskId]);

  const handleSelectTask = (task: VerificationTask) => {
    setSelectedTask(task);
    setSuccessMessage(null);
    setErrorMessage(null);
    loadRecordDetails(task.recordId);
  };

  const handleFieldChange = (key: string, value: string) => {
    setEditedFields((prev) => ({
      ...prev,
      [key]: value,
    }));
  };

  const handleApprove = async () => {
    if (!selectedTask || !currentRecord) return;
    setIsSubmitting(true);
    setErrorMessage(null);
    try {
      const res = await api.submitVerification(
        selectedTask.id,
        'APPROVE',
        editedFields,
        verifierComments || 'Approved by Verifier after split-screen cadastral deed inspection.'
      );
      if (res.success) {
        setSuccessMessage('Land record successfully approved and sealed into registry.');
        // Update local tasks immediately
        const remaining = tasks.filter((t) => t.id !== selectedTask.id);
        setTasks(remaining);
        if (remaining.length > 0) {
          const next = remaining[0];
          setSelectedTask(next);
          loadRecordDetails(next.recordId);
        } else {
          setSelectedTask(null);
          setCurrentRecord(null);
          setCurrentDocItem(null);
          setCurrentDocDataUrl(null);
        }
      } else {
        setErrorMessage(res.error || 'Failed to approve record on server.');
      }
    } catch (e: any) {
      console.error(e);
      setErrorMessage(e?.message || 'Error occurred while approving record.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const openRejectModal = () => {
    if (!selectedTask || !currentRecord) return;
    setCustomRejectNotes(verifierComments || '');
    setIsRejectModalOpen(true);
  };

  const handleConfirmReject = async () => {
    if (!selectedTask || !currentRecord) return;
    setIsSubmitting(true);
    setErrorMessage(null);

    const finalReason = customRejectNotes.trim()
      ? `${selectedRejectReason}: ${customRejectNotes.trim()}`
      : selectedRejectReason;

    try {
      const res = await api.submitVerification(
        selectedTask.id,
        'REJECT',
        editedFields,
        finalReason
      );

      if (res.success) {
        setIsRejectModalOpen(false);
        setSuccessMessage('Record marked as REJECTED. Verifier rationale logged to audit trail.');
        
        // Update local tasks immediately
        const remaining = tasks.filter((t) => t.id !== selectedTask.id);
        setTasks(remaining);
        if (remaining.length > 0) {
          const next = remaining[0];
          setSelectedTask(next);
          loadRecordDetails(next.recordId);
        } else {
          setSelectedTask(null);
          setCurrentRecord(null);
          setCurrentDocItem(null);
          setCurrentDocDataUrl(null);
        }
      } else {
        setErrorMessage(res.error || 'Failed to reject record on server.');
      }
    } catch (e: any) {
      console.error(e);
      setErrorMessage(e?.message || 'Error occurred while rejecting record.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSaveEditsOnly = async () => {
    if (!currentRecord) return;
    setIsSubmitting(true);
    setErrorMessage(null);
    try {
      const res = await api.updateRecord(
        currentRecord.id,
        editedFields,
        verifierComments || 'Field edits saved during verification session.'
      );
      if (res.success) {
        setSuccessMessage('Field modifications saved and re-validated.');
        loadRecordDetails(currentRecord.id);
      } else {
        setErrorMessage(res.error || 'Failed to save modifications.');
      }
    } catch (e: any) {
      console.error(e);
      setErrorMessage(e?.message || 'Error saving edits.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-3">
      {/* Top High Density Sub-Header & Task Switcher */}
      <section className="bg-white border border-slate-200 rounded-md p-3 flex flex-col md:flex-row md:items-center justify-between gap-3 shadow-xs min-w-0">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="text-sm font-bold text-slate-900 tracking-tight flex items-center gap-1.5">
              <CheckSquare className="w-4 h-4 text-blue-600 shrink-0" />
              <span>Human Verification &amp; Cadastral Dossier Review</span>
            </h2>
            <span className="text-[10px] font-bold px-1.5 py-0.2 rounded bg-amber-100 text-amber-800 border border-amber-300 shrink-0">
              {tasks.length} Pending
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Side-by-side inspection: verify extracted fields, confidence scores, and cadastral spatial validation rules.
          </p>
        </div>

        {/* Quick Task Switcher Strip */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 max-w-full md:max-w-md lg:max-w-xl touch-pan-x">
          {tasks.map((task) => (
            <button
              key={task.id}
              type="button"
              onClick={() => handleSelectTask(task)}
              className={`px-2.5 py-1.5 sm:py-1 rounded text-xs font-medium whitespace-nowrap transition-all border shrink-0 min-h-[32px] ${
                selectedTask?.id === task.id
                  ? 'bg-blue-600 text-white font-bold border-blue-700 shadow-xs'
                  : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
              }`}
            >
              <span>{task.ownerName}</span>
              <span className="ml-1 text-[10px] opacity-75">({task.district})</span>
            </button>
          ))}
        </div>
      </section>

      {/* Success Notification Banner */}
      {successMessage && (
        <div className="p-2.5 rounded bg-emerald-50 border border-emerald-300 text-emerald-900 text-xs font-bold flex items-center justify-between animate-in fade-in">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{successMessage}</span>
          </div>
          <button
            type="button"
            onClick={() => setSuccessMessage(null)}
            className="text-emerald-700 hover:text-emerald-900 font-bold px-2 py-1"
          >
            ✕
          </button>
        </div>
      )}

      {/* Error Notification Banner */}
      {errorMessage && (
        <div className="p-2.5 rounded bg-rose-50 border border-rose-300 text-rose-900 text-xs font-bold flex items-center justify-between animate-in fade-in">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
            <span>{errorMessage}</span>
          </div>
          <button
            type="button"
            onClick={() => setErrorMessage(null)}
            className="text-rose-700 hover:text-rose-900 font-bold px-2 py-1"
          >
            ✕
          </button>
        </div>
      )}

      {tasks.length === 0 ? (
        <div className="p-6 sm:p-8 text-center bg-white rounded-md border border-slate-200 shadow-xs space-y-3">
          <CheckCircle2 className="w-8 h-8 text-emerald-500 mx-auto" />
          <h3 className="text-sm font-bold text-slate-900">Verification Queue is Clear</h3>
          <p className="text-xs text-slate-500 max-w-md mx-auto">
            All ingested cadastral deeds have either passed automated AI approval or have already been manually reviewed by an officer.
          </p>
          <button
            type="button"
            onClick={() => onNavigate('upload')}
            className="mt-1 px-3.5 py-2 rounded bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white text-xs font-semibold inline-flex items-center gap-1.5 shadow-xs"
          >
            <span>Upload New Deed for Processing</span>
          </button>
        </div>
      ) : (
        /* Split-Screen Workspace: stacks vertically on mobile (< lg), 2-col side-by-side on desktop (lg+) */
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-3 items-start min-w-0">
          {/* Left Pane: Minimal Scanned Deed Viewer */}
          <div className="lg:col-span-5 flex flex-col w-full min-w-0">
            <DocumentViewer
              documentItem={currentDocItem}
              fileDataUrl={currentDocDataUrl}
              filename={currentDocItem?.filename || selectedTask?.documentName || 'Scanned Deed'}
              fileType={currentDocItem?.fileType || 'pdf'}
              documentId={currentRecord?.documentId || selectedTask?.documentId}
              language={currentDocItem?.language || currentRecord?.documentLanguage || 'English'}
              loading={docLoading}
              error={docError}
              onRetry={() => {
                if (selectedTask) loadRecordDetails(selectedTask.recordId);
              }}
              activeFieldKey={activeFieldKey}
              activeFieldLabel={activeFieldKey && currentRecord?.fields[activeFieldKey] ? currentRecord.fields[activeFieldKey].label : null}
              activeFieldValue={activeFieldKey && currentRecord?.fields[activeFieldKey] ? (editedFields[activeFieldKey] ?? currentRecord.fields[activeFieldKey].value) : null}
              activeFieldConfidence={activeFieldKey && currentRecord?.fields[activeFieldKey] ? currentRecord.fields[activeFieldKey].confidence : null}
              externalZoom={zoomLevel}
              externalRotation={rotation}
              onZoomChange={setZoomLevel}
              onRotationChange={setRotation}
              compact={false}
              className="w-full"
            />
          </div>

          {/* Right Pane: Structured Editable Fields & Verification Engine */}
          <div className="lg:col-span-7 bg-white rounded-md p-3 sm:p-3.5 border border-slate-200 shadow-xs flex flex-col space-y-3 min-w-0">
            {/* Top Details & Overall Confidence */}
            <div className="flex flex-wrap items-center justify-between gap-2 pb-2 border-b border-slate-200">
              <div className="min-w-0">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                  Verification Dossier
                </span>
                <h3 className="text-xs font-bold text-slate-900 truncate">
                  {currentRecord?.ownerName} • {currentRecord?.village}, {currentRecord?.district}
                </h3>
              </div>
              <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
                <ConfidenceBadge score={currentRecord?.overallConfidence} size="sm" />
                <StatusBadge status={currentRecord?.status || 'PENDING_VERIFICATION'} size="sm" />
              </div>
            </div>

            {/* Extraction Summary alert banner */}
            <div className="flex items-center justify-between bg-amber-50 p-2.5 border-l-2 border-amber-400 rounded-r text-[11px] font-semibold text-amber-900 gap-2">
              <div className="flex items-center gap-1.5 min-w-0">
                <AlertTriangle className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                <span className="truncate">
                  Extraction Complete: {Object.keys(currentRecord?.fields || {}).length} fields detected.
                </span>
              </div>
              <span className="text-[9px] font-bold text-amber-800 bg-white px-1.5 py-0.5 border border-amber-300 rounded uppercase shrink-0">
                REVIEW
              </span>
            </div>

            {/* Validation Warnings Alert Box */}
            {currentRecord?.validationResults && (
              <div className="space-y-1">
                <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                  Validation Engine Results
                </div>
                <div className="space-y-1">
                  {currentRecord.validationResults
                    .filter((r) => r.status !== 'PASS')
                    .map((rule, idx) => (
                      <div key={`${rule.ruleCode || 'rule'}-${idx}-${rule.fieldKey || ''}`} className="flex items-center justify-between text-xs p-2 bg-slate-50 border border-slate-200 rounded gap-2">
                        <div className="flex items-center gap-2 min-w-0">
                          <div className="w-4 h-4 rounded-full bg-rose-500 flex items-center justify-center text-[9px] text-white font-bold shrink-0">
                            !
                          </div>
                          <div className="min-w-0">
                            <div className="font-semibold text-slate-800 text-[11px] truncate">{rule.rule || rule.ruleCode}</div>
                            <div className="text-[10px] text-slate-500 break-words">{rule.message}</div>
                          </div>
                        </div>
                        <span className="text-[9px] font-bold text-rose-700 uppercase bg-rose-50 px-1.5 py-0.5 border border-rose-200 rounded shrink-0">
                          {rule.status}
                        </span>
                      </div>
                    ))}
                  {currentRecord.validationResults.filter((r) => r.status !== 'PASS').length === 0 && (
                    <div className="flex items-center justify-between text-xs p-2 bg-emerald-50 border border-emerald-200 rounded text-emerald-800">
                      <div className="flex items-center gap-1.5">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                        <span className="text-[11px] font-medium">All Cadastral Validation Rules Passed (100% compliant)</span>
                      </div>
                      <span className="text-[9px] font-bold text-emerald-700 bg-white px-1.5 py-0.5 border border-emerald-300 rounded shrink-0">
                        PASS
                      </span>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Editable Extracted Fields List with High Density Confidence Block */}
            <div className="space-y-2 max-h-[360px] lg:max-h-[340px] overflow-y-auto pr-1">
              <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                Extracted Cadastral Entities
              </div>
              {currentRecord &&
                Object.entries(currentRecord.fields).map(([key, rawField]) => {
                  const field = rawField as ExtractedField;
                  const isLow = field.confidence < 0.60;
                  const isMed = field.confidence >= 0.60 && field.confidence < 0.85;
                  const isEdited = editedFields[key] !== String(field.value);

                  return (
                    <div
                      key={key}
                      onMouseEnter={() => setActiveFieldKey(key)}
                      className={`p-2 rounded border transition-all ${
                        isLow
                          ? 'bg-rose-50/50 border-rose-300'
                          : isMed
                          ? 'bg-amber-50/30 border-amber-300'
                          : 'bg-slate-50 border-slate-200'
                      } ${activeFieldKey === key ? 'ring-1 ring-blue-500 border-blue-500' : ''}`}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <div className="flex items-center gap-1.5 min-w-0">
                          <label
                            htmlFor={`field-${key}`}
                            className="text-[11px] font-bold text-slate-800 cursor-pointer truncate"
                          >
                            {field.label}
                          </label>
                          {field.notes && (
                            <span className="text-[9px] text-slate-500 italic hidden sm:inline">
                              ({field.notes})
                            </span>
                          )}
                        </div>

                        {isEdited && (
                          <span className="text-[9px] font-bold text-blue-700 bg-blue-50 px-1 py-0.2 rounded border border-blue-200 shrink-0">
                            MODIFIED
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-2">
                        <input
                          id={`field-${key}`}
                          type="text"
                          value={editedFields[key] ?? ''}
                          onChange={(e) => handleFieldChange(key, e.target.value)}
                          className={`w-full px-2.5 py-1.5 sm:py-1 rounded text-xs font-semibold border transition-all min-h-[36px] sm:min-h-[30px] ${
                            isLow
                              ? 'border-rose-400 bg-white text-slate-900 focus:outline-none focus:ring-1 focus:ring-rose-500'
                              : 'border-slate-300 bg-white text-slate-900 focus:outline-none focus:ring-1 focus:ring-blue-500'
                          }`}
                        />

                        {/* High Density Confidence Box matching Theme */}
                        <div
                          className={`w-14 sm:w-16 h-9 sm:h-8 rounded flex flex-col items-center justify-center shrink-0 border font-mono ${
                            isLow
                              ? 'bg-rose-50 border-rose-300 text-rose-700'
                              : isMed
                              ? 'bg-amber-50 border-amber-300 text-amber-800'
                              : 'bg-emerald-50 border-emerald-300 text-emerald-700'
                          }`}
                        >
                          <span className="text-[10px] font-bold leading-tight">
                            {Math.round(field.confidence * 100)}%
                          </span>
                          <span className="text-[7px] uppercase font-bold tracking-tight">
                            {isLow ? 'LOW' : isMed ? 'MED' : 'CONF'}
                          </span>
                        </div>

                        {isEdited && (
                          <button
                            type="button"
                            onClick={() => handleFieldChange(key, String(field.value))}
                            className="p-1.5 rounded border border-slate-300 hover:bg-slate-100 text-slate-600 shrink-0 min-h-[36px] min-w-[36px] flex items-center justify-center sm:min-h-[30px] sm:min-w-[30px]"
                            title="Revert to original OCR text"
                          >
                            <Undo2 className="w-3.5 h-3.5 sm:w-3 sm:h-3" />
                          </button>
                        )}
                      </div>

                      {field.originalValue && (
                        <div className="mt-1 text-[9px] text-slate-500 truncate">
                          Original OCR: <span className="font-mono font-medium text-slate-700">{String(field.originalValue)}</span>
                        </div>
                      )}
                    </div>
                  );
                })}
            </div>

            {/* Verifier Notes & Audit Reason */}
            <div className="space-y-1 pt-1.5 border-t border-slate-200">
              <label className="text-[11px] font-bold text-slate-800 flex items-center justify-between">
                <span>Verifier Findings &amp; Notes</span>
                <span className="text-[9px] text-slate-400 font-normal">Logged to immutable audit</span>
              </label>
              <textarea
                value={verifierComments}
                onChange={(e) => setVerifierComments(e.target.value)}
                placeholder="e.g. Scanned plot area smudge resolved against Tehsil master index..."
                rows={2}
                className="w-full px-2.5 py-1.5 sm:py-1 rounded text-xs border border-slate-300 focus:outline-none focus:ring-1 focus:ring-blue-500 bg-white"
              />
            </div>

            {/* Decision Action Buttons Bar: Stacks on mobile, inline on desktop */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pt-2 border-t border-slate-200">
              <button
                type="button"
                onClick={handleSaveEditsOnly}
                disabled={isSubmitting}
                className="w-full sm:w-auto px-3 py-2 sm:py-1.5 rounded border border-slate-300 hover:bg-slate-50 text-slate-700 text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors disabled:opacity-50 min-h-[38px] sm:min-h-[32px]"
              >
                <Save className="w-3.5 h-3.5" />
                <span>Save Corrections Only</span>
              </button>

              <div className="flex flex-col xs:flex-row items-center gap-2 w-full sm:w-auto">
                <button
                  type="button"
                  onClick={openRejectModal}
                  disabled={isSubmitting}
                  className="w-full sm:w-auto px-3.5 py-2 sm:py-1.5 rounded bg-rose-600 hover:bg-rose-700 active:bg-rose-800 text-white text-xs font-semibold flex items-center justify-center gap-1.5 shadow-xs transition-colors disabled:opacity-50 cursor-pointer min-h-[38px] sm:min-h-[32px]"
                >
                  <XCircle className="w-3.5 h-3.5" />
                  <span>Reject Record</span>
                </button>

                <button
                  type="button"
                  onClick={handleApprove}
                  disabled={isSubmitting}
                  className="w-full sm:w-auto px-4 py-2 sm:py-1.5 rounded bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white text-xs font-semibold flex items-center justify-center gap-1.5 shadow-xs transition-colors disabled:opacity-50 cursor-pointer min-h-[38px] sm:min-h-[32px]"
                >
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>Approve &amp; Digitize Record</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Interactive Rejection Reason Modal */}
      {isRejectModalOpen && selectedTask && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 animate-in fade-in overflow-y-auto">
          <div className="bg-white w-full max-w-lg rounded-xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[90vh] my-auto">
            {/* Modal Header */}
            <div className="bg-rose-600 text-white px-4 py-3 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2 min-w-0">
                <XCircle className="w-5 h-5 shrink-0" />
                <h3 className="text-sm font-bold tracking-tight truncate">Reject Cadastral Record</h3>
              </div>
              <button
                type="button"
                onClick={() => setIsRejectModalOpen(false)}
                className="text-white/80 hover:text-white p-1 rounded hover:bg-rose-700 shrink-0"
                aria-label="Close modal"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-4 space-y-3.5 overflow-y-auto">
              <div>
                <p className="text-xs font-semibold text-slate-800">
                  Target Record: <span className="font-bold text-slate-900">{selectedTask.ownerName}</span> ({selectedTask.district})
                </p>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  Select the primary justification for rejecting this scanned deed. This action will update the cadastral record status and log an immutable entry into the audit trail.
                </p>
              </div>

              {/* Reason Presets */}
              <div className="space-y-1.5">
                <label className="text-[11px] font-bold text-slate-700 uppercase tracking-wider">
                  Select Rejection Category
                </label>
                <div className="space-y-1.5">
                  {REJECTION_PRESETS.map((preset) => (
                    <label
                      key={preset}
                      className={`flex items-start gap-2.5 p-2.5 sm:p-2 rounded border text-xs cursor-pointer transition-colors ${
                        selectedRejectReason === preset
                          ? 'bg-rose-50 border-rose-300 text-rose-950 font-medium'
                          : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'
                      }`}
                    >
                      <input
                        type="radio"
                        name="rejectionReason"
                        checked={selectedRejectReason === preset}
                        onChange={() => setSelectedRejectReason(preset)}
                        className="mt-0.5 text-rose-600 focus:ring-rose-500 shrink-0"
                      />
                      <span className="leading-snug">{preset}</span>
                    </label>
                  ))}
                </div>
              </div>

              {/* Additional Custom Notes */}
              <div className="space-y-1">
                <label className="text-[11px] font-bold text-slate-700 uppercase tracking-wider flex items-center justify-between">
                  <span>Additional Officer Comments (Optional)</span>
                  <span className="text-[10px] text-slate-400 font-normal">Audit Trail Note</span>
                </label>
                <textarea
                  value={customRejectNotes}
                  onChange={(e) => setCustomRejectNotes(e.target.value)}
                  placeholder="Provide specific notes regarding page defects, survey discrepancies, or missing stamps..."
                  rows={2}
                  className="w-full px-2.5 py-1.5 rounded text-xs border border-slate-300 focus:outline-none focus:ring-1 focus:ring-rose-500 bg-white"
                />
              </div>
            </div>

            {/* Modal Actions */}
            <div className="bg-slate-50 px-4 py-3 border-t border-slate-200 flex flex-col-reverse sm:flex-row items-stretch sm:items-center justify-end gap-2 shrink-0">
              <button
                type="button"
                onClick={() => setIsRejectModalOpen(false)}
                disabled={isSubmitting}
                className="w-full sm:w-auto px-3 py-2 sm:py-1.5 rounded border border-slate-300 hover:bg-white text-slate-700 text-xs font-semibold min-h-[38px] sm:min-h-[32px]"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmReject}
                disabled={isSubmitting}
                className="w-full sm:w-auto px-4 py-2 sm:py-1.5 rounded bg-rose-600 hover:bg-rose-700 active:bg-rose-800 text-white text-xs font-bold flex items-center justify-center gap-1.5 shadow-xs disabled:opacity-50 cursor-pointer min-h-[38px] sm:min-h-[32px]"
              >
                <XCircle className="w-3.5 h-3.5" />
                <span>{isSubmitting ? 'Rejecting Record...' : 'Confirm & Reject Record'}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

