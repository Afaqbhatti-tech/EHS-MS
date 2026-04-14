import { useState } from 'react';
import { Search, X as XIcon, ChevronDown } from 'lucide-react';
import ExportDropdown from '../../../components/ui/ExportDropdown';
import type { ExportFormat } from '../../../components/ui/ExportDropdown';
import type { MomFilters as FilterType } from '../hooks/useMom';

interface Props {
  filters: FilterType;
  onFilterChange: (key: string, value: string | number) => void;
  onExport: (format: ExportFormat) => void | Promise<void>;
  loading: boolean;
  exporting?: boolean;
}

const MEETING_TYPES = [
  'Weekly HSE Meeting', 'Monthly HSE Meeting', 'Client / PMC HSE Meeting',
  'Incident Review Meeting', 'RAMS Review Meeting', 'Other',
];

const YEARS = Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - 2 + i);

export function MomFilters({ filters, onFilterChange, onExport, loading, exporting }: Props) {
  const [showMore, setShowMore] = useState(false);

  const hasFilters = filters.search || filters.status || filters.year || filters.meeting_type ||
    filters.week_number || filters.has_open_points || filters.has_overdue ||
    filters.date_from || filters.date_to || filters.period;

  const clearFilters = () => {
    ['search', 'status', 'year', 'week_number', 'meeting_type', 'has_open_points',
     'has_overdue', 'date_from', 'date_to', 'period'].forEach(k => onFilterChange(k, ''));
  };

  return (
    <div style={{ marginBottom: 16 }}>
      {/* Row 1 */}
      <div className="mom-filter-row">
        {/* Search */}
        <div style={{ position: 'relative', flex: '1 1 220px', minWidth: 180 }}>
          <Search size={15} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--color-text-tertiary)' }} />
          <input
            type="text"
            placeholder="Search title, code, chaired by, client..."
            value={filters.search}
            onChange={e => onFilterChange('search', e.target.value)}
            className="w-full pl-8 pr-3 py-[7px] text-[13px] border border-border rounded-[var(--radius-md)] bg-surface focus:outline-none focus:border-primary-400"
          />
        </div>

        {/* Status */}
        <select
          value={filters.status}
          onChange={e => onFilterChange('status', e.target.value)}
          className="px-3 py-[7px] text-[13px] border border-border rounded-[var(--radius-md)] bg-surface focus:outline-none min-w-0 sm:min-w-[130px]"
        >
          <option value="">All Status</option>
          <option value="Open">Open</option>
          <option value="In Progress">In Progress</option>
          <option value="Closed">Closed</option>
        </select>

        {/* Year */}
        <select
          value={filters.year}
          onChange={e => onFilterChange('year', e.target.value)}
          className="px-3 py-[7px] text-[13px] border border-border rounded-[var(--radius-md)] bg-surface focus:outline-none min-w-0 sm:min-w-[100px]"
        >
          <option value="">All Years</option>
          {YEARS.map(y => <option key={y} value={y}>{y}</option>)}
        </select>

        {/* Period chips */}
        <div style={{ display: 'flex', gap: 4 }}>
          {(['week', 'month', 'year'] as const).map(p => (
            <button
              key={p}
              onClick={() => onFilterChange('period', filters.period === p ? '' : p)}
              className={`px-3 py-[6px] text-[12px] font-semibold rounded-[var(--radius-full)] border transition-colors ${
                filters.period === p
                  ? 'bg-primary-600 text-white border-primary-600'
                  : 'bg-surface border-border text-text-secondary hover:bg-surface-sunken'
              }`}
            >
              {p === 'week' ? 'This Week' : p === 'month' ? 'Month' : 'Year'}
            </button>
          ))}
        </div>

        {/* More Filters */}
        <button
          onClick={() => setShowMore(!showMore)}
          className="px-3 py-[7px] text-[12px] font-semibold border border-border rounded-[var(--radius-md)] bg-surface text-text-secondary hover:bg-surface-sunken flex items-center gap-1"
        >
          <ChevronDown size={14} style={{ transform: showMore ? 'rotate(180deg)' : 'none', transition: 'transform 0.15s' }} />
          Filters
        </button>

        {/* Export */}
        <ExportDropdown onExport={onExport} disabled={loading || exporting} />

        {/* Clear */}
        {hasFilters && (
          <button
            onClick={clearFilters}
            className="px-3 py-[7px] text-[12px] font-semibold text-danger-600 hover:text-danger-700 flex items-center gap-1"
          >
            <XIcon size={14} /> Clear
          </button>
        )}
      </div>

      {/* Row 2 (expandable) */}
      {showMore && (
        <div className="mom-filter-row" style={{ paddingTop: 4 }}>
          <input
            type="number"
            placeholder="Week #"
            value={filters.week_number}
            onChange={e => onFilterChange('week_number', e.target.value)}
            min={1}
            max={53}
            className="px-3 py-[7px] text-[13px] border border-border rounded-[var(--radius-md)] bg-surface focus:outline-none w-[90px]"
          />

          <select
            value={filters.meeting_type}
            onChange={e => onFilterChange('meeting_type', e.target.value)}
            className="px-3 py-[7px] text-[13px] border border-border rounded-[var(--radius-md)] bg-surface focus:outline-none min-w-0 sm:min-w-[180px]"
          >
            <option value="">All Meeting Types</option>
            {MEETING_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
          </select>

          <label className="flex items-center gap-2 text-[12px] font-semibold text-text-secondary cursor-pointer">
            <input
              type="checkbox"
              checked={filters.has_open_points === '1'}
              onChange={e => onFilterChange('has_open_points', e.target.checked ? '1' : '')}
              className="accent-primary-600"
            />
            Has Open Points
          </label>

          <label className="flex items-center gap-2 text-[12px] font-semibold text-text-secondary cursor-pointer">
            <input
              type="checkbox"
              checked={filters.has_overdue === '1'}
              onChange={e => onFilterChange('has_overdue', e.target.checked ? '1' : '')}
              className="accent-danger-600"
            />
            Has Overdue
          </label>

          <input
            type="date"
            value={filters.date_from}
            onChange={e => onFilterChange('date_from', e.target.value)}
            className="px-3 py-[7px] text-[12px] border border-border rounded-[var(--radius-md)] bg-surface focus:outline-none"
            title="Date From"
          />
          <input
            type="date"
            value={filters.date_to}
            onChange={e => onFilterChange('date_to', e.target.value)}
            className="px-3 py-[7px] text-[12px] border border-border rounded-[var(--radius-md)] bg-surface focus:outline-none"
            title="Date To"
          />
        </div>
      )}
    </div>
  );
}
