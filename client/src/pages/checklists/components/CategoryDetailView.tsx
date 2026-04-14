import { AlertTriangle, Clock, Package, ChevronLeft } from 'lucide-react';
import { getCategoryConfig, getCategoryInspLabel } from '../config/checklistCategories';
import type { ChecklistItem } from '../hooks/useChecklists';

interface Props {
  categoryKey: string;
  items: ChecklistItem[];
  loading: boolean;
  onBack: () => void;
}

export function CategoryDetailView({ categoryKey, items, loading, onBack }: Props) {
  const catConfig = getCategoryConfig(categoryKey);
  const Icon = catConfig?.icon || Package;
  const inspLabel = getCategoryInspLabel(categoryKey);

  const total = items.length;
  const active = items.filter(i => i.status === 'Active').length;
  const overdue = items.filter(i => i.is_overdue).length;
  const outOfService = items.filter(i => i.status === 'Out of Service').length;

  const nearRetirement = categoryKey === 'full_body_harness'
    ? items.filter(i => {
        if (!i.retirement_date) return false;
        const retDate = new Date(i.retirement_date);
        const threeMonths = new Date();
        threeMonths.setMonth(threeMonths.getMonth() + 3);
        return retDate <= threeMonths && i.status !== 'Removed from Site';
      }).length
    : 0;

  return (
    <div className="space-y-4">
      {/* Category header card */}
      <div
        className="flex flex-wrap sm:flex-nowrap items-center gap-4 p-5 rounded-[var(--radius-lg)] border border-border bg-surface shadow-sm"
        style={{ borderTop: `5px solid ${catConfig?.color || 'var(--color-neutral-400)'}` }}
      >
        <button
          onClick={onBack}
          className="inline-flex items-center gap-1 px-3 py-1.5 text-[12px] font-medium text-text-secondary bg-surface-sunken border border-border rounded-[var(--radius-sm)] hover:bg-surface transition-colors shrink-0"
        >
          <ChevronLeft size={14} />
          Back
        </button>
        <div className="w-px h-8 bg-border" />
        <div
          className="w-[52px] h-[52px] rounded-[var(--radius-lg)] flex items-center justify-center shrink-0"
          style={{ backgroundColor: catConfig?.lightColor }}
        >
          <Icon size={26} style={{ color: catConfig?.color }} />
        </div>
        <div className="min-w-0 flex-1">
          <h2 className="text-[20px] font-bold text-text-primary">{catConfig?.label || categoryKey}</h2>
          <p className="text-[13px] text-text-secondary mt-0.5">{catConfig?.fullLabel}</p>
          <p className="text-[12px] text-text-tertiary mt-1">{inspLabel} Inspection Required</p>
        </div>
      </div>

      {/* KPI mini-chips */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: 'Total', value: total, accent: catConfig?.color || 'var(--color-neutral-700)' },
          { label: 'Active', value: active, accent: 'var(--color-kpi-active)' },
          { label: 'Overdue', value: overdue, accent: 'var(--color-kpi-danger)' },
          { label: 'Out of Service', value: outOfService, accent: 'var(--color-kpi-warning)' },
        ].map(kpi => (
          <div
            key={kpi.label}
            className="bg-surface border border-border rounded-[var(--radius-md)] p-3 text-center shadow-xs"
            style={{ borderLeft: `3px solid ${kpi.accent}` }}
          >
            <div className="text-[22px] font-extrabold leading-none" style={{ color: kpi.accent }}>{kpi.value}</div>
            <div className="text-[10px] font-semibold text-text-tertiary uppercase tracking-wider mt-1">{kpi.label}</div>
          </div>
        ))}
      </div>

      {/* Alert banners */}
      {overdue > 0 && (
        <div className="flex items-center gap-3 p-3.5 bg-danger-50 border border-danger-200 rounded-[var(--radius-md)]" style={{ borderLeft: '5px solid var(--color-danger-600)' }}>
          <AlertTriangle size={18} className="text-danger-600 shrink-0" />
          <span className="text-[13px] font-semibold text-danger-700">
            {overdue} item{overdue > 1 ? 's' : ''} overdue — inspect immediately
          </span>
        </div>
      )}

      {nearRetirement > 0 && (
        <div className="flex items-center gap-3 p-3.5 bg-warning-50 border border-warning-200 rounded-[var(--radius-md)]" style={{ borderLeft: '5px solid var(--color-warning-500)' }}>
          <Clock size={18} className="text-warning-600 shrink-0" />
          <span className="text-[13px] font-semibold text-warning-700">
            {nearRetirement} harness{nearRetirement > 1 ? 'es' : ''} approaching retirement date
          </span>
        </div>
      )}
    </div>
  );
}
