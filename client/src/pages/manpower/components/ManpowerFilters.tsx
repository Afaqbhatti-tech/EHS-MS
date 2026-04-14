import { useState } from 'react';
import { ChevronDown, ChevronUp, X as XIcon, AlertTriangle } from 'lucide-react';
import { FilterSearchInput } from '../../../components/ui/FilterSearchInput';
import ExportDropdown from '../../../components/ui/ExportDropdown';
import type { ExportFormat } from '../../../components/ui/ExportDropdown';
import type { ManpowerFilters as Filters, FilterOptions } from '../hooks/useManpower';

const INDUCTION_STATUSES = ['Done', 'Not Done', 'Pending'];
const WORKER_STATUSES = ['Active', 'Inactive', 'Demobilised', 'Suspended'];
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
  filterOptions: FilterOptions | null;
  loading: boolean;
  viewMode: 'table' | 'cards';
  onViewModeChange: (mode: 'table' | 'cards') => void;
  legacyReviewCount?: number;
}

export function ManpowerFilters({ filters, onFilterChange, onExport, filterOptions, loading, viewMode, onViewModeChange, legacyReviewCount }: Props) {
  const [expanded, setExpanded] = useState(false);

  // For dropdowns and date inputs only — NOT for search inputs (use FilterSearchInput instead).
  // sm:w-auto here is intentional for selects/dates but causes overflow on search wrappers.
  const selectClasses = 'h-[34px] w-full sm:w-auto px-3 pr-8 text-[13px] bg-surface-sunken border border-border rounded-[var(--radius-sm)] text-text-primary focus:outline-none focus:ring-[3px] focus:ring-primary-500/10 focus:border-primary-500 focus:bg-surface appearance-none cursor-pointer transition-all';
  const inputClasses = 'h-[34px] w-full sm:w-auto px-3 text-[13px] bg-surface-sunken border border-border rounded-[var(--radius-sm)] text-text-primary focus:outline-none focus:ring-[3px] focus:ring-primary-500/10 focus:border-primary-500 focus:bg-surface transition-all';

  const hasActiveFilters = filters.status || filters.profession || filters.induction_status || filters.company ||
    filters.department || filters.joined_from || filters.joined_to || filters.search || filters.legacy_review;

  const isLegacyReviewActive = filters.legacy_review === '1';

  const clearFilters = () => {
    const keys: (keyof Filters)[] = ['search', 'profession', 'induction_status', 'status', 'company', 'department', 'period', 'joined_from', 'joined_to', 'legacy_review'];
    keys.forEach(k => onFilterChange(k, ''));
  };

  return (
    <div className="mb-4">
      {/* Row 1: Main filters */}
      <div className={`flex flex-wrap items-center gap-2 bg-surface border border-border ${expanded || isLegacyReviewActive ? 'rounded-t-[var(--radius-md)]' : 'rounded-[var(--radius-md)]'} p-3 shadow-xs`}>
        {/* Search */}
        <FilterSearchInput
          value={filters.search}
          onChange={v => onFilterChange('search', v)}
          placeholder="Search workers..."
          wrapperClassName="sm:max-w-[260px]"
        />

        {/* Profession */}
        <select value={filters.profession} onChange={e => onFilterChange('profession', e.target.value)} className={selectClasses}>
          <option value="">All Professions</option>
          {(filterOptions?.professions || []).map(p => <option key={p} value={p}>{p}</option>)}
        </select>

        {/* Induction Status */}
        <select value={filters.induction_status} onChange={e => onFilterChange('induction_status', e.target.value)} className={selectClasses}>
          <option value="">All Induction</option>
          {INDUCTION_STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
        </select>

        {/* Status */}
        <select value={filters.status} onChange={e => onFilterChange('status', e.target.value)} className={selectClasses}>
          <option value="">All Statuses</option>
          {WORKER_STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
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

        {/* Legacy ID Review toggle */}
        {(legacyReviewCount ?? 0) > 0 && (
          <button
            onClick={() => onFilterChange('legacy_review', isLegacyReviewActive ? '' : '1')}
            className={`inline-flex items-center gap-1.5 px-3 py-[5px] text-[12px] font-semibold rounded-full border-[1.5px] transition-all whitespace-nowrap shrink-0 ${
              isLegacyReviewActive
                ? 'bg-warning-600 text-white border-warning-600'
                : 'bg-surface text-warning-700 border-warning-300 hover:bg-warning-50 hover:border-warning-500'
            }`}
          >
            <AlertTriangle size={13} />
            ID Review ({legacyReviewCount})
          </button>
        )}

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
            className={`px-2.5 py-1.5 text-[11px] font-medium transition-colors ${viewMode === 'table' ? 'bg-primary-600 text-white' : 'bg-surface text-text-secondary hover:bg-surface-sunken'}`}
          >Table</button>
          <button
            onClick={() => onViewModeChange('cards')}
            className={`px-2.5 py-1.5 text-[11px] font-medium transition-colors ${viewMode === 'cards' ? 'bg-primary-600 text-white' : 'bg-surface text-text-secondary hover:bg-surface-sunken'}`}
          >Cards</button>
        </div>

        {/* Export */}
        <ExportDropdown onExport={onExport} disabled={loading} className="ml-auto" />
      </div>

      {/* Legacy Review active banner */}
      {isLegacyReviewActive && (
        <div className={`flex items-center gap-2 bg-warning-50 border border-t-0 border-warning-200 px-3 py-2 ${expanded ? '' : 'rounded-b-[var(--radius-md)]'}`}>
          <AlertTriangle size={14} className="text-warning-600 shrink-0" />
          <span className="text-[12px] text-warning-800 font-medium">
            Showing workers with ID / Passport No. populated but missing Iqama Number — review candidates for legacy data cleanup.
          </span>
          <button
            onClick={() => onFilterChange('legacy_review', '')}
            className="ml-auto text-[11px] font-medium text-warning-700 hover:text-warning-900 underline shrink-0"
          >
            Clear
          </button>
        </div>
      )}

      {/* Row 2: Expanded */}
      {expanded && (
        <div className="flex flex-wrap items-center gap-2 bg-surface-sunken border border-t-0 border-border rounded-b-[var(--radius-md)] p-3 animate-expandDown">
          <input type="date" value={filters.joined_from} onChange={e => onFilterChange('joined_from', e.target.value)} className={inputClasses} placeholder="Joined from" />
          <input type="date" value={filters.joined_to} onChange={e => onFilterChange('joined_to', e.target.value)} className={inputClasses} placeholder="Joined to" />

          <select value={filters.company} onChange={e => onFilterChange('company', e.target.value)} className={selectClasses}>
            <option value="">All Companies</option>
            {(filterOptions?.companies || []).map(c => <option key={c} value={c}>{c}</option>)}
          </select>

          <select value={filters.department} onChange={e => onFilterChange('department', e.target.value)} className={selectClasses}>
            <option value="">All Departments</option>
            {(filterOptions?.departments || []).map(d => <option key={d} value={d}>{d}</option>)}
          </select>

          <select value={filters.sort_by} onChange={e => onFilterChange('sort_by', e.target.value)} className={selectClasses}>
            <option value="created_at">Sort: Latest</option>
            <option value="name">Sort: Name</option>
            <option value="joining_date">Sort: Joining Date</option>
            <option value="profession">Sort: Profession</option>
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
