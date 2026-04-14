import { useState, useEffect, useCallback } from 'react';
import { Trash2, RotateCcw, Search, RefreshCw, ChevronDown, ChevronRight, Package, Clock, History } from 'lucide-react';
import { api } from '../../services/api';
import { useToast } from '../../components/ui/Toast';
import TypedDeleteConfirmModal from '../../components/ui/TypedDeleteConfirmModal';

interface TrashedItem {
  id: string | number;
  type: string;
  type_label: string;
  module: string;
  name: string;
  code: string | null;
  deleted_at: string;
  deleted_by: string | null;
}

interface ModuleSection {
  module: string;
  count: number;
  types: { key: string; label: string; count: number }[];
}

interface AuditLog {
  id: number;
  action: string;
  record_type: string;
  record_name: string | null;
  record_code: string | null;
  module: string;
  performed_by_name: string | null;
  reason: string | null;
  created_at: string;
}

type TabKey = 'items' | 'logs';

export default function RecycleBinPage() {
  const [activeTab, setActiveTab] = useState<TabKey>('items');

  // Items state
  const [items, setItems] = useState<TrashedItem[]>([]);
  const [modules, setModules] = useState<ModuleSection[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [lastPage, setLastPage] = useState(1);
  const [perPage] = useState(25);
  const [loading, setLoading] = useState(true);
  const [moduleFilter, setModuleFilter] = useState('');
  const [search, setSearch] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [expandedModules, setExpandedModules] = useState<Set<string>>(new Set());

  // Logs state
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [logsLoading, setLogsLoading] = useState(false);
  const [logsPage, setLogsPage] = useState(1);
  const [logsLastPage, setLogsLastPage] = useState(1);
  const [logsTotal, setLogsTotal] = useState(0);

  // Action states
  const [restoring, setRestoring] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<TrashedItem | null>(null);
  const [actionLoading, setActionLoading] = useState(false);

  const toast = useToast();

  // ─── Data fetching ────────────────────────────

  const fetchItems = useCallback(async () => {
    setLoading(true);
    try {
      const qs = new URLSearchParams({ page: String(page), per_page: String(perPage) });
      if (moduleFilter) qs.set('module', moduleFilter);
      if (search) qs.set('search', search);
      const res = await api.get<{ data: TrashedItem[]; total: number; last_page: number }>(`/recycle-bin?${qs}`);
      setItems(res.data);
      setTotal(res.total);
      setLastPage(res.last_page);
    } catch {
      toast.error('Failed to load recycle bin');
    } finally {
      setLoading(false);
    }
  }, [page, perPage, moduleFilter, search]);

  const fetchModules = useCallback(async () => {
    try {
      const res = await api.get<ModuleSection[]>('/recycle-bin/modules');
      setModules(Array.isArray(res) ? res : []);
    } catch {
      // Silently fail - modules sidebar is supplementary
    }
  }, []);

  const fetchLogs = useCallback(async () => {
    setLogsLoading(true);
    try {
      const qs = new URLSearchParams({ page: String(logsPage), per_page: '25' });
      const res = await api.get<{ data: AuditLog[]; total: number; last_page: number }>(`/recycle-bin/logs?${qs}`);
      setLogs(res.data);
      setLogsTotal(res.total);
      setLogsLastPage(res.last_page);
    } catch {
      toast.error('Failed to load audit logs');
    } finally {
      setLogsLoading(false);
    }
  }, [logsPage]);

  useEffect(() => { fetchItems(); }, [fetchItems]);
  useEffect(() => { fetchModules(); }, [fetchModules]);
  useEffect(() => { if (activeTab === 'logs') fetchLogs(); }, [activeTab, fetchLogs]);

  // ─── Actions ──────────────────────────────────

  const handleRestore = async (item: TrashedItem) => {
    setRestoring(`${item.type}-${item.id}`);
    setActionLoading(true);
    try {
      await api.post('/recycle-bin/restore', { type: item.type, id: item.id });
      toast.success(`${item.type_label} "${item.name}" restored successfully`);
      fetchItems();
      fetchModules();
    } catch {
      toast.error('Failed to restore item');
    } finally {
      setRestoring(null);
      setActionLoading(false);
    }
  };

  const handlePermanentDelete = async () => {
    if (!deleteTarget) return;
    setActionLoading(true);
    try {
      await api.post('/recycle-bin/force-delete', { type: deleteTarget.type, id: deleteTarget.id });
      toast.success(`${deleteTarget.type_label} permanently deleted`);
      setDeleteTarget(null);
      fetchItems();
      fetchModules();
    } catch {
      toast.error('Failed to permanently delete item');
    } finally {
      setActionLoading(false);
    }
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setSearch(searchInput);
    setPage(1);
  };

  const handleModuleFilter = (mod: string) => {
    setModuleFilter(mod === moduleFilter ? '' : mod);
    setPage(1);
  };

  const toggleModuleExpand = (mod: string) => {
    setExpandedModules(prev => {
      const next = new Set(prev);
      if (next.has(mod)) next.delete(mod); else next.add(mod);
      return next;
    });
  };

  // ─── Helpers ──────────────────────────────────

  const totalTrashed = modules.reduce((sum, m) => sum + m.count, 0);

  const formatDate = (iso: string) => {
    const d = new Date(iso);
    return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) +
      ' ' + d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
  };

  const timeAgo = (iso: string) => {
    const diff = Date.now() - new Date(iso).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return 'just now';
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h ago`;
    const days = Math.floor(hrs / 24);
    if (days < 30) return `${days}d ago`;
    return `${Math.floor(days / 30)}mo ago`;
  };

  const actionLabel = (action: string) => {
    switch (action) {
      case 'deleted': return 'Deleted';
      case 'restored': return 'Restored';
      case 'permanently_deleted': return 'Permanently Deleted';
      default: return action;
    }
  };

  const actionColor = (action: string) => {
    switch (action) {
      case 'deleted': return 'text-amber-700 bg-amber-50 border-amber-200';
      case 'restored': return 'text-green-700 bg-green-50 border-green-200';
      case 'permanently_deleted': return 'text-red-700 bg-red-50 border-red-200';
      default: return 'text-gray-700 bg-gray-50 border-gray-200';
    }
  };

  const modulesWithItems = modules.filter(m => m.count > 0);

  // Group items by module for display
  const itemsByModule = items.reduce<Record<string, TrashedItem[]>>((acc, item) => {
    const mod = item.module;
    if (!acc[mod]) acc[mod] = [];
    acc[mod].push(item);
    return acc;
  }, {});

  return (
    <div className="max-w-[1200px] mx-auto">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center gap-3 mb-1">
          <div className="w-10 h-10 rounded-xl bg-red-100 flex items-center justify-center">
            <Trash2 size={20} className="text-red-600" />
          </div>
          <div>
            <h1 className="text-[22px] font-bold text-text-primary tracking-[-0.01em]">Recycle Bin</h1>
            <p className="text-[13px] text-text-secondary">
              {totalTrashed} deleted {totalTrashed === 1 ? 'item' : 'items'} across {modulesWithItems.length} {modulesWithItems.length === 1 ? 'module' : 'modules'}
            </p>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-1 mb-4 border-b border-border">
        <button
          onClick={() => setActiveTab('items')}
          className={`px-4 py-2.5 text-[13px] font-medium border-b-2 transition-colors duration-150 ${
            activeTab === 'items'
              ? 'border-primary text-primary'
              : 'border-transparent text-text-tertiary hover:text-text-secondary'
          }`}
        >
          <span className="flex items-center gap-2">
            <Package size={15} />
            Deleted Items ({totalTrashed})
          </span>
        </button>
        <button
          onClick={() => setActiveTab('logs')}
          className={`px-4 py-2.5 text-[13px] font-medium border-b-2 transition-colors duration-150 ${
            activeTab === 'logs'
              ? 'border-primary text-primary'
              : 'border-transparent text-text-tertiary hover:text-text-secondary'
          }`}
        >
          <span className="flex items-center gap-2">
            <History size={15} />
            Audit Log
          </span>
        </button>
      </div>

      {/* ─── ITEMS TAB ─── */}
      {activeTab === 'items' && (
        <div className="flex gap-5">
          {/* Left: Module sidebar */}
          <div className="hidden lg:block w-[220px] shrink-0">
            <div className="bg-white rounded-[var(--radius-lg)] border border-border shadow-sm p-3 sticky top-4">
              <h3 className="text-[12px] font-semibold text-text-tertiary uppercase tracking-wider mb-3">Modules</h3>

              {/* All modules button */}
              <button
                onClick={() => { setModuleFilter(''); setPage(1); }}
                className={`w-full flex items-center justify-between px-2.5 py-2 text-[13px] rounded-[var(--radius-md)] transition-colors duration-150 mb-1 ${
                  !moduleFilter ? 'bg-primary/10 text-primary font-medium' : 'text-text-secondary hover:bg-surface-sunken'
                }`}
              >
                <span>All Modules</span>
                <span className="text-[11px] font-medium opacity-70">{totalTrashed}</span>
              </button>

              {/* Module list */}
              <div className="space-y-0.5">
                {modulesWithItems.map(mod => (
                  <div key={mod.module}>
                    <button
                      onClick={() => handleModuleFilter(mod.module)}
                      className={`w-full flex items-center justify-between px-2.5 py-2 text-[13px] rounded-[var(--radius-md)] transition-colors duration-150 ${
                        moduleFilter === mod.module ? 'bg-primary/10 text-primary font-medium' : 'text-text-secondary hover:bg-surface-sunken'
                      }`}
                    >
                      <span className="truncate">{mod.module}</span>
                      <span className="text-[11px] font-medium opacity-70 shrink-0 ml-2">{mod.count}</span>
                    </button>

                    {/* Expand sub-types on click */}
                    {moduleFilter === mod.module && mod.types.filter(t => t.count > 0).length > 1 && (
                      <div className="ml-4 mt-1 mb-1 space-y-0.5">
                        {mod.types.filter(t => t.count > 0).map(t => (
                          <div key={t.key} className="flex items-center justify-between px-2 py-1 text-[12px] text-text-tertiary">
                            <span>{t.label}</span>
                            <span className="text-[10px]">{t.count}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>

              {modulesWithItems.length === 0 && (
                <p className="text-[12px] text-text-tertiary px-2.5 py-3">No deleted items</p>
              )}
            </div>
          </div>

          {/* Right: Items list */}
          <div className="flex-1 min-w-0">
            {/* Toolbar */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 mb-4">
              {/* Search */}
              <form onSubmit={handleSearch} className="flex items-center gap-2 flex-1 w-full sm:w-auto">
                <div className="relative flex-1 sm:max-w-[300px]">
                  <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-tertiary" />
                  <input
                    type="text"
                    placeholder="Search deleted items..."
                    value={searchInput}
                    onChange={e => setSearchInput(e.target.value)}
                    className="w-full h-9 pl-9 pr-3 text-[13px] border border-border rounded-[var(--radius-md)]
                      bg-white text-text-primary placeholder:text-text-tertiary
                      focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-colors duration-150"
                  />
                </div>
                {search && (
                  <button
                    type="button"
                    onClick={() => { setSearch(''); setSearchInput(''); setPage(1); }}
                    className="text-[12px] text-text-tertiary hover:text-text-secondary"
                  >
                    Clear
                  </button>
                )}
              </form>

              {/* Mobile module filter */}
              <div className="flex items-center gap-2 flex-wrap lg:hidden">
                <button
                  onClick={() => { setModuleFilter(''); setPage(1); }}
                  className={`px-2.5 py-1 text-[12px] rounded-full border transition-colors duration-150 ${
                    !moduleFilter ? 'bg-primary text-white border-primary' : 'bg-white text-text-secondary border-border hover:border-primary/30'
                  }`}
                >
                  All ({totalTrashed})
                </button>
                {modulesWithItems.map(m => (
                  <button
                    key={m.module}
                    onClick={() => handleModuleFilter(m.module)}
                    className={`px-2.5 py-1 text-[12px] rounded-full border transition-colors duration-150 ${
                      moduleFilter === m.module ? 'bg-primary text-white border-primary' : 'bg-white text-text-secondary border-border hover:border-primary/30'
                    }`}
                  >
                    {m.module} ({m.count})
                  </button>
                ))}
              </div>

              {/* Refresh */}
              <button
                onClick={() => { fetchItems(); fetchModules(); }}
                disabled={loading}
                className="p-2 text-text-tertiary hover:text-text-secondary hover:bg-surface-sunken rounded-[var(--radius-md)] transition-colors duration-150 disabled:opacity-50"
                title="Refresh"
              >
                <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
              </button>
            </div>

            {/* Active module filter indicator */}
            {moduleFilter && (
              <div className="flex items-center gap-2 mb-3 px-3 py-2 bg-primary/5 border border-primary/20 rounded-[var(--radius-md)]">
                <span className="text-[13px] text-primary font-medium">Showing: {moduleFilter}</span>
                <button
                  onClick={() => { setModuleFilter(''); setPage(1); }}
                  className="text-[12px] text-primary/60 hover:text-primary underline"
                >
                  Show all
                </button>
              </div>
            )}

            {/* Table */}
            <div className="bg-white rounded-[var(--radius-lg)] border border-border overflow-hidden shadow-sm">
              {loading ? (
                <div className="flex items-center justify-center py-16 text-text-tertiary">
                  <span className="w-5 h-5 border-2 border-primary/20 border-t-primary rounded-full animate-spin mr-3" />
                  Loading...
                </div>
              ) : items.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 text-text-tertiary">
                  <Trash2 size={40} className="mb-3 opacity-30" />
                  <p className="text-[14px] font-medium">
                    {moduleFilter ? `No deleted items in ${moduleFilter}` : 'Recycle bin is empty'}
                  </p>
                  <p className="text-[12px] mt-1">Deleted items will appear here</p>
                </div>
              ) : (
                <>
                  {/* Grouped by module */}
                  {Object.keys(itemsByModule).length > 1 && !moduleFilter ? (
                    // Multi-module grouped view
                    <div className="divide-y divide-border">
                      {Object.entries(itemsByModule).map(([mod, modItems]) => {
                        const isExpanded = expandedModules.has(mod) || expandedModules.size === 0;
                        return (
                          <div key={mod}>
                            {/* Module header */}
                            <button
                              onClick={() => toggleModuleExpand(mod)}
                              className="w-full flex items-center gap-2 px-4 py-2.5 bg-surface-sunken/50 hover:bg-surface-sunken text-left transition-colors duration-100"
                            >
                              {isExpanded ? <ChevronDown size={14} className="text-text-tertiary" /> : <ChevronRight size={14} className="text-text-tertiary" />}
                              <span className="text-[13px] font-semibold text-text-primary">{mod}</span>
                              <span className="text-[11px] text-text-tertiary">({modItems.length})</span>
                            </button>

                            {/* Module items */}
                            {isExpanded && (
                              <div className="divide-y divide-border/50">
                                {modItems.map(item => (
                                  <ItemRow
                                    key={`${item.type}-${item.id}`}
                                    item={item}
                                    restoring={restoring}
                                    actionLoading={actionLoading}
                                    onRestore={handleRestore}
                                    onDelete={setDeleteTarget}
                                    formatDate={formatDate}
                                    timeAgo={timeAgo}
                                    showModule={false}
                                  />
                                ))}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    // Single module / flat view
                    <>
                      {/* Desktop table */}
                      <div className="hidden md:block overflow-x-auto">
                        <table className="w-full text-[13px]">
                          <thead>
                            <tr className="border-b border-border bg-surface-sunken/50">
                              <th className="text-left px-4 py-2.5 font-medium text-text-secondary">Item</th>
                              <th className="text-left px-4 py-2.5 font-medium text-text-secondary">Type</th>
                              <th className="text-left px-4 py-2.5 font-medium text-text-secondary">Deleted</th>
                              <th className="text-left px-4 py-2.5 font-medium text-text-secondary">Deleted By</th>
                              <th className="text-right px-4 py-2.5 font-medium text-text-secondary">Actions</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-border">
                            {items.map(item => (
                              <ItemRow
                                key={`${item.type}-${item.id}`}
                                item={item}
                                restoring={restoring}
                                actionLoading={actionLoading}
                                onRestore={handleRestore}
                                onDelete={setDeleteTarget}
                                formatDate={formatDate}
                                timeAgo={timeAgo}
                                showModule={!moduleFilter}
                              />
                            ))}
                          </tbody>
                        </table>
                      </div>

                      {/* Mobile cards */}
                      <div className="md:hidden divide-y divide-border">
                        {items.map(item => (
                          <MobileItemCard
                            key={`${item.type}-${item.id}`}
                            item={item}
                            restoring={restoring}
                            actionLoading={actionLoading}
                            onRestore={handleRestore}
                            onDelete={setDeleteTarget}
                            timeAgo={timeAgo}
                          />
                        ))}
                      </div>
                    </>
                  )}

                  {/* Pagination */}
                  {lastPage > 1 && (
                    <div className="flex items-center justify-between px-4 py-3 border-t border-border bg-surface-sunken/30">
                      <p className="text-[12px] text-text-tertiary">
                        Showing {(page - 1) * perPage + 1}–{Math.min(page * perPage, total)} of {total}
                      </p>
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => setPage(p => Math.max(1, p - 1))}
                          disabled={page <= 1}
                          className="px-3 py-1 text-[12px] border border-border rounded-[var(--radius-md)]
                            hover:bg-white disabled:opacity-40 disabled:cursor-not-allowed transition-colors duration-150"
                        >
                          Previous
                        </button>
                        <span className="px-3 py-1 text-[12px] text-text-secondary">
                          {page} / {lastPage}
                        </span>
                        <button
                          onClick={() => setPage(p => Math.min(lastPage, p + 1))}
                          disabled={page >= lastPage}
                          className="px-3 py-1 text-[12px] border border-border rounded-[var(--radius-md)]
                            hover:bg-white disabled:opacity-40 disabled:cursor-not-allowed transition-colors duration-150"
                        >
                          Next
                        </button>
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ─── LOGS TAB ─── */}
      {activeTab === 'logs' && (
        <div className="bg-white rounded-[var(--radius-lg)] border border-border overflow-hidden shadow-sm">
          {logsLoading ? (
            <div className="flex items-center justify-center py-16 text-text-tertiary">
              <span className="w-5 h-5 border-2 border-primary/20 border-t-primary rounded-full animate-spin mr-3" />
              Loading...
            </div>
          ) : logs.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-text-tertiary">
              <History size={40} className="mb-3 opacity-30" />
              <p className="text-[14px] font-medium">No audit logs yet</p>
              <p className="text-[12px] mt-1">Delete, restore, and permanent delete actions will be logged here</p>
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full text-[13px]">
                  <thead>
                    <tr className="border-b border-border bg-surface-sunken/50">
                      <th className="text-left px-4 py-2.5 font-medium text-text-secondary">Action</th>
                      <th className="text-left px-4 py-2.5 font-medium text-text-secondary">Record</th>
                      <th className="text-left px-4 py-2.5 font-medium text-text-secondary">Module</th>
                      <th className="text-left px-4 py-2.5 font-medium text-text-secondary">Performed By</th>
                      <th className="text-left px-4 py-2.5 font-medium text-text-secondary">When</th>
                      <th className="text-left px-4 py-2.5 font-medium text-text-secondary">Reason</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {logs.map(log => (
                      <tr key={log.id} className="hover:bg-surface-sunken/30 transition-colors duration-100">
                        <td className="px-4 py-3">
                          <span className={`inline-flex items-center px-2 py-0.5 text-[11px] font-medium rounded-full border ${actionColor(log.action)}`}>
                            {actionLabel(log.action)}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <p className="font-medium text-text-primary">{log.record_name || '(unnamed)'}</p>
                          {log.record_code && <p className="text-[11px] text-text-tertiary mt-0.5">{log.record_code}</p>}
                        </td>
                        <td className="px-4 py-3">
                          <span className="inline-flex items-center px-2 py-0.5 text-[11px] font-medium rounded-full bg-gray-100 text-gray-700">
                            {log.module}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-text-secondary">{log.performed_by_name || '—'}</td>
                        <td className="px-4 py-3">
                          <p className="text-text-secondary">{formatDate(log.created_at)}</p>
                          <p className="text-[11px] text-text-tertiary">{timeAgo(log.created_at)}</p>
                        </td>
                        <td className="px-4 py-3 text-text-secondary text-[12px] max-w-[200px] truncate">
                          {log.reason || '—'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Logs pagination */}
              {logsLastPage > 1 && (
                <div className="flex items-center justify-between px-4 py-3 border-t border-border bg-surface-sunken/30">
                  <p className="text-[12px] text-text-tertiary">
                    Showing {(logsPage - 1) * 25 + 1}–{Math.min(logsPage * 25, logsTotal)} of {logsTotal}
                  </p>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => setLogsPage(p => Math.max(1, p - 1))}
                      disabled={logsPage <= 1}
                      className="px-3 py-1 text-[12px] border border-border rounded-[var(--radius-md)]
                        hover:bg-white disabled:opacity-40 disabled:cursor-not-allowed transition-colors duration-150"
                    >
                      Previous
                    </button>
                    <span className="px-3 py-1 text-[12px] text-text-secondary">{logsPage} / {logsLastPage}</span>
                    <button
                      onClick={() => setLogsPage(p => Math.min(logsLastPage, p + 1))}
                      disabled={logsPage >= logsLastPage}
                      className="px-3 py-1 text-[12px] border border-border rounded-[var(--radius-md)]
                        hover:bg-white disabled:opacity-40 disabled:cursor-not-allowed transition-colors duration-150"
                    >
                      Next
                    </button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      )}

      {/* Permanent delete confirmation */}
      <TypedDeleteConfirmModal
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handlePermanentDelete}
        title="Permanently Delete"
        itemName={deleteTarget?.name}
        itemType={deleteTarget?.type_label}
        loading={actionLoading}
        permanent
      />
    </div>
  );
}

// ─── Sub-components ─────────────────────────────

interface ItemRowProps {
  item: TrashedItem;
  restoring: string | null;
  actionLoading: boolean;
  onRestore: (item: TrashedItem) => void;
  onDelete: (item: TrashedItem) => void;
  formatDate: (iso: string) => string;
  timeAgo: (iso: string) => string;
  showModule: boolean;
}

function ItemRow({ item, restoring, actionLoading, onRestore, onDelete, formatDate, timeAgo, showModule }: ItemRowProps) {
  const isRestoring = restoring === `${item.type}-${item.id}`;

  return (
    <tr className="hover:bg-surface-sunken/30 transition-colors duration-100">
      <td className="px-4 py-3">
        <p className="font-medium text-text-primary">{item.name}</p>
        {item.code && <p className="text-[11px] text-text-tertiary mt-0.5">{item.code}</p>}
      </td>
      {showModule && (
        <td className="px-4 py-3">
          <span className="inline-flex items-center px-2 py-0.5 text-[11px] font-medium rounded-full bg-gray-100 text-gray-700">
            {item.module}
          </span>
        </td>
      )}
      <td className="px-4 py-3 text-text-secondary">{item.type_label}</td>
      <td className="px-4 py-3">
        <p className="text-text-secondary">{formatDate(item.deleted_at)}</p>
        <p className="text-[11px] text-text-tertiary">{timeAgo(item.deleted_at)}</p>
      </td>
      <td className="px-4 py-3 text-text-secondary">{item.deleted_by || '—'}</td>
      <td className="px-4 py-3">
        <div className="flex items-center justify-end gap-1.5">
          <button
            onClick={() => onRestore(item)}
            disabled={isRestoring || actionLoading}
            className="inline-flex items-center gap-1.5 px-2.5 py-1.5 text-[12px] font-medium
              text-green-700 bg-green-50 border border-green-200 rounded-[var(--radius-md)]
              hover:bg-green-100 disabled:opacity-40 transition-colors duration-150"
            title="Restore"
          >
            {isRestoring ? (
              <span className="w-3 h-3 border-2 border-green-300 border-t-green-600 rounded-full animate-spin" />
            ) : (
              <RotateCcw size={13} />
            )}
            Restore
          </button>
          <button
            onClick={() => onDelete(item)}
            disabled={actionLoading}
            className="inline-flex items-center gap-1.5 px-2.5 py-1.5 text-[12px] font-medium
              text-red-700 bg-red-50 border border-red-200 rounded-[var(--radius-md)]
              hover:bg-red-100 disabled:opacity-40 transition-colors duration-150"
            title="Permanently delete"
          >
            <Trash2 size={13} />
            Delete
          </button>
        </div>
      </td>
    </tr>
  );
}

interface MobileItemCardProps {
  item: TrashedItem;
  restoring: string | null;
  actionLoading: boolean;
  onRestore: (item: TrashedItem) => void;
  onDelete: (item: TrashedItem) => void;
  timeAgo: (iso: string) => string;
}

function MobileItemCard({ item, restoring, actionLoading, onRestore, onDelete, timeAgo }: MobileItemCardProps) {
  const isRestoring = restoring === `${item.type}-${item.id}`;

  return (
    <div className="p-4 space-y-2">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="text-[14px] font-medium text-text-primary truncate">{item.name}</p>
          {item.code && <p className="text-[12px] text-text-tertiary">{item.code}</p>}
        </div>
        <span className="inline-flex items-center px-2 py-0.5 text-[10px] font-medium rounded-full bg-gray-100 text-gray-700 shrink-0">
          {item.module}
        </span>
      </div>
      <div className="flex items-center gap-3 text-[12px] text-text-tertiary">
        <span>{item.type_label}</span>
        <span>·</span>
        <span>{timeAgo(item.deleted_at)}</span>
        {item.deleted_by && (
          <>
            <span>·</span>
            <span>by {item.deleted_by}</span>
          </>
        )}
      </div>
      <div className="flex items-center gap-2 pt-1">
        <button
          onClick={() => onRestore(item)}
          disabled={isRestoring || actionLoading}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-[12px] font-medium
            text-green-700 bg-green-50 border border-green-200 rounded-[var(--radius-md)]
            hover:bg-green-100 disabled:opacity-40 transition-colors duration-150"
        >
          <RotateCcw size={13} />
          Restore
        </button>
        <button
          onClick={() => onDelete(item)}
          disabled={actionLoading}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-[12px] font-medium
            text-red-700 bg-red-50 border border-red-200 rounded-[var(--radius-md)]
            hover:bg-red-100 disabled:opacity-40 transition-colors duration-150"
        >
          <Trash2 size={13} />
          Delete
        </button>
      </div>
    </div>
  );
}
