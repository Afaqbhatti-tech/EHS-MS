import { useState, useCallback, useMemo } from 'react';
import {
  Shield, Plus, RefreshCw, List, BarChart3, CalendarRange,
  AlertTriangle, Search, X as XIcon, ChevronLeft, ChevronRight, Eye,
  ClipboardList, Clock, Timer, Users, TrendingUp, Activity, CheckCircle,
  FileText, CircleDot, Pencil, Trash2,
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { useDrills } from './useDrills';
import { useErps } from './useErps';
import DrillDetail from './components/DrillDetail';
import DrillForm from './components/DrillForm';
import ErpForm from './components/ErpForm';
import ErpDetail from './components/ErpDetail';
import DrillPlanner from './components/DrillPlanner';
import DrillAnalytics from './components/DrillAnalytics';
import ExportDropdown from '../../components/ui/ExportDropdown';
import TypedDeleteConfirmModal from '../../components/ui/TypedDeleteConfirmModal';
import { api } from '../../services/api';
import { useToast } from '../../components/ui/Toast';

type Tab = 'register' | 'planner' | 'actions' | 'erp' | 'analytics';

// ─── Status badge helpers ────────────────────────

const drillStatusStyles: Record<string, string> = {
  Planned: 'bg-neutral-100 text-neutral-700',
  Scheduled: 'bg-blue-100 text-blue-600',
  'In Progress': 'bg-amber-100 text-amber-700',
  Conducted: 'bg-[#EDE9FE] text-[#5B21B6]',
  'Under Review': 'bg-amber-50 text-amber-700',
  Closed: 'bg-green-100 text-green-700',
  Cancelled: 'bg-neutral-100 text-neutral-500',
};

const erpStatusStyles: Record<string, string> = {
  Draft: 'bg-neutral-100 text-neutral-700',
  Active: 'bg-green-100 text-green-700',
  'Under Review': 'bg-blue-100 text-blue-600',
  Obsolete: 'bg-red-100 text-red-700',
};

function DrillStatusBadge({ status }: { status: string }) {
  const cls = drillStatusStyles[status] ?? 'bg-neutral-100 text-neutral-600';
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-[3px] rounded-full text-[11px] font-medium leading-tight ${cls}`}>
      <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${cls.includes('green') ? 'bg-green-500' : cls.includes('red') ? 'bg-red-500' : cls.includes('blue') ? 'bg-blue-500' : cls.includes('amber') ? 'bg-amber-500' : cls.includes('#5B21B6') ? 'bg-purple-500' : 'bg-neutral-400'}`} />
      {status}
    </span>
  );
}

function ErpStatusBadge({ status }: { status: string }) {
  const cls = erpStatusStyles[status] ?? 'bg-neutral-100 text-neutral-600';
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-[3px] rounded-full text-[11px] font-medium leading-tight ${cls}`}>
      <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${cls.includes('green') ? 'bg-green-500' : cls.includes('red') ? 'bg-red-500' : cls.includes('blue') ? 'bg-blue-500' : 'bg-neutral-400'}`} />
      {status}
    </span>
  );
}

// ─── KPI Card ────────────────────────────────────

const DRILL_KPI_CONFIG = [
  { key: 'active_erps', label: 'Active ERPs', icon: Activity, iconBg: 'var(--color-kpi-active-bg)', iconColor: 'var(--color-kpi-active)', accent: 'var(--color-kpi-active)' },
  { key: 'total', label: 'Total Drills', icon: ClipboardList, iconBg: 'var(--color-kpi-total-bg)', iconColor: 'var(--color-kpi-total)', accent: 'var(--color-kpi-total)' },
  { key: 'planned', label: 'Planned', icon: CalendarRange, iconBg: 'var(--color-kpi-info-bg)', iconColor: 'var(--color-kpi-info)', accent: 'var(--color-kpi-info)' },
  { key: 'conducted', label: 'Conducted', icon: CheckCircle, iconBg: 'var(--color-kpi-secondary-bg)', iconColor: 'var(--color-kpi-secondary)', accent: 'var(--color-kpi-secondary)' },
  { key: 'closed', label: 'Closed', icon: CircleDot, iconBg: 'var(--color-kpi-muted-bg)', iconColor: 'var(--color-kpi-muted)', accent: 'var(--color-kpi-muted)' },
  { key: 'overdue', label: 'Overdue', icon: AlertTriangle, iconBg: 'var(--color-kpi-danger-bg)', iconColor: 'var(--color-kpi-danger)', accent: 'var(--color-kpi-danger)', pulse: true },
  { key: 'open_actions', label: 'Open Actions', icon: AlertTriangle, iconBg: 'var(--color-kpi-warning-bg)', iconColor: 'var(--color-kpi-warning)', accent: 'var(--color-kpi-warning)', pulse: true },
  { key: 'avg_response', label: 'Avg Response Time', icon: Clock, iconBg: 'var(--color-kpi-info-bg)', iconColor: 'var(--color-kpi-info)', accent: 'var(--color-kpi-info)' },
  { key: 'avg_evacuation', label: 'Avg Evacuation Time', icon: Timer, iconBg: 'var(--color-kpi-info-bg)', iconColor: 'var(--color-kpi-info)', accent: 'var(--color-kpi-info)' },
  { key: 'this_month', label: 'This Month', icon: TrendingUp, iconBg: 'var(--color-kpi-secondary-bg)', iconColor: 'var(--color-kpi-secondary)', accent: 'var(--color-kpi-secondary)' },
] as const;

