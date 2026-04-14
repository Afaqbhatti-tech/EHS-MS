import React, { useState, useCallback, useMemo, useRef } from 'react';
import {
  Megaphone, Plus, RefreshCw, List, BarChart3, LayoutGrid,
  AlertTriangle, Search, X, ChevronLeft, ChevronRight, Eye,
  Clock, Users, TrendingUp, Activity, CheckCircle, Target,
  Pencil, Trash2, ArrowLeft, CalendarRange, FileText,
  CircleDot, Zap, ClipboardList,
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { CARD_VIEW_PER_PAGE } from '../../utils/fetchAllPages';
import { useCampaigns } from './hooks/useCampaigns';
import type { Campaign, CampaignAction, CampaignLog } from './hooks/useCampaigns';
import {
  CAMPAIGN_TYPES, CAMPAIGN_STATUSES, FREQUENCY_OPTIONS,
  getTopicOptions, getTopicList,
} from '../../config/campaignConfig';
import ExportDropdown from '../../components/ui/ExportDropdown';
import SelectWithOther from '../../components/ui/SelectWithOther';
import TypedDeleteConfirmModal from '../../components/ui/TypedDeleteConfirmModal';
import { useToast } from '../../components/ui/Toast';
import './CampaignsPage.css';

type Tab = 'register' | 'active' | 'actions' | 'analytics';
type ViewMode = 'table' | 'cards';
type DetailTab = 'overview' | 'activities' | 'participants' | 'evidence' | 'actions' | 'results' | 'history';

// ─── Status badge ────────────────────────────────

const campaignStatusStyles: Record<string, { cls: string; dot: string; pulse?: boolean }> = {
  Draft:     { cls: 'bg-neutral-100 text-neutral-700', dot: 'bg-neutral-400' },
  Planned:   { cls: 'bg-blue-100 text-blue-600',       dot: 'bg-blue-500' },
  Active:    { cls: 'bg-green-100 text-green-700',      dot: 'bg-green-500', pulse: true },
  Completed: { cls: 'bg-[#EDE9FE] text-[#5B21B6]',     dot: 'bg-purple-500' },
  Closed:    { cls: 'bg-neutral-100 text-neutral-500',  dot: 'bg-neutral-400' },
  Cancelled: { cls: 'bg-red-100 text-red-700',          dot: 'bg-red-500' },
};

function CampaignStatusBadge({ status }: { status: string }) {
  const style = campaignStatusStyles[status] ?? { cls: 'bg-neutral-100 text-neutral-600', dot: 'bg-neutral-400' };
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-[3px] rounded-full text-[11px] font-medium leading-tight ${style.cls}`}>
      <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${style.dot} ${style.pulse ? 'animate-pulse' : ''}`} />
      {status}
    </span>
  );
}

// ─── Priority badge ──────────────────────────────

function PriorityBadge({ priority }: { priority: string }) {
  const cls =
    priority === 'Critical' ? 'bg-red-200 text-red-800 font-semibold' :
    priority === 'High' ? 'bg-red-100 text-red-700' :
    priority === 'Medium' ? 'bg-amber-100 text-amber-700' :
    'bg-blue-100 text-blue-700';
  return <span className={`inline-block px-2 py-0.5 rounded-full text-xs ${cls}`}>{priority}</span>;
}

// ─── Action status badge ─────────────────────────

