import {
  FileText,
  Clock,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Shield,
  Calendar,
  Timer,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import type { AmendmentStats } from '../hooks/useAmendments';

/* ── Config ───────────────────────────────────────── */

interface KPICardConfig {
  key: string;
  label: string;
  icon: LucideIcon;
  color: string;
  suffix?: string;
  pulse?: boolean;
}

const KPI_CARDS: KPICardConfig[] = [
  { key: 'total_amendments', label: 'Total Amendments', icon: FileText, color: 'var(--color-primary-600)' },
  { key: 'pending_review', label: 'Pending Review', icon: Clock, color: 'var(--color-warning-600)', pulse: true },
  { key: 'approved', label: 'Approved', icon: CheckCircle, color: 'var(--color-success-600)' },
  { key: 'rejected', label: 'Rejected', icon: XCircle, color: 'var(--color-danger-600)' },
  { key: 'approved_with_comments', label: 'With Conditions', icon: AlertTriangle, color: 'var(--color-warning-600)' },
  { key: 'major_amendments', label: 'Major Amendments', icon: Shield, color: 'var(--color-danger-600)' },
  { key: 'this_month', label: 'This Month', icon: Calendar, color: 'var(--color-info-600)' },
  { key: 'avg_approval_days', label: 'Avg Approval Days', icon: Timer, color: 'var(--color-text-secondary)', suffix: ' days' },
];

/* ── Component ────────────────────────────────────── */

interface Props {
  stats: AmendmentStats | null;
  loading: boolean;
}

const AmendmentKPICards = ({ stats, loading }: Props) => {
  if (loading) {
    return (
      <div className="std-kpi-grid">
        {KPI_CARDS.map((_, i) => (
          <div key={i} className="std-kpi-card" style={{ animationDelay: `${i * 60}ms` }}>
            <div className="skeleton" style={{ width: 80, height: 12 }} />
            <div className="skeleton" style={{ width: 48, height: 28, marginTop: 4 }} />
          </div>
        ))}
      </div>
    );
  }

  const getValue = (key: string): number => {
    if (!stats) return 0;
    if (key === 'avg_approval_days') return stats.avg_approval_days ?? 0;
    const kpis = stats.kpis as Record<string, number> | undefined;
    return kpis?.[key] ?? 0;
  };

  return (
    <div className="std-kpi-grid">
      {KPI_CARDS.map((cfg, i) => {
        const Icon = cfg.icon;
        const raw = getValue(cfg.key);
        const value = cfg.suffix
          ? `${Math.round(raw * 10) / 10}${cfg.suffix}`
          : String(raw);
        const shouldPulse = cfg.pulse && raw > 0;

        return (
          <div
            key={cfg.key}
            className={`std-kpi-card${shouldPulse ? ' std-kpi-card--pulse' : ''}`}
            style={{ animationDelay: `${i * 60}ms`, borderLeft: `3px solid ${cfg.color}` }}
          >
            <div className="std-kpi-card__label">
              <Icon size={14} style={{ color: cfg.color }} />
              {cfg.label}
            </div>
            <div className="std-kpi-card__value" style={{ color: cfg.color }}>
              {value}
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default AmendmentKPICards;
