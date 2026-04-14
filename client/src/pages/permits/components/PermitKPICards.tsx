import { ClipboardCheck, CheckCircle2, FileEdit, AlertTriangle, XCircle } from 'lucide-react';
import type { PermitStats } from '../hooks/usePermits';

const KPI_CONFIG = [
  { key: 'total', label: 'Total Permits', icon: ClipboardCheck, color: 'var(--color-kpi-total)' },
  { key: 'active', label: 'Active', icon: CheckCircle2, color: 'var(--color-kpi-active)' },
  { key: 'draft', label: 'Draft', icon: FileEdit, color: 'var(--color-kpi-info)' },
  { key: 'expired', label: 'Expired', icon: AlertTriangle, color: 'var(--color-kpi-danger)', pulse: true },
  { key: 'closed', label: 'Closed', icon: XCircle, color: 'var(--color-kpi-muted)' },
] as const;

interface Props {
  kpis: PermitStats['kpis'] | undefined;
  loading: boolean;
}

export function PermitKPICards({ kpis, loading }: Props) {
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
        const isOverdue = cfg.key === 'expired' && typeof val === 'number' && val > 0;

        return (
          <div
            key={cfg.key}
            className={`std-kpi-card${isOverdue ? ' std-kpi-card--pulse' : ''}`}
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
