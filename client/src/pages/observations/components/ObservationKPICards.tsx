import { Eye, AlertCircle, Clock, CheckCircle2, ShieldCheck, AlertTriangle, RotateCcw } from 'lucide-react';
import type { ObservationStats } from '../hooks/useObservations';

const KPI_CONFIG = [
  { key: 'total', label: 'Total Observations', icon: Eye, color: 'var(--color-kpi-total)' },
  { key: 'open', label: 'Open', icon: AlertCircle, color: '#DC2626', pulse: true },
  { key: 'in_progress', label: 'In Progress', icon: Clock, color: '#D97706' },
  { key: 'closed', label: 'Closed', icon: CheckCircle2, color: '#16A34A' },
  { key: 'verified', label: 'Verified', icon: ShieldCheck, color: '#059669' },
  { key: 'overdue', label: 'Overdue', icon: AlertTriangle, color: '#DC2626', pulse: true },
  { key: 'reopened', label: 'Reopened', icon: RotateCcw, color: '#D97706' },
] as const;

interface Props {
  kpis: ObservationStats['kpis'] | undefined;
  loading: boolean;
}

export function ObservationKPICards({ kpis, loading }: Props) {
  if (loading) {
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
