import React, { useState, useEffect } from 'react';
import { api } from '../services/api.js';
import { useAuth } from '../context/AuthContext.js';
import { ValidationRulesConfig } from '../types.js';
import {
  Sliders,
  CheckCircle2,
  Save,
  Code2,
  Shield,
  Layers,
  Sparkles,
  AlertTriangle,
  RefreshCw,
  Copy,
  ExternalLink
} from 'lucide-react';

export const SettingsRulesView: React.FC = () => {
  const { user } = useAuth();
  const [config, setConfig] = useState<ValidationRulesConfig | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [savedSuccess, setSavedSuccess] = useState(false);
  const [openApiSpec, setOpenApiSpec] = useState<any>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    api.getRulesConfig().then((res) => {
      if (res.success && res.data) {
        setConfig(res.data);
      }
    });

    api.getOpenApiSpec().then((spec) => {
      if (spec) setOpenApiSpec(spec);
    });
  }, []);

  const handleSaveConfig = async () => {
    if (!config) return;
    setIsSaving(true);
    try {
      const res = await api.updateRulesConfig(config);
      if (res.success) {
        setSavedSuccess(true);
        setTimeout(() => setSavedSuccess(false), 3000);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsSaving(false);
    }
  };

  const copySpec = () => {
    if (openApiSpec) {
      navigator.clipboard.writeText(JSON.stringify(openApiSpec, null, 2));
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  if (!config) {
    return (
      <div className="p-8 flex items-center justify-center min-h-[300px]">
        <RefreshCw className="w-8 h-8 text-blue-600 animate-spin" />
      </div>
    );
  }

  const apiEndpoints = [
    { method: 'POST', path: '/api/auth/login', desc: 'Authenticate with role credentials (Admin, Operator, Verifier, Viewer)' },
    { method: 'POST', path: '/api/documents/upload', desc: 'Upload scanned land deed (PDF, PNG, JPG, SVG)' },
    { method: 'POST', path: '/api/documents/{id}/process', desc: 'Execute Gemini 3.7 OCR & Cadastral Validation pipeline' },
    { method: 'GET', path: '/api/records', desc: 'Query and filter standardized digital land records' },
    { method: 'PUT', path: '/api/records/{id}', desc: 'Update field values and record verifier corrections with audit log' },
    { method: 'GET', path: '/api/verification/pending', desc: 'Get pending human-in-the-loop verification tasks' },
    { method: 'POST', path: '/api/verification/{id}/submit', desc: 'Approve or reject verification dossier with officer notes' },
    { method: 'GET', path: '/api/dashboard/statistics', desc: 'Fetch real-time cadastral digitization analytics' },
    { method: 'GET', path: '/api/audit-logs', desc: 'Retrieve tamper-evident audit history records' },
    { method: 'GET', path: '/api/search', desc: 'Deep multi-parameter search (survey no, khasra, khata, owner)' },
    { method: 'GET', path: '/api/config/rules', desc: 'Get active validation rules & confidence thresholds' },
    { method: 'PUT', path: '/api/config/rules', desc: 'Update validation rules configuration (Admin only)' },
  ];

  return (
    <div className="space-y-6">
      {/* Title */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <Sliders className="w-6 h-6 text-blue-600" />
            <span>Validation Engine Rules &amp; API Integration Suite</span>
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            Configure automated STP thresholds, cadastral boundary rules, and explore developer REST APIs.
          </p>
        </div>

        {user?.role === 'ADMIN' && (
          <button
            onClick={handleSaveConfig}
            disabled={isSaving}
            className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold flex items-center justify-center gap-2 shadow-md transition-all shrink-0"
          >
            {isSaving ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            <span>Save Rule Configuration</span>
          </button>
        )}
      </div>

      {savedSuccess && (
        <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-300 text-emerald-900 text-xs font-bold flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          <span>Validation rules &amp; confidence thresholds successfully saved and activated.</span>
        </div>
      )}

      {/* Rules Configuration Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left Card: Confidence Thresholds */}
        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs space-y-4">
          <div className="flex items-center gap-2 pb-3 border-b border-slate-100">
            <Sparkles className="w-4 h-4 text-blue-600" />
            <h3 className="text-sm font-bold text-slate-900">
              Confidence &amp; Straight-Through Processing (STP) Thresholds
            </h3>
          </div>

          <div className="space-y-4 text-xs">
            <div>
              <div className="flex items-center justify-between mb-1.5 font-bold">
                <span className="text-slate-800">Auto-Approval Threshold (STP):</span>
                <span className="font-mono text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                  {Math.round(config.autoApprovalThreshold * 100)}%
                </span>
              </div>
              <input
                type="range"
                min="0.70"
                max="0.98"
                step="0.01"
                value={config.autoApprovalThreshold}
                onChange={(e) =>
                  setConfig({ ...config, autoApprovalThreshold: parseFloat(e.target.value) })
                }
                className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
              />
              <p className="text-[11px] text-slate-500 mt-1">
                Records with overall score ≥ this value and 0 rule violations skip manual review.
              </p>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5 font-bold">
                <span className="text-slate-800">Minimum Field Confidence:</span>
                <span className="font-mono text-amber-700 bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
                  {Math.round(config.minFieldConfidence * 100)}%
                </span>
              </div>
              <input
                type="range"
                min="0.40"
                max="0.80"
                step="0.01"
                value={config.minFieldConfidence}
                onChange={(e) =>
                  setConfig({ ...config, minFieldConfidence: parseFloat(e.target.value) })
                }
                className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-amber-600"
              />
              <p className="text-[11px] text-slate-500 mt-1">
                Individual fields scoring below this trigger a red visual warning in the Verifier workspace.
              </p>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5 font-bold">
                <span className="text-slate-800">Max Sanity Plot Area Limit:</span>
                <span className="font-mono text-blue-700 bg-blue-50 px-2 py-0.5 rounded border border-blue-200">
                  {config.maxAllowedPlotArea} Acres
                </span>
              </div>
              <input
                type="number"
                value={config.maxAllowedPlotArea}
                onChange={(e) =>
                  setConfig({ ...config, maxAllowedPlotArea: parseFloat(e.target.value) || 500 })
                }
                className="w-full px-3 py-1.5 rounded-lg border border-slate-300 font-semibold"
              />
              <p className="text-[11px] text-slate-500 mt-1">
                Sanity limit to flag anomalous OCR plot area extractions for review.
              </p>
            </div>
          </div>
        </div>

        {/* Right Card: Business Rule Toggles */}
        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs space-y-4">
          <div className="flex items-center gap-2 pb-3 border-b border-slate-100">
            <Shield className="w-4 h-4 text-indigo-600" />
            <h3 className="text-sm font-bold text-slate-900">Active Business Validation Rules</h3>
          </div>

          <div className="space-y-3 text-xs">
            <label className="flex items-start gap-3 p-3 rounded-xl bg-slate-50 border border-slate-200 cursor-pointer">
              <input
                type="checkbox"
                checked={config.duplicateSurveyCheck}
                onChange={(e) =>
                  setConfig({ ...config, duplicateSurveyCheck: e.target.checked })
                }
                className="mt-0.5 w-4 h-4 text-blue-600 rounded"
              />
              <div>
                <div className="font-bold text-slate-900">Duplicate Survey / Khasra Collision Check</div>
                <p className="text-[11px] text-slate-500">
                  Flags records where the same survey and village exists with a different owner name.
                </p>
              </div>
            </label>

            <label className="flex items-start gap-3 p-3 rounded-xl bg-slate-50 border border-slate-200 cursor-pointer">
              <input
                type="checkbox"
                checked={config.requireMutationDetails}
                onChange={(e) =>
                  setConfig({ ...config, requireMutationDetails: e.target.checked })
                }
                className="mt-0.5 w-4 h-4 text-blue-600 rounded"
              />
              <div>
                <div className="font-bold text-slate-900">Require Mutation / Namantaran Entry</div>
                <p className="text-[11px] text-slate-500">
                  Issues a warning if historical mutation order details are missing from the deed.
                </p>
              </div>
            </label>

            <div className="p-3 rounded-xl bg-indigo-50/60 border border-indigo-200 text-indigo-900 text-[11px] space-y-1">
              <div className="font-bold">Required Cadastral Fields Enforced:</div>
              <div className="flex flex-wrap gap-1.5 pt-1">
                {config.requiredFields.map((f) => (
                  <span
                    key={f}
                    className="px-2 py-0.5 rounded bg-white font-mono font-semibold text-indigo-800 border border-indigo-200 text-[10px]"
                  >
                    {f}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* REST API & OpenAPI Swagger Explorer */}
      <div className="bg-slate-950 text-white rounded-2xl p-4 sm:p-6 border border-slate-800 shadow-md space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-800">
          <div className="flex items-center gap-2">
            <Code2 className="w-5 h-5 text-amber-400 shrink-0" />
            <div>
              <h3 className="text-sm font-bold text-white">REST API Integration Endpoints</h3>
              <p className="text-xs text-slate-400">OpenAPI 3.0 Standardized Specification</p>
            </div>
          </div>

          <button
            onClick={copySpec}
            className="w-full sm:w-auto px-3 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs font-semibold flex items-center justify-center gap-1.5 border border-slate-700 text-slate-300"
          >
            <Copy className="w-3.5 h-3.5" />
            <span>{copied ? 'Copied JSON!' : 'Copy OpenAPI Spec'}</span>
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {apiEndpoints.map((ep) => (
            <div
              key={ep.path + ep.method}
              className="p-3 rounded-xl bg-slate-900 border border-slate-800 text-xs space-y-1 overflow-hidden"
            >
              <div className="flex items-center gap-2 font-mono flex-wrap">
                <span
                  className={`text-[10px] font-bold px-1.5 py-0.5 rounded shrink-0 ${
                    ep.method === 'POST'
                      ? 'bg-blue-900 text-blue-200'
                      : ep.method === 'PUT'
                      ? 'bg-amber-900 text-amber-200'
                      : 'bg-emerald-900 text-emerald-200'
                  }`}
                >
                  {ep.method}
                </span>
                <span className="font-bold text-slate-200 break-all">{ep.path}</span>
              </div>
              <p className="text-[11px] text-slate-400">{ep.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
