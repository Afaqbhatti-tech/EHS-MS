import { useState } from 'react';
import { Search, ChevronDown, ChevronUp, X as XIcon } from 'lucide-react';
import ExportDropdown from '../../../../components/ui/ExportDropdown';
import type { ExportFormat } from '../../../../components/ui/ExportDropdown';
import { TRACKER_CATEGORIES } from '../../../../config/trackerCategories';
import type { InspectionFilters as IFilters } from '../../hooks/useTracker';

const INSPECTION_TYPES = [
  'Internal Daily', 'Internal Weekly', 'Internal Monthly',
  'Third Party / TUV', 'Pre-Use Check', 'Post-Incident',
  'Handover', 'Electrical Test', 'Certification Renewal',
];

const PURPOSES = ['Routine', 'Post-Incident', 'Pre-Mobilisation', 'Certification', 'TUV Renewal', 'Emergency', 'Scheduled'];
const RESULTS = ['Pass', 'Fail', 'Pass with Issues', 'Requires Action'];
const PERIODS = [
  { key: 'week', label: 'This Week' },
  { key: 'month', label: 'This Month' },
  { key: 'year', label: 'This Year' },
];

interface Props {
  filters: IFilters;
  onFilterChange: (key: string, value: string | number) => void;
  onExport: (format: ExportFormat) => void;
  loading: boolean;
}

export function InspectionFilters({ filters, onFilterChange, onExport, loading }: Props) {
  const [expanded, setExpanded] = useState(false);

  const inputCls = "h-[34px] px-3 text-[13px] bg-surface-sunken border border-border rounded-[var(--radius-sm)] text-text-primary focus:outline-none focus:ring-[3px] focus:ring-primary-500/10 focus:border-primary-500 focus:bg-surface transition-all";
  const selectCls = `${inputCls} pr-8 appearance-none cursor-pointer`;

  const hasActive = !!(filters.search || filters.category_key || filters.result || filters.period || filters.inspection_type || filters.inspection_purpose || filters.inspector_name || filters.date_from || filters.date_to || filters.was_overdue);

  const clearFilters = () => {
    ['search', 'category_key', 'result', 'period', 'inspection_type', 'inspection_purpose', 'inspector_name', 'date_from', 'date_to', 'was_overdue', 'item_subtype'].forEach(k => onFilterChange(k, ''));
  };

  return (
    <div className="mb-4 space-y-2">
      {/* Row 1 */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative flex-1 min-w-[200px] max-w-[320px]">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-tertiary" />
          <input
            type="text"
            value={filters.search}
            onChange={e => onFilterChange('search', e.target.value)}
            placeholder="Search inspections..."
            className={`${inputCls} w-full pl-9`}
          />
        </div>

        <select value={filters.category_key} onChange={e => onFilterChange('category_key', e.target.value)} className={selectCls}>
          <option value="">All Categories</option>
          {TRACKER_CATEGORIES.map(c => (
            <option key={c.key} value={c.key}>{c.label}</option>
          ))}
        </select>

        <select value={filters.result} onChange={e => onFilterChange('result', e.target.value)} className={selectCls}>
          <option value="">All Results</option>
          {RESULTS.map(r => <option key={r} value={r}>{r}</option>)}
        </select>

        <div className="flex items-center gap-1">
          {PERIODS.map(p => (
            <button
              key={p.key}
              onClick={() => onFilterChange('period', filters.period === p.key ? '' : p.key)}
              className={`px-2.5 py-1.5 text-[11px] font-semibold rounded-[var(--radius-sm)] border transition-colors ${
                filters.period === p.key
                  ? 'bg-primary-50 text-primary-700 border-primary-200'
                  : 'bg-surface text-text-tertiary border-border hover:text-text-primary'
              }`}
            >
              {p.label}
            </button>
          ))}
        </div>

        <button
          onClick={() => setExpanded(!expanded)}
          className="inline-flex items-center gap-1 px-2.5 py-1.5 text-[12px] font-medium text-text-secondary bg-surface border border-border rounded-[var(--radius-sm)] hover:bg-surface-sunken transition-colors"
        >
          {expanded ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
          {expanded ? 'Less' : 'More'}
        </button>

        <div className="flex items-center gap-1 ml-auto">
          {hasActive && (
            <button onClick={clearFilters} className="inline-flex items-center gap-1 px-2.5 py-1.5 text-[11px] font-medium text-danger-600 hover:bg-danger-50 rounded-[var(--radius-sm)] transition-colors">
              <XIcon size={12} /> Clear
            </button>
          )}
          <ExportDropdown onExport={onExport} disabled={loading} />
        </div>
      </div>

      {/* Row 2 (expanded) */}
      {expanded && (
        <div className="flex flex-wrap items-center gap-2 p-3 bg-surface-sunken/50 rounded-[var(--radius-md)] border border-border animate-expandDown">
          <select value={filters.inspection_type} onChange={e => onFilterChange('inspection_type', e.target.value)} className={selectCls}>
            <option value="">All Types</option>
            {INSPECTION_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
          </select>

          <select value={filters.inspection_purpose} onChange={e => onFilterChange('inspection_purpose', e.target.value)} className={selectCls}>
            <option value="">All Purposes</option>
            {PURPOSES.map(p => <option key={p} value={p}>{p}</option>)}
          </select>

          <input
            type="text"
            value={filters.inspector_name}
            onChange={e => onFilterChange('inspector_name', e.target.value)}
            placeholder="Inspector name..."
            className={`${inputCls} w-[160px]`}
          />

          <input
            type="date"
            value={filters.date_from}
            onChange={e => onFilterChange('date_from', e.target.value)}
            className={`${inputCls} w-[140px]`}
            title="From date"
          />
          <input
            type="date"
            value={filters.date_to}
            onChange={e => onFilterChange('date_to', e.target.value)}
            className={`${inputCls} w-[140px]`}
            title="To date"
          />

          <button
            onClick={() => onFilterChange('was_overdue', filters.was_overdue ? '' : '1')}
            className={`px-2.5 py-1.5 text-[11px] font-semibold rounded-[var(--radius-sm)] border transition-colors ${
              filters.was_overdue
                ? 'bg-warning-50 text-warning-700 border-warning-200'
                : 'bg-surface text-text-tertiary border-border hover:text-text-primary'
            }`}
          >
            Was Overdue
          </button>
        </div>
      )}
    </div>
  );
}
