import { FileText, Truck, CheckCircle, AlertTriangle, AlertOctagon, XCircle, Calendar } from 'lucide-react';
import type { ManifestStats } from '../hooks/useManifests';

interface Props {
  stats: ManifestStats | null;
  loading: boolean;
}

const cards = [
  { key: 'total_manifests', label: 'Total Manifests', icon: FileText, color: '#2E9E45' },
  { key: 'in_transit', label: 'In Transit', icon: Truck, color: '#D97706', pulse: true },
  { key: 'completed', label: 'Completed', icon: CheckCircle, color: '#16A34A' },
  { key: 'delayed_manifests', label: 'Delayed', icon: AlertTriangle, color: '#DC2626', pulse: true },
  { key: 'hazardous_manifests', label: 'Hazardous', icon: AlertOctagon, color: '#DC2626' },
  { key: 'non_compliant_manifests', label: 'Non-Compliant', icon: XCircle, color: '#B91C1C' },
  { key: 'cancelled_rejected', label: 'Cancelled / Rejected', icon: XCircle, color: '#6B7280' },
  { key: 'created_this_month', label: 'This Month', icon: Calendar, color: '#0284C7' },
] as const;

export default function ManifestKPICards({ stats, loading }: Props) {
  return (
    <div className="std-kpi-grid">
      {cards.map((card, i) => {
        const value = stats?.kpis?.[card.key as keyof typeof stats.kpis] ?? 0;
        const shouldPulse = 'pulse' in card && card.pulse && (value as number) > 0;

        return (
          <div
            key={card.key}
            className={`std-kpi-card${shouldPulse ? ' std-kpi-card--pulse' : ''}`}
            style={{ animationDelay: `${i * 60}ms`, borderLeft: `3px solid ${card.color}` }}
          >
            {loading ? (
              <>
                <div className="skeleton" style={{ width: 80, height: 12 }} />
                <div className="skeleton" style={{ width: 48, height: 28, marginTop: 4 }} />
              </>
            ) : (
              <>
                <div className="std-kpi-card__label">
                  <card.icon size={14} style={{ color: card.color }} />
                  {card.label}
                </div>
                <div className="std-kpi-card__value" style={{ color: card.color }}>
                  {value}
                </div>
              </>
            )}
          </div>
        );
      })}
    </div>
  );
}
