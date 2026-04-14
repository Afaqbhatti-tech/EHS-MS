import { Users, UserCheck, Shield, UserX, TrendingUp, AlertTriangle } from 'lucide-react';
import type { ManpowerStats } from '../hooks/useManpower';

const KPI_CONFIG = [
  { key: 'total', label: 'Total Workers', icon: Users, color: 'var(--color-kpi-total)' },
  { key: 'active', label: 'Active Workers', icon: UserCheck, color: 'var(--color-kpi-active)' },
  { key: 'inducted', label: 'Inducted', icon: Shield, color: 'var(--color-kpi-info)' },
  { key: 'not_inducted', label: 'Not Inducted', icon: UserX, color: 'var(--color-kpi-danger)', pulse: true },
  { key: 'induction_rate', label: 'Induction Rate', icon: TrendingUp, color: 'var(--color-kpi-warning)', suffix: '%' },
  { key: 'legacy_review_count', label: 'ID Review', icon: AlertTriangle, color: 'var(--color-warning-600)', pulse: true },
] as const;

interface Props {
  kpis: ManpowerStats['kpis'] | undefined;
  loading: boolean;
  onLegacyReviewClick?: () => void;
}

export function ManpowerKPICards({ kpis, loading, onLegacyReviewClick }: Props) {
  if (loading) {
    return (
      <div className="std-kpi-grid">
        {KPI_CONFIG.filter(c => c.key !== 'legacy_review_count').map((_, i) => (
          <div key={i} className="std-kpi-card" style={{ animationDelay: `${i * 60}ms` }}>
            <div className="skeleton" style={{ width: 80, height: 12 }} />
            <div className="skeleton" style={{ width: 48, height: 28, marginTop: 4 }} />
          </div>
        ))}
      </div>
    );
  }

  const visibleCards = KPI_CONFIG.filter(cfg => {
    if (cfg.key === 'legacy_review_count') {
      const val = kpis?.[cfg.key] ?? 0;
      return val > 0;
    }
    return true;
  });

  return (
    <div className="std-kpi-grid">
      {visibleCards.map((cfg, i) => {
        const Icon = cfg.icon;
        const val = kpis?.[cfg.key as keyof typeof kpis] ?? 0;
        const suffix = 'suffix' in cfg ? cfg.suffix : '';
        const isNotInducted = cfg.key === 'not_inducted' && typeof val === 'number' && val > 0;
        const isLegacyReview = cfg.key === 'legacy_review_count' && typeof val === 'number' && val > 0;
        const shouldPulse = (isNotInducted || isLegacyReview) && 'pulse' in cfg;
        const isClickable = cfg.key === 'legacy_review_count' && onLegacyReviewClick;

        return (
          <div
            key={cfg.key}
            className={`std-kpi-card${shouldPulse ? ' std-kpi-card--pulse' : ''}${isClickable ? ' cursor-pointer hover:shadow-md transition-shadow' : ''}`}
            style={{ animationDelay: `${i * 60}ms`, borderLeft: `3px solid ${cfg.color}` }}
            onClick={isClickable ? onLegacyReviewClick : undefined}
            title={isClickable ? 'Click to filter legacy ID review candidates' : undefined}
          >
            <div className="std-kpi-card__label">
              <Icon size={14} style={{ color: cfg.color }} />
              {cfg.label}
            </div>
            <div className="std-kpi-card__value" style={{ color: cfg.color }}>
              {val}{suffix}
            </div>
          </div>
        );
      })}
    </div>
  );
}
