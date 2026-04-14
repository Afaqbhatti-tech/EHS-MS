import { Search, X as XIcon } from 'lucide-react';
import type { ViolationFilters as Filters, FilterOptions } from '../useViolations';

interface Props {
  filters: Filters;
  filterOptions: FilterOptions | undefined;
  updateFilter: (key: keyof Filters, value: string | number) => void;
  resetFilters: () => void;
}

export default function ViolationFilters({ filters, filterOptions, updateFilter, resetFilters }: Props) {
  const hasActive = filters.search || filters.status || filters.severity || filters.violation_type ||
    filters.violation_category || filters.contractor || filters.location ||
    filters.date_from || filters.date_to;

  return (
    <div className="bg-surface rounded-xl border border-border p-4 space-y-3">
      <div className="flex items-center justify-between">
        <div className="relative flex-1 max-w-sm">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-tertiary" />
          <input type="text" value={filters.search}
            onChange={e => updateFilter('search', e.target.value)}
            placeholder="Search violations..."
            className="input-field w-full pl-9 py-2 text-sm" />
        </div>
        {hasActive && (
          <button onClick={resetFilters} className="text-xs text-danger-600 hover:underline flex items-center gap-1">
            <XIcon size={12} /> Clear all
          </button>
        )}
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-8 gap-3">
        <select value={filters.status} onChange={e => updateFilter('status', e.target.value)}
          className="input-field text-sm">
          <option value="">All Status</option>
          {(filterOptions?.statuses ?? ['Open', 'Under Investigation', 'Action Assigned', 'In Progress', 'Closed', 'Reopened', 'Escalated']).map(s => (
            <option key={s} value={s}>{s}</option>
          ))}
        </select>

        <select value={filters.severity} onChange={e => updateFilter('severity', e.target.value)}
          className="input-field text-sm">
          <option value="">All Severity</option>
          {['Low', 'Medium', 'High', 'Critical'].map(s => (
            <option key={s} value={s}>{s}</option>
          ))}
        </select>

        <select value={filters.violation_type} onChange={e => updateFilter('violation_type', e.target.value)}
          className="input-field text-sm">
          <option value="">All Types</option>
          {['Routine', 'Situational', 'Exceptional'].map(t => (
            <option key={t} value={t}>{t}</option>
          ))}
        </select>

        <select value={filters.violation_category} onChange={e => updateFilter('violation_category', e.target.value)}
          className="input-field text-sm">
          <option value="">All Categories</option>
          {(filterOptions?.categories ?? []).map(c => (
            <option key={c} value={c}>{c}</option>
          ))}
        </select>

        <select value={filters.contractor} onChange={e => updateFilter('contractor', e.target.value)}
          className="input-field text-sm">
          <option value="">All Contractors</option>
          {(filterOptions?.contractors ?? []).map(c => (
            <option key={c} value={c}>{c}</option>
          ))}
        </select>

        <select value={filters.location} onChange={e => updateFilter('location', e.target.value)}
          className="input-field text-sm">
          <option value="">All Locations</option>
          {(filterOptions?.locations ?? []).map(l => (
            <option key={l} value={l}>{l}</option>
          ))}
        </select>

        <input type="date" value={filters.date_from} onChange={e => updateFilter('date_from', e.target.value)}
          className="input-field text-sm" placeholder="From" />

        <input type="date" value={filters.date_to} onChange={e => updateFilter('date_to', e.target.value)}
          className="input-field text-sm" placeholder="To" />
      </div>
    </div>
  );
}
