import { useState } from 'react';
import { ChevronDown, ChevronUp, X as XIcon } from 'lucide-react';
import { FilterSearchInput } from '../../../components/ui/FilterSearchInput';
import ExportDropdown from '../../../components/ui/ExportDropdown';
import type { ExportFormat } from '../../../components/ui/ExportDropdown';
import type { TrainingFilters as Filters, TrainingFilterOptions } from '../hooks/useTraining';

const STATUSES = ['Valid', 'Expired', 'Expiring Soon', 'Pending'];
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
  onExport?: (format: ExportFormat) => void;
  filterOptions: TrainingFilterOptions | null;
  loading: boolean;
}

export function TrainingFilters({ filters, onFilterChange, onExport, filterOptions, loading }: Props) {
  const [expanded, setExpanded] = useState(false);

  // For dropdowns and date inputs only — NOT for search inputs (use FilterSearchInput instead).
  // sm:w-auto here is intentional for selects/dates but causes overflow on search wrappers.
  const selectClasses = 'h-[34px] w-full sm:w-auto px-3 pr-8 text-[13px] bg-surface-sunken border border-border rounded-[var(--radius-sm)] text-text-primary focus:outline-none focus:ring-[3px] focus:ring-primary-500/10 focus:border-primary-500 focus:bg-surface appearance-none cursor-pointer transition-all';
  const inputClasses = 'h-[34px] w-full sm:w-auto px-3 text-[13px] bg-surface-sunken border border-border rounded-[var(--radius-sm)] text-text-primary focus:outline-none focus:ring-[3px] focus:ring-primary-500/10 focus:border-primary-500 focus:bg-surface transition-all';

  const hasActiveFilters = filters.status || filters.training_topic_key || filters.profession ||
    filters.company || filters.date_from || filters.date_to || filters.search;

  const clearFilters = () => {
    const keys: (keyof Filters)[] = ['search', 'training_topic_key', 'status', 'profession', 'company', 'period', 'date_from', 'date_to'];
    keys.forEach(k => onFilterChange(k, ''));
  };

  // Group topics by category for the select
  const topicsByCategory: Record<string, { key: string; label: string }[]> = {};
  (filterOptions?.topics || []).forEach(t => {
    if (!topicsByCategory[t.category]) topicsByCategory[t.category] = [];
    topicsByCategory[t.category].push(t);
  });

  return (
    <div className="mb-4">
      <div className={`flex flex-wrap items-center gap-2 bg-surface border border-border ${expanded ? 'rounded-t-[var(--radius-md)]' : 'rounded-[var(--radius-md)]'} p-3 shadow-xs`}>
        {/* Search */}
        <FilterSearchInput
          value={filters.search}
          onChange={v => onFilterChange('search', v)}
          placeholder="Search records..."
          wrapperClassName="sm:max-w-[280px]"
        />

        {/* Topic */}
        <select value={filters.training_topic_key} onChange={e => onFilterChange('training_topic_key', e.target.value)} className={selectClasses}>
          <option value="">All Topics</option>
          {Object.entries(topicsByCategory).map(([cat, items]) => (
            <optgroup key={cat} label={cat}>
              {items.map(t => <option key={t.key} value={t.key}>{t.label}</option>)}
            </optgroup>
          ))}
        </select>

        {/* Status */}
        <select value={filters.status} onChange={e => onFilterChange('status', e.target.value)} className={selectClasses}>
          <option value="">All Statuses</option>
          {STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
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

        {/* Export */}
        {onExport && <ExportDropdown onExport={onExport} disabled={loading} className="ml-auto" />}
      </div>

      {/* Expanded row */}
      {expanded && (
        <div className="flex flex-wrap items-center gap-2 bg-surface-sunken border border-t-0 border-border rounded-b-[var(--radius-md)] p-3 animate-expandDown">
          <input type="date" value={filters.date_from} onChange={e => onFilterChange('date_from', e.target.value)} className={inputClasses} placeholder="From date" />
          <input type="date" value={filters.date_to} onChange={e => onFilterChange('date_to', e.target.value)} className={inputClasses} placeholder="To date" />

          <select value={filters.profession} onChange={e => onFilterChange('profession', e.target.value)} className={selectClasses}>
            <option value="">All Professions</option>
            {(filterOptions?.professions || []).map(p => <option key={p} value={p}>{p}</option>)}
          </select>

          <select value={filters.company} onChange={e => onFilterChange('company', e.target.value)} className={selectClasses}>
            <option value="">All Companies</option>
            {(filterOptions?.companies || []).map(c => <option key={c} value={c}>{c}</option>)}
          </select>

          <select value={filters.sort_by} onChange={e => onFilterChange('sort_by', e.target.value)} className={selectClasses}>
            <option value="training_date">Sort: Training Date</option>
            <option value="expiry_date">Sort: Expiry Date</option>
            <option value="status">Sort: Status</option>
            <option value="record_id">Sort: Record ID</option>
            <option value="created_at">Sort: Latest</option>
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
