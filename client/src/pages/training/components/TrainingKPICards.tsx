import { Award, CheckCircle, AlertTriangle, XCircle, Users, CalendarDays, Clock, UserX } from 'lucide-react';
import type { TrainingStats } from '../hooks/useTraining';

const KPI_CONFIG = [
  { key: 'total_records', label: 'Total Records', icon: Award, color: 'var(--color-kpi-total)' },
  { key: 'valid', label: 'Valid', icon: CheckCircle, color: '#16a34a' },
  { key: 'expired', label: 'Expired', icon: XCircle, color: '#dc2626', pulse: true },
  { key: 'expiring_soon', label: 'Expiring Soon', icon: AlertTriangle, color: '#ca8a04', pulse: true },
  { key: 'pending', label: 'Pending', icon: Clock, color: '#d97706' },
  { key: 'total_workers', label: 'Total Workers', icon: Users, color: 'var(--color-kpi-total)' },
  { key: 'workers_trained', label: 'Workers Trained', icon: UserX, color: '#2563eb' },
  { key: 'this_month', label: 'This Month', icon: CalendarDays, color: '#4f46e5' },
] as const;

interface Props {
  kpis?: TrainingStats['kpis'];
  loading: boolean;
}

export function TrainingKPICards({ kpis, loading }: Props) {
  if (loading) {
    return (
      <div className="std-kpi-grid">
        {KPI_CONFIG.map((c, i) => (
          <div key={c.key} className="std-kpi-card" style={{ animationDelay: `${i * 60}ms` }}>
            <div className="skeleton" style={{ width: 80, height: 12 }} />
            <div className="skeleton" style={{ width: 48, height: 28, marginTop: 4 }} />
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="std-kpi-grid">
      {KPI_CONFIG.map((c, i) => {
        const Icon = c.icon;
        const value = kpis?.[c.key as keyof typeof kpis] ?? 0;
        const shouldPulse = 'pulse' in c && c.pulse && typeof value === 'number' && value > 0;

        return (
          <div
            key={c.key}
            className={`std-kpi-card${shouldPulse ? ' std-kpi-card--pulse' : ''}`}
            style={{ animationDelay: `${i * 60}ms`, borderLeft: `3px solid ${c.color}` }}
          >
            <div className="std-kpi-card__label">
              <Icon size={14} style={{ color: c.color }} />
              {c.label}
            </div>
            <div className="std-kpi-card__value" style={{ color: c.color }}>
              {value}
            </div>
          </div>
        );
      })}
    </div>
  );
}
