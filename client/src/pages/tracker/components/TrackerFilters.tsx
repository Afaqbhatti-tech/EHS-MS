import { Download, X as XIcon, Upload, ChevronDown } from 'lucide-react';
import { FilterSearchInput } from '../../../components/ui/FilterSearchInput';
import ExportDropdown from '../../../components/ui/ExportDropdown';
import type { ExportFormat } from '../../../components/ui/ExportDropdown';
import { TRACKER_CATEGORIES } from '../../../config/trackerCategories';
import type { TrackerFilters as FiltersType, TrackerCategory } from '../hooks/useTracker';

interface Props {
  filters: FiltersType;
  onFilterChange: (key: string, value: string | number) => void;
  onExport: (format: ExportFormat) => void;
  onImport: () => void;
  onDownloadTemplate: () => void;
  categories: TrackerCategory[];
  loading: boolean;
}

export function TrackerFilters({
  filters, onFilterChange, onExport, onImport, onDownloadTemplate, categories, loading,
}: Props) {
  const hasActiveFilters = filters.search || filters.category_key || filters.status ||
    filters.condition || filters.overdue || filters.due_soon || filters.tuv_overdue || filters.cert_expired;

  const clearAll = () => {
    onFilterChange('search', '');
    onFilterChange('category_key', '');
    onFilterChange('status', '');
    onFilterChange('condition', '');
    onFilterChange('overdue', '');
    onFilterChange('due_soon', '');
    onFilterChange('tuv_overdue', '');
    onFilterChange('cert_expired', '');
    onFilterChange('period', '');
  };

  // For dropdowns only — NOT for search inputs (use FilterSearchInput instead).
  // sm:w-auto here is intentional for selects but causes overflow on search wrappers.
  const selectClasses = 'h-[34px] w-full sm:w-auto px-3 pr-8 text-[13px] bg-surface-sunken border border-border rounded-[var(--radius-sm)] text-text-primary focus:outline-none focus:ring-[3px] focus:ring-primary-500/10 focus:border-primary-500 focus:bg-surface appearance-none cursor-pointer transition-all';

  const activeCat = filters.category_key ? TRACKER_CATEGORIES.find(c => c.key === filters.category_key) : null;

  return (
    <div className="mb-4 space-y-3">
      {/* Active category indicator */}
      {activeCat && (
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-full border text-[12px] font-semibold"
            style={{ backgroundColor: activeCat.lightColor, color: activeCat.textColor, borderColor: activeCat.color + '30' }}>
            <activeCat.icon size={14} />
            {activeCat.label}
            <button onClick={() => onFilterChange('category_key', '')}
              className="ml-1 p-0.5 rounded-full hover:bg-black/5 transition-colors">
              <XIcon size={12} />
            </button>
          </div>
        </div>
      )}

      {/* Filter bar */}
      <div className="flex flex-wrap items-center gap-2 bg-surface border border-border rounded-[var(--radius-md)] p-3 shadow-xs">
        {/* Search */}
        <FilterSearchInput
          value={filters.search}
          onChange={v => onFilterChange('search', v)}
          placeholder="Search equipment..."
        />

        {/* Category (hidden if already filtered) */}
        {!filters.category_key && (
          <select value={filters.category_key} onChange={e => onFilterChange('category_key', e.target.value)} className={selectClasses}>
            <option value="">All Categories</option>
            {categories.map(c => <option key={c.key} value={c.key}>{c.label}</option>)}
          </select>
        )}

        {/* Status */}
        <select value={filters.status} onChange={e => onFilterChange('status', e.target.value)} className={selectClasses}>
          <option value="">All Statuses</option>
          {['Active', 'Inactive', 'Out of Service', 'Quarantined', 'Under Maintenance'].map(s => (
            <option key={s} value={s}>{s}</option>
          ))}
        </select>

        {/* Condition */}
        <select value={filters.condition} onChange={e => onFilterChange('condition', e.target.value)} className={selectClasses}>
          <option value="">All Conditions</option>
          {['Good', 'Fair', 'Poor', 'Out of Service', 'Quarantined'].map(c => (
            <option key={c} value={c}>{c}</option>
          ))}
        </select>

        {/* Quick toggles */}
        <button onClick={() => onFilterChange('overdue', filters.overdue ? '' : '1')}
          className={`px-3 py-[5px] text-[12px] font-semibold rounded-full border-[1.5px] transition-all ${
            filters.overdue ? 'bg-primary-600 text-white border-primary-700' : 'bg-surface text-text-secondary border-border hover:bg-primary-600 hover:border-primary-700 hover:text-white'
          }`}>Overdue</button>

        <button onClick={() => onFilterChange('tuv_overdue', filters.tuv_overdue ? '' : '1')}
          className={`px-3 py-[5px] text-[12px] font-semibold rounded-full border-[1.5px] transition-all ${
            filters.tuv_overdue ? 'bg-primary-600 text-white border-primary-700' : 'bg-surface text-text-secondary border-border hover:bg-primary-600 hover:border-primary-700 hover:text-white'
          }`}>TUV Overdue</button>

        {hasActiveFilters && (
          <button onClick={clearAll} className="ml-auto inline-flex items-center gap-1 text-[13px] font-medium text-danger-600 hover:underline cursor-pointer">
            <XIcon size={13} />
            Clear
          </button>
        )}

        {!hasActiveFilters && <div className="flex-1" />}

        {/* Import */}
        {filters.category_key && (
          <>
            <button onClick={onDownloadTemplate}
              className="inline-flex items-center gap-1.5 px-3 py-[5px] text-[12px] font-semibold text-text-primary bg-surface border border-border rounded-[var(--radius-sm)] hover:bg-surface-sunken transition-colors">
              <Download size={14} />
              Template
            </button>
            <button onClick={onImport}
              className="inline-flex items-center gap-1.5 px-3 py-[5px] text-[12px] font-semibold text-white bg-primary-600 rounded-[var(--radius-sm)] hover:bg-primary-700 transition-colors">
              <Upload size={14} />
              Import
            </button>
          </>
        )}

        {/* Export */}
        <ExportDropdown onExport={onExport} disabled={loading} />
      </div>
    </div>
  );
}
