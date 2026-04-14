import { X as XIcon } from 'lucide-react';
import { FilterSearchInput } from '../../../components/ui/FilterSearchInput';
import ExportDropdown from '../../../components/ui/ExportDropdown';
import type { ExportFormat } from '../../../components/ui/ExportDropdown';
import type { ChecklistFilters as FiltersType, FilterOptions } from '../hooks/useChecklists';
import { CHECKLIST_CATEGORIES } from '../config/checklistCategories';

interface Props {
  filters: FiltersType;
  onFilterChange: (key: string, value: string | number) => void;
  onExport: (format: ExportFormat) => void;
  filterOptions: FilterOptions | null;
  loading: boolean;
  activeCategoryKey?: string;
  onClearCategory?: () => void;
}

export function ChecklistFilters({
  filters, onFilterChange, onExport, filterOptions, loading,
  activeCategoryKey, onClearCategory,
}: Props) {
  const hasActiveFilters = filters.search || filters.category_key || filters.status ||
    filters.health_condition || filters.overdue || filters.due_soon;

  const clearAll = () => {
    onFilterChange('search', '');
    onFilterChange('category_key', '');
    onFilterChange('status', '');
    onFilterChange('health_condition', '');
    onFilterChange('overdue', '');
    onFilterChange('due_soon', '');
    onFilterChange('period', '');
    onClearCategory?.();
  };

  // For dropdowns only — NOT for search inputs (use FilterSearchInput instead).
  // sm:w-auto here is intentional for selects but causes overflow on search wrappers.
  const selectClasses = 'h-[34px] w-full sm:w-auto px-3 pr-8 text-[13px] bg-surface-sunken border border-border rounded-[var(--radius-sm)] text-text-primary focus:outline-none focus:ring-[3px] focus:ring-primary-500/10 focus:border-primary-500 focus:bg-surface appearance-none cursor-pointer transition-all';

  return (
    <div className="mb-4 space-y-3">
      {/* Active category indicator */}
      {activeCategoryKey && (
        <div className="flex items-center gap-2">
          {(() => {
            const cat = CHECKLIST_CATEGORIES.find(c => c.key === activeCategoryKey);
            if (!cat) return null;
            const Icon = cat.icon;
            return (
              <div
                className="flex items-center gap-2 px-3 py-1.5 rounded-full border text-[12px] font-semibold"
                style={{ backgroundColor: cat.lightColor, color: cat.textColor, borderColor: cat.color + '30' }}
              >
                <Icon size={14} />
                {cat.label}
                <button
                  onClick={onClearCategory}
                  className="ml-1 p-0.5 rounded-full hover:bg-black/5 transition-colors"
                >
                  <XIcon size={12} />
                </button>
              </div>
            );
          })()}
        </div>
      )}

      {/* Filter bar */}
      <div className="flex flex-wrap items-center gap-2 bg-surface border border-border rounded-[var(--radius-md)] p-3 shadow-xs">
        {/* Search */}
        <FilterSearchInput
          value={filters.search}
          onChange={v => onFilterChange('search', v)}
          placeholder="Search items..."
        />

        {/* Category filter (only show when no active category) */}
        {!activeCategoryKey && (
          <select
            value={filters.category_key}
            onChange={e => onFilterChange('category_key', e.target.value)}
            className={selectClasses}
          >
            <option value="">All Categories</option>
            {(filterOptions?.categories || []).map(c => (
              <option key={c.key} value={c.key}>{c.label}</option>
            ))}
          </select>
        )}

        {/* Status filter */}
        <select
          value={filters.status}
          onChange={e => onFilterChange('status', e.target.value)}
          className={selectClasses}
        >
          <option value="">All Statuses</option>
          {(filterOptions?.statuses || []).map(s => (
            <option key={s} value={s}>{s}</option>
          ))}
        </select>

        {/* Health condition */}
        <select
          value={filters.health_condition}
          onChange={e => onFilterChange('health_condition', e.target.value)}
          className={selectClasses}
        >
          <option value="">All Conditions</option>
          {(filterOptions?.health_conditions || []).map(h => (
            <option key={h} value={h}>{h}</option>
          ))}
        </select>

        {/* Quick alert toggles */}
        <button
          onClick={() => onFilterChange('overdue', filters.overdue ? '' : '1')}
          className={`px-3 py-[5px] text-[12px] font-semibold rounded-full border-[1.5px] transition-all ${
            filters.overdue
              ? 'bg-primary-600 text-white border-primary-700'
              : 'bg-surface text-text-secondary border-border hover:bg-primary-600 hover:border-primary-700 hover:text-white'
          }`}
        >
          Overdue
        </button>
        <button
          onClick={() => onFilterChange('due_soon', filters.due_soon ? '' : '1')}
          className={`px-3 py-[5px] text-[12px] font-semibold rounded-full border-[1.5px] transition-all ${
            filters.due_soon
              ? 'bg-primary-600 text-white border-primary-700'
              : 'bg-surface text-text-secondary border-border hover:bg-primary-600 hover:border-primary-700 hover:text-white'
          }`}
        >
          Due Soon
        </button>

        {hasActiveFilters && (
          <button
            onClick={clearAll}
            className="ml-auto inline-flex items-center gap-1 text-[13px] font-medium text-danger-600 hover:underline cursor-pointer"
          >
            <XIcon size={13} />
            Clear Filters
          </button>
        )}

        {!hasActiveFilters && <div className="flex-1" />}

        {/* Export */}
        <ExportDropdown onExport={onExport} disabled={loading} />
      </div>
    </div>
  );
}
