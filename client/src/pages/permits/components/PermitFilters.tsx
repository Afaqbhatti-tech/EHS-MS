import { useState } from 'react';
import { ChevronDown, ChevronUp, X as XIcon, LayoutGrid, List } from 'lucide-react';
import { FilterSearchInput } from '../../../components/ui/FilterSearchInput';
import ExportDropdown from '../../../components/ui/ExportDropdown';
import type { ExportFormat } from '../../../components/ui/ExportDropdown';
import { PERMIT_TYPES, PERMIT_STATUSES } from '../config/permitTypes';
import type { PermitFilters as Filters, PermitFilterOptions } from '../hooks/usePermits';

const PERIODS = [
  { value: '', label: 'All Time' },
  { value: 'today', label: 'Today' },
  { value: 'week', label: 'This Week' },
  { value: 'month', label: 'This Month' },
  { value: 'year', label: 'This Year' },
];

interface Props {
  filters: Filters;
  onFilterChange: (key: keyof Filters, value: string | number) => void;
  onExport: (format: ExportFormat) => void;
  filterOptions: PermitFilterOptions | null;
  loading: boolean;
  viewMode: 'table' | 'cards';
  onViewModeChange: (mode: 'table' | 'cards') => void;
}

export function PermitFilters({ filters, onFilterChange, onExport, filterOptions, loading, viewMode, onViewModeChange }: Props) {
  const [expanded, setExpanded] = useState(false);

  // For dropdowns and date inputs only — NOT for search inputs (use FilterSearchInput instead).
  // sm:w-auto here is intentional for selects/dates but causes overflow on search wrappers.
  const selectClasses = 'h-[34px] w-full sm:w-auto px-3 pr-8 text-[13px] bg-surface-sunken border border-border rounded-[var(--radius-sm)] text-text-primary focus:outline-none focus:ring-[3px] focus:ring-primary-500/10 focus:border-primary-500 focus:bg-surface appearance-none cursor-pointer transition-all';
  const inputClasses = 'h-[34px] w-full sm:w-auto px-3 text-[13px] bg-surface-sunken border border-border rounded-[var(--radius-sm)] text-text-primary focus:outline-none focus:ring-[3px] focus:ring-primary-500/10 focus:border-primary-500 focus:bg-surface transition-all';

  const hasActiveFilters = filters.permit_type || filters.status || filters.area || filters.contractor ||
    filters.date_from || filters.date_to || filters.search;

  const clearFilters = () => {
    const keys: (keyof Filters)[] = ['search', 'permit_type', 'status', 'area', 'contractor', 'period', 'date_from', 'date_to'];
    keys.forEach(k => onFilterChange(k, ''));
  };

  return (
    <div className="mb-4">
      {/* Row 1: Main filters */}
      <div className={`flex flex-wrap items-center gap-2 bg-surface border border-border ${expanded ? 'rounded-t-[var(--radius-md)]' : 'rounded-[var(--radius-md)]'} p-3 shadow-xs`}>
        {/* Search */}
        <FilterSearchInput
          value={filters.search}
          onChange={v => onFilterChange('search', v)}
          placeholder="Search permits..."
          wrapperClassName="sm:max-w-[280px]"
        />

        {/* Permit Type */}
        <select value={filters.permit_type} onChange={e => onFilterChange('permit_type', e.target.value)} className={selectClasses}>
          <option value="">All Types</option>
          {PERMIT_TYPES.map(t => (
            <option key={t.key} value={t.key}>{t.abbr} - {t.label}</option>
          ))}
        </select>

        {/* Status */}
        <select value={filters.status} onChange={e => onFilterChange('status', e.target.value)} className={selectClasses}>
          <option value="">All Statuses</option>
          {PERMIT_STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
        </select>

        {/* Period chips */}
        <div className="flex flex-wrap gap-1 overflow-x-auto shrink-0" style={{ scrollbarWidth: 'none' }}>
          {PERIODS.map(p => (
            <button
              key={p.value}
              onClick={() => onFilterChange('period', p.value)}
              className={`px-3 py-[5px] text-[12px] font-semibold rounded-full border-[1.5px] transition-all whitespace-nowrap shrink-0 ${
                filters.period === p.value
                  ? 'bg-primary-600 text-white border-primary-600'
                  : 'bg-surface text-text-secondary border-border hover:bg-primary-50 hover:border-primary-400 hover:text-primary-700'
              }`}
            >
              {p.label}
            </button>
          ))}
        </div>

        {/* Expand toggle */}
        <button
          onClick={() => setExpanded(!expanded)}
          className="inline-flex items-center gap-1 px-3 py-[5px] text-[12px] font-medium text-text-secondary border border-border rounded-[var(--radius-sm)] bg-surface hover:bg-surface-sunken transition-colors"
        >
          {expanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
          {expanded ? 'Less' : 'More'}
        </button>

        {/* View mode toggle */}
        <div className="flex border border-border rounded-[var(--radius-sm)] overflow-hidden">
          <button
            onClick={() => onViewModeChange('table')}
            className={`p-1.5 transition-colors ${viewMode === 'table' ? 'bg-primary-600 text-white' : 'bg-surface text-text-tertiary hover:bg-surface-sunken'}`}
            title="Table view"
          >
            <List size={15} />
          </button>
          <button
            onClick={() => onViewModeChange('cards')}
            className={`p-1.5 transition-colors ${viewMode === 'cards' ? 'bg-primary-600 text-white' : 'bg-surface text-text-tertiary hover:bg-surface-sunken'}`}
            title="Card view"
          >
            <LayoutGrid size={15} />
          </button>
        </div>

        {/* Export */}
        <ExportDropdown onExport={onExport} disabled={loading} className="ml-auto" />
      </div>

      {/* Row 2: Expanded filters */}
      {expanded && (
        <div className="flex flex-wrap items-center gap-2 bg-surface-sunken border border-t-0 border-border rounded-b-[var(--radius-md)] p-3 animate-expandDown">
          <input
            type="date"
            value={filters.date_from}
            onChange={e => onFilterChange('date_from', e.target.value)}
            className={inputClasses}
          />
          <input
            type="date"
            value={filters.date_to}
            onChange={e => onFilterChange('date_to', e.target.value)}
            className={inputClasses}
          />

          {/* Area */}
          <select value={filters.area} onChange={e => onFilterChange('area', e.target.value)} className={selectClasses}>
            <option value="">All Areas</option>
            {(filterOptions?.areas || []).map(a => <option key={a} value={a}>{a}</option>)}
          </select>

          {/* Contractor */}
          <select value={filters.contractor} onChange={e => onFilterChange('contractor', e.target.value)} className={selectClasses}>
            <option value="">All Contractors</option>
            {(filterOptions?.contractors || []).map(c => <option key={c} value={c}>{c}</option>)}
          </select>

          {hasActiveFilters && (
            <button
              onClick={clearFilters}
              className="ml-auto inline-flex items-center gap-1 text-[13px] font-medium text-danger-600 hover:underline cursor-pointer"
            >
              <XIcon size={13} />
              Clear Filters
            </button>
          )}
        </div>
      )}
    </div>
  );
}
