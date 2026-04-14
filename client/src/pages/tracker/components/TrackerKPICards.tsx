import { ClipboardCheck, Activity, AlertTriangle, Clock, Layers, FolderOpen } from 'lucide-react';

const KPI_CONFIG = [
  { key: 'total_items', label: 'Total Items', icon: ClipboardCheck, color: 'var(--color-kpi-total)' },
  { key: 'active', label: 'Active', icon: Activity, color: 'var(--color-kpi-active)' },
  { key: 'expired', label: 'Expired', icon: AlertTriangle, color: 'var(--color-kpi-danger)', pulse: true },
  { key: 'expiring_soon', label: 'Expiring Soon', icon: Clock, color: 'var(--color-kpi-warning)' },
  { key: 'total_groups', label: 'Groups', icon: Layers, color: 'var(--color-kpi-muted)' },
  { key: 'total_categories', label: 'Categories', icon: FolderOpen, color: 'var(--color-kpi-muted)' },
] as const;

interface KPIData {
  total_items: number;
  active: number;
  expired: number;
  expiring_soon: number;
  total_groups: number;
  total_categories: number;
}

interface Props {
  kpis: KPIData | undefined;
  loading: boolean;
}

export function TrackerKPICards({ kpis, loading }: Props) {
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
        const val = kpis?.[cfg.key as keyof KPIData] ?? 0;
        const shouldPulse = 'pulse' in cfg && cfg.pulse && typeof val === 'number' && val > 0;

        return (
          <div
            key={cfg.key}
            className={`std-kpi-card${shouldPulse ? ' std-kpi-card--pulse' : ''}`}
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
