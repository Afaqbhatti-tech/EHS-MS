import { ClipboardCheck, Calendar, CheckCircle, XCircle, AlertTriangle, FileText } from 'lucide-react';
import type { InspectionStats } from '../../hooks/useTracker';

interface Props {
  kpis: InspectionStats['kpis'] | null;
  loading: boolean;
}

const CARDS = [
  { key: 'total_inspections', label: 'Total Inspections', icon: ClipboardCheck, color: 'var(--color-kpi-total)' },
  { key: 'this_month', label: 'This Month', icon: Calendar, color: 'var(--color-primary-600)' },
  { key: 'pass_rate', label: 'Pass Rate', icon: CheckCircle, color: 'var(--color-health-good-text)' },
  { key: 'fail_count', label: 'Failed', icon: XCircle, color: 'var(--color-kpi-danger)' },
  { key: 'with_defects', label: 'With Defects', icon: AlertTriangle, color: 'var(--color-kpi-warning)' },
  { key: 'with_checklists', label: 'With Checklists', icon: FileText, color: 'var(--color-primary-600)' },
] as const;

export function InspectionKPICards({ kpis, loading }: Props) {
  if (loading || !kpis) {
    return (
      <div className="std-kpi-grid">
        {CARDS.map((_, i) => (
          <div key={i} className="std-kpi-card" style={{ animationDelay: `${i * 60}ms` }}>
            <div className="skeleton" style={{ width: 80, height: 12 }} />
            <div className="skeleton" style={{ width: 48, height: 28, marginTop: 4 }} />
          </div>
        ))}
      </div>
    );
  }

  const passRate = kpis.total_inspections > 0
    ? Math.round((kpis.pass_count / kpis.total_inspections) * 100)
    : 0;

  const values: Record<string, string | number> = {
    total_inspections: kpis.total_inspections,
    this_month: kpis.this_month,
    pass_rate: `${passRate}%`,
    fail_count: kpis.fail_count,
    with_defects: kpis.with_defects,
    with_checklists: kpis.with_checklists,
  };

  return (
    <div className="std-kpi-grid">
      {CARDS.map((card, i) => {
        const Icon = card.icon;
        return (
          <div
            key={card.key}
            className="std-kpi-card"
            style={{ animationDelay: `${i * 60}ms`, borderLeft: `3px solid ${card.color}` }}
          >
            <div className="std-kpi-card__label">
              <Icon size={14} style={{ color: card.color }} />
              {card.label}
            </div>
            <div className="std-kpi-card__value" style={{ color: card.color }}>
              {values[card.key]}
            </div>
          </div>
        );
      })}
    </div>
  );
}
