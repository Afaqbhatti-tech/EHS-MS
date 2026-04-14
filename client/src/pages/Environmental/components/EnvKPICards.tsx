import React from 'react';
import {
  Layers, AlertTriangle, Trash2, Biohazard,
  Flame, AlertCircle, ClipboardCheck, XCircle,
  Clock, Target,
} from 'lucide-react';

// ─── Types ──────────────────────────────────────

interface EnvKPICardsProps {
  kpis: {
    total_aspects?: number;
    significant_aspects?: number;
    high_risks?: number;
    open_incidents?: number;
    pending_inspections?: number;
    compliance_rate?: number;
    waste_this_month?: number;
    exceedances_this_month?: number;
    active_objectives?: number;
    open_actions?: number;
    overdue_actions?: number;
    resource_consumption_trend?: number;
    total_waste_records?: number;
    hazardous_waste?: number;
    total_incidents?: number;
    total_compliance_items?: number;
    non_compliant?: number;
    objectives_achieved?: number;
    objectives_total?: number;
  } | null | undefined;
}

// ─── Card Definition ────────────────────────────

interface KPICard {
  key: string;
  label: string;
  getValue: (k: NonNullable<EnvKPICardsProps['kpis']>) => string | number;
  icon: React.ElementType;
  color: string;
  pulse?: (k: NonNullable<EnvKPICardsProps['kpis']>) => boolean;
}

const CARDS: KPICard[] = [
  {
    key: 'total_aspects',
    label: 'Total Aspects',
    getValue: (k) => k.total_aspects ?? 0,
    icon: Layers,
    color: '#2563EB',
  },
  {
    key: 'high_risks',
    label: 'High Risk Aspects',
    getValue: (k) => k.high_risks ?? 0,
    icon: AlertTriangle,
    color: '#DC2626',
    pulse: (k) => (k.high_risks ?? 0) > 0,
  },
  {
    key: 'total_waste_records',
    label: 'Total Waste Records',
    getValue: (k) => k.total_waste_records ?? k.waste_this_month ?? 0,
    icon: Trash2,
    color: '#4338CA',
  },
  {
    key: 'hazardous_waste',
    label: 'Hazardous Waste',
    getValue: (k) => k.hazardous_waste ?? 0,
    icon: Biohazard,
    color: '#DC2626',
    pulse: (k) => (k.hazardous_waste ?? 0) > 0,
  },
  {
    key: 'total_incidents',
    label: 'Env Incidents',
    getValue: (k) => k.total_incidents ?? 0,
    icon: Flame,
    color: '#D97706',
  },
  {
    key: 'open_incidents',
    label: 'Open Incidents',
    getValue: (k) => k.open_incidents ?? 0,
    icon: AlertCircle,
    color: '#D97706',
    pulse: (k) => (k.open_incidents ?? 0) > 0,
  },
  {
    key: 'total_compliance_items',
    label: 'Total Compliance Items',
    getValue: (k) => k.total_compliance_items ?? 0,
    icon: ClipboardCheck,
    color: '#059669',
  },
  {
    key: 'non_compliant',
    label: 'Non-Compliant',
    getValue: (k) => k.non_compliant ?? 0,
    icon: XCircle,
    color: '#DC2626',
    pulse: (k) => (k.non_compliant ?? 0) > 0,
  },
  {
    key: 'open_actions',
    label: 'Open Actions',
    getValue: (k) => k.open_actions ?? 0,
    icon: Clock,
    color: '#D97706',
    pulse: (k) => (k.open_actions ?? 0) > 0,
  },
  {
    key: 'objectives_achieved',
    label: 'Objectives Achieved',
    getValue: (k) => {
      const achieved = k.objectives_achieved ?? 0;
      const total = k.objectives_total ?? k.active_objectives ?? 0;
      return `${achieved}/${total}`;
    },
    icon: Target,
    color: '#059669',
  },
];

// ─── Component ──────────────────────────────────

export default function EnvKPICards({ kpis }: EnvKPICardsProps) {
  const data = kpis ?? ({} as NonNullable<EnvKPICardsProps['kpis']>);

  return (
    <div className="std-kpi-grid">
      {CARDS.map((card, i) => {
        const value = card.getValue(data);
        const shouldPulse = card.pulse?.(data) ?? false;
        const Icon = card.icon;

        return (
          <div
            key={card.key}
            className={`std-kpi-card${shouldPulse ? ' std-kpi-card--pulse' : ''}`}
            style={{ animationDelay: `${i * 60}ms`, borderLeft: `3px solid ${card.color}` }}
          >
            <div className="std-kpi-card__label">
              <Icon size={14} style={{ color: card.color }} />
              {card.label}
            </div>
            <div className="std-kpi-card__value" style={{ color: card.color }}>
              {value}
            </div>
          </div>
        );
      })}
    </div>
  );
}
