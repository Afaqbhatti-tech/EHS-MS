import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { useDashboardData } from './useDashboardData';
import type { DashboardStat, MonthlyTrend, ActivityItem, ComplianceScore, AiInsight } from './useDashboardData';
import {
  Shield, Clock, ClipboardCheck, Eye,
  FileEdit, FileText, ClipboardList, Leaf,
  Brain, AlertTriangle, TrendingUp, TrendingDown,
  UserPlus, Rocket, Database, Mail,
  Download, PlusCircle, MoreHorizontal, ExternalLink, List,
  type LucideIcon,
} from 'lucide-react';

// ─── Icon Map ──────────────────────────────────────
const STAT_ICONS: Record<string, LucideIcon> = {
  incident_free_days: Shield,
  man_hours: Clock,
  active_permits: ClipboardCheck,
  open_observations: Eye,
  pending_amendments: FileEdit,
  open_mom_actions: FileText,
  pending_mockups: ClipboardList,
  env_manifests: Leaf,
};

const ACTIVITY_ICONS: Record<string, { icon: LucideIcon; color: string; bg: string }> = {
  observation: { icon: Eye, color: 'text-warning-600', bg: 'bg-warning-50' },
  permit: { icon: ClipboardCheck, color: 'text-info-600', bg: 'bg-info-50' },
  incident: { icon: AlertTriangle, color: 'text-danger-600', bg: 'bg-danger-50' },
  violation: { icon: Shield, color: 'text-danger-600', bg: 'bg-danger-50' },
};

const COLOR_MAP: Record<string, { icon: string; badge: string; bar: string }> = {
  primary: { icon: 'bg-primary-50 text-primary-600', badge: 'bg-primary-100 text-primary-700', bar: 'bg-primary-500' },
  success: { icon: 'bg-success-50 text-success-600', badge: 'bg-success-100 text-success-700', bar: 'bg-success-500' },
  warning: { icon: 'bg-warning-50 text-warning-600', badge: 'bg-warning-100 text-warning-700', bar: 'bg-warning-500' },
  danger: { icon: 'bg-danger-50 text-danger-600', badge: 'bg-danger-100 text-danger-700', bar: 'bg-danger-500' },
  info: { icon: 'bg-info-50 text-info-600', badge: 'bg-info-100 text-info-700', bar: 'bg-info-500' },
};

// ─── Fallback data (shown while API loads or DB is empty) ──
const FALLBACK_STATS: DashboardStat[] = [
  { key: 'incident_free_days', label: 'Incident-Free Days', value: 0, color: 'success', trend: { value: '0%', up: true } },
  { key: 'man_hours', label: 'Man-Hours MTD', value: '0', color: 'primary', sub: '0 workers active' },
  { key: 'active_permits', label: 'Active Permits', value: 0, color: 'info', trend: { value: '0', up: true } },
  { key: 'open_observations', label: 'Open Observations', value: 0, color: 'warning', sub: '0 overdue' },
  { key: 'pending_amendments', label: 'Pending Amendments', value: 0, color: 'warning' },
  { key: 'open_mom_actions', label: 'MOM Open Actions', value: 0, color: 'danger' },
  { key: 'pending_mockups', label: 'Mock-Up Pending', value: 0, color: 'info' },
  { key: 'env_manifests', label: 'Env. Manifests', value: 0, color: 'success' },
];

const FALLBACK_TREND: MonthlyTrend[] = (() => {
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const now = new Date();
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(now.getFullYear(), now.getMonth() - 6 + i, 1);
    return { month: months[d.getMonth()], observations: 0, permits: 0 };
  });
})();

const FALLBACK_ACTIVITY: ActivityItem[] = [];
const FALLBACK_COMPLIANCE: ComplianceScore[] = [
  { label: 'Observation Close-out Rate', value: 0, target: 90 },
  { label: 'Permit Compliance', value: 0, target: 95 },
  { label: 'Training Coverage', value: 0, target: 85 },
  { label: 'Environmental Compliance', value: 0, target: 85 },
];
const FALLBACK_INSIGHTS: AiInsight[] = [];

// ─── Mini Bar Sparkline ────────────────────────────
const SPARK_BG: Record<string, string> = {
  primary: 'bg-primary-200',
  success: 'bg-success-200',
  warning: 'bg-warning-200',
  danger: 'bg-danger-200',
  info: 'bg-info-200',
};

