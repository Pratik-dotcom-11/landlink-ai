import React from 'react';
import { DocumentStatus } from '../types.js';
import { CheckCircle2, Clock, AlertCircle, XCircle, Sparkles, RefreshCw } from 'lucide-react';

interface StatusBadgeProps {
  status: DocumentStatus | string;
  size?: 'sm' | 'md';
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({ status, size = 'md' }) => {
  const sizeClass = size === 'sm' ? 'text-[9px] px-1.5 py-0.2' : 'text-[10px] px-2 py-0.5';

  switch (status) {
    case 'AUTO_APPROVED':
      return (
        <span className={`inline-flex items-center gap-1 font-bold rounded bg-emerald-50 text-emerald-700 border border-emerald-300 ${sizeClass}`}>
          <Sparkles className="w-3 h-3 text-emerald-600" />
          <span>Auto Approved</span>
        </span>
      );
    case 'VERIFIED':
      return (
        <span className={`inline-flex items-center gap-1 font-bold rounded bg-teal-50 text-teal-800 border border-teal-300 ${sizeClass}`}>
          <CheckCircle2 className="w-3 h-3 text-teal-700" />
          <span>Verified &amp; Approved</span>
        </span>
      );
    case 'PENDING_VERIFICATION':
      return (
        <span className={`inline-flex items-center gap-1 font-bold rounded bg-amber-50 text-amber-800 border border-amber-300 ${sizeClass}`}>
          <Clock className="w-3 h-3 text-amber-700" />
          <span>Needs Verification</span>
        </span>
      );
    case 'VALIDATION_FAILED':
      return (
        <span className={`inline-flex items-center gap-1 font-bold rounded bg-orange-50 text-orange-800 border border-orange-300 ${sizeClass}`}>
          <AlertCircle className="w-3 h-3 text-orange-700" />
          <span>Validation Warning</span>
        </span>
      );
    case 'REJECTED':
      return (
        <span className={`inline-flex items-center gap-1 font-bold rounded bg-rose-50 text-rose-700 border border-rose-300 ${sizeClass}`}>
          <XCircle className="w-3 h-3 text-rose-600" />
          <span>Rejected</span>
        </span>
      );
    case 'AI_EXTRACTING':
    case 'OCR_PROCESSING':
    case 'PREPROCESSING':
      return (
        <span className={`inline-flex items-center gap-1 font-bold rounded bg-blue-50 text-blue-700 border border-blue-300 ${sizeClass}`}>
          <RefreshCw className="w-3 h-3 text-blue-600 animate-spin" />
          <span>Processing</span>
        </span>
      );
    case 'UPLOADED':
      return (
        <span className={`inline-flex items-center gap-1 font-medium rounded bg-slate-100 text-slate-700 border border-slate-300 ${sizeClass}`}>
          <Clock className="w-3 h-3 text-slate-500" />
          <span>Uploaded</span>
        </span>
      );
    default:
      return (
        <span className={`inline-flex items-center gap-1 font-medium rounded bg-slate-100 text-slate-700 border border-slate-300 ${sizeClass}`}>
          <span>{status}</span>
        </span>
      );
  }
};
