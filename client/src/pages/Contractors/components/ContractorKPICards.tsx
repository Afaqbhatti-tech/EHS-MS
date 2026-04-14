import {
  Building2, Activity, ShieldOff, CalendarX, FileWarning,
  Clock, CalendarClock, Users,
} from 'lucide-react';
import type { ContractorStats } from '../hooks/useContractors';

interface Props {
  stats: ContractorStats | null;
  loading: boolean;
}

const cards = [
  { key: 'total_contractors',       label: 'Total Contractors',    icon: Building2,     color: '#2E9E45' },
  { key: 'active_contractors',      label: 'Active Now',           icon: Activity,      color: '#059669', pulse: true },
  { key: 'suspended',               label: 'Suspended',            icon: ShieldOff,     color: '#D97706', pulse: true },
  { key: 'expired',                 label: 'Expired',              icon: CalendarX,     color: '#DC2626' },
  { key: 'with_expired_docs',       label: 'Expired Documents',    icon: FileWarning,   color: '#B91C1C', pulse: true },
  { key: 'with_expiring_docs',      label: 'Expiring Soon',        icon: Clock,         color: '#92400E' },
  { key: 'contracts_expiring_soon', label: 'Contracts Expiring',   icon: CalendarClock, color: '#0284C7' },
  { key: 'total_workforce',         label: 'Total Workforce',      icon: Users,         color: '#6D28D9' },
] as const;

export default function ContractorKPICards({ stats, loading }: Props) {
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
                  {typeof value === 'number' ? value.toLocaleString() : value}
                </div>
              </>
            )}
          </div>
        );
      })}
    </div>
  );
}
