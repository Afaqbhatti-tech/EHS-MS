import { Search, X as XIcon, Upload } from 'lucide-react';
import ExportDropdown from '../../../components/ui/ExportDropdown';
import type { ExportFormat } from '../../../components/ui/ExportDropdown';
import type { MockupFilters as Filters, FilterOptions } from '../hooks/useMockups';

const APPROVAL_STATUSES = [
  'Draft', 'Submitted for Review', 'Approved', 'Rejected',
  'Approved with Comments', 'Comments Resolved', 'Re-submitted',
  'Pending Compliance', 'Superseded',
];

const PRIORITIES = ['Low', 'Medium', 'High', 'Critical'];

interface Props {
  filters: Filters;
  onFilterChange: (key: keyof Filters, value: string | number) => void;
  onExport: (format: ExportFormat) => void;
  onImport: () => void;
  filterOptions: FilterOptions | null;
  loading: boolean;
}

export function MockupFilters({ filters, onFilterChange, onExport, onImport, filterOptions, loading }: Props) {
  const hasActiveFilters = filters.approval_status || filters.contractor || filters.zone ||
    filters.phase || filters.trim_line || filters.mockup_type || filters.supervisor_name ||
    filters.priority || filters.date_from || filters.date_to || filters.period;

  const clearAll = () => {
    (['approval_status', 'contractor', 'zone', 'phase', 'trim_line', 'mockup_type', 'supervisor_name', 'priority', 'date_from', 'date_to', 'period', 'search'] as const).forEach(k => onFilterChange(k, ''));
  };

  const selectCls = 'h-9 w-[calc(50%-0.625rem)] sm:w-auto px-2.5 text-[12px] bg-surface border border-border rounded-[var(--radius-md)] text-text-primary focus:outline-none focus:ring-[3px] focus:ring-primary-500/10 focus:border-primary-500 appearance-none cursor-pointer';

  return (
    <div className="bg-surface border border-border rounded-[var(--radius-md)] p-3.5 mb-4 shadow-xs">
      <div className="flex flex-wrap items-center gap-2.5">
        {/* Intentionally does not use FilterSearchInput — this module uses denser 12px/h-9/rounded-md
           styling that differs from the standard 13px/h-[34px]/rounded-sm filter pattern. Safe (w-full, no sm:w-auto). */}
        <div className="relative w-full sm:flex-1 sm:min-w-[200px]">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-tertiary" />
          <input type="text" placeholder="Search mock-ups, RAMS, contractors..." value={filters.search} onChange={e => onFilterChange('search', e.target.value)}
            className="w-full h-9 pl-9 pr-3 text-[12px] bg-surface-sunken border border-border rounded-[var(--radius-md)] text-text-primary focus:outline-none focus:ring-[3px] focus:ring-primary-500/10 focus:border-primary-500 transition-all" />
        </div>

        <select value={filters.approval_status} onChange={e => onFilterChange('approval_status', e.target.value)} className={selectCls}>
          <option value="">All Statuses</option>
          {APPROVAL_STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
        </select>

        <select value={filters.mockup_type} onChange={e => onFilterChange('mockup_type', e.target.value)} className={selectCls}>
          <option value="">All Types</option>
          {(filterOptions?.mockup_types || []).map(t => <option key={t} value={t}>{t}</option>)}
        </select>

        <select value={filters.priority} onChange={e => onFilterChange('priority', e.target.value)} className={selectCls}>
          <option value="">All Priorities</option>
          {PRIORITIES.map(p => <option key={p} value={p}>{p}</option>)}
        </select>

        <select value={filters.contractor} onChange={e => onFilterChange('contractor', e.target.value)} className={selectCls}>
          <option value="">All Contractors</option>
          {(filterOptions?.contractors || []).map(c => <option key={c} value={c}>{c}</option>)}
        </select>

        <select value={filters.phase} onChange={e => onFilterChange('phase', e.target.value)} className={selectCls}>
          <option value="">All Phases</option>
          {(filterOptions?.phases || []).map(p => <option key={p} value={p}>{p}</option>)}
        </select>

        <select value={filters.trim_line} onChange={e => onFilterChange('trim_line', e.target.value)} className={selectCls}>
          <option value="">All Trim Lines</option>
          {(filterOptions?.trim_lines || []).map(t => <option key={t} value={t}>{t}</option>)}
        </select>

        <select value={filters.supervisor_name} onChange={e => onFilterChange('supervisor_name', e.target.value)} className={selectCls}>
          <option value="">All Supervisors</option>
          {(filterOptions?.supervisors || []).map(s => <option key={s} value={s}>{s}</option>)}
        </select>

        <select value={filters.period} onChange={e => onFilterChange('period', e.target.value)} className={selectCls}>
          <option value="">All Time</option>
          <option value="week">This Week</option>
          <option value="month">This Month</option>
          <option value="year">This Year</option>
        </select>

        <button onClick={onImport} disabled={loading} className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-[12px] font-semibold text-white bg-primary-600 rounded-[var(--radius-md)] hover:bg-primary-700 transition-colors disabled:opacity-50 shadow-xs print:hidden">
          <Upload size={14} /> Import
        </button>

        <ExportDropdown onExport={onExport} disabled={loading} />

        {hasActiveFilters && (
          <button onClick={clearAll} className="h-9 px-3 text-[12px] font-medium text-danger-600 bg-danger-50 border border-danger-100 rounded-[var(--radius-md)] hover:bg-danger-100 transition-colors flex items-center gap-1.5">
            <XIcon size={13} /> Clear
          </button>
        )}
      </div>
    </div>
  );
}
