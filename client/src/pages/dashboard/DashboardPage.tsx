import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { useDashboardData } from './useDashboardData';
import type { DashboardStat, MonthlyTrend, ActivityItem, ComplianceScore } from './useDashboardData';
import {
  Shield, Clock, ClipboardCheck, Eye,
  FileEdit, FileText, ClipboardList, Leaf,
  Brain, AlertTriangle, TrendingUp, TrendingDown,
  UserPlus, Rocket, Database, Mail,
  Download, PlusCircle, MoreHorizontal,
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

// ─── Fallback data ─────────────────────────────────
const FALLBACK_STATS: DashboardStat[] = [
  { key: 'incident_free_days', label: 'Incident-Free Days', value: 87, color: 'success', trend: { value: '12%', up: true } },
  { key: 'man_hours', label: 'Man-Hours MTD', value: '142,580', color: 'primary', sub: '2,381 workers active' },
  { key: 'active_permits', label: 'Active Permits', value: 24, color: 'info', trend: { value: '3', up: true } },
  { key: 'open_observations', label: 'Open Observations', value: 18, color: 'warning', sub: '3 overdue' },
];

const FALLBACK_TREND: MonthlyTrend[] = [
  { month: 'Sep', observations: 32, permits: 18 },
  { month: 'Oct', observations: 40, permits: 22 },
  { month: 'Nov', observations: 36, permits: 28 },
  { month: 'Dec', observations: 48, permits: 35 },
  { month: 'Jan', observations: 56, permits: 30 },
  { month: 'Feb', observations: 60, permits: 38 },
  { month: 'Mar', observations: 64, permits: 42 },
];

const FALLBACK_ACTIVITY: ActivityItem[] = [
  { type: 'observation', text: 'Observation OBS-0187 created in Zone A', status: 'open', time: '12 min ago' },
  { type: 'permit', text: 'Permit PTW-0045 approved by Ahmed S.', status: 'approved', time: '28 min ago' },
  { type: 'incident', text: 'Incident INC-0012 investigation started', status: 'investigating', time: '1 hr ago' },
  { type: 'observation', text: 'Observation OBS-0186 closed — Zone C', status: 'closed', time: '2 hrs ago' },
  { type: 'permit', text: 'Permit PTW-0044 expired and archived', status: 'closed', time: '3 hrs ago' },
];

const FALLBACK_COMPLIANCE: ComplianceScore[] = [
  { label: 'Observation Close-out Rate', value: 82, target: 90 },
  { label: 'Permit Compliance', value: 94, target: 95 },
  { label: 'Training Coverage', value: 71, target: 85 },
  { label: 'Environmental Compliance', value: 88, target: 85 },
];

const AI_INSIGHTS = [
  { text: 'Zone B scaffolding observations trending 40% above baseline — consider safety stand-down', severity: 'warning' as const },
  { text: 'CCCC permit compliance has improved 15% this month', severity: 'success' as const },
  { text: '3 observations overdue beyond 7 days — escalation recommended', severity: 'danger' as const },
  { text: 'Training certification gap detected for 12 crane operators', severity: 'warning' as const },
];

// ─── Mini Bar Sparkline ────────────────────────────
const SPARK_BG: Record<string, string> = {
  primary: 'bg-primary-100',
  success: 'bg-success-100',
  warning: 'bg-warning-100',
  danger: 'bg-danger-100',
  info: 'bg-info-100',
};

function MiniSparkBars({ heights, color }: { heights: number[]; color: string }) {
  const barColor = COLOR_MAP[color]?.bar || 'bg-primary-500';
  const dimColor = SPARK_BG[color] || 'bg-primary-200';
  return (
    <div className="mt-4 h-10 w-full flex items-end gap-[3px]">
      {heights.map((h, i) => {
        const isLast = i === heights.length - 1;
        return (
          <div
            key={i}
            className={`flex-1 rounded-t-sm transition-all duration-300 ${isLast ? barColor : dimColor}`}
            style={{ height: `${h}%` }}
          />
        );
      })}
    </div>
  );
}

// ─── Per-card spark patterns ───────────────────────
const SPARK_PATTERNS: Record<string, number[]> = {
  incident_free_days: [40, 50, 55, 65, 70, 85, 100],
  man_hours:          [30, 45, 60, 55, 75, 65, 95],
  active_permits:     [50, 40, 65, 70, 60, 80, 100],
  open_observations:  [80, 70, 60, 55, 50, 45, 40],
  pending_amendments: [35, 50, 45, 60, 55, 70, 65],
  open_mom_actions:   [60, 70, 50, 80, 65, 75, 55],
  pending_mockups:    [45, 55, 65, 50, 70, 60, 85],
  env_manifests:      [30, 40, 50, 55, 60, 70, 90],
};

// ─── Stat Card (Monolith-style) ────────────────────
function MonolithStatCard({ stat }: { stat: DashboardStat }) {
  const Icon = STAT_ICONS[stat.key] || Shield;
  const colors = COLOR_MAP[stat.color] || COLOR_MAP.primary;
  const sparkHeights = SPARK_PATTERNS[stat.key] || [40, 60, 50, 80, 70, 90, 100];

  return (
    <div className="bg-surface p-3.5 sm:p-5 rounded-[var(--radius-xl)] border border-border shadow-xs hover:shadow-md transition-all duration-300 min-h-card">
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
      <MiniSparkBars heights={sparkHeights} color={stat.color} />
    </div>
  );
}

// ─── Bar Chart ─────────────────────────────────────
function BarChart({ data, metric = 'observations' }: { data: MonthlyTrend[]; metric?: 'observations' | 'permits' }) {
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
        const h = Math.max((d[metric] / maxVal) * 100, 8);
        return (
          <div key={d.month} className="flex flex-col items-center gap-2 flex-1 group cursor-pointer">
            <div
              className={`w-full max-w-10 rounded-t-[var(--radius-md)] transition-all duration-300 ${
                isLast ? 'bg-primary-600' : 'bg-primary-500/20 group-hover:bg-primary-600'
              }`}
              style={{ height: `${h}%` }}
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

// ─── Main Dashboard ────────────────────────────────
export default function DashboardPage() {
  const { user } = useAuth();
  const { data, isLoading } = useDashboardData();
  const navigate = useNavigate();
  const [chartView, setChartView] = useState<'observations' | 'permits'>('observations');

  const greeting = data?.greeting || 'Good morning';
  const stats = data?.stats || FALLBACK_STATS;
  const trend = data?.monthlyTrend || FALLBACK_TREND;
  const activity = data?.recentActivity || FALLBACK_ACTIVITY;
  const compliance = data?.complianceScores || FALLBACK_COMPLIANCE;
  const firstName = user?.name?.split(' ')[0] || 'there';

  // Show top 4 stats for the bento grid
  const topStats = stats.slice(0, 4);

  return (
    <div className="space-y-5 sm:space-y-8 max-w-[1440px]">
      {/* ── Welcome Header ──────────────────────────── */}
      <div>
        <h3 className="text-[22px] sm:text-[28px] font-extrabold text-text-primary tracking-tight mb-1">
          {greeting}, {firstName}.
        </h3>
        <p className="text-text-secondary text-[13px] sm:text-[15px]">
          Your EHS performance overview for this month.
        </p>
      </div>

      {/* ── Summary Cards Bento Grid ────────────────── */}
      <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-5">
        {topStats.map((stat) => (
          <MonolithStatCard key={stat.key} stat={stat} />
        ))}
      </div>

      {/* ── Main Content Grid ───────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 sm:gap-6">

        {/* Analytics Chart */}
        <div className="lg:col-span-8 bg-surface p-4 sm:p-6 rounded-[var(--radius-xl)] border border-border shadow-xs">
          <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3 mb-6 sm:mb-8">
            <div>
              <h3 className="text-[16px] sm:text-[18px] font-bold text-text-primary">Safety Performance</h3>
              <p className="text-text-secondary text-[12px] sm:text-[13px]">Monthly observations & permit activity</p>
            </div>
            <div className="flex bg-surface-sunken p-1 rounded-[var(--radius-md)] self-start">
              <button
                onClick={() => setChartView('observations')}
                className={`px-3 sm:px-4 py-1.5 text-[11px] sm:text-[12px] font-bold rounded-[var(--radius-sm)] transition-colors ${
                  chartView === 'observations' ? 'bg-surface shadow-xs text-primary-600' : 'text-text-secondary font-medium hover:text-primary-600'
                }`}
              >
                Observations
              </button>
              <button
                onClick={() => setChartView('permits')}
                className={`px-3 sm:px-4 py-1.5 text-[11px] sm:text-[12px] font-bold rounded-[var(--radius-sm)] transition-colors ${
                  chartView === 'permits' ? 'bg-surface shadow-xs text-primary-600' : 'text-text-secondary font-medium hover:text-primary-600'
                }`}
              >
                Permits
              </button>
            </div>
          </div>

          {isLoading ? (
            <div className="h-64 flex items-center justify-center">
              <div className="w-8 h-8 border-2 border-primary-200 border-t-primary-600 rounded-full animate-spin" />
            </div>
          ) : (
            <BarChart data={trend} metric={chartView} />
          )}

          {/* Chart footer actions */}
          <div className="mt-6 sm:mt-8 pt-4 sm:pt-6 border-t border-border flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div className="flex items-center gap-4 text-[11px] sm:text-[12px] text-text-tertiary">
              <span className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-sm bg-primary-600" />
                Current Month
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-sm bg-primary-500/20" />
                Previous Months
              </span>
            </div>
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
          </div>
        </div>

        {/* Right Column */}
        <div className="lg:col-span-4 space-y-4 sm:space-y-6">

          {/* Quick Operations */}
          <div className="bg-surface-sunken p-5 rounded-[var(--radius-xl)]">
            <h4 className="text-[11px] font-bold text-text-primary uppercase tracking-widest mb-4">Quick Operations</h4>
            <div className="grid grid-cols-2 gap-3">
              <QuickOpButton icon={UserPlus} label="Add User" color="bg-primary-50 text-primary-600 group-hover:bg-primary-600 group-hover:text-white" onClick={() => navigate('/admin/users')} />
              <QuickOpButton icon={Rocket} label="New Permit" color="bg-warning-50 text-warning-600 group-hover:bg-warning-600 group-hover:text-white" onClick={() => navigate('/permits')} />
              <QuickOpButton icon={Database} label="Backup DB" color="bg-success-50 text-success-600 group-hover:bg-success-600 group-hover:text-white" onClick={() => alert('Database backup initiated.')} />
              <QuickOpButton icon={Mail} label="Send Alert" color="bg-danger-50 text-danger-600 group-hover:bg-danger-600 group-hover:text-white" onClick={() => alert('Send Alert feature coming soon.')} />
            </div>
          </div>

          {/* Recent Activity */}
          <div className="bg-surface p-5 rounded-[var(--radius-xl)] border border-border shadow-xs">
            <div className="flex justify-between items-center mb-5">
              <h4 className="text-[16px] font-bold text-text-primary">Recent Activity</h4>
              <button onClick={() => navigate('/observations')} className="text-text-tertiary hover:text-primary-600 transition-colors">
                <MoreHorizontal size={18} />
              </button>
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
                        a.status === 'closed' ? 'bg-success-500' :
                        a.status === 'open' ? 'bg-warning-500' :
                        'bg-info-500'
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
            <button onClick={() => navigate('/observations')} className="w-full mt-5 py-2.5 text-[11px] font-bold text-primary-600 bg-primary-50 rounded-[var(--radius-lg)] hover:bg-primary-100 transition-colors uppercase tracking-widest">
              View All Activity
            </button>
          </div>
        </div>
      </div>

      {/* ── AI Intelligence + Compliance ──────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-4 sm:gap-6">
        {/* AI Panel (dark) */}
        <div className="lg:col-span-3 bg-[#0F1623] rounded-[var(--radius-xl)] border border-white/[0.06] p-4 sm:p-6 shadow-sm">
          <div className="flex items-center gap-2.5 mb-1">
            <Brain size={18} className="text-primary-500" />
            <h3 className="text-[15px] font-semibold text-white">AI Intelligence</h3>
            <span className="w-2 h-2 rounded-full bg-primary-500 animate-pulse" />
          </div>
          <p className="text-[11px] text-white/40 mb-5">Live analysis across all modules</p>

          <div className="space-y-3.5">
            {AI_INSIGHTS.map((insight, i) => (
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

        {/* Compliance Scorecard */}
        <div className="lg:col-span-2 bg-surface p-4 sm:p-6 rounded-[var(--radius-xl)] border border-border shadow-xs">
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
      </div>

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
