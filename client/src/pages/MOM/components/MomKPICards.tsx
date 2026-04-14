import { FileText, ListChecks, AlertCircle, Clock, CheckCircle, AlertTriangle, Calendar } from 'lucide-react';
import type { MomStats } from '../hooks/useMom';

interface Props {
  kpis: MomStats['kpis'] | undefined;
  loading: boolean;
}

const CARDS = [
  { key: 'total_moms',   label: 'Total MOMs',   color: '#1F8034', icon: FileText },
  { key: 'total_points', label: 'Total Points',  color: '#0284C7', icon: ListChecks },
  { key: 'open_points',  label: 'Open Points',   color: '#DC2626', icon: AlertCircle, pulse: true },
  { key: 'in_progress',  label: 'In Progress',   color: '#D97706', icon: Clock },
  { key: 'resolved',     label: 'Resolved',      color: '#16A34A', icon: CheckCircle },
  { key: 'overdue',      label: 'Overdue',        color: '#DC2626', icon: AlertTriangle, pulse: true },
  { key: 'this_week',    label: 'This Week',      color: '#0284C7', icon: Calendar },
] as const;

export function MomKPICards({ kpis, loading }: Props) {
  if (loading || !kpis) {
    return (
      <div className="std-kpi-grid">
        {CARDS.map((c, i) => (
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
      {CARDS.map((c, i) => {
        const val = kpis[c.key as keyof typeof kpis] ?? 0;
        const shouldPulse = 'pulse' in c && c.pulse && val > 0;
        return (
          <div
            key={c.key}
            className={`std-kpi-card${shouldPulse ? ' std-kpi-card--pulse' : ''}`}
            style={{ animationDelay: `${i * 60}ms`, borderLeft: `3px solid ${c.color}` }}
          >
            <div className="std-kpi-card__label">
              <c.icon size={14} style={{ color: c.color }} />
              {c.label}
            </div>
            <div className="std-kpi-card__value" style={{ color: c.color }}>
              {val}
            </div>
          </div>
        );
      })}
    </div>
  );
}
