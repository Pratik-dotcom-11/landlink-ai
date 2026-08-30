import React, { useState, useEffect } from 'react';
import {
  ZoomIn,
  ZoomOut,
  RotateCw,
  Maximize2,
  RefreshCw,
  AlertCircle,
  FileText,
  ExternalLink,
  Download,
  Eye,
  Sparkles,
  Layers,
  HelpCircle,
} from 'lucide-react';
import { DocumentItem } from '../types.js';

interface DocumentViewerProps {
  documentItem?: DocumentItem | null;
  fileDataUrl?: string | null;
  filename?: string;
  fileType?: string;
  documentId?: string;
  language?: string;
  loading?: boolean;
  error?: string | null;
  onRetry?: () => void;
  // OCR Field Inspection
  activeFieldKey?: string | null;
  activeFieldLabel?: string | null;
  activeFieldValue?: string | number | null;
  activeFieldConfidence?: number | null;
  // External Zoom/Rotation State (Optional)
  externalZoom?: number;
  externalRotation?: number;
  onZoomChange?: (zoom: number) => void;
  onRotationChange?: (rotation: number) => void;
  // View options
  compact?: boolean;
  className?: string;
}

export const DocumentViewer: React.FC<DocumentViewerProps> = ({
  documentItem,
  fileDataUrl: propFileDataUrl,
  filename: propFilename,
  fileType: propFileType,
  documentId: propDocumentId,
  language: propLanguage,
  loading = false,
  error: propError = null,
  onRetry,
  activeFieldKey,
  activeFieldLabel,
  activeFieldValue,
  activeFieldConfidence,
  externalZoom,
  externalRotation,
  onZoomChange,
  onRotationChange,
  compact = false,
  className = '',
}) => {
  const [internalZoom, setInternalZoom] = useState<number>(1);
  const [internalRotation, setInternalRotation] = useState<number>(0);
  const [imageError, setImageError] = useState<string | null>(null);
  const [pdfLoadError, setPdfLoadError] = useState<boolean>(false);
  const [viewMode, setViewMode] = useState<'fit' | 'fill'>('fit');

  const zoomLevel = externalZoom !== undefined ? externalZoom : internalZoom;
  const rotation = externalRotation !== undefined ? externalRotation : internalRotation;

  const setZoom = (newZoom: number) => {
    const clamped = Math.min(3.5, Math.max(0.4, Math.round(newZoom * 10) / 10));
    if (onZoomChange) onZoomChange(clamped);
    else setInternalZoom(clamped);
  };

  const setRotate = (newRotate: number) => {
    const norm = ((newRotate % 360) + 360) % 360;
    if (onRotationChange) onRotationChange(norm);
    else setInternalRotation(norm);
  };

  // Derive document attributes
  const dataUrl = propFileDataUrl || documentItem?.fileDataUrl || null;
  const filename = propFilename || documentItem?.filename || 'Cadastral_Document';
  const fileType = (propFileType || documentItem?.fileType || 'pdf').toLowerCase();
  const documentId = propDocumentId || documentItem?.id || 'DOC-UNASSIGNED';
  const language = propLanguage || documentItem?.language || 'English';

  // Reset errors when dataUrl changes
  useEffect(() => {
    setImageError(null);
    setPdfLoadError(false);
  }, [dataUrl]);

  // Determine media type
  const isPdf =
    fileType === 'pdf' ||
    filename.toLowerCase().endsWith('.pdf') ||
    (typeof dataUrl === 'string' && dataUrl.startsWith('data:application/pdf'));

  const isSvg =
    fileType === 'svg' ||
    filename.toLowerCase().endsWith('.svg') ||
    (typeof dataUrl === 'string' && (dataUrl.startsWith('data:image/svg+xml') || dataUrl.includes('<svg')));

  // Normalize image data source (convert raw SVG xml string into valid data URI if needed)
  let normalizedSrc = dataUrl || '';
  if (typeof dataUrl === 'string') {
    const trimmed = dataUrl.trim();
    if (trimmed.startsWith('<svg') || trimmed.startsWith('<?xml')) {
      normalizedSrc = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(trimmed)}`;
    }
  }

  const handleImageError = () => {
    // Note: Do not pass synthetic event object to console logger to prevent circular reference errors
    console.warn(`[DocumentViewer] Failed to load image preview for ${filename} (${documentId})`);
    setImageError('Image decoding failed or corrupted document URI.');
  };

  const handleResetView = () => {
    setZoom(1);
    setRotate(0);
  };

  const handleDownload = () => {
    if (!dataUrl) return;
    const a = document.createElement('a');
    a.href = dataUrl;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  const handleOpenRaw = () => {
    if (documentId && documentId !== 'DOC-UNASSIGNED') {
      window.open(`/api/documents/${documentId}/raw`, '_blank');
    } else if (dataUrl) {
      window.open(dataUrl, '_blank');
    }
  };

  // Error or unavailable condition
  const hasError = propError || imageError || (!loading && !dataUrl);

  return (
    <div
      className={`flex flex-col h-full bg-slate-900 text-slate-100 rounded-md border border-slate-700 shadow-md overflow-hidden ${className}`}
    >
      {/* Top Header / Cadastral Inspection Toolbar */}
      <div className="flex flex-wrap sm:flex-nowrap items-center justify-between px-2.5 sm:px-3 py-2 bg-slate-950 border-b border-slate-800 shrink-0 text-xs gap-2">
        <div className="flex items-center gap-2 overflow-hidden min-w-0">
          <div className="w-6 h-6 rounded bg-blue-900/60 border border-blue-500/40 text-blue-400 flex items-center justify-center shrink-0">
            <FileText className="w-3.5 h-3.5" />
          </div>
          <div className="truncate min-w-0">
            <div className="font-bold text-slate-100 truncate text-[11px] flex items-center gap-1.5">
              <span className="truncate">{filename}</span>
              <span className="text-[9px] font-mono px-1 py-0.2 rounded bg-slate-800 text-blue-300 uppercase border border-slate-700 shrink-0">
                {fileType.toUpperCase()}
              </span>
            </div>
            <div className="text-[9px] text-slate-400 font-mono truncate">
              ID: {documentId} • {language}
            </div>
          </div>
        </div>

        {/* View Controls Toolbar */}
        <div className="flex items-center gap-1 shrink-0 ml-auto sm:ml-0">
          <button
            type="button"
            onClick={() => setZoom(zoomLevel - 0.2)}
            disabled={zoomLevel <= 0.5 || hasError}
            title="Zoom Out"
            className="p-1.5 sm:p-1 rounded hover:bg-slate-800 active:bg-slate-700 text-slate-300 disabled:opacity-30 disabled:hover:bg-transparent min-w-[28px] min-h-[28px] flex items-center justify-center"
          >
            <ZoomOut className="w-3.5 h-3.5" />
          </button>
          <span className="font-mono text-[10px] text-slate-400 w-8 sm:w-9 text-center font-bold">
            {Math.round(zoomLevel * 100)}%
          </span>
          <button
            type="button"
            onClick={() => setZoom(zoomLevel + 0.2)}
            disabled={zoomLevel >= 3.0 || hasError}
            title="Zoom In"
            className="p-1.5 sm:p-1 rounded hover:bg-slate-800 active:bg-slate-700 text-slate-300 disabled:opacity-30 disabled:hover:bg-transparent min-w-[28px] min-h-[28px] flex items-center justify-center"
          >
            <ZoomIn className="w-3.5 h-3.5" />
          </button>
          <div className="w-px h-3.5 bg-slate-800 mx-0.5" />
          <button
            type="button"
            onClick={() => setRotate(rotation + 90)}
            disabled={hasError}
            title="Rotate 90° Clockwise"
            className="p-1.5 sm:p-1 rounded hover:bg-slate-800 active:bg-slate-700 text-slate-300 disabled:opacity-30 min-w-[28px] min-h-[28px] flex items-center justify-center"
          >
            <RotateCw className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={handleResetView}
            disabled={hasError}
            title="Reset Zoom & Rotation"
            className="px-1.5 py-1 sm:py-0.5 rounded text-[10px] font-mono text-slate-300 hover:bg-slate-800 border border-slate-800 min-h-[28px] flex items-center justify-center"
          >
            Reset
          </button>
          {dataUrl && (
            <button
              type="button"
              onClick={handleOpenRaw}
              title="Open Raw Document in New Tab"
              className="p-1.5 sm:p-1 rounded hover:bg-slate-800 text-slate-400 hover:text-slate-200 ml-0.5 min-w-[28px] min-h-[28px] flex items-center justify-center"
            >
              <ExternalLink className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* Main Document Canvas Viewport */}
      <div className={`flex-1 ${compact ? 'min-h-[240px] max-h-[320px]' : 'min-h-[280px] max-h-[400px]'} relative overflow-auto bg-slate-950 flex items-center justify-center p-2 select-none`}>
        {loading ? (
          <div className="flex flex-col items-center justify-center gap-2 text-slate-400 p-6">
            <RefreshCw className="w-5 h-5 animate-spin text-blue-400" />
            <span className="text-xs font-medium">Retrieving scanned land record...</span>
            <span className="text-[10px] font-mono text-slate-500">{filename}</span>
          </div>
        ) : hasError ? (
          /* Graceful Document Preview Unavailable Fallback */
          <div className="max-w-sm w-full m-3 p-4 rounded-lg bg-slate-900 border border-slate-800 text-center shadow-lg space-y-2.5">
            <div className="w-8 h-8 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-400 flex items-center justify-center mx-auto">
              <AlertCircle className="w-4 h-4" />
            </div>
            <div>
              <h4 className="text-xs font-bold text-slate-100 uppercase tracking-wide">
                Document Preview Unavailable
              </h4>
              <p className="text-[10px] text-slate-400 mt-0.5">
                {propError || imageError || 'The scanned document data could not be rendered directly.'}
              </p>
            </div>

            {/* Diagnostic Details */}
            <div className="bg-slate-950/80 rounded p-2 text-left border border-slate-800 font-mono text-[9px] text-slate-400 space-y-0.5">
              <div><span className="text-slate-500">File:</span> <span className="text-slate-300 truncate">{filename}</span></div>
              <div><span className="text-slate-500">Format:</span> <span className="text-blue-400 uppercase">{fileType}</span></div>
            </div>

            {/* Action Buttons */}
            <div className="flex items-center justify-center gap-2 pt-1">
              {onRetry && (
                <button
                  type="button"
                  onClick={onRetry}
                  className="px-2.5 py-1 rounded bg-blue-600 hover:bg-blue-500 text-white text-[11px] font-bold flex items-center gap-1 transition-colors"
                >
                  <RefreshCw className="w-3 h-3" />
                  <span>Retry</span>
                </button>
              )}
              {dataUrl && (
                <button
                  type="button"
                  onClick={handleDownload}
                  className="px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 text-[11px] font-medium flex items-center gap-1 border border-slate-700"
                >
                  <Download className="w-3 h-3" />
                  <span>Download</span>
                </button>
              )}
            </div>
          </div>
        ) : isPdf && dataUrl && dataUrl.startsWith('data:application/pdf') ? (
          /* Minimal Embedded PDF Viewer */
          <div
            className="w-full h-full min-h-[260px] max-h-[360px] flex items-center justify-center transition-transform duration-150 origin-center"
            style={{
              transform: `scale(${zoomLevel}) rotate(${rotation}deg)`,
            }}
          >
            <iframe
              src={dataUrl}
              title={`Cadastral PDF - ${filename}`}
              className="w-full h-full min-h-[260px] max-h-[360px] rounded border border-slate-800 bg-white"
            />
          </div>
        ) : (
          /* Scanned Image / SVG Rendering */
          <div
            className="transition-transform duration-150 origin-center flex items-center justify-center max-w-full"
            style={{
              transform: `scale(${zoomLevel}) rotate(${rotation}deg)`,
            }}
          >
            <img
              src={normalizedSrc}
              alt={`Cadastral Deed - ${filename}`}
              onError={handleImageError}
              className={`${compact ? 'max-h-[240px]' : 'max-h-[340px]'} w-auto max-w-full object-contain rounded shadow-lg border border-slate-800 bg-white`}
            />
          </div>
        )}
      </div>

      {/* Bottom OCR Field Live Inspection Banner (Step 8) */}
      <div className="px-3 py-2 bg-slate-950 border-t border-slate-800 shrink-0 text-xs flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 overflow-hidden">
          <div className="w-2 h-2 rounded-full bg-blue-500 animate-pulse shrink-0" />
          <div className="truncate text-[11px]">
            {activeFieldLabel ? (
              <span className="text-slate-300">
                Inspecting <strong className="text-white font-bold">{activeFieldLabel}</strong>:
                <span className="font-mono text-amber-300 ml-1.5 font-bold">
                  "{String(activeFieldValue ?? 'None')}"
                </span>
              </span>
            ) : (
              <span className="text-slate-400">
                Hover or select an extracted field on the right to inspect cadastral deed coordinates.
              </span>
            )}
          </div>
        </div>

        {activeFieldConfidence !== undefined && activeFieldConfidence !== null && (
          <div className="flex items-center gap-1.5 shrink-0 font-mono text-[10px]">
            <span className="text-slate-400">OCR Conf:</span>
            <span
              className={`font-bold px-1.5 py-0.2 rounded border ${
                activeFieldConfidence < 0.6
                  ? 'bg-rose-950/80 border-rose-600 text-rose-300'
                  : activeFieldConfidence < 0.85
                  ? 'bg-amber-950/80 border-amber-600 text-amber-300'
                  : 'bg-emerald-950/80 border-emerald-600 text-emerald-300'
              }`}
            >
              {Math.round(activeFieldConfidence * 100)}%
            </span>
          </div>
        )}
      </div>
    </div>
  );
};
