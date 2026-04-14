import { useState, useEffect, useRef, useCallback } from 'react';
import {
  Search,
  ChevronDown,
  ChevronUp,
  X,
  SlidersHorizontal,
  ToggleLeft,
  ToggleRight,
} from 'lucide-react';
import type { AmendmentFilters as Filters } from '../hooks/useAmendments';
import { AMENDMENT_TYPES, STATUSES, PRIORITIES } from '../hooks/useAmendments';
import ExportDropdown from '../../../components/ui/ExportDropdown';

/* ── Period options ────────────────────────────────── */

const PERIODS = [
  { value: '', label: 'All Time' },
  { value: 'week', label: 'Week' },
  { value: 'month', label: 'Month' },
  { value: 'year', label: 'Year' },
];

/* ── Component ────────────────────────────────────── */

interface Props {
  filters: Filters;
  onFilterChange: (f: Filters) => void;
  onExport: (format: string) => void;
}

const AmendmentFilters = ({ filters, onFilterChange, onExport }: Props) => {
  const [showMore, setShowMore] = useState(false);
  const [localSearch, setLocalSearch] = useState(filters.search);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  /* Debounce search input — 300 ms */
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      if (localSearch !== filters.search) {
        onFilterChange({ ...filters, search: localSearch, page: 1 });
      }
    }, 300);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [localSearch]); // eslint-disable-line react-hooks/exhaustive-deps

  /* Sync external filter changes back to local search */
  useEffect(() => {
    setLocalSearch(filters.search);
  }, [filters.search]);

  /* Helpers */
  const set = useCallback(
    (key: keyof Filters, value: string | number) => {
      onFilterChange({ ...filters, [key]: value, page: 1 });
    },
    [filters, onFilterChange],
  );

  const clearAll = () => {
    onFilterChange({
      search: '',
      amendment_type: '',
      amendment_category: '',
      status: '',
      priority: '',
      permit_id: '',
      area: '',
      permit_type: '',
      date_from: '',
      date_to: '',
      effective_from: '',
      effective_to: '',
      is_major_change_flagged: '',
      period: '',
      sort_by: 'created_at',
      sort_dir: 'desc',
      per_page: filters.per_page,
      page: 1,
    });
    setLocalSearch('');
  };

  const hasActiveFilters =
    filters.amendment_category ||
    filters.priority ||
    filters.area ||
    filters.is_major_change_flagged ||
    filters.date_from ||
    filters.date_to ||
    filters.effective_from ||
    filters.effective_to;

  return (
    <div className="amendment-filters" style={{ flexDirection: 'column', alignItems: 'stretch' }}>
      {/* ── Row 1: Always visible ─────────────────────── */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, alignItems: 'center' }}>
        {/* Search */}
        <div className="amendment-filters__search">
          <Search size={16} className="amendment-filters__search-icon" />
          <input
            type="text"
            placeholder="Search title, code, permit, requested by..."
            value={localSearch}
            onChange={(e) => setLocalSearch(e.target.value)}
          />
        </div>

        {/* Status */}
        <select
          className="amendment-filters__select"
          value={filters.status}
          onChange={(e) => set('status', e.target.value)}
        >
          <option value="">All Statuses</option>
          {STATUSES.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>

        {/* Amendment Type */}
        <select
          className="amendment-filters__select"
          value={filters.amendment_type}
          onChange={(e) => set('amendment_type', e.target.value)}
        >
          <option value="">All Types</option>
          {AMENDMENT_TYPES.map((t) => (
            <option key={t} value={t}>
              {t}
            </option>
          ))}
        </select>

        {/* Period chips */}
        <div className="amendment-filters__chips">
          {PERIODS.map((p) => (
            <button
              key={p.value}
              type="button"
              className={`amendment-filters__chip${
                filters.period === p.value ? ' amendment-filters__chip--active' : ''
              }`}
              onClick={() => set('period', p.value)}
            >
              {p.label}
            </button>
          ))}
        </div>

        {/* More Filters toggle */}
        <button
          type="button"
          className="amendment-filters__expand-btn"
          onClick={() => setShowMore((v) => !v)}
        >
          {showMore ? <ChevronUp size={14} /> : <SlidersHorizontal size={14} />}
          {showMore ? 'Less Filters' : '+ More Filters'}
        </button>

        {/* Export dropdown */}
        <ExportDropdown onExport={onExport} className="ml-auto" />
      </div>

      {/* ── Row 2: Expandable filters ─────────────────── */}
      {showMore && (
        <div className="amendment-filters__expanded">
          {/* Amendment Category */}
          <select
            className="amendment-filters__select"
            value={filters.amendment_category}
            onChange={(e) => set('amendment_category', e.target.value)}
          >
            <option value="">All Categories</option>
            <option value="Minor">Minor</option>
            <option value="Major">Major</option>
          </select>

          {/* Priority */}
          <select
            className="amendment-filters__select"
            value={filters.priority}
            onChange={(e) => set('priority', e.target.value)}
          >
            <option value="">All Priorities</option>
            {PRIORITIES.map((p) => (
              <option key={p} value={p}>
                {p}
              </option>
            ))}
          </select>

          {/* Area */}
          <input
            className="amendment-filters__select"
            type="text"
            placeholder="Area"
            value={filters.area}
            onChange={(e) => set('area', e.target.value)}
            style={{ appearance: 'auto', backgroundImage: 'none', paddingRight: 10 }}
          />

          {/* Major Changes Only toggle */}
          <button
            type="button"
            className={`amendment-filters__chip${
              filters.is_major_change_flagged === '1' ? ' amendment-filters__chip--active' : ''
            }`}
            onClick={() =>
              set(
                'is_major_change_flagged',
                filters.is_major_change_flagged === '1' ? '' : '1',
              )
            }
            style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}
          >
            {filters.is_major_change_flagged === '1' ? (
              <ToggleRight size={16} />
            ) : (
              <ToggleLeft size={16} />
            )}
            Major Only
          </button>

          {/* Date From / To */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            <span
              style={{
                fontSize: 11,
                fontWeight: 600,
                color: 'var(--color-text-tertiary)',
                whiteSpace: 'nowrap',
              }}
            >
              Request:
            </span>
            <input
              className="amendment-filters__select"
              type="date"
              value={filters.date_from}
              onChange={(e) => set('date_from', e.target.value)}
              title="Request date from"
              style={{ appearance: 'auto', backgroundImage: 'none', paddingRight: 6 }}
            />
            <span style={{ fontSize: 12, color: 'var(--color-text-tertiary)' }}>&ndash;</span>
            <input
              className="amendment-filters__select"
              type="date"
              value={filters.date_to}
              onChange={(e) => set('date_to', e.target.value)}
              title="Request date to"
              style={{ appearance: 'auto', backgroundImage: 'none', paddingRight: 6 }}
            />
          </div>

          {/* Effective From / To */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            <span
              style={{
                fontSize: 11,
                fontWeight: 600,
                color: 'var(--color-text-tertiary)',
                whiteSpace: 'nowrap',
              }}
            >
              Effective:
            </span>
            <input
              className="amendment-filters__select"
              type="date"
              value={filters.effective_from}
              onChange={(e) => set('effective_from', e.target.value)}
              title="Effective from"
              style={{ appearance: 'auto', backgroundImage: 'none', paddingRight: 6 }}
            />
            <span style={{ fontSize: 12, color: 'var(--color-text-tertiary)' }}>&ndash;</span>
            <input
              className="amendment-filters__select"
              type="date"
              value={filters.effective_to}
              onChange={(e) => set('effective_to', e.target.value)}
              title="Effective to"
              style={{ appearance: 'auto', backgroundImage: 'none', paddingRight: 6 }}
            />
          </div>

          {/* Clear Filters */}
          {hasActiveFilters && (
            <button
              type="button"
              onClick={clearAll}
              style={{
                marginLeft: 'auto',
                display: 'inline-flex',
                alignItems: 'center',
                gap: 4,
                fontSize: 12,
                fontWeight: 600,
                color: 'var(--color-danger-600)',
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                padding: '4px 8px',
              }}
            >
              <X size={13} />
              Clear Filters
            </button>
          )}
        </div>
      )}
    </div>
  );
};

export default AmendmentFilters;
