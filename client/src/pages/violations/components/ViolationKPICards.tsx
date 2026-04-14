import { AlertTriangle, ShieldAlert, Search, CheckCircle, RotateCcw, ArrowUpCircle, Ban } from 'lucide-react';
import type { ViolationStats } from '../useViolations';

interface Props { stats: ViolationStats | undefined; isLoading: boolean }

const KPI_CONFIG = [
  { key: 'total', label: 'Total Violations', icon: Ban, color: 'var(--color-kpi-total)' },
  { key: 'open', label: 'Open', icon: AlertTriangle, color: 'var(--color-kpi-warning)' },
  { key: 'under_investigation', label: 'Under Investigation', icon: Search, color: 'var(--color-kpi-info)' },
  { key: 'in_progress', label: 'In Progress', icon: ArrowUpCircle, color: 'var(--color-kpi-active)' },
  { key: 'closed', label: 'Closed', icon: CheckCircle, color: 'var(--color-kpi-muted)' },
  { key: 'critical', label: 'Critical', icon: ShieldAlert, color: 'var(--color-kpi-danger)', pulse: true },
  { key: 'reopened', label: 'Reopened', icon: RotateCcw, color: 'var(--color-kpi-warning)' },
] as const;

export default function ViolationKPICards({ stats, isLoading }: Props) {
  if (isLoading) {
    return (
      <div className="std-kpi-grid">
        {KPI_CONFIG.map((_, i) => (
          <div key={i} className="std-kpi-card" style={{ animationDelay: `${i * 60}ms` }}>
            <div className="skeleton" style={{ width: 80, height: 12 }} />
            <div className="skeleton" style={{ width: 48, height: 28, marginTop: 4 }} />
          </div>
        ))}
      </div>
    );
  }

  const kpis = stats?.kpis;

  return (
    <div className="std-kpi-grid">
      {KPI_CONFIG.map((cfg, i) => {
        const Icon = cfg.icon;
        const val = kpis?.[cfg.key as keyof typeof kpis] ?? 0;
        const shouldPulse = 'pulse' in cfg && cfg.pulse && typeof val === 'number' && val > 0;

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
              {val}
            </div>
          </div>
        );
      })}
    </div>
  );
}
