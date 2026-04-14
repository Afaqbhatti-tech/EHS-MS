import { Search, X as XIcon, Filter } from 'lucide-react';

interface IncidentFilters {
  search: string;
  status: string;
  severity: string;
  incident_type: string;
  incident_category: string;
  contractor: string;
  location: string;
  date_from: string;
  date_to: string;
  page: number;
  [key: string]: string | number;
}

interface FilterOptions {
  categories: string[];
  types: string[];
  locations: string[];
  contractors: string[];
  severities: string[];
  statuses: string[];
}

interface Props {
  hook: {
    filters: IncidentFilters;
    setFilter: (key: string, value: string | number) => void;
    resetFilters: () => void;
    filterOptions: FilterOptions | undefined;
  };
}

const DEFAULT_STATUSES = ['Reported', 'Under Investigation', 'Action Assigned', 'In Progress', 'Closed', 'Reopened', 'Escalated'];
const DEFAULT_SEVERITIES = ['Low', 'Medium', 'High', 'Critical'];

export default function IncidentFilters({ hook }: Props) {
  const { filters, setFilter, resetFilters, filterOptions } = hook;

  const hasActiveFilters =
    filters.search ||
    filters.status ||
    filters.severity ||
    filters.incident_type ||
    filters.incident_category ||
    filters.contractor ||
    filters.location ||
    filters.date_from ||
    filters.date_to;

  return (
    <div className="bg-surface rounded-[var(--radius-md)] border border-border shadow-sm p-4 space-y-3">
      {/* Search row */}
      <div className="flex items-center justify-between gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-tertiary pointer-events-none" />
          <input
            type="text"
            value={filters.search}
            onChange={e => setFilter('search', e.target.value)}
            placeholder="Search incidents..."
            className="input-field w-full pl-9 py-2 text-sm"
          />
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[11px] text-text-tertiary uppercase tracking-wide font-semibold flex items-center gap-1">
            <Filter size={12} />
            Filters
          </span>
          {hasActiveFilters && (
            <button
              onClick={resetFilters}
              className="text-xs text-danger-600 hover:text-danger-700 hover:underline flex items-center gap-1 transition-colors"
            >
              <XIcon size={12} />
              Clear all
            </button>
          )}
        </div>
      </div>

      {/* Filter dropdowns */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-8 gap-3">
        {/* Status */}
        <select
          value={filters.status}
          onChange={e => setFilter('status', e.target.value)}
          className="input-field text-sm"
        >
          <option value="">All Statuses</option>
          {(filterOptions?.statuses ?? DEFAULT_STATUSES).map(s => (
            <option key={s} value={s}>{s}</option>
          ))}
        </select>

        {/* Severity */}
        <select
          value={filters.severity}
          onChange={e => setFilter('severity', e.target.value)}
          className="input-field text-sm"
        >
          <option value="">All Severities</option>
          {(filterOptions?.severities ?? DEFAULT_SEVERITIES).map(s => (
            <option key={s} value={s}>{s}</option>
          ))}
        </select>

        {/* Type */}
        <select
          value={filters.incident_type}
          onChange={e => setFilter('incident_type', e.target.value)}
          className="input-field text-sm"
        >
          <option value="">All Types</option>
          {(filterOptions?.types ?? []).map(t => (
            <option key={t} value={t}>{t}</option>
          ))}
        </select>

        {/* Category */}
        <select
          value={filters.incident_category}
          onChange={e => setFilter('incident_category', e.target.value)}
          className="input-field text-sm"
        >
          <option value="">All Categories</option>
          {(filterOptions?.categories ?? []).map(c => (
            <option key={c} value={c}>{c}</option>
          ))}
        </select>

        {/* Contractor */}
        <select
          value={filters.contractor}
          onChange={e => setFilter('contractor', e.target.value)}
          className="input-field text-sm"
        >
          <option value="">All Contractors</option>
          {(filterOptions?.contractors ?? []).map(c => (
            <option key={c} value={c}>{c}</option>
          ))}
        </select>

        {/* Location */}
        <select
          value={filters.location}
          onChange={e => setFilter('location', e.target.value)}
          className="input-field text-sm"
        >
          <option value="">All Locations</option>
          {(filterOptions?.locations ?? []).map(l => (
            <option key={l} value={l}>{l}</option>
          ))}
        </select>

        {/* Date From */}
        <input
          type="date"
          value={filters.date_from}
          onChange={e => setFilter('date_from', e.target.value)}
          className="input-field text-sm"
          title="Date from"
        />

        {/* Date To */}
        <input
          type="date"
          value={filters.date_to}
          onChange={e => setFilter('date_to', e.target.value)}
          className="input-field text-sm"
          title="Date to"
        />
      </div>
    </div>
  );
}
