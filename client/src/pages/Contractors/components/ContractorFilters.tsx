import { Search, X as XIcon } from 'lucide-react';
import {
  CONTRACTOR_STATUSES, COMPLIANCE_STATUSES, COMPANY_TYPES,
} from '../../../config/contractorConfig';
import type { ContractorFilters as Filters } from '../hooks/useContractors';

interface Props {
  filters: Filters;
  onFilterChange: (filters: Filters) => void;
  onExport: (format: string) => void;
}

const periods = [
  { key: '', label: 'All Time' },
  { key: 'week', label: 'This Week' },
  { key: 'month', label: 'This Month' },
  { key: 'year', label: 'This Year' },
];

export default function ContractorFilters({ filters, onFilterChange, onExport }: Props) {
  const set = (key: keyof Filters, value: string | number) => {
    onFilterChange({ ...filters, [key]: value, page: 1 });
  };

  const clear = () => {
    onFilterChange({
      search: '', contractor_status: '', compliance_status: '',
      company_type: '', scope_of_work: '', site: '', area: '', project: '',
      is_active: '', is_suspended: '',
      has_expired_documents: '', has_expiring_documents: '', contract_expiring: '',
      date_from: '', date_to: '', period: '',
      sort_by: 'contractor_name', sort_dir: 'asc',
      per_page: 20, page: 1,
    });
  };

  const hasFilters =
    filters.contractor_status || filters.compliance_status ||
    filters.company_type || filters.period ||
    filters.has_expired_documents || filters.has_expiring_documents ||
    filters.date_from || filters.date_to;

  const selectClass =
    'ctr-filter-select h-[34px] px-2.5 text-[12px] border border-border rounded-[var(--radius-sm)] bg-surface text-text-primary focus:outline-none focus:ring-1 focus:ring-primary-300 min-w-0';
  const inputClass = selectClass;

  return (
    <div className="ctr-filters space-y-3 mb-5">
      {/* Main row */}
      <div className="flex flex-wrap items-center gap-2">
        {/* Search */}
        <div className="relative flex-1 min-w-[200px] max-w-[320px]">
          <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-text-tertiary" />
          <input
            type="text"
            placeholder="Search code, name, scope..."
            value={filters.search}
            onChange={e => set('search', e.target.value)}
            className={`${inputClass} w-full pl-8`}
          />
        </div>

        {/* Status */}
        <select
          value={filters.contractor_status}
          onChange={e => set('contractor_status', e.target.value)}
          className={selectClass}
        >
          <option value="">All Statuses</option>
          {CONTRACTOR_STATUSES.map(s => (
            <option key={s} value={s}>{s}</option>
          ))}
        </select>

        {/* Compliance */}
        <select
          value={filters.compliance_status}
          onChange={e => set('compliance_status', e.target.value)}
          className={selectClass}
        >
          <option value="">All Compliance</option>
          {COMPLIANCE_STATUSES.map(c => (
            <option key={c} value={c}>{c}</option>
          ))}
        </select>

        {/* Company Type */}
        <select
          value={filters.company_type}
          onChange={e => set('company_type', e.target.value)}
          className={selectClass}
        >
          <option value="">All Types</option>
          {COMPANY_TYPES.map(t => (
            <option key={t} value={t}>{t}</option>
          ))}
        </select>

        {/* Period chips */}
        <div className="flex items-center gap-1">
          {periods.map(p => (
            <button
              key={p.key}
              onClick={() => set('period', p.key)}
              className={`px-2.5 py-1.5 text-[11px] font-medium rounded-full border transition-colors ${
                filters.period === p.key
                  ? 'bg-primary-500 text-white border-primary-500'
                  : 'bg-surface border-border text-text-secondary hover:bg-surface-sunken'
              }`}
            >
              {p.label}
            </button>
          ))}
        </div>

        {/* Export */}
        <button
          onClick={() => onExport('xlsx')}
          className="ctr-filter-export inline-flex items-center gap-1.5 px-3 py-1.5 text-[11px] font-medium text-white bg-primary-500 rounded-[var(--radius-sm)] hover:bg-primary-600 transition-colors"
        >
          Export
        </button>

        {/* Clear */}
        {hasFilters && (
          <button
            onClick={clear}
            className="inline-flex items-center gap-1 px-2 py-1.5 text-[11px] text-danger-600 hover:text-danger-700"
          >
            <XIcon size={12} /> Clear
          </button>
        )}
      </div>
    </div>
  );
}