function ActionStatusBadge({ status }: { status: string }) {
  const cls =
    status === 'Overdue' ? 'bg-red-100 text-red-700' :
    status === 'In Progress' ? 'bg-amber-100 text-amber-700' :
    status === 'Completed' ? 'bg-green-100 text-green-700' :
    'bg-blue-100 text-blue-700';
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-[3px] rounded-full text-[11px] font-medium ${cls}`}>
      {status}
    </span>
  );
}

// ─── KPI Card ────────────────────────────────────

function KPICard({ icon: Icon, label, value, color, delay, pulse }: {
  icon: React.ElementType; label: string; value: string | number; color: string; delay: number; pulse?: boolean;
}) {
  const shouldPulse = pulse && value > 0;
  return (
    <div
      className={`std-kpi-card${shouldPulse ? ' std-kpi-card--pulse' : ''}`}
      style={{ animationDelay: `${delay}ms`, borderLeft: `3px solid ${color}` }}
    >
      <div className="std-kpi-card__label">
        <Icon size={14} style={{ color }} />
        {label}
      </div>
      <div className="std-kpi-card__value" style={{ color }}>
        {value}
      </div>
    </div>
  );
}

// ─── Period chip ─────────────────────────────────

function PeriodChip({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className={`px-3 py-1.5 text-xs font-medium rounded-full border transition-colors ${
        active
          ? 'bg-primary-50 text-primary-700 border-primary-300'
          : 'bg-surface text-text-secondary border-border hover:bg-surface-sunken'
      }`}
    >
      {label}
    </button>
  );
}

// ─── Date formatter ─────────────────────────────

function fmtDate(raw?: string | null): string {
  if (!raw) return '--';
  const d = new Date(raw);
  if (isNaN(d.getTime())) return raw;
  return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
}

// ─── Main Component ──────────────────────────────

export default function CampaignsPage() {
  const { hasPermission } = useAuth();
  const toast = useToast();

  const {
    campaigns, total, page, lastPage, isLoading,
    stats, isStatsLoading,
    selectedCampaign, isDetailLoading,
    filters, updateFilter, resetFilters, setFilters,
    selectedId, setSelectedId,
    create, update, destroy,
    isCreating, isUpdating,
    exportCampaigns,
    refresh, isRefreshing,
  } = useCampaigns();

  const [tab, setTab] = useState<Tab>('register');
  const [viewMode, setViewModeState] = useState<ViewMode>('table');
  const savedTablePageRef = useRef(1);
  const handleViewModeChange = (mode: ViewMode) => {
    if (viewMode === 'table' && mode === 'cards') {
      savedTablePageRef.current = filters.page || 1;
    }
    setViewModeState(mode);
    setFilters(prev => ({
      ...prev,
      per_page: mode === 'cards' ? CARD_VIEW_PER_PAGE : 20,
      page: mode === 'cards' ? 1 : savedTablePageRef.current,
    }));
  };
  const [showForm, setShowForm] = useState(false);
  const [editingCampaign, setEditingCampaign] = useState<Campaign | null>(null);
  const [deletingCampaign, setDeletingCampaign] = useState<{ id: number; title: string } | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [detailTab, setDetailTab] = useState<DetailTab>('overview');

  // ─── Form state ──────────────────────────────
  const emptyForm = {
    title: '', campaign_type: '', topic: '', description: '', objective: '',
    start_date: '', end_date: '', frequency: 'One-Time',
    owner_name: '', conducted_by: '', approved_by: '',
    site: '', project: '', area: '', zone: '', department: '', contractor_name: '',
    target_audience: '', expected_participants: '',
    notes: '',
  };
  const [formData, setFormData] = useState(emptyForm);

  const canManage = hasPermission('can_manage_campaigns') || hasPermission('can_access_campaigns');
  const canExport = hasPermission('can_export_reports') || hasPermission('can_access_campaigns');

  // ─── Derived data ────────────────────────────

  const kpis = stats?.kpis;
  const activeNowCount = kpis?.active_now ?? 0;
  const openActionsCount = kpis?.open_actions ?? 0;

  const openActionsList = useMemo(() => {
    return stats?.open_actions_list ?? [];
  }, [stats]);

  // ─── Handlers ────────────────────────────────

  const handleOpenCreateForm = useCallback(() => {
    setFormData(emptyForm);
    setEditingCampaign(null);
    setShowForm(true);
  }, []);

  const handleOpenEditForm = useCallback((c: Campaign) => {
    setFormData({
      title: c.title || '',
      campaign_type: c.campaign_type || '',
      topic: c.topic || '',
      description: c.description || '',
      objective: c.objective || '',
      start_date: c.start_date?.split('T')[0] || '',
      end_date: c.end_date?.split('T')[0] || '',
      frequency: c.frequency || 'One-Time',
      owner_name: c.owner_name || '',
      conducted_by: c.conducted_by || '',
      approved_by: c.approved_by || '',
      site: c.site || '',
      project: c.project || '',
      area: c.area || '',
      zone: c.zone || '',
      department: c.department || '',
      contractor_name: c.contractor_name || '',
      target_audience: c.target_audience || '',
      expected_participants: c.expected_participants != null ? String(c.expected_participants) : '',
      notes: c.notes || '',
    });
    setEditingCampaign(c);
    setShowForm(true);
  }, []);

  const handleFormChange = useCallback((field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  }, []);

  const handleSave = useCallback(async (status: string) => {
    try {
      const payload: Record<string, unknown> = {
        ...formData,
        status,
        expected_participants: formData.expected_participants ? Number(formData.expected_participants) : null,
      };

      if (editingCampaign) {
        await update({ id: editingCampaign.id, data: payload });
      } else {
        await create(payload);
      }
      setShowForm(false);
      setEditingCampaign(null);
      setFormData(emptyForm);
    } catch (err: any) {
      toast.error(err.message || 'An error occurred while saving the campaign');
    }
  }, [formData, editingCampaign, create, update]);

  const handleExport = useCallback(async (format: string) => {
    if (isExporting) return;
    if (!total && format !== 'print') {
      toast.warning('No data to export');
      return;
    }
    setIsExporting(true);
    try {
      await exportCampaigns(format);
    } catch (err: any) {
      toast.error(err.message || 'Failed to export campaigns');
    } finally {
      setIsExporting(false);
    }
  }, [exportCampaigns, toast, isExporting, total]);

  const handleViewCampaign = useCallback((id: number) => {
    setSelectedId(id);
    setDetailTab('overview');
  }, [setSelectedId]);

  const handleCloseDetail = useCallback(() => setSelectedId(null), [setSelectedId]);

  const handleDelete = useCallback(async () => {
    if (!deletingCampaign) return;
    setIsDeleting(true);
    try {
      await destroy(deletingCampaign.id);
      setDeletingCampaign(null);
      toast.success('Campaign deleted successfully');
    } catch (err: any) {
      toast.error(err.message || 'Failed to delete campaign');
    } finally {
      setIsDeleting(false);
    }
  }, [deletingCampaign, destroy, toast]);

  // ─── Filter bar helpers ──────────────────────

  const filtersActive = filters.search || filters.status || filters.campaign_type || filters.topic || filters.period || filters.date_from || filters.date_to;

  // ─── Period helper ───────────────────────────

  const handlePeriod = useCallback((period: string) => {
    updateFilter('period', filters.period === period ? '' : period);
  }, [filters.period, updateFilter]);

  // ─── Tab config ──────────────────────────────

  const TABS: { key: Tab; label: string; icon: typeof List; badge?: number }[] = [
    { key: 'register', label: 'Campaign Register', icon: List },
    { key: 'active', label: `Active (${activeNowCount})`, icon: Zap },
    { key: 'actions', label: `Open Actions (${openActionsCount})`, icon: AlertTriangle, badge: openActionsCount },
    { key: 'analytics', label: 'Analytics', icon: BarChart3 },
  ];

  // ─── Topic dropdown helper ───────────────────

  const topicGroups = useMemo(() => getTopicOptions(), []);
  const allTopics = useMemo(() => getTopicList(), []);

  // ─── Detail view ─────────────────────────────

  if (selectedId) {
    const c = selectedCampaign;

    const DETAIL_TABS: { key: DetailTab; label: string }[] = [
      { key: 'overview', label: 'Overview' },
      { key: 'activities', label: `Activities (${c?.activities?.length ?? 0})` },
      { key: 'participants', label: `Participants (${c?.participants?.length ?? 0})` },
      { key: 'evidence', label: `Evidence (${c?.evidence?.length ?? 0})` },
      { key: 'actions', label: `Actions (${c?.actions?.length ?? 0})` },
      { key: 'results', label: 'Results' },
      { key: 'history', label: 'History' },
    ];

    return (
      <div className="space-y-4">
        {/* Back button + header */}
        <div className="flex items-center gap-3">
          <button
            onClick={handleCloseDetail}
            className="p-2 rounded-lg text-text-secondary hover:text-text-primary hover:bg-surface-sunken transition-colors"
          >
            <ArrowLeft size={20} />
          </button>
          <div className="flex-1 min-w-0">
            {isDetailLoading ? (
              <div className="space-y-2">
                <div className="skeleton h-5 w-48" />
                <div className="skeleton h-3 w-32" />
              </div>
            ) : c ? (
              <div>
                <div className="flex items-center gap-3">
                  <h1 className="text-xl font-bold text-text-primary truncate">{c.title}</h1>
                  <CampaignStatusBadge status={c.status} />
                </div>
                <p className="text-xs text-text-secondary mt-0.5">
                  <span className="font-mono font-semibold text-primary-700">{c.campaign_code}</span>
                  <span className="mx-2 text-border">|</span>
                  {c.campaign_type}
                  <span className="mx-2 text-border">|</span>
                  {c.topic}
                </p>
              </div>
            ) : (
              <p className="text-sm text-text-secondary">Campaign not found</p>
            )}
          </div>
          {c && canManage && (
            <button
              onClick={() => handleOpenEditForm(c)}
              className="btn-secondary px-3 py-2 text-sm rounded-lg flex items-center gap-2"
            >
              <Pencil size={14} /> Edit
            </button>
          )}
        </div>

        {/* Detail tabs */}
        {c && (
          <>
            <div className="flex items-center gap-1 border-b border-border overflow-x-auto">
              {DETAIL_TABS.map(t => (
                <button
                  key={t.key}
                  onClick={() => setDetailTab(t.key)}
                  className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
                    detailTab === t.key
                      ? 'border-primary-500 text-primary-700'
                      : 'border-transparent text-text-secondary hover:text-text-primary'
                  }`}
                >
                  {t.label}
                </button>
              ))}
            </div>

            {/* Overview tab */}
            {detailTab === 'overview' && (
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                {/* Left: Info card */}
                <div className="lg:col-span-2 bg-surface border border-border rounded-[var(--radius-lg)] p-5 space-y-4">
                  <h3 className="text-sm font-semibold text-text-primary">Campaign Details</h3>

                  <div className="grid grid-cols-2 gap-x-6 gap-y-3 text-sm">
                    <div>
                      <span className="text-text-tertiary text-xs uppercase tracking-wide">Type</span>
                      <p className="font-medium text-text-primary">{c.campaign_type}</p>
                    </div>
                    <div>
                      <span className="text-text-tertiary text-xs uppercase tracking-wide">Topic</span>
                      <p className="font-medium text-text-primary">{c.topic}</p>
                    </div>
                    <div>
                      <span className="text-text-tertiary text-xs uppercase tracking-wide">Start Date</span>
                      <p className="font-medium text-text-primary">{fmtDate(c.start_date)}</p>
                    </div>
                    <div>
                      <span className="text-text-tertiary text-xs uppercase tracking-wide">End Date</span>
                      <p className="font-medium text-text-primary">{fmtDate(c.end_date)}</p>
                    </div>
                    <div>
                      <span className="text-text-tertiary text-xs uppercase tracking-wide">Frequency</span>
                      <p className="font-medium text-text-primary">{c.frequency}</p>
                    </div>
                    <div>
                      <span className="text-text-tertiary text-xs uppercase tracking-wide">Duration</span>
                      <p className="font-medium text-text-primary">{c.duration_formatted || (c.duration_days ? `${c.duration_days} days` : '--')}</p>
                    </div>
                    <div>
                      <span className="text-text-tertiary text-xs uppercase tracking-wide">Owner</span>
                      <p className="font-medium text-text-primary">{c.owner_name || c.owner?.full_name || '--'}</p>
                    </div>
                    <div>
                      <span className="text-text-tertiary text-xs uppercase tracking-wide">Conducted By</span>
                      <p className="font-medium text-text-primary">{c.conducted_by || '--'}</p>
                    </div>
                    <div>
                      <span className="text-text-tertiary text-xs uppercase tracking-wide">Site / Project</span>
                      <p className="font-medium text-text-primary">{[c.site, c.project].filter(Boolean).join(' / ') || '--'}</p>
                    </div>
                    <div>
                      <span className="text-text-tertiary text-xs uppercase tracking-wide">Area / Zone</span>
                      <p className="font-medium text-text-primary">{[c.area, c.zone].filter(Boolean).join(' / ') || '--'}</p>
                    </div>
                    <div>
                      <span className="text-text-tertiary text-xs uppercase tracking-wide">Department</span>
                      <p className="font-medium text-text-primary">{c.department || '--'}</p>
                    </div>
                    <div>
                      <span className="text-text-tertiary text-xs uppercase tracking-wide">Contractor</span>
                      <p className="font-medium text-text-primary">{c.contractor_name || '--'}</p>
                    </div>
                    <div>
                      <span className="text-text-tertiary text-xs uppercase tracking-wide">Target Audience</span>
                      <p className="font-medium text-text-primary">{c.target_audience || '--'}</p>
                    </div>
                    <div>
                      <span className="text-text-tertiary text-xs uppercase tracking-wide">Expected Participants</span>
                      <p className="font-medium text-text-primary">{c.expected_participants ?? '--'}</p>
                    </div>
                  </div>

                  {c.description && (
                    <div>
                      <span className="text-text-tertiary text-xs uppercase tracking-wide">Description</span>
                      <p className="text-sm text-text-secondary mt-1 whitespace-pre-line">{c.description}</p>
                    </div>
                  )}

                  {c.objective && (
                    <div>
                      <span className="text-text-tertiary text-xs uppercase tracking-wide">Objective</span>
                      <p className="text-sm text-text-secondary mt-1 whitespace-pre-line">{c.objective}</p>
                    </div>
                  )}

                  {c.notes && (
                    <div>
                      <span className="text-text-tertiary text-xs uppercase tracking-wide">Notes</span>
                      <p className="text-sm text-text-secondary mt-1 whitespace-pre-line">{c.notes}</p>
                    </div>
                  )}
                </div>

                {/* Right: Stats sidebar */}
                <div className="space-y-4">
                  <div className="bg-surface border border-border rounded-[var(--radius-lg)] p-5 space-y-3">
                    <h3 className="text-sm font-semibold text-text-primary">Progress</h3>
                    <div className="space-y-2">
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-text-secondary">Completion</span>
                        <span className="font-bold text-text-primary">{c.completion_percentage}%</span>
                      </div>
                      <div className="w-full h-2 bg-canvas rounded-full overflow-hidden">
                        <div
                          className="h-full rounded-full transition-all duration-500 bg-primary-500"
                          style={{ width: `${Math.min(c.completion_percentage, 100)}%` }}
                        />
                      </div>
                    </div>
                  </div>

                  <div className="bg-surface border border-border rounded-[var(--radius-lg)] p-5 space-y-3">
                    <h3 className="text-sm font-semibold text-text-primary">Counters</h3>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-text-secondary flex items-center gap-2"><Activity size={14} /> Activities</span>
                        <span className="font-semibold text-text-primary">{c.activity_count}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-text-secondary flex items-center gap-2"><Users size={14} /> Participants</span>
                        <span className="font-semibold text-text-primary">{c.participant_count}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-text-secondary flex items-center gap-2"><FileText size={14} /> Evidence</span>
                        <span className="font-semibold text-text-primary">{c.evidence_count}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-text-secondary flex items-center gap-2"><ClipboardList size={14} /> Actions</span>
                        <span className="font-semibold text-text-primary">{c.action_count}</span>
                      </div>
                      {c.open_action_count > 0 && (
                        <div className="flex justify-between">
                          <span className="text-danger-600 flex items-center gap-2"><AlertTriangle size={14} /> Open Actions</span>
                          <span className="font-semibold text-danger-600">{c.open_action_count}</span>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="bg-surface border border-border rounded-[var(--radius-lg)] p-5 space-y-2">
                    <h3 className="text-sm font-semibold text-text-primary">Audit</h3>
                    <div className="text-xs text-text-secondary space-y-1">
                      <p>Created: {new Date(c.created_at).toLocaleDateString()}</p>
                      <p>Updated: {new Date(c.updated_at).toLocaleDateString()}</p>
                      {c.created_by_user && <p>Created by: {c.created_by_user.full_name}</p>}
                      {c.approved_by && <p>Approved by: {c.approved_by}</p>}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Activities tab */}
            {detailTab === 'activities' && (
              <div className="bg-surface border border-border rounded-[var(--radius-lg)] overflow-hidden">
                {!c.activities?.length ? (
                  <div className="p-12 text-center">
                    <p className="text-text-secondary text-sm">No activities recorded</p>
                    <p className="text-text-tertiary text-xs mt-1">Activities will appear here once added to this campaign</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="bg-canvas border-b border-border">
                          <th className="text-left px-4 py-3 text-xs font-semibold text-text-secondary uppercase tracking-wide">Code</th>
                          <th className="text-left px-4 py-3 text-xs font-semibold text-text-secondary uppercase tracking-wide">Title</th>
                          <th className="text-left px-4 py-3 text-xs font-semibold text-text-secondary uppercase tracking-wide">Type</th>
                          <th className="text-left px-4 py-3 text-xs font-semibold text-text-secondary uppercase tracking-wide">Date</th>
                          <th className="text-left px-4 py-3 text-xs font-semibold text-text-secondary uppercase tracking-wide">Conducted By</th>
                          <th className="text-center px-4 py-3 text-xs font-semibold text-text-secondary uppercase tracking-wide">Attendance</th>
                          <th className="text-left px-4 py-3 text-xs font-semibold text-text-secondary uppercase tracking-wide">Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border">
                        {c.activities.map(a => (
                          <tr key={a.id} className="hover:bg-canvas/50 transition-colors">
                            <td className="px-4 py-3 font-mono text-xs font-semibold text-primary-700">{a.activity_code}</td>
                            <td className="px-4 py-3 text-text-primary font-medium truncate max-w-[180px]">{a.title}</td>
                            <td className="px-4 py-3 text-text-secondary text-xs">{a.activity_type}</td>
                            <td className="px-4 py-3 text-text-secondary text-xs whitespace-nowrap">{a.activity_date}</td>
                            <td className="px-4 py-3 text-text-secondary text-xs">{a.conducted_by || '--'}</td>
                            <td className="px-4 py-3 text-center text-text-secondary text-xs">{a.attendance_count}</td>
                            <td className="px-4 py-3"><CampaignStatusBadge status={a.status} /></td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}

            {/* Participants tab */}
            {detailTab === 'participants' && (
              <div className="bg-surface border border-border rounded-[var(--radius-lg)] overflow-hidden">
                {!c.participants?.length ? (
                  <div className="p-12 text-center">
                    <p className="text-text-secondary text-sm">No participants recorded</p>
                    <p className="text-text-tertiary text-xs mt-1">Participants will appear here once added</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="bg-canvas border-b border-border">
                          <th className="text-left px-4 py-3 text-xs font-semibold text-text-secondary uppercase tracking-wide">Name</th>
                          <th className="text-left px-4 py-3 text-xs font-semibold text-text-secondary uppercase tracking-wide">Employee ID</th>
                          <th className="text-left px-4 py-3 text-xs font-semibold text-text-secondary uppercase tracking-wide">Designation</th>
                          <th className="text-left px-4 py-3 text-xs font-semibold text-text-secondary uppercase tracking-wide">Department</th>
                          <th className="text-left px-4 py-3 text-xs font-semibold text-text-secondary uppercase tracking-wide">Type</th>
                          <th className="text-left px-4 py-3 text-xs font-semibold text-text-secondary uppercase tracking-wide">Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border">
                        {c.participants.map(p => (
                          <tr key={p.id} className="hover:bg-canvas/50 transition-colors">
                            <td className="px-4 py-3 text-text-primary font-medium">{p.participant_name}</td>
                            <td className="px-4 py-3 text-text-secondary text-xs font-mono">{p.employee_id || '--'}</td>
                            <td className="px-4 py-3 text-text-secondary text-xs">{p.designation || '--'}</td>
                            <td className="px-4 py-3 text-text-secondary text-xs">{p.department || '--'}</td>
                            <td className="px-4 py-3 text-text-secondary text-xs">{p.participation_type}</td>
                            <td className="px-4 py-3">
                              <span className={`inline-block px-2 py-0.5 rounded-full text-[11px] font-medium ${
                                p.attendance_status === 'Present' ? 'bg-green-100 text-green-700' :
                                p.attendance_status === 'Absent' ? 'bg-red-100 text-red-700' :
                                p.attendance_status === 'Late' ? 'bg-amber-100 text-amber-700' :
                                'bg-neutral-100 text-neutral-600'
                              }`}>
                                {p.attendance_status}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}

            {/* Evidence tab */}
            {detailTab === 'evidence' && (
              <div className="bg-surface border border-border rounded-[var(--radius-lg)] overflow-hidden">
                {!c.evidence?.length ? (
                  <div className="p-12 text-center">
                    <p className="text-text-secondary text-sm">No evidence uploaded</p>
                    <p className="text-text-tertiary text-xs mt-1">Upload photos, documents, or other evidence</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4 p-4">
                    {c.evidence.map(e => (
                      <div key={e.id} className="border border-border rounded-lg p-3 space-y-2 hover:shadow-sm transition-shadow">
                        {e.file_type?.startsWith('image/') ? (
                          <img src={e.url} alt={e.caption || e.original_name || ''} className="w-full h-32 object-cover rounded" />
                        ) : (
                          <div className="w-full h-32 bg-canvas rounded flex items-center justify-center">
                            <FileText size={32} className="text-text-tertiary" />
                          </div>
                        )}
                        <p className="text-xs text-text-primary font-medium truncate">{e.original_name || 'File'}</p>
                        {e.evidence_category && <p className="text-[11px] text-text-tertiary">{e.evidence_category}</p>}
                        {e.caption && <p className="text-[11px] text-text-secondary truncate">{e.caption}</p>}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Actions tab */}
            {detailTab === 'actions' && (
              <div className="bg-surface border border-border rounded-[var(--radius-lg)] overflow-hidden">
                {!c.actions?.length ? (
                  <div className="p-12 text-center">
                    <p className="text-text-secondary text-sm">No actions recorded</p>
                    <p className="text-text-tertiary text-xs mt-1">Corrective actions will appear here once created</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="bg-canvas border-b border-border">
                          <th className="text-left px-4 py-3 text-xs font-semibold text-text-secondary uppercase tracking-wide">Code</th>
                          <th className="text-left px-4 py-3 text-xs font-semibold text-text-secondary uppercase tracking-wide">Title</th>
                          <th className="text-left px-4 py-3 text-xs font-semibold text-text-secondary uppercase tracking-wide">Assigned To</th>
                          <th className="text-left px-4 py-3 text-xs font-semibold text-text-secondary uppercase tracking-wide">Due Date</th>
                          <th className="text-left px-4 py-3 text-xs font-semibold text-text-secondary uppercase tracking-wide">Priority</th>
                          <th className="text-left px-4 py-3 text-xs font-semibold text-text-secondary uppercase tracking-wide">Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border">
                        {c.actions.map((a: CampaignAction) => (
                          <tr key={a.id} className="hover:bg-canvas/50 transition-colors">
                            <td className="px-4 py-3 font-mono text-xs font-semibold text-primary-700">{a.action_code}</td>
                            <td className="px-4 py-3 text-text-primary font-medium truncate max-w-[200px]">{a.title}</td>
                            <td className="px-4 py-3 text-text-secondary text-xs">{a.assigned_to || a.assigned_to_user?.full_name || '--'}</td>
                            <td className="px-4 py-3 text-text-secondary text-xs whitespace-nowrap">{fmtDate(a.due_date)}</td>
                            <td className="px-4 py-3"><PriorityBadge priority={a.priority} /></td>
                            <td className="px-4 py-3"><ActionStatusBadge status={a.status} /></td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}

            {/* Results tab */}
            {detailTab === 'results' && (
              <div className="bg-surface border border-border rounded-[var(--radius-lg)] p-5">
                {!c.result ? (
                  <div className="p-8 text-center">
                    <p className="text-text-secondary text-sm">No results recorded yet</p>
                    <p className="text-text-tertiary text-xs mt-1">Campaign results and evaluation will appear here once completed</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <h3 className="text-sm font-semibold text-text-primary">Campaign Results</h3>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                      <div className="text-center p-3 bg-canvas rounded-lg">
                        <p className="text-2xl font-bold text-text-primary">{c.result.total_activities_conducted}</p>
                        <p className="text-[11px] text-text-tertiary uppercase mt-1">Activities</p>
                      </div>
                      <div className="text-center p-3 bg-canvas rounded-lg">
                        <p className="text-2xl font-bold text-text-primary">{c.result.total_participants}</p>
                        <p className="text-[11px] text-text-tertiary uppercase mt-1">Participants</p>
                      </div>
                      <div className="text-center p-3 bg-canvas rounded-lg">
                        <p className="text-2xl font-bold text-text-primary">{c.result.actions_closed}/{c.result.actions_created}</p>
                        <p className="text-[11px] text-text-tertiary uppercase mt-1">Actions Closed</p>
                      </div>
                      <div className="text-center p-3 bg-canvas rounded-lg">
                        <p className="text-2xl font-bold text-text-primary">{c.result.effectiveness_rating || '--'}</p>
                        <p className="text-[11px] text-text-tertiary uppercase mt-1">Effectiveness</p>
                      </div>
                    </div>
                    {c.result.outcome_summary && (
                      <div>
                        <span className="text-text-tertiary text-xs uppercase tracking-wide">Outcome Summary</span>
                        <p className="text-sm text-text-secondary mt-1 whitespace-pre-line">{c.result.outcome_summary}</p>
                      </div>
                    )}
                    {c.result.lessons_learned && (
                      <div>
                        <span className="text-text-tertiary text-xs uppercase tracking-wide">Lessons Learned</span>
                        <p className="text-sm text-text-secondary mt-1 whitespace-pre-line">{c.result.lessons_learned}</p>
                      </div>
                    )}
                    {c.result.recommendations && (
                      <div>
                        <span className="text-text-tertiary text-xs uppercase tracking-wide">Recommendations</span>
                        <p className="text-sm text-text-secondary mt-1 whitespace-pre-line">{c.result.recommendations}</p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* History tab */}
            {detailTab === 'history' && (
              <div className="bg-surface border border-border rounded-[var(--radius-lg)] overflow-hidden">
                {!c.logs?.length ? (
                  <div className="p-12 text-center">
                    <p className="text-text-secondary text-sm">No history entries</p>
                  </div>
                ) : (
                  <div className="divide-y divide-border">
                    {c.logs.map((log: CampaignLog) => (
                      <div key={log.id} className="px-5 py-3 flex items-start gap-3">
                        <div className="w-2 h-2 rounded-full bg-primary-400 mt-1.5 shrink-0" />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm text-text-primary">
                            <span className="font-medium">{log.action}</span>
                            {log.from_status && log.to_status && (
                              <span className="text-text-secondary">
                                {' '}&mdash; {log.from_status} &rarr; {log.to_status}
                              </span>
                            )}
                          </p>
                          {log.description && <p className="text-xs text-text-secondary mt-0.5">{log.description}</p>}
                          <p className="text-[11px] text-text-tertiary mt-1">
                            {log.performed_by_name || log.performer?.full_name || 'System'}
                            <span className="mx-1.5">&#183;</span>
                            {new Date(log.created_at).toLocaleString()}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </>
        )}
      </div>
    );
  }

  // ─── Main list view ──────────────────────────

  return (
    <div className="space-y-4">
      {/* Page Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-primary-50 text-primary-600">
              <Megaphone size={22} />
            </div>
            <div>
              <h1 className="text-xl font-bold text-text-primary">Campaigns</h1>
              <p className="text-xs text-text-secondary mt-0.5">Safety awareness and compliance initiative management</p>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => refresh()} className="btn-secondary p-2 rounded-lg" title="Refresh" disabled={isRefreshing}>
            <RefreshCw size={16} className={isRefreshing ? 'animate-spin' : ''} />
          </button>
          {canExport && (
            <ExportDropdown onExport={handleExport} disabled={!total || isExporting} />
          )}
          {canManage && (
            <button onClick={handleOpenCreateForm}
              className="env-btn env-btn--primary flex items-center gap-2">
              <Plus size={16} /> New Campaign
            </button>
          )}
        </div>
      </div>

      {/* Tabs */}
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

      {/* ── Campaign Register Tab ───────────────── */}
      {tab === 'register' && (
        <>
          {/* KPI Cards */}
          {isStatsLoading ? (
            <div className="std-kpi-grid">
              {Array.from({ length: 8 }).map((_, i) => (
                <div key={i} className="std-kpi-card" style={{ animationDelay: `${i * 60}ms` }}>
                  <div className="skeleton" style={{ width: 80, height: 12 }} />
                  <div className="skeleton" style={{ width: 48, height: 28, marginTop: 4 }} />
                </div>
              ))}
            </div>
          ) : (
            <div className="std-kpi-grid">
                <KPICard icon={Megaphone} label="Total Campaigns" value={kpis?.total_campaigns ?? 0} color="var(--color-kpi-total)" delay={0} />
                <KPICard icon={Activity} label="Active Now" value={activeNowCount} color="#D97706" delay={60} pulse={activeNowCount > 0} />
                <KPICard icon={CalendarRange} label="Planned" value={kpis?.planned ?? 0} color="#0284C7" delay={120} />
                <KPICard icon={CheckCircle} label="Completed" value={kpis?.completed ?? 0} color="#16A34A" delay={180} />
                <KPICard icon={Users} label="Participants This Month" value={kpis?.participants_this_month ?? 0} color="#6D28D9" delay={240} />
                <KPICard icon={ClipboardList} label="Activities Conducted" value={kpis?.activities_conducted ?? 0} color="#059669" delay={300} />
                <KPICard icon={AlertTriangle} label="Open Actions" value={openActionsCount} color="#DC2626" delay={360} pulse={openActionsCount > 0} />
                <KPICard icon={TrendingUp} label="This Month Started" value={kpis?.campaigns_this_month ?? 0} color="#4F46E5" delay={420} />
            </div>
          )}

          {/* Filter bar */}
          <div className="bg-surface rounded-xl border border-border p-4 space-y-3">
            <div className="flex items-center justify-between">
              <div className="relative flex-1 max-w-sm">
                <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-tertiary" />
                <input
                  type="text"
                  value={filters.search}
                  onChange={e => updateFilter('search', e.target.value)}
                  placeholder="Search campaigns..."
                  className="input-field w-full pl-9 py-2 text-sm"
                />
              </div>
              <div className="flex items-center gap-2">
                {/* View toggle */}
                <div className="flex items-center border border-border rounded-lg overflow-hidden">
                  <button
                    onClick={() => handleViewModeChange('table')}
                    className={`p-1.5 transition-colors ${viewMode === 'table' ? 'bg-primary-50 text-primary-600' : 'text-text-tertiary hover:text-text-primary'}`}
                    title="Table view"
                  >
                    <List size={16} />
                  </button>
                  <button
                    onClick={() => handleViewModeChange('cards')}
                    className={`p-1.5 transition-colors ${viewMode === 'cards' ? 'bg-primary-50 text-primary-600' : 'text-text-tertiary hover:text-text-primary'}`}
                    title="Card view"
                  >
                    <LayoutGrid size={16} />
                  </button>
                </div>
                {filtersActive && (
                  <button onClick={resetFilters} className="text-xs text-danger-600 hover:underline flex items-center gap-1">
                    <X size={12} /> Clear all
                  </button>
                )}
              </div>
            </div>
            <div className="flex items-center gap-3 flex-wrap">
              <select
                value={filters.status}
                onChange={e => updateFilter('status', e.target.value)}
                className="input-field text-sm"
              >
                <option value="">All Status</option>
                {CAMPAIGN_STATUSES.map(s => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>

              <select
                value={filters.campaign_type}
                onChange={e => updateFilter('campaign_type', e.target.value)}
                className="input-field text-sm"
              >
                <option value="">All Types</option>
                {CAMPAIGN_TYPES.map(t => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </select>

              {/* Period chips */}
              <div className="flex items-center gap-1.5">
                <PeriodChip label="Week" active={filters.period === 'week'} onClick={() => handlePeriod('week')} />
                <PeriodChip label="Month" active={filters.period === 'month'} onClick={() => handlePeriod('month')} />
                <PeriodChip label="Year" active={filters.period === 'year'} onClick={() => handlePeriod('year')} />
              </div>

              <select
                value={filters.topic}
                onChange={e => updateFilter('topic', e.target.value)}
                className="input-field text-sm"
              >
                <option value="">All Topics</option>
                {topicGroups.map(g => (
                  <optgroup key={g.group} label={g.group}>
                    {g.options.map(o => (
                      <option key={o} value={o}>{o}</option>
                    ))}
                  </optgroup>
                ))}
              </select>

              <button onClick={resetFilters} className="btn-secondary px-3 py-2 text-sm rounded-lg flex items-center gap-1.5 justify-center">
                <RefreshCw size={14} /> Reset
              </button>
            </div>
          </div>

          {/* Campaign Table / Cards */}
          {isLoading ? (
            <div className="bg-surface rounded-xl border border-border overflow-hidden">
              <div className="p-8 text-center text-text-secondary">Loading campaigns...</div>
            </div>
          ) : !campaigns.length ? (
            <div className="bg-surface rounded-xl border border-border overflow-hidden">
              <div className="p-12 text-center">
                <p className="text-text-secondary text-sm">No campaigns found</p>
                <p className="text-text-tertiary text-xs mt-1">Try adjusting your filters or create a new campaign</p>
              </div>
            </div>
          ) : viewMode === 'table' ? (
            <div className="bg-surface rounded-xl border border-border overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full min-w-[1100px] text-sm">
                  <thead>
                    <tr className="bg-canvas border-b border-border">
                      <th className="text-left px-4 py-3 text-xs font-semibold text-text-secondary uppercase tracking-wide">Campaign</th>
                      <th className="text-left px-4 py-3 text-xs font-semibold text-text-secondary uppercase tracking-wide">Topic</th>
                      <th className="text-left px-4 py-3 text-xs font-semibold text-text-secondary uppercase tracking-wide">Duration</th>
                      <th className="text-left px-4 py-3 text-xs font-semibold text-text-secondary uppercase tracking-wide">Owner</th>
                      <th className="text-left px-4 py-3 text-xs font-semibold text-text-secondary uppercase tracking-wide">Status</th>
                      <th className="text-center px-4 py-3 text-xs font-semibold text-text-secondary uppercase tracking-wide">Progress</th>
                      <th className="text-center px-4 py-3 text-xs font-semibold text-text-secondary uppercase tracking-wide">Open Actions</th>
                      <th className="text-center px-4 py-3 text-xs font-semibold text-text-secondary uppercase tracking-wide">Completion</th>
                      <th className="px-3.5 py-3 text-center text-[11px] font-semibold uppercase tracking-wider text-text-tertiary w-[120px] sticky right-0 bg-canvas z-10">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {campaigns.map(c => {
                      const isActive = c.status === 'Active';
                      const isOverdue = !!c.is_overdue;
                      return (
                        <tr
                          key={c.id}
                          className={`hover:bg-canvas/50 transition-colors cursor-pointer ${
                            isActive ? 'border-l-2 border-green-500' :
                            isOverdue ? 'border-l-2 border-danger-500 bg-danger-50/30' : ''
                          }`}
                          onClick={() => handleViewCampaign(c.id)}
                        >
                          <td className="px-4 py-3">
                            <div>
                              <span className="font-mono text-[11px] font-semibold text-primary-700">{c.campaign_code}</span>
                              <div className="flex items-center gap-2 mt-0.5">
                                <span className="text-text-primary font-medium text-sm truncate max-w-[180px]">{c.title}</span>
                                <span className="shrink-0 inline-block px-1.5 py-0.5 rounded text-[10px] font-medium bg-canvas text-text-tertiary border border-border">{c.campaign_type}</span>
                              </div>
                            </div>
                          </td>
                          <td className="px-4 py-3">
                            <span className="inline-block px-2 py-0.5 rounded-full text-[11px] font-medium bg-blue-50 text-blue-700 border border-blue-200">{c.topic}</span>
                          </td>
                          <td className="px-4 py-3 text-text-secondary whitespace-nowrap text-xs">
                            {c.start_date && c.end_date
                              ? `${fmtDate(c.start_date)} → ${fmtDate(c.end_date)}`
                              : fmtDate(c.start_date)
                            }
                          </td>
                          <td className="px-4 py-3 text-text-secondary text-xs">{c.owner_name || c.owner?.full_name || '--'}</td>
                          <td className="px-4 py-3"><CampaignStatusBadge status={c.status} /></td>
                          <td className="px-4 py-3 text-center text-text-secondary text-xs">
                            <div className="flex items-center justify-center gap-2">
                              <span title="Activities"><Activity size={12} className="inline" /> {c.activity_count}</span>
                              <span title="Participants"><Users size={12} className="inline" /> {c.participant_count}</span>
                            </div>
                          </td>
                          <td className="px-4 py-3 text-center">
                            {c.open_action_count > 0 ? (
                              <span className="inline-block px-2 py-0.5 rounded-full text-[11px] font-bold bg-red-100 text-red-700">{c.open_action_count}</span>
                            ) : (
                              <span className="text-text-tertiary text-xs">0</span>
                            )}
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-2">
                              <div className="flex-1 h-1.5 bg-canvas rounded-full overflow-hidden min-w-[48px]">
                                <div
                                  className="h-full rounded-full bg-primary-500 transition-all duration-300"
                                  style={{ width: `${Math.min(c.completion_percentage, 100)}%` }}
                                />
                              </div>
                              <span className="text-xs font-medium text-text-secondary w-8 text-right">{c.completion_percentage}%</span>
                            </div>
                          </td>
                          <td className="px-3.5 py-3 text-center sticky right-0 bg-surface z-10 shadow-[-4px_0_8px_-4px_rgba(0,0,0,0.08)]" onClick={e => e.stopPropagation()}>
                            <div className="flex items-center justify-center gap-1 table-actions">
                              <button onClick={() => handleViewCampaign(c.id)} className="action-btn action-btn--view" title="View">
                                <Eye size={15} />
                              </button>
                              {canManage && (
                                <>
                                  <button onClick={() => handleOpenEditForm(c)} className="action-btn action-btn--edit" title="Edit">
                                    <Pencil size={15} />
                                  </button>
                                  <button onClick={() => setDeletingCampaign({ id: c.id, title: c.title || c.campaign_code })} className="action-btn action-btn--delete" title="Delete">
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
                  Showing {((page - 1) * 20) + 1}&ndash;{Math.min(page * 20, total)} of {total}
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
          ) : (
            /* Cards view */
            <>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {campaigns.map(c => {
                  const isActive = c.status === 'Active';
                  const isOverdue = !!c.is_overdue;
                  return (
                    <div
                      key={c.id}
                      onClick={() => handleViewCampaign(c.id)}
                      className={`flex flex-col bg-surface border rounded-[var(--radius-lg)] cursor-pointer hover:shadow-md transition-shadow overflow-hidden ${
                        isActive ? 'border-green-300' :
                        isOverdue ? 'border-danger-300 bg-danger-50/20' :
                        'border-border'
                      }`}
                    >
                      <div className="flex-1 flex flex-col p-4 gap-3">
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0">
                            <p className="font-mono text-[11px] font-semibold text-primary-700">{c.campaign_code}</p>
                            <p className="text-sm font-semibold text-text-primary truncate mt-0.5">{c.title}</p>
                          </div>
                          <CampaignStatusBadge status={c.status} />
                        </div>

                        <div className="flex items-center gap-2 flex-wrap min-h-[1.375rem]">
                          <span className="inline-block px-1.5 py-0.5 rounded text-[10px] font-medium bg-canvas text-text-tertiary border border-border">{c.campaign_type}</span>
                          <span className="inline-block px-2 py-0.5 rounded-full text-[10px] font-medium bg-blue-50 text-blue-700 border border-blue-200">{c.topic}</span>
                        </div>

                        <div className="text-xs text-text-secondary space-y-1">
                          <p><CalendarRange size={12} className="inline mr-1" />{fmtDate(c.start_date)} &rarr; {fmtDate(c.end_date)}</p>
                          <p><Users size={12} className="inline mr-1" />{c.owner_name || c.owner?.full_name || 'No owner'}</p>
                        </div>

                        {/* Progress bar + optional alerts - pushed to bottom */}
                        <div className="mt-auto space-y-3">
                          <div>
                            <div className="flex items-center justify-between text-[11px] mb-1">
                              <span className="text-text-tertiary">{c.activity_count} activities / {c.participant_count} participants</span>
                              <span className="font-semibold text-text-primary">{c.completion_percentage}%</span>
                            </div>
                            <div className="w-full h-1.5 bg-canvas rounded-full overflow-hidden">
                              <div
                                className="h-full rounded-full bg-primary-500 transition-all duration-300"
                                style={{ width: `${Math.min(c.completion_percentage, 100)}%` }}
                              />
                            </div>
                          </div>

                          {c.open_action_count > 0 && (
                            <div className="flex items-center gap-1.5 text-xs text-red-600 font-medium">
                              <AlertTriangle size={12} /> {c.open_action_count} open action{c.open_action_count !== 1 ? 's' : ''}
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Card actions - pinned footer */}
                      {canManage && (
                        <div className="shrink-0 flex items-center gap-1 px-4 py-2.5 border-t border-border bg-surface-sunken">
                          <button onClick={e => { e.stopPropagation(); handleOpenEditForm(c); }} className="action-btn action-btn--edit" title="Edit">
                            <Pencil size={15} />
                          </button>
                          <button onClick={e => { e.stopPropagation(); setDeletingCampaign({ id: c.id, title: c.title || c.campaign_code }); }} className="action-btn action-btn--delete" title="Delete">
                            <Trash2 size={15} />
                          </button>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* Cards record count */}
              {total > 0 && (
                <p className="text-xs text-text-secondary mt-3">
                  Showing all {total} campaign{total !== 1 ? 's' : ''}
                </p>
              )}
            </>
          )}
        </>
      )}

      {/* ── Active Tab ────────────────────────────── */}
      {tab === 'active' && (
        <>
          {isLoading ? (
            <div className="bg-surface rounded-xl border border-border overflow-hidden">
              <div className="p-8 text-center text-text-secondary">Loading active campaigns...</div>
            </div>
          ) : (() => {
            const activeCampaigns = campaigns.filter(c => c.status === 'Active' || c.is_active);
            return !activeCampaigns.length ? (
              <div className="bg-surface rounded-xl border border-border overflow-hidden">
                <div className="p-12 text-center">
                  <p className="text-text-secondary text-sm">No active campaigns</p>
                  <p className="text-text-tertiary text-xs mt-1">Campaigns with Active status will appear here</p>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {activeCampaigns.map(c => (
                  <div
                    key={c.id}
                    onClick={() => handleViewCampaign(c.id)}
                    className="flex flex-col bg-surface border border-green-300 rounded-[var(--radius-lg)] cursor-pointer hover:shadow-md transition-shadow overflow-hidden"
                  >
                    <div className="flex-1 flex flex-col p-4 gap-3">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <p className="font-mono text-[11px] font-semibold text-primary-700">{c.campaign_code}</p>
                          <p className="text-sm font-semibold text-text-primary truncate mt-0.5">{c.title}</p>
                        </div>
                        <CampaignStatusBadge status={c.status} />
                      </div>

                      <div className="flex items-center gap-2 flex-wrap min-h-[1.375rem]">
                        <span className="inline-block px-1.5 py-0.5 rounded text-[10px] font-medium bg-canvas text-text-tertiary border border-border">{c.campaign_type}</span>
                        <span className="inline-block px-2 py-0.5 rounded-full text-[10px] font-medium bg-blue-50 text-blue-700 border border-blue-200">{c.topic}</span>
                      </div>

                      <div className="text-xs text-text-secondary space-y-1">
                        <p><CalendarRange size={12} className="inline mr-1" />{fmtDate(c.start_date)} &rarr; {fmtDate(c.end_date)}</p>
                        <p><Users size={12} className="inline mr-1" />{c.owner_name || c.owner?.full_name || 'No owner'}</p>
                      </div>

                      {/* Progress + alerts - pushed to bottom */}
                      <div className="mt-auto space-y-3">
                        <div>
                          <div className="flex items-center justify-between text-[11px] mb-1">
                            <span className="text-text-tertiary">{c.activity_count} activities / {c.participant_count} participants</span>
                            <span className="font-semibold text-text-primary">{c.completion_percentage}%</span>
                          </div>
                          <div className="w-full h-1.5 bg-canvas rounded-full overflow-hidden">
                            <div
                              className="h-full rounded-full bg-green-500 transition-all duration-300"
                              style={{ width: `${Math.min(c.completion_percentage, 100)}%` }}
                            />
                          </div>
                        </div>

                        {c.open_action_count > 0 && (
                          <div className="flex items-center gap-1.5 text-xs text-red-600 font-medium">
                            <AlertTriangle size={12} /> {c.open_action_count} open action{c.open_action_count !== 1 ? 's' : ''}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            );
          })()}
        </>
      )}

      {/* ── Open Actions Tab ──────────────────────── */}
      {tab === 'actions' && (
        <div className="space-y-4">
          <div className="bg-surface rounded-xl border border-border overflow-hidden">
            {isStatsLoading ? (
              <div className="p-8 text-center text-text-secondary">Loading actions...</div>
            ) : !openActionsList.length ? (
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
                        <th className="text-left px-4 py-3 text-xs font-semibold text-text-secondary uppercase tracking-wide">Campaign</th>
                        <th className="text-left px-4 py-3 text-xs font-semibold text-text-secondary uppercase tracking-wide">Action Code</th>
                        <th className="text-left px-4 py-3 text-xs font-semibold text-text-secondary uppercase tracking-wide">Title</th>
                        <th className="text-left px-4 py-3 text-xs font-semibold text-text-secondary uppercase tracking-wide">Assigned To</th>
                        <th className="text-left px-4 py-3 text-xs font-semibold text-text-secondary uppercase tracking-wide">Due Date</th>
                        <th className="text-left px-4 py-3 text-xs font-semibold text-text-secondary uppercase tracking-wide">Priority</th>
                        <th className="text-left px-4 py-3 text-xs font-semibold text-text-secondary uppercase tracking-wide">Status</th>
                        <th className="text-center px-4 py-3 text-xs font-semibold text-text-secondary uppercase tracking-wide w-16" />
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {openActionsList.map(a => {
                        const isActionOverdue = a.due_date && new Date(a.due_date) < new Date() && a.status !== 'Completed';
                        return (
                          <tr
                            key={a.id}
                            className={`hover:bg-canvas/50 transition-colors cursor-pointer ${
                              isActionOverdue ? 'border-l-2 border-danger-500 bg-danger-50/30' : ''
                            }`}
                            onClick={() => handleViewCampaign(a.campaign_id)}
                          >
                            <td className="px-4 py-3">
                              <div>
                                <span className="font-mono text-xs font-semibold text-primary-700">{a.campaign_code}</span>
                                <p className="text-text-secondary text-xs truncate max-w-[150px]">{a.campaign_title}</p>
                              </div>
                            </td>
                            <td className="px-4 py-3 font-mono text-xs font-semibold text-text-primary">{a.action_code}</td>
                            <td className="px-4 py-3 text-text-primary font-medium truncate max-w-[200px]">{a.title}</td>
                            <td className="px-4 py-3 text-text-secondary text-xs">{a.assigned_to || '--'}</td>
                            <td className="px-4 py-3 text-text-secondary whitespace-nowrap text-xs">
                              {fmtDate(a.due_date)}
                              {isActionOverdue && (
                                <span className="ml-1.5 text-[10px] font-semibold text-danger-600 uppercase">Overdue</span>
                              )}
                            </td>
                            <td className="px-4 py-3"><PriorityBadge priority={a.priority} /></td>
                            <td className="px-4 py-3"><ActionStatusBadge status={a.status} /></td>
                            <td className="px-4 py-3 text-center">
                              <button
                                onClick={e => { e.stopPropagation(); handleViewCampaign(a.campaign_id); }}
                                className="action-btn action-btn--view"
                                title="View campaign"
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
                    {openActionsList.length} open / overdue action{openActionsList.length !== 1 ? 's' : ''}
                  </p>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* ── Analytics Tab ─────────────────────────── */}
      {tab === 'analytics' && (
        <div className="cmp-analytics space-y-5">
          {/* Alert strip */}
          {stats && (stats.kpis.open_actions > 0 || stats.kpis.active_now > 0) && (
            <div className="flex flex-wrap gap-2">
              {stats.kpis.active_now > 0 && (
                <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-green-50 border border-green-200 text-[12px] font-medium text-green-700">
                  <Activity size={13} /> {stats.kpis.active_now} campaign(s) running now
                </div>
              )}
              {stats.kpis.open_actions > 0 && (
                <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-amber-50 border border-amber-200 text-[12px] font-medium text-amber-700">
                  <AlertTriangle size={13} /> {stats.kpis.open_actions} open action(s) pending
                </div>
              )}
            </div>
          )}

          {isStatsLoading ? (
            <div className="bg-surface rounded-xl border border-border p-12 text-center text-text-secondary text-[13px]">Loading analytics...</div>
          ) : !stats ? (
            <div className="bg-surface rounded-xl border border-border p-12 text-center text-text-secondary text-[13px]">No data available</div>
          ) : (
            <>
              {/* KPI Summary Row */}
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
                {[
                  { label: 'Total Campaigns', value: stats.kpis.total_campaigns, color: '#2563EB' },
                  { label: 'Active Now', value: stats.kpis.active_now, color: '#059669' },
                  { label: 'Completed', value: stats.kpis.completed, color: '#7C3AED' },
                  { label: 'Participants (Month)', value: stats.kpis.participants_this_month, color: '#0891B2' },
                  { label: 'Activities Conducted', value: stats.kpis.activities_conducted, color: '#D97706' },
                ].map(kpi => (
                  <div key={kpi.label} className="cmp-analytics-kpi bg-surface border border-border rounded-[var(--radius-lg)] p-3.5">
                    <div className="text-[10px] font-medium text-text-tertiary uppercase tracking-wider mb-1">{kpi.label}</div>
                    <div className="text-[22px] font-bold leading-none" style={{ color: kpi.color }}>
                      {typeof kpi.value === 'number' ? kpi.value.toLocaleString() : kpi.value}
                    </div>
                  </div>
                ))}
              </div>

              {/* Charts Grid */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {/* Status Distribution */}
                <div className="bg-surface border border-border rounded-[var(--radius-lg)] p-5">
                  <h4 className="text-[13px] font-semibold text-text-primary mb-4">Status Distribution</h4>
                  <div className="space-y-2.5">
                    {stats.by_status.map(item => {
                      const maxVal = Math.max(1, ...stats.by_status.map(s => s.total));
                      const statusColors: Record<string, string> = {
                        Draft: '#9CA3AF', Planned: '#3B82F6', Active: '#22C55E',
                        Completed: '#8B5CF6', Closed: '#6B7280', Cancelled: '#EF4444',
                      };
                      return (
                        <div key={item.label} className="flex items-center gap-2.5">
                          <span className="text-[11px] text-text-secondary w-[80px] shrink-0 truncate">{item.label}</span>
                          <div className="flex-1 h-[18px] bg-surface-sunken rounded-full overflow-hidden">
                            <div
                              className="h-full rounded-full transition-all duration-500"
                              style={{
                                width: `${Math.max(4, (item.total / maxVal) * 100)}%`,
                                backgroundColor: statusColors[item.label] || '#6366F1',
                              }}
                            />
                          </div>
                          <span className="text-[12px] font-semibold text-text-primary w-[28px] text-right">{item.total}</span>
                        </div>
                      );
                    })}
                    {stats.by_status.length === 0 && <p className="text-[12px] text-text-tertiary italic">No data</p>}
                  </div>
                </div>

                {/* By Campaign Type */}
                <div className="bg-surface border border-border rounded-[var(--radius-lg)] p-5">
                  <h4 className="text-[13px] font-semibold text-text-primary mb-4">By Campaign Type</h4>
                  <div className="space-y-2.5">
                    {stats.by_type.map(item => {
                      const maxVal = Math.max(1, ...stats.by_type.map(s => s.total));
                      return (
                        <div key={item.label} className="flex items-center gap-2.5">
                          <span className="text-[11px] text-text-secondary w-[110px] shrink-0 truncate">{item.label}</span>
                          <div className="flex-1 h-[18px] bg-surface-sunken rounded-full overflow-hidden">
                            <div
                              className="h-full rounded-full bg-blue-500 transition-all duration-500"
                              style={{ width: `${Math.max(4, (item.total / maxVal) * 100)}%` }}
                            />
                          </div>
                          <span className="text-[12px] font-semibold text-text-primary w-[28px] text-right">{item.total}</span>
                        </div>
                      );
                    })}
                    {stats.by_type.length === 0 && <p className="text-[12px] text-text-tertiary italic">No data</p>}
                  </div>
                </div>

                {/* By Topic */}
                <div className="bg-surface border border-border rounded-[var(--radius-lg)] p-5">
                  <h4 className="text-[13px] font-semibold text-text-primary mb-4">Topic Coverage</h4>
                  <div className="space-y-2.5">
                    {stats.by_topic.map(item => {
                      const maxVal = Math.max(1, ...stats.by_topic.map(s => s.total));
                      return (
                        <div key={item.label} className="flex items-center gap-2.5">
                          <span className="text-[11px] text-text-secondary w-[110px] shrink-0 truncate">{item.label}</span>
                          <div className="flex-1 h-[18px] bg-surface-sunken rounded-full overflow-hidden">
                            <div
                              className="h-full rounded-full bg-teal-500 transition-all duration-500"
                              style={{ width: `${Math.max(4, (item.total / maxVal) * 100)}%` }}
                            />
                          </div>
                          <span className="text-[12px] font-semibold text-text-primary w-[28px] text-right">{item.total}</span>
                        </div>
                      );
                    })}
                    {stats.by_topic.length === 0 && <p className="text-[12px] text-text-tertiary italic">No data</p>}
                  </div>
                </div>

                {/* Effectiveness Distribution */}
                <div className="bg-surface border border-border rounded-[var(--radius-lg)] p-5">
                  <h4 className="text-[13px] font-semibold text-text-primary mb-4">Effectiveness Ratings</h4>
                  <div className="space-y-2.5">
                    {stats.effectiveness_distribution.length > 0 ? stats.effectiveness_distribution.map(item => {
                      const maxVal = Math.max(1, ...stats.effectiveness_distribution.map(s => s.total));
                      const ratingColors: Record<string, string> = {
                        Excellent: '#22C55E', Good: '#3B82F6', Average: '#F59E0B',
                        Poor: '#EF4444', 'Not Rated': '#9CA3AF',
                      };
                      return (
                        <div key={item.rating} className="flex items-center gap-2.5">
                          <span className="text-[11px] text-text-secondary w-[80px] shrink-0 truncate">{item.rating}</span>
                          <div className="flex-1 h-[18px] bg-surface-sunken rounded-full overflow-hidden">
                            <div
                              className="h-full rounded-full transition-all duration-500"
                              style={{
                                width: `${Math.max(4, (item.total / maxVal) * 100)}%`,
                                backgroundColor: ratingColors[item.rating] || '#6366F1',
                              }}
                            />
                          </div>
                          <span className="text-[12px] font-semibold text-text-primary w-[28px] text-right">{item.total}</span>
                        </div>
                      );
                    }) : <p className="text-[12px] text-text-tertiary italic">No effectiveness data yet</p>}
                  </div>
                </div>

                {/* Monthly Trend — full width */}
                <div className="bg-surface border border-border rounded-[var(--radius-lg)] p-5 lg:col-span-2">
                  <h4 className="text-[13px] font-semibold text-text-primary mb-4">Monthly Trend (12 months)</h4>
                  {stats.monthly_trend.length > 0 ? (
                    <div className="flex items-end gap-1.5 h-[140px]">
                      {stats.monthly_trend.map(item => {
                        const maxCampaigns = Math.max(1, ...stats.monthly_trend.map(m => m.campaigns_started));
                        const pct = (item.campaigns_started / maxCampaigns) * 100;
                        const monthLabel = item.month.split('-')[1];
                        const monthNames = ['', 'Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
                        return (
                          <div key={item.month} className="flex-1 flex flex-col items-center gap-1 min-w-0">
                            <span className="text-[10px] font-semibold text-text-primary">{item.campaigns_started}</span>
                            <div className="w-full flex justify-center" style={{ height: '100px' }}>
                              <div className="flex flex-col justify-end w-full max-w-[28px]">
                                <div
                                  className="w-full bg-primary-500 rounded-t-[3px] transition-all duration-500"
                                  style={{ height: `${Math.max(4, pct)}%` }}
                                  title={`${item.campaigns_started} campaigns, ${item.participants} participants`}
                                />
                              </div>
                            </div>
                            <span className="text-[9px] text-text-tertiary">{monthNames[Number(monthLabel)] || monthLabel}</span>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <p className="text-[12px] text-text-tertiary italic">No trend data</p>
                  )}
                  <div className="flex items-center gap-4 mt-3 pt-2 border-t border-border/50">
                    <span className="flex items-center gap-1.5 text-[10px] text-text-tertiary">
                      <span className="w-2.5 h-2.5 rounded-[2px] bg-primary-500" /> Campaigns Started
                    </span>
                  </div>
                </div>
              </div>

              {/* Bottom Row: Top Participation + Open Actions */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {/* Top Participation */}
                <div className="bg-surface border border-border rounded-[var(--radius-lg)] p-5">
                  <h4 className="text-[13px] font-semibold text-text-primary mb-3">Top Participation</h4>
                  {stats.top_participation.length > 0 ? (
                    <div className="space-y-2">
                      {stats.top_participation.map((item, i) => (
                        <div key={item.id} className="flex items-center gap-2.5 py-1.5 border-b border-border/50 last:border-0">
                          <span className="w-5 h-5 rounded-full bg-primary-50 text-primary-600 flex items-center justify-center text-[10px] font-bold shrink-0">
                            {i + 1}
                          </span>
                          <div className="flex-1 min-w-0">
                            <div className="text-[12px] font-medium text-text-primary truncate">{item.title}</div>
                            <div className="text-[10px] text-text-tertiary font-mono">{item.campaign_code}</div>
                          </div>
                          <div className="flex items-center gap-1 shrink-0">
                            <Users size={12} className="text-text-tertiary" />
                            <span className="text-[12px] font-bold text-primary-600">{item.participant_count}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-[12px] text-text-tertiary italic">No participation data</p>
                  )}
                </div>

                {/* Open Actions */}
                <div className="bg-surface border border-border rounded-[var(--radius-lg)] p-5">
                  <h4 className="text-[13px] font-semibold text-text-primary mb-3">
                    Open Actions
                    {stats.open_actions_list.length > 0 && (
                      <span className="ml-1.5 text-[10px] font-semibold text-amber-600 bg-amber-50 px-1.5 py-0.5 rounded-full">
                        {stats.open_actions_list.length}
                      </span>
                    )}
                  </h4>
                  {stats.open_actions_list.length > 0 ? (
                    <div className="space-y-2">
                      {stats.open_actions_list.map(action => {
                        const isOverdue = action.due_date && new Date(action.due_date) < new Date();
                        return (
                          <div
                            key={action.id}
                            className={`flex items-center gap-2.5 py-1.5 border-b border-border/50 last:border-0 ${isOverdue ? 'bg-red-50/50 -mx-2 px-2 rounded' : ''}`}
                          >
                            <div className="flex-1 min-w-0">
                              <div className="text-[12px] font-medium text-text-primary truncate">{action.title}</div>
                              <div className="text-[10px] text-text-tertiary">
                                {action.campaign_code} &middot; {action.assigned_to || 'Unassigned'}
                              </div>
                            </div>
                            <div className="flex items-center gap-2 shrink-0">
                              <PriorityBadge priority={action.priority} />
                              {action.due_date && (
                                <span className={`text-[10px] font-medium ${isOverdue ? 'text-red-600' : 'text-text-tertiary'}`}>
                                  {new Date(action.due_date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })}
                                </span>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <p className="text-[12px] text-text-tertiary italic">No open actions</p>
                  )}
                </div>
              </div>
            </>
          )}
        </div>
      )}

      {/* ── Form Drawer ───────────────────────────── */}
      {showForm && (
        <>
          {/* Overlay */}
          <div className="fixed inset-0 bg-black/30 z-40" onClick={() => { setShowForm(false); setEditingCampaign(null); }} />

          {/* Drawer */}
          <div className="fixed inset-y-0 right-0 w-[560px] max-w-full bg-surface border-l border-border shadow-xl z-50 flex flex-col overflow-hidden animate-in slide-in-from-right duration-200">
            {/* Drawer header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-border shrink-0">
              <h2 className="text-lg font-semibold text-text-primary">
                {editingCampaign ? 'Edit Campaign' : 'New Campaign'}
              </h2>
              <button
                onClick={() => { setShowForm(false); setEditingCampaign(null); }}
                className="p-1.5 rounded-lg text-text-tertiary hover:text-text-primary hover:bg-surface-sunken transition-colors"
              >
                <X size={18} />
              </button>
            </div>

            {/* Drawer body */}
            <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain px-6 py-5 space-y-6">
              {/* Section 1: Basic Info */}
              <div className="space-y-4">
                <h3 className="text-xs font-semibold text-text-tertiary uppercase tracking-wider">Campaign Information</h3>

                <div>
                  <label className="block text-[13px] font-medium text-text-secondary mb-1.5">Title <span className="text-danger-500">*</span></label>
                  <input
                    type="text"
                    value={formData.title}
                    onChange={e => handleFormChange('title', e.target.value)}
                    placeholder="Campaign title"
                    className="input-field w-full py-2 text-sm"
                    required
                  />
                </div>

                <div>
                  <label className="block text-[13px] font-medium text-text-secondary mb-1.5">Campaign Type</label>
                  <SelectWithOther
                    options={CAMPAIGN_TYPES}
                    value={formData.campaign_type}
                    onChange={v => handleFormChange('campaign_type', v)}
                    placeholder="Select type..."
                    selectClassName="input-field w-full py-2 text-sm"
                  />
                </div>

                <div>
                  <label className="block text-[13px] font-medium text-text-secondary mb-1.5">Topic</label>
                  <SelectWithOther
                    options={allTopics}
                    value={formData.topic}
                    onChange={v => handleFormChange('topic', v)}
                    placeholder="Select topic..."
                    selectClassName="input-field w-full py-2 text-sm"
                  />
                </div>

                <div>
                  <label className="block text-[13px] font-medium text-text-secondary mb-1.5">Description</label>
                  <textarea
                    value={formData.description}
                    onChange={e => handleFormChange('description', e.target.value)}
                    placeholder="Campaign description..."
                    rows={3}
                    className="input-field w-full py-2 text-sm resize-none"
                  />
                </div>

                <div>
                  <label className="block text-[13px] font-medium text-text-secondary mb-1.5">Objective</label>
                  <textarea
                    value={formData.objective}
                    onChange={e => handleFormChange('objective', e.target.value)}
                    placeholder="Campaign objectives..."
                    rows={2}
                    className="input-field w-full py-2 text-sm resize-none"
                  />
                </div>
              </div>

              {/* Section 2: Schedule */}
              <div className="space-y-4">
                <h3 className="text-xs font-semibold text-text-tertiary uppercase tracking-wider">Schedule</h3>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[13px] font-medium text-text-secondary mb-1.5">Start Date</label>
                    <input
                      type="date"
                      value={formData.start_date}
                      onChange={e => handleFormChange('start_date', e.target.value)}
                      className="input-field w-full py-2 text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-[13px] font-medium text-text-secondary mb-1.5">End Date</label>
                    <input
                      type="date"
                      value={formData.end_date}
                      onChange={e => handleFormChange('end_date', e.target.value)}
                      className="input-field w-full py-2 text-sm"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-[13px] font-medium text-text-secondary mb-1.5">Frequency</label>
                  <select
                    value={formData.frequency}
                    onChange={e => handleFormChange('frequency', e.target.value)}
                    className="input-field w-full py-2 text-sm"
                  >
                    {FREQUENCY_OPTIONS.map(f => (
                      <option key={f} value={f}>{f}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Section 3: People */}
              <div className="space-y-4">
                <h3 className="text-xs font-semibold text-text-tertiary uppercase tracking-wider">People</h3>
                <div>
                  <label className="block text-[13px] font-medium text-text-secondary mb-1.5">Owner Name</label>
                  <input
                    type="text"
                    value={formData.owner_name}
                    onChange={e => handleFormChange('owner_name', e.target.value)}
                    placeholder="Campaign owner"
                    className="input-field w-full py-2 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-[13px] font-medium text-text-secondary mb-1.5">Conducted By</label>
                  <input
                    type="text"
                    value={formData.conducted_by}
                    onChange={e => handleFormChange('conducted_by', e.target.value)}
                    placeholder="Who will conduct"
                    className="input-field w-full py-2 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-[13px] font-medium text-text-secondary mb-1.5">Approved By</label>
                  <input
                    type="text"
                    value={formData.approved_by}
                    onChange={e => handleFormChange('approved_by', e.target.value)}
                    placeholder="Approved by"
                    className="input-field w-full py-2 text-sm"
                  />
                </div>
              </div>

              {/* Section 4: Location & Scope */}
              <div className="space-y-4">
                <h3 className="text-xs font-semibold text-text-tertiary uppercase tracking-wider">Location & Scope</h3>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[13px] font-medium text-text-secondary mb-1.5">Site</label>
                    <input type="text" value={formData.site} onChange={e => handleFormChange('site', e.target.value)} placeholder="Site" className="input-field w-full py-2 text-sm" />
                  </div>
                  <div>
                    <label className="block text-[13px] font-medium text-text-secondary mb-1.5">Project</label>
                    <input type="text" value={formData.project} onChange={e => handleFormChange('project', e.target.value)} placeholder="Project" className="input-field w-full py-2 text-sm" />
                  </div>
                  <div>
                    <label className="block text-[13px] font-medium text-text-secondary mb-1.5">Area</label>
                    <input type="text" value={formData.area} onChange={e => handleFormChange('area', e.target.value)} placeholder="Area" className="input-field w-full py-2 text-sm" />
                  </div>
                  <div>
                    <label className="block text-[13px] font-medium text-text-secondary mb-1.5">Zone</label>
                    <input type="text" value={formData.zone} onChange={e => handleFormChange('zone', e.target.value)} placeholder="Zone" className="input-field w-full py-2 text-sm" />
                  </div>
                  <div>
                    <label className="block text-[13px] font-medium text-text-secondary mb-1.5">Department</label>
                    <input type="text" value={formData.department} onChange={e => handleFormChange('department', e.target.value)} placeholder="Department" className="input-field w-full py-2 text-sm" />
                  </div>
                  <div>
                    <label className="block text-[13px] font-medium text-text-secondary mb-1.5">Contractor</label>
                    <input type="text" value={formData.contractor_name} onChange={e => handleFormChange('contractor_name', e.target.value)} placeholder="Contractor" className="input-field w-full py-2 text-sm" />
                  </div>
                </div>
                <div>
                  <label className="block text-[13px] font-medium text-text-secondary mb-1.5">Target Audience</label>
                  <input type="text" value={formData.target_audience} onChange={e => handleFormChange('target_audience', e.target.value)} placeholder="e.g. All site workers, Supervisors" className="input-field w-full py-2 text-sm" />
                </div>
                <div>
                  <label className="block text-[13px] font-medium text-text-secondary mb-1.5">Expected Participants</label>
                  <input type="number" value={formData.expected_participants} onChange={e => handleFormChange('expected_participants', e.target.value)} placeholder="0" className="input-field w-full py-2 text-sm" min="0" />
                </div>
              </div>

              {/* Section 5: Notes */}
              <div className="space-y-4">
                <h3 className="text-xs font-semibold text-text-tertiary uppercase tracking-wider">Additional</h3>
                <div>
                  <label className="block text-[13px] font-medium text-text-secondary mb-1.5">Notes</label>
                  <textarea
                    value={formData.notes}
                    onChange={e => handleFormChange('notes', e.target.value)}
                    placeholder="Additional notes..."
                    rows={3}
                    className="input-field w-full py-2 text-sm resize-none"
                  />
                </div>
              </div>
            </div>

            {/* Drawer footer */}
            <div className="flex items-center justify-end gap-2 px-6 py-4 border-t border-border shrink-0 bg-canvas/50">
              <button
                onClick={() => { setShowForm(false); setEditingCampaign(null); }}
                className="px-4 h-9 text-[13px] font-medium text-text-secondary bg-white border border-border rounded-[var(--radius-md)] hover:bg-surface-sunken transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => handleSave('Draft')}
                disabled={!formData.title.trim() || isCreating || isUpdating}
                className="px-4 h-9 text-[13px] font-medium text-text-primary bg-white border border-border rounded-[var(--radius-md)] hover:bg-surface-sunken disabled:opacity-40 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
              >
                {(isCreating || isUpdating) ? (
                  <span className="w-3.5 h-3.5 border-2 border-text-tertiary/30 border-t-text-primary rounded-full animate-spin" />
                ) : null}
                Save as Draft
              </button>
              <button
                onClick={() => handleSave('Planned')}
                disabled={!formData.title.trim() || isCreating || isUpdating}
                className="btn-primary px-4 h-9 text-[13px] font-medium rounded-[var(--radius-md)] disabled:opacity-40 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
              >
                {(isCreating || isUpdating) ? (
                  <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : null}
                {editingCampaign ? 'Save Changes' : 'Save & Set as Planned'}
              </button>
            </div>
          </div>
        </>
      )}

      {/* ── Delete Confirmation Modal ────────────── */}
      <TypedDeleteConfirmModal
        open={!!deletingCampaign}
        onClose={() => setDeletingCampaign(null)}
        onConfirm={handleDelete}
        title="Delete Campaign"
        itemName={deletingCampaign?.title ?? ''}
        itemType="campaign"
        loading={isDeleting}
      />
    </div>
  );
}
