import { useState } from 'react';
import { ChevronDown, ChevronUp, X as XIcon } from 'lucide-react';
import { FilterSearchInput } from '../../../components/ui/FilterSearchInput';
import ExportDropdown from '../../../components/ui/ExportDropdown';
import type { ExportFormat } from '../../../components/ui/ExportDropdown';
import type { ObservationFilters as Filters, FilterOptions } from '../hooks/useObservations';

const STATUSES = ['Open', 'In Progress', 'Closed', 'Verified', 'Overdue', 'Reopened'];
const PRIORITIES = ['Low', 'Medium', 'High'];
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
  onClearFilters?: () => void;
  onExport: (format: ExportFormat) => void;
  filterOptions: FilterOptions | null;
  loading: boolean;
}

export function ObservationFilters({ filters, onFilterChange, onClearFilters, onExport, filterOptions, loading }: Props) {
  const [expanded, setExpanded] = useState(false);

  // For dropdowns and date inputs only — NOT for search inputs (use FilterSearchInput instead).
  // sm:w-auto here is intentional for selects/dates but causes overflow on search wrappers.
  const selectClasses = 'h-9 w-full sm:w-auto px-3 pr-8 text-[13px] bg-surface-sunken border border-border rounded-[var(--radius-sm)] text-text-primary focus:outline-none focus:ring-[3px] focus:ring-primary-500/10 focus:border-primary-500 focus:bg-surface appearance-none cursor-pointer transition-all';
  const inputClasses = 'h-9 w-full sm:w-auto px-3 text-[13px] bg-surface-sunken border border-border rounded-[var(--radius-sm)] text-text-primary focus:outline-none focus:ring-[3px] focus:ring-primary-500/10 focus:border-primary-500 focus:bg-surface transition-all';

  const hasActiveFilters = filters.status || filters.category || filters.priority || filters.contractor ||
    filters.observation_type || filters.responsible_supervisor || filters.date_from || filters.date_to || filters.search;

  const clearFilters = () => {
    if (onClearFilters) {
      onClearFilters();
    } else {
      const keys: (keyof Filters)[] = ['search', 'status', 'category', 'priority', 'contractor', 'observation_type', 'responsible_supervisor', 'period', 'date_from', 'date_to'];
      keys.forEach(k => onFilterChange(k, ''));
    }
  };

  return (
    <div className="mb-4 space-y-3">
      {/* Row 1: Main filters */}
      <div className="flex flex-wrap items-center gap-2 bg-surface border border-border rounded-[var(--radius-md)] p-3 shadow-xs">
        {/* Search */}
        <FilterSearchInput
          value={filters.search}
          onChange={v => onFilterChange('search', v)}
          placeholder="Search observations..."
        />

        {/* Status */}
        <select value={filters.status} onChange={e => onFilterChange('status', e.target.value)} className={selectClasses}>
          <option value="">All Statuses</option>
          {STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
        </select>

        {/* Priority */}
        <select value={filters.priority} onChange={e => onFilterChange('priority', e.target.value)} className={selectClasses}>
          <option value="">All Priorities</option>
          {PRIORITIES.map(p => <option key={p} value={p}>{p}</option>)}
        </select>

        {/* Period chips */}
        <div className="flex flex-wrap gap-1 overflow-x-auto shrink-0" style={{ scrollbarWidth: 'none' }}>
          {PERIODS.map(p => (
            <button
              key={p.value}
              onClick={() => onFilterChange('period', p.value)}
              className={`px-2.5 py-[5px] text-[11px] font-semibold rounded-full border-[1.5px] transition-all whitespace-nowrap shrink-0 ${
                filters.period === p.value
                  ? 'bg-primary-600 text-white border-primary-600'
                  : 'bg-surface text-text-secondary border-border hover:bg-primary-50 hover:border-primary-200 hover:text-primary-700'
              }`}
            >
              {p.label}
            </button>
          ))}
        </div>

        {/* Expand toggle */}
        <button
          onClick={() => setExpanded(!expanded)}
          className="inline-flex items-center gap-1 px-3 py-1.5 text-[12px] font-medium text-text-secondary border border-border rounded-[var(--radius-md)] bg-surface hover:bg-surface-sunken transition-colors"
        >
          {expanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
          {expanded ? 'Less' : 'More'}
        </button>

        {/* Export */}
        <ExportDropdown onExport={onExport} disabled={loading} className="ml-auto" />
      </div>

      {/* Row 2: Expanded filters */}
      {expanded && (
        <div className="flex flex-wrap items-center gap-2 bg-surface border border-border rounded-[var(--radius-md)] p-3 shadow-xs animate-expandDown">
          <input
            type="date"
            value={filters.date_from}
            onChange={e => onFilterChange('date_from', e.target.value)}
            className={inputClasses}
            placeholder="From date"
          />
          <input
            type="date"
            value={filters.date_to}
            onChange={e => onFilterChange('date_to', e.target.value)}
            className={inputClasses}
            placeholder="To date"
          />

          {/* Category */}
          <select value={filters.category} onChange={e => onFilterChange('category', e.target.value)} className={selectClasses}>
            <option value="">All Categories</option>
            {(filterOptions?.categories || []).map(c => <option key={c} value={c}>{c}</option>)}
          </select>

          {/* Contractor */}
          <select value={filters.contractor} onChange={e => onFilterChange('contractor', e.target.value)} className={selectClasses}>
            <option value="">All Contractors</option>
            {(filterOptions?.contractors || []).map(c => <option key={c} value={c}>{c}</option>)}
          </select>

          {/* Observation Type */}
          <select value={filters.observation_type} onChange={e => onFilterChange('observation_type', e.target.value)} className={selectClasses}>
            <option value="">All Types</option>
            {(filterOptions?.observation_types || []).map(t => <option key={t} value={t}>{t}</option>)}
          </select>

          {/* Supervisor */}
          <select value={filters.responsible_supervisor} onChange={e => onFilterChange('responsible_supervisor', e.target.value)} className={selectClasses}>
            <option value="">All Supervisors</option>
            {(filterOptions?.supervisors || []).map(s => <option key={s} value={s}>{s}</option>)}
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
