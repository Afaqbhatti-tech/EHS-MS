import { Search, X as XIcon, Filter, RotateCcw } from 'lucide-react';
import type { Filters, FilterOptions } from '../hooks/useEquipmentRegister';

interface Props {
  filters: Filters;
  filterOptions: FilterOptions | null;
  onFilterChange: (key: keyof Filters, value: string) => void;
  onReset: () => void;
  total: number;
}

function fmt(val: string): string {
  return val.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
}

export default function EquipmentRegisterFilters({ filters, filterOptions, onFilterChange, onReset, total }: Props) {
  const hasFilters = Object.values(filters).some(v => v !== '');
  const activeCount = Object.values(filters).filter(v => v !== '').length;

  return (
    <div className="space-y-3">
      {/* Search bar */}
      <div className="flex items-center gap-3">
        <div className="relative flex-1">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-tertiary" />
          <input
            type="text"
            value={filters.search}
            onChange={e => onFilterChange('search', e.target.value)}
            placeholder="Search by name, code, serial number, company, area..."
            className="w-full h-9 pl-9 pr-9 text-[13px] border border-border rounded-[var(--radius-md)] bg-white
              text-text-primary placeholder:text-text-tertiary
              focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-400 transition-all duration-150"
          />
          {filters.search && (
            <button
              onClick={() => onFilterChange('search', '')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 p-0.5 text-text-tertiary hover:text-text-secondary rounded-sm"
            >
              <XIcon size={14} />
            </button>
          )}
        </div>
        <div className="text-[12px] text-text-tertiary font-medium whitespace-nowrap">
          {total} equipment
        </div>
      </div>

      {/* Filter row */}
      <div className="flex items-center gap-2 flex-wrap">
        <div className="flex items-center gap-1.5 text-[12px] text-text-secondary font-medium shrink-0">
          <Filter size={13} />
          Filters
          {activeCount > 0 && (
            <span className="inline-flex items-center justify-center w-4.5 h-4.5 text-[10px] font-bold bg-primary-100 text-primary-700 rounded-full px-1.5">
              {activeCount}
            </span>
          )}
        </div>

        {/* Status */}
        <FilterSelect
          value={filters.equipment_status}
          onChange={v => onFilterChange('equipment_status', v)}
          placeholder="Status"
          options={filterOptions?.statuses || []}
        />

        {/* Working Status */}
        <FilterSelect
          value={filters.working_status}
          onChange={v => onFilterChange('working_status', v)}
          placeholder="Working Status"
          options={filterOptions?.working_statuses || []}
        />

        {/* Condition */}
        <FilterSelect
          value={filters.condition_status}
          onChange={v => onFilterChange('condition_status', v)}
          placeholder="Condition"
          options={filterOptions?.conditions || []}
        />

        {/* Category */}
        <FilterSelect
          value={filters.equipment_category}
          onChange={v => onFilterChange('equipment_category', v)}
          placeholder="Category"
          options={filterOptions?.categories || []}
        />

        {/* Company */}
        <FilterSelect
          value={filters.company_name}
          onChange={v => onFilterChange('company_name', v)}
          placeholder="Company"
          options={filterOptions?.companies || []}
          raw
        />

        {/* Area */}
        <FilterSelect
          value={filters.area}
          onChange={v => onFilterChange('area', v)}
          placeholder="Area"
          options={filterOptions?.areas || []}
          raw
        />

        {/* Zone */}
        <FilterSelect
          value={filters.zone}
          onChange={v => onFilterChange('zone', v)}
          placeholder="Zone"
          options={filterOptions?.zones || []}
          raw
        />

        {/* Inspection Status */}
        <FilterSelect
          value={filters.inspection_status}
          onChange={v => onFilterChange('inspection_status', v)}
          placeholder="Inspection"
          options={['valid', 'due_soon', 'overdue']}
        />

        {/* Reset */}
        {hasFilters && (
          <button
            onClick={onReset}
            className="inline-flex items-center gap-1 px-2.5 py-1.5 text-[11px] font-medium text-red-600
              bg-red-50 border border-red-200 rounded-[var(--radius-md)] hover:bg-red-100 transition-colors shrink-0"
          >
            <RotateCcw size={11} />
            Reset
          </button>
        )}
      </div>
    </div>
  );
}

// ── Small filter select ──

function FilterSelect({ value, onChange, placeholder, options, raw }: {
  value: string;
  onChange: (v: string) => void;
  placeholder: string;
  options: string[];
  raw?: boolean;
}) {
  return (
    <select
      value={value}
      onChange={e => onChange(e.target.value)}
      className={`h-7.5 px-2 text-[11px] font-medium border rounded-[var(--radius-md)] bg-white
        focus:outline-none focus:ring-1 focus:ring-primary-500/20 transition-colors cursor-pointer
        ${value
          ? 'border-primary-300 text-primary-700 bg-primary-50'
          : 'border-border text-text-secondary hover:border-gray-400'
        }`}
    >
      <option value="">{placeholder}</option>
      {options.map(opt => (
        <option key={opt} value={opt}>
          {raw ? opt : opt.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())}
        </option>
      ))}
    </select>
  );
}
