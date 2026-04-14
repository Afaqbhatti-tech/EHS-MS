import React from 'react';
import {
  FileText, CheckCircle, Clock, AlertTriangle, XCircle,
  AlertOctagon, Calendar, FileEdit,
} from 'lucide-react';
import type { DcStats } from '../hooks/useDocuments';

interface Props {
  stats: DcStats | null;
  loading: boolean;
  onFilterClick?: (filter: Record<string, string>) => void;
}

export default function DocumentKPICards({ stats, loading, onFilterClick }: Props) {
  const k = stats?.kpis;
  const cards = [
    { label: 'Total Documents', value: k?.total_documents ?? 0, color: 'var(--color-kpi-total)', icon: FileText, filter: {} },
    { label: 'Active', value: k?.active ?? 0, color: 'var(--color-kpi-active)', icon: CheckCircle, pulse: true, filter: { status: 'Active' } },
    { label: 'Under Review', value: k?.under_review ?? 0, color: 'var(--color-info)', icon: Clock, filter: { status: 'Under Review' } },
    { label: 'Pending Approvals', value: k?.pending_approvals ?? 0, color: 'var(--color-warning)', icon: AlertTriangle, pulse: (k?.pending_approvals ?? 0) > 0, filter: {} },
    { label: 'Expired', value: k?.expired ?? 0, color: 'var(--color-danger)', icon: AlertOctagon, pulse: (k?.expired ?? 0) > 0, filter: { is_expired: '1' } },
    { label: 'Overdue Review', value: k?.overdue_review ?? 0, color: 'var(--color-danger)', icon: XCircle, filter: { is_overdue_review: '1' } },
    { label: 'Expiring Soon', value: k?.expiring_soon ?? 0, color: 'var(--color-warning)', icon: Calendar, filter: { is_expiring_soon: '1' } },
    { label: 'Draft', value: k?.draft ?? 0, color: 'var(--color-kpi-muted)', icon: FileEdit, filter: { status: 'Draft' } },
  ];

  return (
    <div className="std-kpi-grid">
      {cards.map((c, i) => {
        const Icon = c.icon;
        const shouldPulse = c.pulse && c.value > 0;
        return (
          <div
            key={i}
            className={`std-kpi-card${shouldPulse ? ' std-kpi-card--pulse' : ''}`}
            style={{
              animationDelay: `${i * 60}ms`,
              borderLeft: `3px solid ${c.color}`,
              cursor: onFilterClick ? 'pointer' : 'default',
            }}
            onClick={() => onFilterClick?.(c.filter)}
          >
            <div className="std-kpi-card__label">
              <Icon size={14} style={{ color: c.color }} />
              {c.label}
            </div>
            <div className="std-kpi-card__value" style={{ color: c.color }}>
              {loading ? '...' : c.value}
            </div>
          </div>
        );
      })}
    </div>
  );
}
