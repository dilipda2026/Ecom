'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { RefreshCw, Eye } from 'lucide-react';
import { DataTable, SearchInput, PageHeader, ToastContainer, useToast } from '@/components/ui/data-table';
import ExportDropdown from '@/components/admin/ExportDropdown';
import { getAuditLogs } from '@/features/admin/actions';
import type { AuditEntry } from '@/features/admin/types';

const AUDIT_EXPORT_HEADERS = ['Timestamp', 'Action', 'Entity / Table', 'Record ID', 'Changed By', 'IP Address'];

export default function AdminAuditLogsPage() {
  const [logs, setLogs] = useState<AuditEntry[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(0);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [tableName, setTableName] = useState('');
  const [selectedLog, setSelectedLog] = useState<AuditEntry | null>(null);
  const { toasts, removeToast } = useToast();

  const fetchLogs = useCallback(async (p?: number) => {
    setLoading(true);
    const res = await getAuditLogs({
      search: search || undefined,
      tableName: tableName || undefined,
      page: p ?? page,
      pageSize: 50,
      sortBy: 'created_at',
      sortOrder: 'desc',
    });
    if (res.success && res.data) {
      setLogs(res.data.data as AuditEntry[]);
      setTotal(res.data.total);
      setTotalPages(res.data.totalPages);
      setPage(res.data.page);
    }
    setLoading(false);
  }, [search, tableName, page]);

  useEffect(() => {
    fetchLogs(1); // eslint-disable-line react-hooks/set-state-in-effect
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const exportRows = useMemo(() => {
    return logs.map((l) => [
      new Date(l.created_at).toLocaleString('en-IN'),
      l.action,
      l.table_name,
      l.record_id ?? 'N/A',
      l.changed_by_name ?? l.changed_by ?? 'System',
      l.ip_address ?? 'N/A',
    ]);
  }, [logs]);

  const columns = [
    { key: 'timestamp', header: 'Timestamp', sortable: true, render: (l: AuditEntry) => (
      <span className="text-xs text-ztext-lighter whitespace-nowrap">{new Date(l.created_at).toLocaleString()}</span>
    )},
    { key: 'action', header: 'Action', render: (l: AuditEntry) => (
      <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium capitalize bg-zgray text-ztext-light">
        {l.action.replace(/_/g, ' ')}
      </span>
    )},
    { key: 'table', header: 'Entity', render: (l: AuditEntry) => (
      <span className="text-xs font-mono text-ztext-light">{l.table_name}</span>
    )},
    { key: 'record', header: 'Record ID', render: (l: AuditEntry) => (
      <span className="font-mono text-[10px] text-ztext-lighter">{l.record_id?.slice(0, 12) ?? '-'}</span>
    )},
    { key: 'changed_by', header: 'Changed By', render: (l: AuditEntry) => (
      <span className="text-xs text-ztext-light">{l.changed_by_name ?? l.changed_by?.slice(0, 12) ?? 'System'}</span>
    )},
    { key: 'ip', header: 'IP', render: (l: AuditEntry) => (
      <span className="text-[10px] text-ztext-muted font-mono">{l.ip_address ?? '-'}</span>
    ), hideOnMobile: true},
    { key: 'actions', header: '', render: (l: AuditEntry) => (
      <button onClick={() => setSelectedLog(l)} className="p-1.5 hover:bg-zgray rounded-lg text-ztext-muted hover:text-ztext-light transition-colors" title="View details">
        <Eye size={14} />
      </button>
    )},
  ];

  const tableOptions = [
    { label: 'All entities', value: '' },
    { label: 'Profiles', value: 'profiles' },
    { label: 'Orders', value: 'orders' },
    { label: 'Payments', value: 'payments' },
    { label: 'Restaurants', value: 'restaurants' },
    { label: 'Credit Accounts', value: 'credit_accounts' },
    { label: 'Credit Transactions', value: 'credit_transactions' },
    { label: 'System Settings', value: 'system_settings' },
  ];

  return (
    <div>
      <PageHeader title="Audit Logs" description={`${total} recorded event${total !== 1 ? 's' : ''}`}>
        <ExportDropdown
          title="Audit Logs Report"
          filenamePrefix="audit-logs-export"
          headers={AUDIT_EXPORT_HEADERS}
          rows={exportRows}
          disabled={logs.length === 0}
        />
      </PageHeader>

      <div className="flex flex-col sm:flex-row gap-3 mb-4">
        <div className="flex-1">
          <SearchInput value={search} onChange={(v) => { setSearch(v); setPage(1); }} placeholder="Search audit logs..." />
        </div>
        <select value={tableName} onChange={(v) => { setTableName(v.target.value); setPage(1); }}
          className="px-3 py-2 text-sm border border-zborder rounded-xl focus:outline-none focus:ring-2 focus:ring-zred/20 focus:border-zred bg-zcard appearance-none cursor-pointer">
          {tableOptions.map((opt) => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
        </select>
        <button onClick={() => fetchLogs()} aria-label="Refresh logs" className="p-2.5 rounded-xl hover:bg-zgray text-ztext-lighter transition-colors">
          <RefreshCw size={18} />
        </button>
      </div>

      <div className="bg-zcard rounded-xl border border-zborder">
        <DataTable
          columns={columns}
          data={logs as unknown as Record<string, unknown>[]}
          total={total}
          page={page}
          pageSize={50}
          totalPages={totalPages}
          loading={loading}
          onPageChange={(p) => fetchLogs(p)}
          keyExtractor={(l) => (l as unknown as AuditEntry).id}
          emptyMessage="No audit logs found"
        />
      </div>

      {selectedLog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40" onClick={() => setSelectedLog(null)}>
          <div className="bg-zcard rounded-2xl p-6 max-w-lg w-full shadow-z-modal" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-bold text-ztext">Audit Entry</h3>
              <button onClick={() => setSelectedLog(null)} aria-label="Close details" className="p-1 hover:bg-zgray rounded-lg">&times;</button>
            </div>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between"><span className="text-ztext-lighter">Timestamp</span><span>{new Date(selectedLog.created_at).toLocaleString()}</span></div>
              <div className="flex justify-between"><span className="text-ztext-lighter">Action</span><span className="capitalize">{selectedLog.action.replace(/_/g, ' ')}</span></div>
              <div className="flex justify-between"><span className="text-ztext-lighter">Entity</span><span className="font-mono">{selectedLog.table_name}</span></div>
              <div className="flex justify-between"><span className="text-ztext-lighter">Record ID</span><span className="font-mono text-xs">{selectedLog.record_id}</span></div>
              <div className="flex justify-between"><span className="text-ztext-lighter">Changed By</span><span>{selectedLog.changed_by_name ?? selectedLog.changed_by ?? 'System'}</span></div>
              <div className="flex justify-between"><span className="text-ztext-lighter">IP Address</span><span className="font-mono">{selectedLog.ip_address ?? 'N/A'}</span></div>
              {selectedLog.user_agent && <div className="flex justify-between"><span className="text-ztext-lighter">User Agent</span><span className="text-xs text-right max-w-[200px] truncate">{selectedLog.user_agent}</span></div>}
            </div>
            {(selectedLog.old_data || selectedLog.new_data) && (
              <div className="mt-4 space-y-3">
                {selectedLog.old_data && (
                  <div>
                    <p className="text-xs font-semibold text-ztext-lighter mb-1">Previous Value</p>
                    <pre className="text-[10px] bg-zgray rounded-lg p-3 overflow-x-auto max-h-32">{JSON.stringify(selectedLog.old_data, null, 2)}</pre>
                  </div>
                )}
                {selectedLog.new_data && (
                  <div>
                    <p className="text-xs font-semibold text-ztext-lighter mb-1">New Value</p>
                    <pre className="text-[10px] bg-zgray rounded-lg p-3 overflow-x-auto max-h-32">{JSON.stringify(selectedLog.new_data, null, 2)}</pre>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      <ToastContainer toasts={toasts} removeToast={removeToast} />
    </div>
  );
}