function MiniSparkBars({ heights, color }: { heights: number[]; color: string }) {
  const barColor = COLOR_MAP[color]?.bar || 'bg-primary-500';
  const dimColor = SPARK_BG[color] || 'bg-primary-200';
  return (
    <div className="mt-4 h-10 w-full flex items-end gap-[3px]">
      {heights.map((h, i) => {
        const isLast = i === heights.length - 1;
        const barH = Math.max(h, 10); // minimum 10% so bars are always visible
        return (
          <div
            key={i}
            className={`flex-1 rounded-t-sm transition-all duration-300 ${isLast ? barColor : dimColor}`}
            style={{ height: `${barH}%` }}
          />
        );
      })}
    </div>
  );
}

// ─── Default sparkline (flat line when no data) ────
const DEFAULT_SPARK = [50, 50, 50, 50, 50, 50, 50];

// ─── Stat Card (Monolith-style) ────────────────────
function MonolithStatCard({ stat, sparkTrends }: { stat: DashboardStat; sparkTrends?: Record<string, number[]> }) {
  const Icon = STAT_ICONS[stat.key] || Shield;
  const colors = COLOR_MAP[stat.color] || COLOR_MAP.primary;
  const raw = sparkTrends?.[stat.key];
  // Fall back to default flat bars when data is all zeros or missing
  const sparkHeights = (!raw || raw.every(v => v === 0)) ? DEFAULT_SPARK : raw;

  return (
    <div className="bg-surface p-3.5 sm:p-5 rounded-[var(--radius-xl)] border border-border shadow-xs hover:shadow-md transition-all duration-300 min-h-card flex flex-col">
      <div className="flex justify-between items-start mb-2 sm:mb-3">
        <div className={`p-1.5 sm:p-2 rounded-[var(--radius-md)] ${colors.icon}`}>
          <Icon size={16} className="sm:hidden" />
          <Icon size={18} className="hidden sm:block" />
        </div>
        {stat.trend && (
          <span className={`px-1.5 sm:px-2 py-0.5 rounded-full text-[9px] sm:text-[10px] font-bold flex items-center gap-0.5 sm:gap-1 ${
            stat.trend.up ? 'bg-success-50 text-success-700' : 'bg-danger-50 text-danger-700'
          }`}>
            {stat.trend.up ? <TrendingUp size={9} /> : <TrendingDown size={9} />}
            {stat.trend.value}
          </span>
        )}
      </div>
      <div className="space-y-0.5">
        <p className="text-text-tertiary text-[10px] sm:text-[11px] font-semibold uppercase tracking-wider truncate">{stat.label}</p>
        <h4 className="text-xl sm:text-2xl font-bold text-text-primary tracking-tight">{stat.value}</h4>
        {stat.sub && <p className="text-[10px] sm:text-[11px] text-text-tertiary truncate">{stat.sub}</p>}
      </div>
      <div className="mt-auto">
        <MiniSparkBars heights={sparkHeights} color={stat.color} />
      </div>
    </div>
  );
}

// ─── Bar Chart ─────────────────────────────────────
function BarChart({ data, metric = 'observations', showCurrent = true, showPrevious = true }: { data: MonthlyTrend[]; metric?: 'observations' | 'permits'; showCurrent?: boolean; showPrevious?: boolean }) {
  const maxVal = Math.max(...data.map(d => Math.max(d.observations, d.permits)), 1);

  return (
    <div className="relative h-64 w-full flex items-end justify-between px-2">
      {/* Grid lines */}
      <div className="absolute inset-0 flex flex-col justify-between pointer-events-none opacity-[0.04]">
        {[0, 1, 2, 3].map(i => (
          <div key={i} className="w-full border-t border-text-primary" />
        ))}
      </div>
      {/* Bars */}
      {data.map((d, i) => {
        const isLast = i === data.length - 1;
        const isVisible = isLast ? showCurrent : showPrevious;
        const h = isVisible ? Math.max((d[metric] / maxVal) * 100, 8) : 0;
        return (
          <div key={d.month} className="flex flex-col items-center gap-2 flex-1 group cursor-pointer">
            <div
              className={`w-full max-w-10 rounded-t-[var(--radius-md)] transition-all duration-300 ${
                isLast ? 'bg-primary-600' : 'bg-primary-500/20 group-hover:bg-primary-600'
              }`}
              style={{ height: `${h}%`, opacity: isVisible ? 1 : 0 }}
            />
            <span className={`text-[10px] font-bold tracking-wide ${
              isLast ? 'text-primary-600' : 'text-text-tertiary'
            }`}>
              {d.month.toUpperCase()}
            </span>
          </div>
        );
      })}
    </div>
  );
}