// ─── Main Component ──────────────────────────────

export default function DrillsPage() {
  const { hasPermission } = useAuth();
  const toast = useToast();

  const {
    drills, total, page, lastPage, isLoading,
    stats, isStatsLoading,
    filterOptions,
    selectedDrill, isDetailLoading,
    filters, updateFilter, resetFilters,
    selectedId, setSelectedId,
    create, update, destroy,
    isCreating, isUpdating,
    refresh, isRefreshing,
  } = useDrills();

  const {
    erps, total: erpTotal, page: erpPage, lastPage: erpLastPage, isLoading: isErpsLoading,
    stats: erpStats, isStatsLoading: isErpStatsLoading,
    selectedErp, isDetailLoading: isErpDetailLoading,
    filters: erpFilters, updateFilter: updateErpFilter, resetFilters: resetErpFilters,
    selectedId: selectedErpId, setSelectedId: setSelectedErpId,
    create: createErp,
    isCreating: isErpCreating,
    refresh: refreshErps, isRefreshing: isErpsRefreshing,
  } = useErps();

  const [tab, setTab] = useState<Tab>('register');
  const [showDrillForm, setShowDrillForm] = useState(false);
  const [showErpForm, setShowErpForm] = useState(false);
  const [editingDrill, setEditingDrill] = useState<Record<string, unknown> | null>(null);
  const [deletingDrill, setDeletingDrill] = useState<{ id: string; title: string } | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const canManage = hasPermission('can_manage_drills') || hasPermission('can_access_mock_drills');
  const canExport = hasPermission('can_export_reports') || hasPermission('can_access_mock_drills');

  // ─── Derived data ────────────────────────────────

  const kpis = stats?.kpis;
  const overdueCount = kpis?.overdue ?? 0;
  const openActionsCount = kpis?.open_actions ?? 0;

  // Open / overdue actions for the actions tab
  const openActions = useMemo(() => {
    return stats?.top_open_actions ?? [];
  }, [stats]);

  // ─── Handlers ────────────────────────────────────

  const handleCreateDrill = useCallback(async (data: Record<string, unknown>) => {
    try {
      await create(data);
      toast.success('Drill created successfully');
      setShowDrillForm(false);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to create drill';
      toast.error(message);
    }
  }, [create, toast]);

  const handleCreateErp = useCallback(async (data: FormData) => {
    try {
      await createErp(data);
      toast.success('ERP created successfully');
      setShowErpForm(false);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to create ERP';
      toast.error(message);
    }
  }, [createErp, toast]);

  const handleExport = useCallback((format: string) => {
    const params = new URLSearchParams();
    params.set('format', format);
    if (filters.status) params.set('status', filters.status);
    if (filters.drill_type) params.set('drill_type', filters.drill_type);
    if (filters.erp_id) params.set('erp_id', filters.erp_id);
    if (filters.department) params.set('department', filters.department);
    if (filters.date_from) params.set('date_from', filters.date_from);
    if (filters.date_to) params.set('date_to', filters.date_to);
    api.download(`/drills/export?${params.toString()}`).catch((err: unknown) => {
      const message = err instanceof Error ? err.message : 'Export failed';
      toast.error(message);
    });
  }, [filters, toast]);

  const handleViewDrill = useCallback((id: string) => setSelectedId(id), [setSelectedId]);
  const handleCloseDrillDetail = useCallback(() => setSelectedId(null), [setSelectedId]);

  const handleEditDrill = useCallback((d: Record<string, unknown>) => {
    setEditingDrill(d);
  }, []);

  const handleUpdateDrill = useCallback(async (data: Record<string, unknown>) => {
    if (!editingDrill) return;
    await update({ id: editingDrill.id as string, data });
    setEditingDrill(null);
  }, [editingDrill, update]);

  const handleDeleteDrill = useCallback(async () => {
    if (!deletingDrill) return;
    setIsDeleting(true);
    try {
      await destroy(deletingDrill.id);
      setDeletingDrill(null);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to delete drill';
      toast.error(message);
    } finally {
      setIsDeleting(false);
    }
  }, [deletingDrill, destroy, toast]);

  const handleViewErp = useCallback((id: string) => setSelectedErpId(id), [setSelectedErpId]);
  const handleCloseErpDetail = useCallback(() => setSelectedErpId(null), [setSelectedErpId]);

  const handleRefreshAll = useCallback(() => {
    refresh();
    refreshErps();
  }, [refresh, refreshErps]);

  // ─── Filter bar helpers ──────────────────────────

  const drillFiltersActive = filters.search || filters.status || filters.drill_type || filters.erp_id || filters.department || filters.date_from || filters.date_to;
  const erpFiltersActive = erpFilters.search || erpFilters.erp_type || erpFilters.status;

  // ─── Tab config ──────────────────────────────────

  const TABS: { key: Tab; label: string; icon: typeof List }[] = [
    { key: 'register', label: 'Drill Register', icon: List },
    { key: 'planner', label: 'Planner', icon: CalendarRange },
    { key: 'actions', label: 'Open Actions', icon: AlertTriangle },
    { key: 'erp', label: 'ERP Register', icon: FileText },
    { key: 'analytics', label: 'Analytics', icon: BarChart3 },
  ];

  return (
    <div className="space-y-4">
      {/* ── Page Header ──────────────────────────── */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-primary-50 text-primary-600">
              <Shield size={22} />
            </div>
            <div>
              <h1 className="text-xl font-bold text-text-primary">Mock Drills / ERP</h1>
              <p className="text-xs text-text-secondary mt-0.5">Plan, conduct, and evaluate emergency drills and response procedures</p>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={handleRefreshAll} className="btn-secondary p-2 rounded-lg" title="Refresh" disabled={isRefreshing || isErpsRefreshing}>
            <RefreshCw size={16} className={isRefreshing || isErpsRefreshing ? 'animate-spin' : ''} />
          </button>
          {canExport && (
            <ExportDropdown onExport={handleExport} disabled={!total} />
          )}
          {canManage && (
            <>
              <button onClick={() => setShowErpForm(true)}
                className="btn-secondary px-4 py-2 text-sm rounded-lg flex items-center gap-2">
                <Plus size={16} /> New ERP
              </button>
              <button onClick={() => setShowDrillForm(true)}
                className="btn-primary px-4 py-2 text-sm rounded-lg flex items-center gap-2">
                <Plus size={16} /> New Drill
              </button>
            </>
          )}
        </div>
      </div>

      {/* ── Tabs ─────────────────────────────────── */}
      <div className="flex items-center gap-1 border-b border-border overflow-x-auto">
        {TABS.map(t => {
          const Icon = t.icon;
          return (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
                tab === t.key
                  ? 'border-primary-500 text-primary-700'
                  : 'border-transparent text-text-secondary hover:text-text-primary'
              }`}
            >
              <Icon size={16} /> {t.label}
              {t.key === 'actions' && openActionsCount > 0 && (
                <span className="ml-1 px-1.5 py-0.5 text-[10px] font-bold bg-danger-100 text-danger-700 rounded-full">{openActionsCount}</span>
              )}
            </button>
          );
        })}
      </div>

      {/* ── Drill Register Tab ───────────────────── */}
      {tab === 'register' && (
        <>
          {/* KPI Cards */}
          {isStatsLoading || isErpStatsLoading ? (
            <div className="std-kpi-grid">
              {DRILL_KPI_CONFIG.map((_, i) => (
                <div key={i} className="std-kpi-card" style={{ animationDelay: `${i * 60}ms` }}>
                  <div className="skeleton" style={{ width: 80, height: 12 }} />
                  <div className="skeleton" style={{ width: 48, height: 28, marginTop: 4 }} />
                </div>
              ))}
            </div>
          ) : (() => {
            const values: Record<string, string | number> = {
              active_erps: erpStats?.kpis?.active ?? 0,
              total: kpis?.total_drills ?? 0,
              planned: kpis?.planned ?? 0,
              conducted: kpis?.conducted ?? 0,
              closed: kpis?.closed ?? 0,
              overdue: overdueCount,
              open_actions: openActionsCount,
              avg_response: kpis?.avg_response_seconds ? `${(kpis.avg_response_seconds / 60).toFixed(1)} min` : '--',
              avg_evacuation: kpis?.avg_evacuation_seconds ? `${(kpis.avg_evacuation_seconds / 60).toFixed(1)} min` : '--',
              this_month: kpis?.drills_this_month ?? 0,
            };
            return (
              <div className="std-kpi-grid">
                {DRILL_KPI_CONFIG.map((cfg, i) => {
                  const Icon = cfg.icon;
                  const val = values[cfg.key];
                  const shouldPulse = cfg.pulse && typeof val === 'number' && val > 0;
                  return (
                    <div
                      key={cfg.key}
                      className={`std-kpi-card${shouldPulse ? ' std-kpi-card--pulse' : ''}`}
                      style={{ animationDelay: `${i * 60}ms`, borderLeft: `3px solid ${cfg.accent}` }}
                    >
                      <div className="std-kpi-card__label">
                        <Icon size={14} style={{ color: cfg.accent }} />
                        {cfg.label}
                      </div>
                      <div className="std-kpi-card__value" style={{ color: cfg.accent }}>
                        {val}
                      </div>
                    </div>
                  );
                })}
              </div>
            );
          })()}

          {/* Filter bar */}
          <div className="bg-surface rounded-xl border border-border p-4 space-y-3">
            <div className="flex items-center justify-between">
              <div className="relative flex-1 max-w-sm">
                <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-tertiary" />
                <input
                  type="text"
                  value={filters.search}
                  onChange={e => updateFilter('search', e.target.value)}
                  placeholder="Search drills..."
                  className="input-field w-full pl-9 py-2 text-sm"
                />
              </div>
              {drillFiltersActive && (
                <button onClick={resetFilters} className="text-xs text-danger-600 hover:underline flex items-center gap-1">
                  <XIcon size={12} /> Clear all
                </button>
              )}
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-7 gap-3">
              <select
                value={filters.drill_type}
                onChange={e => updateFilter('drill_type', e.target.value)}
                className="input-field text-sm"
              >
                <option value="">All Types</option>
                {(filterOptions?.drill_types ?? ['Fire Drill', 'Evacuation', 'First Aid', 'Chemical Spill', 'Confined Space Rescue', 'Medical Emergency', 'Natural Disaster', 'Other']).map(t => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </select>

              <select
                value={filters.status}
                onChange={e => updateFilter('status', e.target.value)}
                className="input-field text-sm"
              >
                <option value="">All Status</option>
                {(filterOptions?.statuses ?? ['Planned', 'Scheduled', 'In Progress', 'Conducted', 'Under Review', 'Closed', 'Cancelled']).map(s => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>

              <select
                value={filters.erp_id}
                onChange={e => updateFilter('erp_id', e.target.value)}
                className="input-field text-sm"
              >
                <option value="">All ERPs</option>
                {(filterOptions?.erps ?? []).map((e: { id: string; erp_code: string; title: string }) => (
                  <option key={e.id} value={e.id}>{e.erp_code} - {e.title}</option>
                ))}
              </select>

              <select
                value={filters.department}
                onChange={e => updateFilter('department', e.target.value)}
                className="input-field text-sm"
              >
                <option value="">All Departments</option>
                {(filterOptions?.departments ?? []).map(d => (
                  <option key={d} value={d}>{d}</option>
                ))}
              </select>

              <input
                type="date"
                value={filters.date_from}
                onChange={e => updateFilter('date_from', e.target.value)}
                className="input-field text-sm"
                placeholder="From"
              />

              <input
                type="date"
                value={filters.date_to}
                onChange={e => updateFilter('date_to', e.target.value)}
                className="input-field text-sm"
                placeholder="To"
              />

              <button onClick={resetFilters} className="btn-secondary px-3 py-2 text-sm rounded-lg flex items-center gap-1.5 justify-center">
                <RefreshCw size={14} /> Reset
              </button>
            </div>
          </div>

          {/* Drill Register Table */}
          {isLoading ? (
            <div className="bg-surface rounded-xl border border-border overflow-hidden">
              <div className="p-8 text-center text-text-secondary">Loading drills...</div>
            </div>
          ) : !drills.length ? (
            <div className="bg-surface rounded-xl border border-border overflow-hidden">
              <div className="p-12 text-center">
                <p className="text-text-secondary text-sm">No drills found</p>
                <p className="text-text-tertiary text-xs mt-1">Try adjusting your filters or schedule a new drill</p>
              </div>
            </div>
          ) : (
            <div className="bg-surface rounded-xl border border-border overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-canvas border-b border-border">
                      <th className="text-left px-4 py-3 text-xs font-semibold text-text-secondary uppercase tracking-wide">Code</th>
                      <th className="text-left px-4 py-3 text-xs font-semibold text-text-secondary uppercase tracking-wide">Title</th>
                      <th className="text-left px-4 py-3 text-xs font-semibold text-text-secondary uppercase tracking-wide">ERP</th>
                      <th className="text-left px-4 py-3 text-xs font-semibold text-text-secondary uppercase tracking-wide">Type</th>
                      <th className="text-left px-4 py-3 text-xs font-semibold text-text-secondary uppercase tracking-wide">Planned Date</th>
                      <th className="text-left px-4 py-3 text-xs font-semibold text-text-secondary uppercase tracking-wide">Status</th>
                      <th className="text-center px-4 py-3 text-xs font-semibold text-text-secondary uppercase tracking-wide">Participants</th>
                      <th className="text-center px-4 py-3 text-xs font-semibold text-text-secondary uppercase tracking-wide">Obs</th>
                      <th className="text-center px-4 py-3 text-xs font-semibold text-text-secondary uppercase tracking-wide">Actions</th>
                      <th className="text-center px-4 py-3 text-xs font-semibold text-text-secondary uppercase tracking-wide">Score</th>
                      <th className="text-center px-4 py-3 text-xs font-semibold text-text-secondary uppercase tracking-wide w-28" />
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {drills.map(d => {
                      const isOverdue = d.status === 'Planned' && d.planned_date && new Date(d.planned_date) < new Date();
                      const isClosed = d.status === 'Closed';
                      return (
                        <tr
                          key={d.id}
                          className={`hover:bg-canvas/50 transition-colors cursor-pointer ${
                            isOverdue ? 'border-l-2 border-danger-500 bg-danger-50/30' :
                            isClosed ? 'opacity-60' : ''
                          }`}
                          onClick={() => handleViewDrill(d.id)}
                        >
                          <td className="px-4 py-3 font-mono text-xs font-semibold text-primary-700">{d.drill_code}</td>
                          <td className="px-4 py-3 text-text-primary font-medium truncate max-w-[180px]">{d.title}</td>
                          <td className="px-4 py-3 text-text-secondary text-xs truncate max-w-[120px]">{d.erp?.erp_code || '—'}</td>
                          <td className="px-4 py-3 text-text-secondary text-xs">{d.drill_type}</td>
                          <td className="px-4 py-3 text-text-secondary whitespace-nowrap text-xs">
                            {d.planned_date || '—'}
                            {isOverdue && (
                              <span className="ml-1.5 text-[10px] font-semibold text-danger-600 uppercase">Overdue</span>
                            )}
                          </td>
                          <td className="px-4 py-3"><DrillStatusBadge status={d.status} /></td>
                          <td className="px-4 py-3 text-center text-text-secondary text-xs">{d.participant_count ?? '—'}</td>
                          <td className="px-4 py-3 text-center text-text-secondary text-xs">{d.observation_count ?? 0}</td>
                          <td className="px-4 py-3 text-center text-text-secondary text-xs">{d.action_count ?? 0}</td>
                          <td className="px-4 py-3 text-center">
                            {d.score != null ? (
                              <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-semibold ${
                                d.score >= 80 ? 'bg-green-100 text-green-700' :
                                d.score >= 60 ? 'bg-amber-100 text-amber-700' :
                                'bg-red-100 text-red-700'
                              }`}>
                                {d.score}%
                              </span>
                            ) : (
                              <span className="text-text-tertiary text-xs">—</span>
                            )}
                          </td>
                          <td className="px-4 py-3 text-center">
                            <div className="flex items-center justify-center gap-1 table-actions">
                              <button
                                onClick={e => { e.stopPropagation(); handleViewDrill(d.id); }}
                                className="action-btn action-btn--view"
                                title="View"
                              >
                                <Eye size={15} />
                              </button>
                              {canManage && (
                                <>
                                  <button
                                    onClick={e => { e.stopPropagation(); handleEditDrill(d as unknown as Record<string, unknown>); }}
                                    className="action-btn action-btn--edit"
                                    title="Edit"
                                  >
                                    <Pencil size={15} />
                                  </button>
                                  <button
                                    onClick={e => { e.stopPropagation(); setDeletingDrill({ id: d.id, title: d.title || d.drill_code }); }}
                                    className="action-btn action-btn--delete"
                                    title="Delete"
                                  >
                                    <Trash2 size={15} />
                                  </button>
                                </>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Pagination */}
              <div className="flex items-center justify-between px-4 py-3 border-t border-border bg-canvas/50">
                <p className="text-xs text-text-secondary">
                  Showing {((page - 1) * 20) + 1}–{Math.min(page * 20, total)} of {total}
                </p>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => updateFilter('page', page - 1)}
                    disabled={page <= 1}
                    className="p-1.5 rounded-lg text-text-tertiary hover:text-text-primary hover:bg-canvas disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                  >
                    <ChevronLeft size={16} />
                  </button>
                  <span className="px-2 text-xs font-medium text-text-secondary">{page} / {lastPage}</span>
                  <button
                    onClick={() => updateFilter('page', page + 1)}
                    disabled={page >= lastPage}
                    className="p-1.5 rounded-lg text-text-tertiary hover:text-text-primary hover:bg-canvas disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                  >
                    <ChevronRight size={16} />
                  </button>
                </div>
              </div>
            </div>
          )}
        </>
      )}

      {/* ── Planner Tab ──────────────────────────── */}
      {tab === 'planner' && (
        <DrillPlanner />
      )}

      {/* ── Open Actions Tab ─────────────────────── */}
      {tab === 'actions' && (
        <div className="space-y-4">
          <div className="bg-surface rounded-xl border border-border overflow-hidden">
            {isStatsLoading ? (
              <div className="p-8 text-center text-text-secondary">Loading actions...</div>
            ) : !openActions.length ? (
              <div className="p-12 text-center">
                <p className="text-text-secondary text-sm">No open actions</p>
                <p className="text-text-tertiary text-xs mt-1">All corrective actions have been resolved</p>
              </div>
            ) : (
              <>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="bg-canvas border-b border-border">
                        <th className="text-left px-4 py-3 text-xs font-semibold text-text-secondary uppercase tracking-wide">Drill Code</th>
                        <th className="text-left px-4 py-3 text-xs font-semibold text-text-secondary uppercase tracking-wide">Action Title</th>
                        <th className="text-left px-4 py-3 text-xs font-semibold text-text-secondary uppercase tracking-wide">Assigned To</th>
                        <th className="text-left px-4 py-3 text-xs font-semibold text-text-secondary uppercase tracking-wide">Due Date</th>
                        <th className="text-left px-4 py-3 text-xs font-semibold text-text-secondary uppercase tracking-wide">Priority</th>
                        <th className="text-left px-4 py-3 text-xs font-semibold text-text-secondary uppercase tracking-wide">Status</th>
                        <th className="text-center px-4 py-3 text-xs font-semibold text-text-secondary uppercase tracking-wide w-16" />
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {openActions.map((a: Record<string, unknown>) => {
                        const isActionOverdue = a.due_date && new Date(a.due_date as string) < new Date() && a.status !== 'Completed';
                        return (
                          <tr
                            key={a.id as string}
                            className={`hover:bg-canvas/50 transition-colors cursor-pointer ${
                              isActionOverdue ? 'border-l-2 border-danger-500 bg-danger-50/30' : ''
                            }`}
                            onClick={() => handleViewDrill(a.drill_id as string)}
                          >
                            <td className="px-4 py-3 font-mono text-xs font-semibold text-primary-700">{a.drill_code as string}</td>
                            <td className="px-4 py-3 text-text-primary font-medium truncate max-w-[200px]">{a.title as string}</td>
                            <td className="px-4 py-3 text-text-secondary text-xs">{(a.assigned_to_name as string) || '—'}</td>
                            <td className="px-4 py-3 text-text-secondary whitespace-nowrap text-xs">
                              {(a.due_date as string) || '—'}
                              {isActionOverdue && (
                                <span className="ml-1.5 text-[10px] font-semibold text-danger-600 uppercase">Overdue</span>
                              )}
                            </td>
                            <td className="px-4 py-3">
                              <span className={`inline-block px-2 py-0.5 rounded-full text-xs ${
                                a.priority === 'Critical' ? 'bg-red-200 text-red-800 font-semibold' :
                                a.priority === 'High' ? 'bg-red-100 text-red-700' :
                                a.priority === 'Medium' ? 'bg-amber-100 text-amber-700' :
                                'bg-blue-100 text-blue-700'
                              }`}>
                                {a.priority as string}
                              </span>
                            </td>
                            <td className="px-4 py-3">
                              <span className={`inline-flex items-center gap-1.5 px-2.5 py-[3px] rounded-full text-[11px] font-medium ${
                                a.status === 'Overdue' ? 'bg-red-100 text-red-700' :
                                a.status === 'In Progress' ? 'bg-amber-100 text-amber-700' :
                                'bg-blue-100 text-blue-700'
                              }`}>
                                {a.status as string}
                              </span>
                            </td>
                            <td className="px-4 py-3 text-center">
                              <button
                                onClick={e => { e.stopPropagation(); handleViewDrill(a.drill_id as string); }}
                                className="action-btn action-btn--view"
                                title="View drill"
                              >
                                <Eye size={15} />
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
                <div className="px-4 py-3 border-t border-border bg-canvas/50">
                  <p className="text-xs text-text-secondary">
                    {openActions.length} open / overdue action{openActions.length !== 1 ? 's' : ''}
                  </p>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* ── ERP Register Tab ─────────────────────── */}
      {tab === 'erp' && (
        <>
          {/* ERP Filters */}
          <div className="bg-surface rounded-xl border border-border p-4 space-y-3">
            <div className="flex items-center justify-between">
              <div className="relative flex-1 max-w-sm">
                <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-tertiary" />
                <input
                  type="text"
                  value={erpFilters.search}
                  onChange={e => updateErpFilter('search', e.target.value)}
                  placeholder="Search ERPs..."
                  className="input-field w-full pl-9 py-2 text-sm"
                />
              </div>
              {erpFiltersActive && (
                <button onClick={resetErpFilters} className="text-xs text-danger-600 hover:underline flex items-center gap-1">
                  <XIcon size={12} /> Clear all
                </button>
              )}
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
              <select
                value={erpFilters.erp_type}
                onChange={e => updateErpFilter('erp_type', e.target.value)}
                className="input-field text-sm"
              >
                <option value="">All Types</option>
                {['Fire', 'Evacuation', 'Chemical Spill', 'Medical Emergency', 'Natural Disaster', 'Confined Space', 'Other'].map(t => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </select>

              <select
                value={erpFilters.status}
                onChange={e => updateErpFilter('status', e.target.value)}
                className="input-field text-sm"
              >
                <option value="">All Status</option>
                {['Draft', 'Active', 'Under Review', 'Obsolete'].map(s => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
            </div>
          </div>

          {/* ERP Table */}
          {isErpsLoading ? (
            <div className="bg-surface rounded-xl border border-border overflow-hidden">
              <div className="p-8 text-center text-text-secondary">Loading ERPs...</div>
            </div>
          ) : !erps.length ? (
            <div className="bg-surface rounded-xl border border-border overflow-hidden">
              <div className="p-12 text-center">
                <p className="text-text-secondary text-sm">No ERPs found</p>
                <p className="text-text-tertiary text-xs mt-1">Create your first Emergency Response Plan to get started</p>
              </div>
            </div>
          ) : (
            <div className="bg-surface rounded-xl border border-border overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-canvas border-b border-border">
                      <th className="text-left px-4 py-3 text-xs font-semibold text-text-secondary uppercase tracking-wide">ERP Code</th>
                      <th className="text-left px-4 py-3 text-xs font-semibold text-text-secondary uppercase tracking-wide">Title</th>
                      <th className="text-left px-4 py-3 text-xs font-semibold text-text-secondary uppercase tracking-wide">Type</th>
                      <th className="text-left px-4 py-3 text-xs font-semibold text-text-secondary uppercase tracking-wide">Status</th>
                      <th className="text-left px-4 py-3 text-xs font-semibold text-text-secondary uppercase tracking-wide">Risk Level</th>
                      <th className="text-left px-4 py-3 text-xs font-semibold text-text-secondary uppercase tracking-wide">Site</th>
                      <th className="text-center px-4 py-3 text-xs font-semibold text-text-secondary uppercase tracking-wide">Drills</th>
                      <th className="text-left px-4 py-3 text-xs font-semibold text-text-secondary uppercase tracking-wide">Review Date</th>
                      <th className="text-center px-4 py-3 text-xs font-semibold text-text-secondary uppercase tracking-wide w-16" />
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {erps.map(e => (
                      <tr
                        key={e.id}
                        className="hover:bg-canvas/50 transition-colors cursor-pointer"
                        onClick={() => handleViewErp(e.id)}
                      >
                        <td className="px-4 py-3 font-mono text-xs font-semibold text-primary-700">{e.erp_code}</td>
                        <td className="px-4 py-3 text-text-primary font-medium truncate max-w-[200px]">{e.title}</td>
                        <td className="px-4 py-3 text-text-secondary text-xs">{e.erp_type}</td>
                        <td className="px-4 py-3"><ErpStatusBadge status={e.status} /></td>
                        <td className="px-4 py-3">
                          <span className={`inline-block px-2 py-0.5 rounded-full text-xs ${
                            e.risk_level === 'Critical' ? 'bg-red-200 text-red-800 font-semibold' :
                            e.risk_level === 'High' ? 'bg-red-100 text-red-700' :
                            e.risk_level === 'Medium' ? 'bg-amber-100 text-amber-700' :
                            'bg-blue-100 text-blue-700'
                          }`}>
                            {e.risk_level}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-text-secondary text-xs truncate max-w-[120px]">{e.site || '—'}</td>
                        <td className="px-4 py-3 text-center text-text-secondary text-xs">{(e as Record<string, unknown>).drills_count as number ?? 0}</td>
                        <td className="px-4 py-3 text-text-secondary whitespace-nowrap text-xs">
                          {e.next_review_date || e.review_date || '—'}
                        </td>
                        <td className="px-4 py-3 text-center">
                          <button
                            onClick={ev => { ev.stopPropagation(); handleViewErp(e.id); }}
                            className="action-btn action-btn--view"
                            title="View details"
                          >
                            <Eye size={15} />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* ERP Pagination */}
              <div className="flex items-center justify-between px-4 py-3 border-t border-border bg-canvas/50">
                <p className="text-xs text-text-secondary">
                  Showing {((erpPage - 1) * 20) + 1}–{Math.min(erpPage * 20, erpTotal)} of {erpTotal}
                </p>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => updateErpFilter('page', erpPage - 1)}
                    disabled={erpPage <= 1}
                    className="p-1.5 rounded-lg text-text-tertiary hover:text-text-primary hover:bg-canvas disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                  >
                    <ChevronLeft size={16} />
                  </button>
                  <span className="px-2 text-xs font-medium text-text-secondary">{erpPage} / {erpLastPage}</span>
                  <button
                    onClick={() => updateErpFilter('page', erpPage + 1)}
                    disabled={erpPage >= erpLastPage}
                    className="p-1.5 rounded-lg text-text-tertiary hover:text-text-primary hover:bg-canvas disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                  >
                    <ChevronRight size={16} />
                  </button>
                </div>
              </div>
            </div>
          )}
        </>
      )}

      {/* ── Analytics Tab ────────────────────────── */}
      {tab === 'analytics' && (
        <DrillAnalytics />
      )}

      {/* ── Drill Form Modal (Create) ────────────── */}
      {showDrillForm && (
        <DrillForm
          open={showDrillForm}
          onClose={() => setShowDrillForm(false)}
          onSubmit={handleCreateDrill}
          isSubmitting={isCreating}
          erps={erps}
        />
      )}

      {/* ── Drill Form Modal (Edit) ──────────────── */}
      {editingDrill && (
        <DrillForm
          open={!!editingDrill}
          onClose={() => setEditingDrill(null)}
          onSubmit={handleUpdateDrill}
          isSubmitting={isUpdating}
          initialData={editingDrill}
          erps={erps}
        />
      )}

      {/* ── Delete Confirmation Modal ────────────── */}
      <TypedDeleteConfirmModal
        open={!!deletingDrill}
        onClose={() => setDeletingDrill(null)}
        onConfirm={handleDeleteDrill}
        title="Delete Drill"
        itemName={deletingDrill?.title ?? ''}
        itemType="drill"
        loading={isDeleting}
      />

      {/* ── ERP Form Modal ───────────────────────── */}
      {showErpForm && (
        <ErpForm
          open={showErpForm}
          onClose={() => setShowErpForm(false)}
          onSubmit={handleCreateErp}
          isSubmitting={isErpCreating}
        />
      )}

      {/* ── Drill Detail Drawer ──────────────────── */}
      {selectedId && (
        <DrillDetail
          drill={selectedDrill}
          isLoading={isDetailLoading}
          onClose={handleCloseDrillDetail}
          onUpdate={(id, data) => update({ id, data })}
          isUpdating={isUpdating}
        />
      )}

      {/* ── ERP Detail Drawer ────────────────────── */}
      {selectedErpId && (
        <ErpDetail
          erp={selectedErp}
          isLoading={isErpDetailLoading}
          onClose={handleCloseErpDetail}
        />
      )}
    </div>
  );
}
