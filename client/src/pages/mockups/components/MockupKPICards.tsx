import {
  FileText, Send, CheckCircle2, XCircle, MessageSquare,
  ShieldCheck, AlertOctagon, AlertTriangle,
} from 'lucide-react';
import type { MockupStats } from '../hooks/useMockups';

interface Props {
  kpis: MockupStats['kpis'] | undefined;
  loading: boolean;
}

const cards = [
  { key: 'total', label: 'Total', icon: FileText, color: 'var(--color-kpi-total)' },
  { key: 'submitted', label: 'Under Review', icon: Send, color: 'var(--color-info)' },
  { key: 'approved', label: 'Approved', icon: CheckCircle2, color: 'var(--color-success)' },
  { key: 'rejected', label: 'Rejected', icon: XCircle, color: 'var(--color-danger)' },
  { key: 'approved_with_comments', label: 'With Comments', icon: MessageSquare, color: 'var(--color-warning)' },
  { key: 'compliance_pending', label: 'Pending Compliance', icon: AlertTriangle, color: '#EA580C', pulse: true },
  { key: 'can_proceed', label: 'Can Proceed', icon: ShieldCheck, color: '#16A34A' },
  { key: 'blocked', label: 'Blocked', icon: AlertOctagon, color: 'var(--color-danger-600)', pulse: true },
] as const;

export function MockupKPICards({ kpis, loading }: Props) {
  if (loading || !kpis) {
    return (
      <div className="std-kpi-grid">
        {cards.map((c, i) => (
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
      {cards.map((c, i) => {
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