// ─── Quick Operation Button ────────────────────────
function QuickOpButton({ icon: Icon, label, color, onClick }: { icon: LucideIcon; label: string; color: string; onClick?: () => void }) {
  return (
    <button onClick={onClick} className="flex flex-col items-start gap-2.5 p-4 bg-surface rounded-[var(--radius-lg)] border border-border hover:shadow-md transition-all group">
      <div className={`w-9 h-9 rounded-[var(--radius-md)] flex items-center justify-center transition-colors ${color}`}>
        <Icon size={18} />
      </div>
      <span className="text-[12px] font-bold text-text-primary">{label}</span>
    </button>
  );
}

// ─── Activity Dropdown ──────────────────────────
function ActivityDropdown({ navigate }: { navigate: (path: string) => void }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  const items = [
    { icon: List, label: 'View All Activity', onClick: () => navigate('/reports') },
    { icon: ExternalLink, label: 'View Observations', onClick: () => navigate('/observations') },
    { icon: ExternalLink, label: 'View Permits', onClick: () => navigate('/permits') },
  ];

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen(v => !v)}
        className="text-text-tertiary hover:text-primary-600 transition-colors p-1 rounded-[var(--radius-md)] hover:bg-surface-sunken"
      >
        <MoreHorizontal size={18} />
      </button>
      {open && (
        <div className="absolute right-0 top-full mt-1 w-48 bg-surface rounded-[var(--radius-lg)] border border-border shadow-lg z-50 py-1">
          {items.map((item) => (
            <button
              key={item.label}
              onClick={() => { setOpen(false); item.onClick(); }}
              className="w-full flex items-center gap-2.5 px-3.5 py-2 text-[12px] font-medium text-text-secondary hover:text-primary-600 hover:bg-surface-sunken transition-colors text-left"
            >
              <item.icon size={14} className="shrink-0" />
              {item.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Activity-type → permission mapping ──────────
const ACTIVITY_PERMISSION_MAP: Record<string, string> = {
  observation: 'can_access_observations',
  permit: 'can_access_permits',
  incident: 'can_access_incidents',
  violation: 'can_access_violations',
};

// ─── Main Dashboard ────────────────────────────────
export default function DashboardPage() {
  const { user, hasPermission } = useAuth();
  const { data, isLoading, isError, error: queryError } = useDashboardData();
  const navigate = useNavigate();
  const [chartView, setChartView] = useState<'observations' | 'permits'>('observations');
  const [showCurrent, setShowCurrent] = useState(true);
  const [showPrevious, setShowPrevious] = useState(true);

  const greeting = data?.greeting || 'Good morning';
  // Backend already filters stats by user's granular data permissions
  const stats = data?.stats?.length ? data.stats : [];
  const trend = data?.monthlyTrend?.length ? data.monthlyTrend : FALLBACK_TREND;
  const allActivity = data?.recentActivity || FALLBACK_ACTIVITY;
  const compliance = data?.complianceScores?.length ? data.complianceScores : FALLBACK_COMPLIANCE;
  const aiInsights = data?.aiInsights || FALLBACK_INSIGHTS;
  const sparkTrends = data?.sparkTrends || {};
  const firstName = user?.name?.split(' ')[0] || 'there';
  const vs = data?.visibleSections;

  // Filter activity by permission
  const activity = allActivity.filter((a) => {
    const perm = ACTIVITY_PERMISSION_MAP[a.type];
    if (!perm) return true;
    return hasPermission(perm);
  });

  // Section visibility — driven by backend visibleSections when available, fallback to module-level checks
  const canSeeObservations = hasPermission('can_access_observations');
  const canSeePermits = hasPermission('can_access_permits');
  const canSeeChart = vs ? !!vs.safety_chart : (canSeeObservations || canSeePermits);
  const canSeeAI = vs ? !!vs.ai_insights : hasPermission('can_access_ai_intelligence');
  const canSeeCompliance = vs ? !!vs.compliance_scorecard : (hasPermission('can_access_kpis_reports') || hasPermission('can_view_management_dashboard'));
  const canSeeQuickOps = vs ? !!vs.quick_operations : true;
  const canSeeRecentActivity = vs ? !!vs.recent_activity : true;
  const canSeeReports = hasPermission('can_access_kpis_reports');
  const canManageUsers = hasPermission('can_manage_users');
  const canRecordPermit = hasPermission('can_record_permit');

  // Quick Operations — only show what user can access (also gated by data_dashboard_quick_operations)
  const quickOps: { icon: LucideIcon; label: string; color: string; onClick: () => void }[] = [];
  if (!canSeeQuickOps) { /* skip all quick ops */ }
  else {
  if (canManageUsers) quickOps.push({ icon: UserPlus, label: 'Add User', color: 'bg-primary-50 text-primary-600 group-hover:bg-primary-600 group-hover:text-white', onClick: () => navigate('/admin/users') });
  if (canRecordPermit) quickOps.push({ icon: Rocket, label: 'New Permit', color: 'bg-warning-50 text-warning-600 group-hover:bg-warning-600 group-hover:text-white', onClick: () => navigate('/permits') });
  if (canSeeObservations) quickOps.push({ icon: Eye, label: 'Observations', color: 'bg-info-50 text-info-600 group-hover:bg-info-600 group-hover:text-white', onClick: () => navigate('/observations') });
  if (canSeeReports) quickOps.push({ icon: Download, label: 'Reports', color: 'bg-success-50 text-success-600 group-hover:bg-success-600 group-hover:text-white', onClick: () => navigate('/reports') });
  } // end canSeeQuickOps

  // Auto-correct chart view if user can only see one metric
  const effectiveChartView = !canSeeObservations && canSeePermits ? 'permits' : !canSeePermits && canSeeObservations ? 'observations' : chartView;

  // Show top 4 stats for the bento grid, remaining for secondary row
  const topStats = stats.slice(0, 4);
  const secondaryStats = stats.slice(4);

  // Determine if dashboard has any real content beyond welcome header
  const hasContent = stats.length > 0 || canSeeChart || (canSeeRecentActivity && activity.length > 0) || canSeeAI || canSeeCompliance;

  return (
    <div className="space-y-5 sm:space-y-8 max-w-[1440px]">
      {/* ── Welcome Header ──────────────────────────── */}
      <div>
        <h3 className="text-[22px] sm:text-[28px] font-extrabold text-text-primary tracking-tight mb-1">
          {greeting}, {firstName}.
        </h3>
        <p className="text-text-secondary text-[13px] sm:text-[15px]">
          {hasContent
            ? 'Your EHS performance overview for this month.'
            : 'Welcome to EHS·OS. Contact your administrator if you need access to additional modules.'}
        </p>
      </div>

      {/* ── Error Banner ────────────────────────────── */}
      {isError && (
        <div className="p-3 rounded-[var(--radius-md)] bg-danger-50 border border-danger-200 text-[13px] text-danger-700 flex items-center justify-between">
          <span>Failed to load dashboard data{queryError instanceof Error ? `: ${queryError.message}` : ''}. Showing default values.</span>
        </div>
      )}

      {/* ── Summary Cards Bento Grid ────────────────── */}
      {topStats.length > 0 && (
        <div className={`grid grid-cols-2 sm:grid-cols-2 gap-3 sm:gap-5 ${topStats.length >= 4 ? 'lg:grid-cols-4' : topStats.length === 3 ? 'lg:grid-cols-3' : topStats.length === 2 ? 'lg:grid-cols-2' : 'lg:grid-cols-1'}`}>
          {topStats.map((stat) => (
            <MonolithStatCard key={stat.key} stat={stat} sparkTrends={sparkTrends} />
          ))}
        </div>
      )}

      {/* ── Secondary Stats Row ──────────────────────── */}
      {secondaryStats.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
          {secondaryStats.map((stat) => {
            const Icon = STAT_ICONS[stat.key] || Shield;
            const colors = COLOR_MAP[stat.color] || COLOR_MAP.primary;
            return (
              <div key={stat.key} className="flex items-center gap-3 bg-surface px-3.5 py-3 rounded-[var(--radius-lg)] border border-border shadow-xs hover:shadow-md transition-all">
                <div className={`p-1.5 rounded-[var(--radius-md)] ${colors.icon} shrink-0`}>
                  <Icon size={15} />
                </div>
                <div className="min-w-0">
                  <p className="text-[10px] font-semibold text-text-tertiary uppercase tracking-wider truncate">{stat.label}</p>
                  <p className="text-[17px] font-bold text-text-primary leading-tight">{stat.value}</p>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ── Main Content Grid ───────────────────────── */}
      {(canSeeChart || quickOps.length > 0 || (canSeeRecentActivity && activity.length > 0)) && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 sm:gap-6">

          {/* Analytics Chart — only if user can see observations or permits */}
          {canSeeChart && (
            <div className={`bg-surface p-4 sm:p-6 rounded-[var(--radius-xl)] border border-border shadow-xs ${quickOps.length > 0 || activity.length > 0 ? 'lg:col-span-8' : 'lg:col-span-12'}`}>
              <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3 mb-6 sm:mb-8">
                <div>
                  <h3 className="text-[16px] sm:text-[18px] font-bold text-text-primary">Safety Performance</h3>
                  <p className="text-text-secondary text-[12px] sm:text-[13px]">Monthly observations & permit activity</p>
                </div>
                {canSeeObservations && canSeePermits && (
                  <div className="flex bg-surface-sunken p-1 rounded-[var(--radius-md)] self-start">
                    <button
                      onClick={() => setChartView('observations')}
                      className={`px-3 sm:px-4 py-1.5 text-[11px] sm:text-[12px] font-bold rounded-[var(--radius-sm)] transition-colors ${
                        effectiveChartView === 'observations' ? 'bg-surface shadow-xs text-primary-600' : 'text-text-secondary font-medium hover:text-primary-600'
                      }`}
                    >
                      Observations
                    </button>
                    <button
                      onClick={() => setChartView('permits')}
                      className={`px-3 sm:px-4 py-1.5 text-[11px] sm:text-[12px] font-bold rounded-[var(--radius-sm)] transition-colors ${
                        effectiveChartView === 'permits' ? 'bg-surface shadow-xs text-primary-600' : 'text-text-secondary font-medium hover:text-primary-600'
                      }`}
                    >
                      Permits
                    </button>
                  </div>
                )}
              </div>

              {isLoading ? (
                <div className="h-64 flex items-center justify-center">
                  <div className="w-8 h-8 border-2 border-primary-200 border-t-primary-600 rounded-full animate-spin" />
                </div>
              ) : trend.length === 0 ? (
                <div className="h-64 flex items-center justify-center text-text-tertiary text-[13px]">
                  No trend data available yet
                </div>
              ) : (
                <BarChart data={trend} metric={effectiveChartView} showCurrent={showCurrent} showPrevious={showPrevious} />
              )}

              {/* Chart footer actions */}
              <div className="mt-6 sm:mt-8 pt-4 sm:pt-6 border-t border-border flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                <div className="flex items-center gap-4 text-[11px] sm:text-[12px] text-text-tertiary">
                  <button
                    onClick={() => setShowCurrent(v => !v)}
                    className={`flex items-center gap-1.5 transition-opacity ${showCurrent ? '' : 'opacity-40 line-through'}`}
                  >
                    <span className="w-2.5 h-2.5 rounded-sm bg-primary-600" />
                    Current Month
                  </button>
                  <button
                    onClick={() => setShowPrevious(v => !v)}
                    className={`flex items-center gap-1.5 transition-opacity ${showPrevious ? '' : 'opacity-40 line-through'}`}
                  >
                    <span className="w-2.5 h-2.5 rounded-sm bg-primary-500/20" />
                    Previous Months
                  </button>
                </div>
                {canSeeReports && (
                  <div className="flex gap-2 sm:gap-3 w-full sm:w-auto">
                    <button
                      onClick={() => navigate('/reports')}
                      className="flex items-center justify-center gap-2 px-3 sm:px-4 py-2 text-[12px] sm:text-[13px] font-semibold text-text-secondary hover:text-primary-600 transition-colors flex-1 sm:flex-none"
                    >
                      <Download size={15} />
                      Export
                    </button>
                    <button
                      onClick={() => navigate('/reports')}
                      className="flex items-center justify-center gap-2 px-4 sm:px-5 py-2 bg-primary-600 text-white text-[12px] sm:text-[13px] font-bold rounded-[var(--radius-md)] shadow-md hover:-translate-y-0.5 active:translate-y-0 transition-all flex-1 sm:flex-none"
                    >
                      <PlusCircle size={15} />
                      Create Report
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Right Column */}
          {(quickOps.length > 0 || (canSeeRecentActivity && activity.length > 0)) && (
            <div className={`space-y-4 sm:space-y-6 ${canSeeChart ? 'lg:col-span-4' : 'lg:col-span-12'}`}>

              {/* Quick Operations */}
              {quickOps.length > 0 && (
                <div className="bg-surface-sunken p-5 rounded-[var(--radius-xl)]">
                  <h4 className="text-[11px] font-bold text-text-primary uppercase tracking-widest mb-4">Quick Operations</h4>
                  <div className={`grid gap-3 ${canSeeChart ? 'grid-cols-2' : 'grid-cols-2 sm:grid-cols-4'}`}>
                    {quickOps.map((op) => (
                      <QuickOpButton key={op.label} icon={op.icon} label={op.label} color={op.color} onClick={op.onClick} />
                    ))}
                  </div>
                </div>
              )}

              {/* Recent Activity */}
              {canSeeRecentActivity && activity.length > 0 && (
                <div className="bg-surface p-5 rounded-[var(--radius-xl)] border border-border shadow-xs">
                  <div className="flex justify-between items-center mb-5">
                    <h4 className="text-[16px] font-bold text-text-primary">Recent Activity</h4>
                    <ActivityDropdown navigate={navigate} />
                  </div>
                  <div className="space-y-5">
                    {activity.map((a, i) => {
                      const meta = ACTIVITY_ICONS[a.type] || ACTIVITY_ICONS.observation;
                      const IconComp = meta.icon;
                      return (
                        <div key={i} className="flex gap-3">
                          <div className="relative shrink-0">
                            <div className={`w-9 h-9 rounded-full flex items-center justify-center ${meta.bg}`}>
                              <IconComp size={15} className={meta.color} />
                            </div>
                            <div className={`absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-white ${
                              (() => {
                                const s = (a.status || '').toLowerCase();
                                if (s === 'closed' || s === 'verified' || s === 'completed' || s === 'resolved') return 'bg-success-500';
                                if (s === 'open' || s === 'reported' || s === 'pending' || s === 'draft') return 'bg-warning-500';
                                if (s === 'active' || s === 'in progress') return 'bg-info-500';
                                return 'bg-info-500';
                              })()
                            }`} />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-[13px] text-text-primary leading-snug">{a.text}</p>
                            <p className="text-[11px] text-text-tertiary mt-0.5 uppercase tracking-tight">{a.time}</p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* ── AI Intelligence + Compliance ──────────── */}
      {(canSeeAI || canSeeCompliance) && (
        <div className={`grid grid-cols-1 gap-4 sm:gap-6 ${canSeeAI && canSeeCompliance ? 'lg:grid-cols-5' : ''}`}>
          {/* AI Panel (dark) */}
          {canSeeAI && (
            <div className={`bg-[#0F1623] rounded-[var(--radius-xl)] border border-white/[0.06] p-4 sm:p-6 shadow-sm ${canSeeCompliance ? 'lg:col-span-3' : ''}`}>
              <div className="flex items-center gap-2.5 mb-1">
                <Brain size={18} className="text-primary-500" />
                <h3 className="text-[15px] font-semibold text-white">AI Intelligence</h3>
                <span className="w-2 h-2 rounded-full bg-primary-500 animate-pulse" />
              </div>
              <p className="text-[11px] text-white/40 mb-5">Live analysis across all modules</p>

              {aiInsights.length === 0 && !isLoading && (
                <p className="text-[13px] text-white/30 py-4">No insights available yet. Data will appear as records are created.</p>
              )}
              <div className="space-y-3.5">
                {aiInsights.map((insight, i) => (
                  <div key={i} className="flex items-start gap-3">
                    <span className={`w-2 h-2 rounded-full mt-1.5 shrink-0 ${
                      insight.severity === 'danger' ? 'bg-danger-500' :
                      insight.severity === 'warning' ? 'bg-warning-500' : 'bg-success-500'
                    }`} />
                    <div className="flex-1 min-w-0">
                      <p className="text-[12px] sm:text-[13px] text-[#CBD5E1] leading-relaxed">{insight.text}</p>
                      <span className={`inline-block mt-1 sm:hidden px-2 py-0.5 rounded-full text-[10px] font-bold ${
                        insight.severity === 'danger' ? 'bg-danger-500/20 text-danger-500' :
                        insight.severity === 'warning' ? 'bg-warning-500/20 text-warning-500' :
                        'bg-success-500/20 text-success-500'
                      }`}>
                        {insight.severity === 'danger' ? 'Critical' : insight.severity === 'warning' ? 'Attention' : 'Positive'}
                      </span>
                    </div>
                    <span className={`hidden sm:inline-block shrink-0 px-2 py-0.5 rounded-full text-[10px] font-bold ${
                      insight.severity === 'danger' ? 'bg-danger-500/20 text-danger-500' :
                      insight.severity === 'warning' ? 'bg-warning-500/20 text-warning-500' :
                      'bg-success-500/20 text-success-500'
                    }`}>
                      {insight.severity === 'danger' ? 'Critical' : insight.severity === 'warning' ? 'Attention' : 'Positive'}
                    </span>
                  </div>
                ))}
              </div>

              <button onClick={() => navigate('/ai-intelligence')} className="mt-5 text-[13px] text-primary-500 hover:text-primary-200 font-medium transition-colors">
                View Full Analysis &rarr;
              </button>
            </div>
          )}

          {/* Compliance Scorecard */}
          {canSeeCompliance && (
            <div className={`bg-surface p-4 sm:p-6 rounded-[var(--radius-xl)] border border-border shadow-xs ${canSeeAI ? 'lg:col-span-2' : ''}`}>
              <h3 className="text-[15px] font-semibold text-text-primary mb-5">Compliance Scorecard</h3>
              <div className="space-y-5">
                {compliance.map((kpi) => {
                  const pct = kpi.value;
                  const barColor = pct >= kpi.target ? 'bg-success-500' : pct >= kpi.target - 15 ? 'bg-warning-500' : 'bg-danger-500';
                  const textColor = pct >= kpi.target ? 'text-success-700' : pct >= kpi.target - 15 ? 'text-warning-600' : 'text-danger-600';
                  return (
                    <div key={kpi.label}>
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="text-[13px] text-text-secondary">{kpi.label}</span>
                        <span className={`text-[13px] font-bold ${textColor}`}>{pct}%</span>
                      </div>
                      <div className="relative h-2 bg-surface-sunken rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all duration-700 ease-out ${barColor}`}
                          style={{ width: `${pct}%` }}
                        />
                        {/* Target marker */}
                        <div
                          className="absolute top-0 bottom-0 w-0.5 bg-text-primary/30"
                          style={{ left: `${kpi.target}%` }}
                          title={`Target: ${kpi.target}%`}
                        />
                      </div>
                      <p className="text-[10px] text-text-tertiary mt-1">Target: {kpi.target}%</p>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── Minimal dashboard message when user has no module access ── */}
      {!hasContent && (
        <div className="bg-surface p-8 sm:p-12 rounded-[var(--radius-xl)] border border-border shadow-xs text-center">
          <div className="w-16 h-16 rounded-full bg-primary-50 flex items-center justify-center mx-auto mb-4">
            <Shield size={28} className="text-primary-500" />
          </div>
          <h3 className="text-[18px] font-bold text-text-primary mb-2">Your Dashboard</h3>
          <p className="text-[14px] text-text-secondary max-w-md mx-auto">
            You currently have limited access. Additional modules and features will appear here once your administrator grants the relevant permissions.
          </p>
        </div>
      )}

      {/* ── Footer ──────────────────────────────────── */}
      <footer className="pt-6 sm:pt-8 flex flex-col sm:flex-row justify-between items-center gap-2 text-text-tertiary text-[10px] sm:text-[11px] font-medium tracking-widest uppercase">
        <p>&copy; {new Date().getFullYear()} EHS&middot;OS — KAEC Rail Project</p>
        <div className="flex gap-4 sm:gap-6">
          <span className="hover:text-primary-600 transition-colors cursor-pointer">Privacy</span>
          <span className="hover:text-primary-600 transition-colors cursor-pointer">Terms</span>
          <span className="hover:text-primary-600 transition-colors cursor-pointer">Security</span>
        </div>
      </footer>
    </div>
  );
}
