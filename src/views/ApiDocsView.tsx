import React, { useState } from 'react';
import {
  Code2,
  Terminal,
  FileCode,
  CheckCircle,
  Copy,
  Layers,
  Sparkles,
  ArrowRight,
  ShieldAlert
} from 'lucide-react';

export const ApiDocsView: React.FC = () => {
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const handleCopy = (id: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const curlExamples = [
    {
      id: 'curl-upload',
      title: '1. Ingest Scanned Cadastral Deed',
      method: 'POST',
      endpoint: '/api/documents/upload',
      code: `curl -X POST http://localhost:3000/api/documents/upload \\
  -H "Authorization: Bearer <TOKEN>" \\
  -H "Content-Type: application/json" \\
  -d '{
    "filename": "maharashtra_7_12_record.pdf",
    "fileType": "pdf",
    "fileDataUrl": "data:application/pdf;base64,...",
    "language": "English"
  }'`,
    },
    {
      id: 'curl-process',
      title: '2. Execute AI Multi-Lingual OCR & Validation Pipeline',
      method: 'POST',
      endpoint: '/api/documents/{id}/process',
      code: `curl -X POST http://localhost:3000/api/documents/DOC-101/process \\
  -H "Authorization: Bearer <TOKEN>"`,
    },
    {
      id: 'curl-search',
      title: '3. Multi-Parameter Cadastral Search',
      method: 'GET',
      endpoint: '/api/search?surveyNumber=214/1A&district=Pune',
      code: `curl -X GET "http://localhost:3000/api/search?surveyNumber=214/1A&district=Pune" \\
  -H "Authorization: Bearer <TOKEN>"`,
    },
    {
      id: 'curl-verification',
      title: '4. Submit Verifier Decision & Field Audit Edits',
      method: 'POST',
      endpoint: '/api/verification/{taskId}/submit',
      code: `curl -X POST http://localhost:3000/api/verification/TASK-202/submit \\
  -H "Authorization: Bearer <TOKEN>" \\
  -H "Content-Type: application/json" \\
  -d '{
    "action": "APPROVE",
    "corrections": {
      "plot_area": 7.90
    },
    "comments": "Verified against Tehsil cadastral master index."
  }'`,
    },
  ];

  return (
    <div className="space-y-6">
      {/* Title */}
      <div>
        <h2 className="text-xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
          <Code2 className="w-6 h-6 text-blue-600" />
          <span>Department of Land Resources API Integration Hub</span>
        </h2>
        <p className="text-xs text-slate-500 mt-1">
          Machine-to-machine REST interfaces for automated deed submission, OCR pipeline execution, and registry queries.
        </p>
      </div>

      {/* Security Note Banner */}
      <div className="p-4 rounded-2xl bg-blue-50/70 border border-blue-200 text-xs text-blue-950 flex items-start gap-3">
        <ShieldAlert className="w-5 h-5 text-blue-700 shrink-0 mt-0.5" />
        <div>
          <h4 className="font-bold">DILRMP-Compliant Standardized Interfaces</h4>
          <p className="text-[11px] text-blue-800 mt-0.5">
            All endpoints support JSON web token (JWT) role-based authorization headers and return normalized cadastral land record models with field-level confidence ratings.
          </p>
        </div>
      </div>

      {/* cURL Code Examples */}
      <div className="space-y-4">
        {curlExamples.map((ex) => (
          <div
            key={ex.id}
            className="bg-slate-950 rounded-2xl border border-slate-800 overflow-hidden shadow-md"
          >
            <div className="p-3.5 sm:p-4 bg-slate-900 border-b border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
              <div className="flex items-center gap-2 flex-wrap min-w-0">
                <Terminal className="w-4 h-4 text-amber-400 shrink-0" />
                <span className="text-xs font-bold text-white truncate">{ex.title}</span>
                <span className="text-[10px] font-mono font-bold px-1.5 py-0.2 rounded bg-blue-900 text-blue-200 shrink-0">
                  {ex.method}
                </span>
                <span className="text-[11px] font-mono text-slate-400 break-all">{ex.endpoint}</span>
              </div>

              <button
                onClick={() => handleCopy(ex.id, ex.code)}
                className="self-end sm:self-auto px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-[11px] font-semibold text-slate-300 flex items-center gap-1 border border-slate-700 shrink-0"
              >
                {copiedId === ex.id ? (
                  <>
                    <CheckCircle className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Copied</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5" />
                    <span>Copy cURL</span>
                  </>
                )}
              </button>
            </div>

            <div className="p-4 overflow-x-auto">
              <pre className="font-mono text-xs text-emerald-400 leading-relaxed">
                {ex.code}
              </pre>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
