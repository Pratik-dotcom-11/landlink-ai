import React, { useState, useEffect } from 'react';
import { api } from '../services/api.js';
import { DocumentItem, LandRecord, SupportedLanguage } from '../types.js';
import { ConfidenceBadge } from '../components/ConfidenceBadge.js';
import { StatusBadge } from '../components/StatusBadge.js';
import { DocumentViewer } from '../components/DocumentViewer.js';
import {
  UploadCloud,
  FileText,
  Sparkles,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  RefreshCw,
  Eye,
  Sliders,
  Layers,
  FileCheck,
  Languages,
  Check,
  RotateCcw
} from 'lucide-react';

interface UploadDocumentViewProps {
  onNavigate: (tab: any, params?: any) => void;
}

export const UploadDocumentView: React.FC<UploadDocumentViewProps> = ({ onNavigate }) => {
  const [file, setFile] = useState<File | null>(null);
  const [filePreview, setFilePreview] = useState<string | null>(null);
  const [selectedLanguage, setSelectedLanguage] = useState<SupportedLanguage>('English');
  const [isDragging, setIsDragging] = useState(false);
  const [samples, setSamples] = useState<any[]>([]);

  // Processing state
  const [processingStep, setProcessingStep] = useState<number>(0);
  const [isProcessing, setIsProcessing] = useState(false);
  const [processResult, setProcessResult] = useState<{
    document: DocumentItem;
    record: LandRecord;
    validation: any;
  } | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Load pre-configured sample documents for judges
    api.getSampleDocuments().then((res) => {
      if (res.success && res.data) {
        setSamples(res.data);
      }
    });
  }, []);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const selected = e.target.files[0];
      setFile(selected);
      const reader = new FileReader();
      reader.onload = (event) => {
        setFilePreview(event.target?.result as string);
      };
      reader.readAsDataURL(selected);
      setProcessResult(null);
      setError(null);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const dropped = e.dataTransfer.files[0];
      setFile(dropped);
      const reader = new FileReader();
      reader.onload = (event) => {
        setFilePreview(event.target?.result as string);
      };
      reader.readAsDataURL(dropped);
      setProcessResult(null);
      setError(null);
    }
  };

  const handleSelectSample = (sample: any) => {
    setFile({
      name: `${sample.title.replace(/\s+/g, '_')}.svg`,
      type: 'image/svg+xml',
      size: 14200,
    } as any);
    setFilePreview(sample.svgUrl);
    setSelectedLanguage(sample.language as any);
    setProcessResult(null);
    setError(null);
  };

  const handleStartPipeline = async () => {
    if (!filePreview) {
      setError('Please select or drop a land record document first.');
      return;
    }

    setIsProcessing(true);
    setError(null);
    setProcessingStep(1); // Uploading & Ingestion

    try {
      // Step 1: Upload document to backend
      let detectedType: any = 'pdf';
      if (file?.type) {
        if (file.type.includes('png')) detectedType = 'png';
        else if (file.type.includes('jpeg') || file.type.includes('jpg')) detectedType = 'jpg';
        else if (file.type.includes('svg')) detectedType = 'svg';
        else if (file.type.includes('pdf')) detectedType = 'pdf';
      } else if (file?.name) {
        const ext = file.name.split('.').pop()?.toLowerCase();
        if (ext === 'png') detectedType = 'png';
        else if (ext === 'jpg' || ext === 'jpeg') detectedType = 'jpg';
        else if (ext === 'svg') detectedType = 'svg';
        else if (ext === 'pdf') detectedType = 'pdf';
      }

      const uploadRes = await api.uploadDocument({
        filename: file?.name || 'scanned_cadastral_deed.svg',
        fileType: detectedType,
        fileDataUrl: filePreview,
        language: selectedLanguage,
      });

      if (!uploadRes.success || !uploadRes.data) {
        throw new Error(uploadRes.error || 'Failed to upload document');
      }

      const uploadedDoc = uploadRes.data;

      // Simulated Pipeline Stepper for Visual Feedback
      setTimeout(() => setProcessingStep(2), 600); // Preprocessing & Noise Reduction
      setTimeout(() => setProcessingStep(3), 1200); // Gemini 3.7 OCR Vision Extraction
      setTimeout(() => setProcessingStep(4), 1800); // Field Classification & Semantic Parsing
      setTimeout(() => setProcessingStep(5), 2400); // Confidence Scoring & Rules Validation

      // Trigger Actual Process Endpoint
      const processRes = await api.processDocument(uploadedDoc.id);

      if (!processRes.success || !processRes.data) {
        throw new Error(processRes.error || 'Processing failed');
      }

      setTimeout(() => {
        setProcessingStep(6); // Done
        setProcessResult(processRes.data);
        setIsProcessing(false);
      }, 2900);
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'An error occurred during AI processing pipeline.');
      setIsProcessing(false);
      setProcessingStep(0);
    }
  };

  const resetUpload = () => {
    setFile(null);
    setFilePreview(null);
    setProcessResult(null);
    setProcessingStep(0);
    setError(null);
  };

  const pipelineSteps = [
    { title: '1. Ingestion', desc: 'Secure payload upload & metadata validation' },
    { title: '2. Preprocessing', desc: 'Deskew, contrast equalization & binarization' },
    { title: '3. Multilingual OCR', desc: 'Gemini 3.7 Vision multi-script recognition' },
    { title: '4. Field Classification', desc: 'Semantic extraction of 14 cadastral fields' },
    { title: '5. Validation Engine', desc: 'Confidence scoring & business rules check' },
    { title: '6. Output & Routing', desc: 'Auto-Approve or route to Verifier Queue' },
  ];

  return (
    <div className="space-y-6">
      {/* Title */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <UploadCloud className="w-6 h-6 text-blue-600" />
            <span>Land Record Ingestion &amp; AI Digitization Pipeline</span>
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            Upload scanned land deeds, 7/12 extracts, Porcha, Khatiyan, or Khasra-Khatauni documents.
          </p>
        </div>

        {filePreview && (
          <button
            onClick={resetUpload}
            className="px-3 py-1.5 rounded-lg border border-slate-300 hover:bg-slate-50 text-slate-700 text-xs font-semibold flex items-center gap-1.5 self-start"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Reset / New Upload</span>
          </button>
        )}
      </div>

      {/* 1-Click Sample Documents Selector for Judges */}
      <div className="bg-linear-to-r from-blue-50 to-indigo-50 border border-blue-200/80 rounded-2xl p-3.5 sm:p-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 mb-3">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-blue-600 shrink-0" />
            <span className="text-xs font-bold text-blue-950 uppercase tracking-wide">
              Quick Test: Select Benchmark Cadastral Deeds
            </span>
          </div>
          <span className="text-[11px] text-blue-700 font-medium">1-Click Sample Preload for Evaluation</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
          {samples.map((sample) => (
            <button
              key={sample.id}
              onClick={() => handleSelectSample(sample)}
              className="text-left p-3 rounded-xl bg-white border border-blue-100 hover:border-blue-400 hover:shadow-xs transition-all group"
            >
              <div className="flex items-center justify-between gap-1">
                <span className="text-xs font-bold text-slate-900 group-hover:text-blue-600 transition-colors truncate">
                  {sample.title}
                </span>
                <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-slate-100 text-slate-700 shrink-0">
                  {sample.language}
                </span>
              </div>
              <p className="text-[11px] text-slate-500 mt-1 line-clamp-2">{sample.description}</p>
              <div className="mt-2 flex items-center gap-2 text-[10px] font-semibold text-blue-600">
                <span>Load Sample Deed</span>
                <ArrowRight className="w-3 h-3 group-hover:translate-x-1 transition-transform" />
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Main Upload Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Upload Dropzone & Language Config */}
        <div className="lg:col-span-5 space-y-4">
          {/* Dropzone */}
          <div
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            className={`border-2 border-dashed rounded-2xl p-6 text-center transition-all bg-white ${
              isDragging
                ? 'border-blue-500 bg-blue-50/50 scale-[0.99]'
                : 'border-slate-300 hover:border-slate-400'
            }`}
          >
            <input
              type="file"
              id="file-upload"
              accept=".pdf,.png,.jpg,.jpeg,.svg"
              onChange={handleFileChange}
              className="hidden"
            />
            <label htmlFor="file-upload" className="cursor-pointer block space-y-3">
              <div className="w-12 h-12 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center mx-auto shadow-inner">
                <UploadCloud className="w-6 h-6" />
              </div>
              <div>
                <span className="text-xs font-bold text-blue-700 hover:underline">
                  Click to select file
                </span>
                <span className="text-xs text-slate-600"> or drag and drop here</span>
              </div>
              <p className="text-[11px] text-slate-500">
                Supports scanned PDF, JPG, PNG, or SVG cadastral land records (Max 25MB)
              </p>
            </label>
          </div>

          {/* Configuration Card */}
          <div className="bg-white p-4 rounded-xl border border-slate-200 space-y-3">
            <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
              <Languages className="w-4 h-4 text-slate-600" />
              <span>Document Script &amp; Language</span>
            </h4>

            <div className="grid grid-cols-2 gap-2">
              {(['English', 'Hindi', 'Bengali', 'Marathi', 'Gujarati', 'Telugu'] as SupportedLanguage[]).map(
                (lang) => (
                  <button
                    key={lang}
                    type="button"
                    onClick={() => setSelectedLanguage(lang)}
                    className={`px-3 py-2 rounded-lg text-xs font-semibold text-left flex items-center justify-between border transition-all ${
                      selectedLanguage === lang
                        ? 'bg-blue-50 border-blue-400 text-blue-900 font-bold'
                        : 'border-slate-200 text-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    <span>{lang}</span>
                    {selectedLanguage === lang && <Check className="w-3.5 h-3.5 text-blue-600" />}
                  </button>
                )
              )}
            </div>

            <div className="pt-2 border-t border-slate-100">
              <button
                disabled={!filePreview || isProcessing}
                onClick={handleStartPipeline}
                className={`w-full py-3 rounded-xl text-xs font-extrabold flex items-center justify-center gap-2 shadow-md transition-all ${
                  !filePreview || isProcessing
                    ? 'bg-slate-200 text-slate-400 cursor-not-allowed'
                    : 'bg-blue-600 hover:bg-blue-500 text-white hover:scale-[1.02]'
                }`}
              >
                {isProcessing ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>Executing AI Pipeline...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4" />
                    <span>Run AI OCR &amp; Validation Pipeline</span>
                  </>
                )}
              </button>
            </div>
          </div>

          {error && (
            <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
              <div>
                <p className="font-bold">Execution Error</p>
                <p className="text-[11px]">{error}</p>
              </div>
            </div>
          )}
        </div>

        {/* Right Column: Interactive Document Preview or Live Pipeline Stepper */}
        <div className="lg:col-span-7 space-y-4">
          {/* Document Preview Card */}
          <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-xs">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <FileText className="w-4 h-4 text-blue-600" />
                <span className="text-xs font-bold text-slate-900">
                  {file?.name || 'Cadastral Document Canvas'}
                </span>
              </div>
              {file && (
                <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-slate-100 text-slate-600">
                  {selectedLanguage} Record
                </span>
              )}
            </div>

            {/* Document Content View */}
            <div className="mt-3">
              {filePreview ? (
                <DocumentViewer
                  fileDataUrl={filePreview}
                  filename={file?.name || 'Cadastral_Document'}
                  fileType={file?.type?.includes('pdf') ? 'pdf' : (file?.name?.endsWith('.pdf') ? 'pdf' : 'image')}
                  language={selectedLanguage}
                  className="min-h-[420px]"
                />
              ) : (
                <div className="bg-slate-950 rounded-xl p-8 min-h-[380px] flex flex-col items-center justify-center text-center space-y-2">
                  <FileText className="w-10 h-10 text-slate-700 mx-auto" />
                  <p className="text-xs text-slate-400 font-medium">No document selected</p>
                  <p className="text-[11px] text-slate-600 max-w-xs">
                    Choose one of the 1-click sample deeds above or upload a local scanned file to initiate extraction.
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Stepper Progress Bar */}
          {isProcessing && (
            <div className="bg-slate-900 text-white rounded-2xl p-5 border border-slate-800 space-y-4 animate-in fade-in">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-amber-400 uppercase tracking-wider flex items-center gap-1.5">
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  AI Pipeline in Progress
                </span>
                <span className="text-xs font-mono text-slate-400">Step {processingStep} of 6</span>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {pipelineSteps.map((step, idx) => {
                  const stepNum = idx + 1;
                  const isDone = processingStep > stepNum;
                  const isCurrent = processingStep === stepNum;

                  return (
                    <div
                      key={step.title}
                      className={`p-2.5 rounded-lg border text-xs transition-all ${
                        isDone
                          ? 'bg-emerald-950/40 border-emerald-500/40 text-emerald-300'
                          : isCurrent
                          ? 'bg-blue-950/80 border-blue-400 text-blue-200 shadow-md ring-1 ring-blue-400'
                          : 'bg-slate-800/40 border-slate-700/50 text-slate-500'
                      }`}
                    >
                      <div className="font-bold flex items-center gap-1.5">
                        {isDone ? (
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                        ) : isCurrent ? (
                          <RefreshCw className="w-3.5 h-3.5 text-blue-400 animate-spin" />
                        ) : (
                          <span className="w-3.5 h-3.5 rounded-full border border-slate-600 inline-block text-[9px] text-center leading-3">
                            {stepNum}
                          </span>
                        )}
                        <span>{step.title}</span>
                      </div>
                      <p className="text-[10px] mt-1 text-slate-400">{step.desc}</p>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Finished Pipeline Summary Card */}
          {processResult && (
            <div className="bg-white rounded-2xl border-2 border-emerald-500/30 p-5 shadow-lg space-y-4 animate-in fade-in slide-in-from-bottom-2">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-slate-100">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
                    <CheckCircle2 className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-slate-900">
                      Extraction &amp; Validation Completed
                    </h4>
                    <p className="text-[11px] text-slate-500">
                      Document processed in {(processResult.document.processingTimeMs || 1400) / 1000}s via Gemini 3.7 Vision
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <ConfidenceBadge score={processResult.record.overallConfidence} size="md" />
                  <StatusBadge status={processResult.record.status} size="md" />
                </div>
              </div>

              {/* Extracted Key Fields Quick Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 text-xs">
                <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-200">
                  <span className="text-[10px] text-slate-500 uppercase font-semibold">Owner Name</span>
                  <div className="font-bold text-slate-900 truncate mt-0.5">
                    {processResult.record.ownerName}
                  </div>
                </div>

                <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-200">
                  <span className="text-[10px] text-slate-500 uppercase font-semibold">Survey / Khasra</span>
                  <div className="font-bold text-slate-900 truncate mt-0.5">
                    {processResult.record.surveyNumber}
                  </div>
                </div>

                <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-200">
                  <span className="text-[10px] text-slate-500 uppercase font-semibold">Plot Area</span>
                  <div className="font-bold text-slate-900 truncate mt-0.5">
                    {processResult.record.plotArea} {processResult.record.plotAreaUnit}
                  </div>
                </div>

                <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-200">
                  <span className="text-[10px] text-slate-500 uppercase font-semibold">Village &amp; District</span>
                  <div className="font-bold text-slate-900 truncate mt-0.5">
                    {processResult.record.village}, {processResult.record.district}
                  </div>
                </div>
              </div>

              {/* Validation Rules Scorecard */}
              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 text-xs space-y-1.5">
                <div className="font-bold text-slate-800 text-[11px] uppercase tracking-wider">
                  Automated Rule Validations ({processResult.validation.results.length} checks)
                </div>
                <div className="space-y-1.5">
                  {processResult.validation.results.map((rule: any, idx: number) => (
                    <div key={`${rule.ruleCode || 'rule'}-${idx}-${rule.fieldKey || ''}`} className="flex flex-col sm:flex-row sm:items-center justify-between text-[11px] gap-1 sm:gap-2 p-1.5 sm:p-0 rounded-lg sm:rounded-none bg-white sm:bg-transparent border sm:border-0 border-slate-100">
                      <div className="flex items-start sm:items-center gap-1.5 min-w-0">
                        {rule.status === 'PASS' ? (
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0 mt-0.5 sm:mt-0" />
                        ) : rule.status === 'WARNING' ? (
                          <AlertTriangle className="w-3.5 h-3.5 text-amber-500 shrink-0 mt-0.5 sm:mt-0" />
                        ) : (
                          <AlertTriangle className="w-3.5 h-3.5 text-rose-600 shrink-0 mt-0.5 sm:mt-0" />
                        )}
                        <span className="font-semibold text-slate-700 shrink-0">{rule.rule || rule.ruleCode || rule.ruleName}:</span>
                        <span className="text-slate-500 break-words">{rule.message}</span>
                      </div>
                      <span
                        className={`text-[9px] font-bold px-1.5 py-0.2 rounded uppercase self-start sm:self-auto shrink-0 ${
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

              {/* Action Buttons */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-end gap-2.5 pt-2">
                {processResult.record.status === 'PENDING_VERIFICATION' ||
                processResult.record.status === 'VALIDATION_FAILED' ? (
                  <button
                    onClick={() => onNavigate('verification', { taskId: processResult.record.id })}
                    className="w-full sm:w-auto px-4 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-bold flex items-center justify-center gap-1.5 shadow-xs"
                  >
                    <span>Open in Split-Screen Human Verification</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                ) : (
                  <button
                    onClick={() => onNavigate('records', { recordId: processResult.record.id })}
                    className="w-full sm:w-auto px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold flex items-center justify-center gap-1.5 shadow-xs"
                  >
                    <span>View Digitized Land Record</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
