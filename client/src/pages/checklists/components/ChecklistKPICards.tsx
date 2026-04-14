import { ClipboardCheck, Activity, AlertTriangle, Clock, Ban, FileCheck } from 'lucide-react';
import type { ChecklistStats } from '../hooks/useChecklists';

const KPI_CONFIG = [
  { key: 'total', label: 'Total Items', icon: ClipboardCheck, color: 'var(--color-kpi-total)' },
  { key: 'active', label: 'Active', icon: Activity, color: 'var(--color-kpi-active)' },
  { key: 'overdue', label: 'Overdue', icon: AlertTriangle, color: 'var(--color-kpi-danger)', pulse: true },
  { key: 'due_soon', label: 'Due Soon', icon: Clock, color: 'var(--color-kpi-warning)' },
  { key: 'out_of_service', label: 'Out of Service', icon: Ban, color: 'var(--color-kpi-muted)' },
  { key: 'inspections_this_month', label: 'Inspections (Month)', icon: FileCheck, color: 'var(--color-kpi-info)' },
] as const;

interface Props {
  kpis: ChecklistStats['kpis'] | undefined;
  loading: boolean;
}

export function ChecklistKPICards({ kpis, loading }: Props) {
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
        const isOverdue = cfg.key === 'overdue' && typeof val === 'number' && val > 0;

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
