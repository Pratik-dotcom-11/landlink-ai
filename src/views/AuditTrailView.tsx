import React, { useState, useEffect } from 'react';
import { api } from '../services/api.js';
import { AuditLog } from '../types.js';
import {
  History,
  ShieldCheck,
  Filter,
  Search,
  Download,
  Clock,
  User,
  FileText,
  Lock,
  ArrowRight
} from 'lucide-react';

export const AuditTrailView: React.FC = () => {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [filteredLogs, setFilteredLogs] = useState<AuditLog[]>([]);
  const [actionFilter, setActionFilter] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);

  const fetchLogs = async () => {
    setLoading(true);
    try {
      const res = await api.getAuditLogs();
      if (res.success && res.data) {
        setLogs(res.data);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, []);

  useEffect(() => {
    let result = logs;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      result = result.filter(
        (l) =>
          l.userName.toLowerCase().includes(q) ||
          l.entityId.toLowerCase().includes(q) ||
          (l.reason && l.reason.toLowerCase().includes(q)) ||
          l.action.toLowerCase().includes(q)
      );
    }
    if (actionFilter !== 'ALL') {
      result = result.filter((l) => l.action === actionFilter);
    }
    setFilteredLogs(result);
  }, [logs, searchQuery, actionFilter]);

  const handleExportAuditCSV = () => {
    if (logs.length === 0) return;
    const headers = [
      'Log_ID',
      'Timestamp',
      'User_Name',
      'User_Role',
      'Action',
      'Entity_Type',
      'Entity_ID',
      'Field_Key',
      'Old_Value',
      'New_Value',
      'Reason_Audit',
    ];
    const rows = logs.map((l) => [
      l.id,
      `"${l.timestamp}"`,
      `"${l.userName}"`,
      l.userRole,
      l.action,
      l.entityType,
      l.entityId,
      l.fieldKey || '',
      `"${l.oldValue || ''}"`,
      `"${l.newValue || ''}"`,
      `"${l.reason || ''}"`,
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `DoLR_Audit_Trail_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    link.remove();
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <ShieldCheck className="w-6 h-6 text-blue-600" />
            <span>Immutable Cadastral Audit Trail &amp; Provenance</span>
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            Tamper-evident logs of all automated AI classifications, operator edits, verifier approvals, and rule updates.
          </p>
        </div>

        <button
          onClick={handleExportAuditCSV}
          className="w-full sm:w-auto px-4 py-2.5 rounded-xl border border-slate-300 hover:bg-slate-50 text-slate-700 text-xs font-bold flex items-center justify-center gap-1.5 shadow-xs transition-all shrink-0"
        >
          <Download className="w-4 h-4 text-blue-600" />
          <span>Export Audit Log (CSV)</span>
        </button>
      </div>

      {/* Filter Bar */}
      <div className="bg-white p-3.5 sm:p-4 rounded-2xl border border-slate-200 shadow-xs flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        {/* Search */}
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search by user, entity ID, action, or audit comments..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2 rounded-xl text-xs border border-slate-200 focus:ring-2 focus:ring-blue-500 bg-slate-50/50"
          />
        </div>

        {/* Filter Action */}
        <div className="flex items-center justify-between sm:justify-start gap-2 text-xs text-slate-600 shrink-0">
          <div className="flex items-center gap-1.5">
            <Filter className="w-3.5 h-3.5 text-slate-400" />
            <span>Action:</span>
          </div>
          <select
            value={actionFilter}
            onChange={(e) => setActionFilter(e.target.value)}
            className="flex-1 sm:flex-initial px-2.5 py-1.5 rounded-lg text-xs font-semibold border border-slate-200 bg-white"
          >
            <option value="ALL">All Actions</option>
            <option value="AUTO_APPROVED">Auto Approved</option>
            <option value="VERIFIER_APPROVE">Verifier Approved</option>
            <option value="VERIFIER_EDIT">Verifier Edit</option>
            <option value="VERIFIER_REJECT">Verifier Reject</option>
            <option value="SUBMIT_FOR_VERIFICATION">Sent to Queue</option>
            <option value="UPLOAD_DOCUMENT">Document Upload</option>
          </select>
        </div>
      </div>

      {/* Audit Log Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs min-w-[700px]">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 uppercase text-[10px] font-bold tracking-wider">
              <tr>
                <th className="py-3.5 px-4">Timestamp (IST)</th>
                <th className="py-3.5 px-4">Officer / Agent</th>
                <th className="py-3.5 px-4">Action Taken</th>
                <th className="py-3.5 px-4">Target Entity</th>
                <th className="py-3.5 px-4">Modification Details</th>
                <th className="py-3.5 px-4">Audit Justification</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
              {filteredLogs.map((log) => (
                <tr key={log.id} className="hover:bg-slate-50/80 transition-colors">
                  <td className="py-3 px-4 font-mono text-[11px] text-slate-500 whitespace-nowrap">
                    {new Date(log.timestamp).toLocaleString('en-IN', {
                      day: '2-digit',
                      month: 'short',
                      year: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit',
                      second: '2-digit',
                    })}
                  </td>
                  <td className="py-3 px-4">
                    <div className="font-bold text-slate-900">{log.userName}</div>
                    <span
                      className={`text-[9px] font-bold px-1.5 py-0.2 rounded uppercase ${
                        log.userRole === 'ADMIN'
                          ? 'bg-purple-100 text-purple-800'
                          : log.userRole === 'VERIFIER'
                          ? 'bg-amber-100 text-amber-800'
                          : 'bg-blue-100 text-blue-800'
                      }`}
                    >
                      {log.userRole}
                    </span>
                  </td>
                  <td className="py-3 px-4">
                    <span className="font-mono text-xs font-semibold px-2 py-0.5 rounded bg-slate-100 text-slate-800 border border-slate-200">
                      {log.action}
                    </span>
                  </td>
                  <td className="py-3 px-4 font-mono text-[11px]">
                    <div className="text-slate-900 font-bold">{log.entityId}</div>
                    <div className="text-slate-400 text-[10px]">{log.entityType}</div>
                  </td>
                  <td className="py-3 px-4">
                    {log.fieldKey ? (
                      <div className="text-xs">
                        <span className="font-bold text-slate-800">{log.fieldKey}:</span>
                        <div className="flex items-center gap-1.5 text-[11px] mt-0.5">
                          <span className="line-through text-rose-600 bg-rose-50 px-1.5 py-0.2 rounded">
                            {String(log.oldValue || 'empty')}
                          </span>
                          <ArrowRight className="w-3 h-3 text-slate-400 shrink-0" />
                          <span className="font-bold text-emerald-700 bg-emerald-50 px-1.5 py-0.2 rounded">
                            {String(log.newValue || 'empty')}
                          </span>
                        </div>
                      </div>
                    ) : (
                      <span className="text-slate-400 text-[11px]">—</span>
                    )}
                  </td>
                  <td className="py-3 px-4 text-slate-600 text-[11px] max-w-xs">
                    {log.reason || 'Automated validation workflow trigger.'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {filteredLogs.length === 0 && (
            <div className="p-8 text-center text-slate-500 text-xs">
              No matching audit entries found.
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
