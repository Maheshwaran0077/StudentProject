import React, { useState, useEffect } from 'react';
import api from '../../services/api';
import { ShieldAlert, Terminal, Calendar, User, Laptop } from 'lucide-react';

const AuditLogs = () => {
  const [logs, setLogs] = useState([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchLogs(page);
  }, [page]);

  const fetchLogs = async (p) => {
    setLoading(true);
    try {
      const res = await api.get(`/users/audit?page=${p}&limit=20`);
      setLogs(res.data.data.logs);
      setTotalPages(res.data.pages || 1);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6 text-left">
      <div>
        <h2 className="text-xl font-bold text-slate-800">System Security Audit Logs</h2>
        <p className="text-xs text-slate-500">Immutable history of administrative edits, case status modifications, and portal entries</p>
      </div>

      {/* TABLE */}
      <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-left text-xs text-slate-500">
            <thead className="bg-slate-50 text-[10px] font-bold uppercase tracking-wider text-slate-400 border-b border-slate-100">
              <tr>
                <th className="px-6 py-4">Timestamp</th>
                <th className="px-6 py-4">Trigger User</th>
                <th className="px-6 py-4">Role</th>
                <th className="px-6 py-4">Action Event</th>
                <th className="px-6 py-4">Target Resource</th>
                <th className="px-6 py-4">Client IP</th>
                <th className="px-6 py-4">User Agent</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-mono text-[11px]">
              {loading ? (
                <tr>
                  <td colSpan={7} className="text-center py-8">
                    <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary-500 border-t-transparent mx-auto" />
                  </td>
                </tr>
              ) : logs.length === 0 ? (
                <tr>
                  <td colSpan={7} className="text-center py-8 italic text-slate-400 font-sans">
                    No system logs recorded.
                  </td>
                </tr>
              ) : (
                logs.map((log) => (
                  <tr key={log._id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap text-slate-500 font-sans">
                      {new Date(log.createdAt).toLocaleString()}
                    </td>
                    <td className="px-6 py-4 font-semibold text-slate-700 font-sans">
                      {log.userId?.name || 'System / Auto'}
                      <div className="text-[9px] text-slate-400 mt-0.5">{log.userId?.email || '—'}</div>
                    </td>
                    <td className="px-6 py-4 font-sans">
                      {log.userId?.role || '—'}
                    </td>
                    <td className="px-6 py-4 font-bold text-primary-600">
                      {log.action}
                    </td>
                    <td className="px-6 py-4 font-sans text-slate-600 capitalize">
                      {log.resourceType}: {log.resourceId ? log.resourceId.slice(-6) : '—'}
                    </td>
                    <td className="px-6 py-4">{log.ipAddress || '—'}</td>
                    <td className="px-6 py-4 max-w-[150px] truncate font-sans text-slate-400" title={log.userAgent}>
                      {log.userAgent || '—'}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Controls */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between border-t border-slate-100 px-6 py-4 bg-slate-50/50">
            <button
              onClick={() => setPage(p => Math.max(1, p - 1))}
              disabled={page === 1}
              className="rounded border border-slate-200 bg-white px-3 py-1.5 font-semibold hover:bg-slate-50 transition-colors disabled:opacity-50"
            >
              Previous
            </button>
            <span className="text-xs text-slate-500 font-semibold">
              Page {page} of {totalPages}
            </span>
            <button
              onClick={() => setPage(p => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
              className="rounded border border-slate-200 bg-white px-3 py-1.5 font-semibold hover:bg-slate-50 transition-colors disabled:opacity-50"
            >
              Next
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default AuditLogs;
