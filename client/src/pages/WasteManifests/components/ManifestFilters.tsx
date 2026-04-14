import { useState } from 'react';
import { Search, ChevronDown, ChevronUp, X as XIcon } from 'lucide-react';
import { WASTE_TYPES, WASTE_CATEGORIES, STATUSES, PRIORITIES, COMPLIANCE_STATUSES } from '../../../config/wasteManifestConfig';
import type { ManifestFilters as Filters } from '../hooks/useManifests';

interface Props {
  filters: Filters;
  onChange: (filters: Filters) => void;
  onExport: (format: string) => void;
}

const periods = [
  { key: '', label: 'All Time' },
  { key: 'week', label: 'This Week' },
  { key: 'month', label: 'This Month' },
  { key: 'year', label: 'This Year' },
];

export default function ManifestFilters({ filters, onChange, onExport }: Props) {
  const [expanded, setExpanded] = useState(false);

  const set = (key: keyof Filters, value: string | number) => {
    onChange({ ...filters, [key]: value, page: 1 });
  };

  const clear = () => {
    onChange({
      search: '', status: '', waste_type: '', waste_category: '',
      source_area: '', source_department: '', transporter_name: '',
      facility_name: '', generator_company: '', priority: '',
      manifest_compliance_status: '', is_delayed: '', linked_waste_record_id: '',
      date_from: '', date_to: '', dispatch_from: '', dispatch_to: '',
      period: '', sort_by: 'manifest_date', sort_dir: 'desc',
      per_page: 20, page: 1,
    });
  };

  const hasFilters = filters.status || filters.waste_type || filters.waste_category ||
    filters.source_area || filters.transporter_name || filters.facility_name ||
    filters.priority || filters.is_delayed || filters.date_from || filters.date_to ||
    filters.dispatch_from || filters.dispatch_to || filters.manifest_compliance_status;

  const selectClass = 'h-[34px] px-2.5 text-[12px] border border-border rounded-[var(--radius-sm)] bg-surface text-text-primary focus:outline-none focus:ring-1 focus:ring-primary-300 min-w-0';
  const inputClass = selectClass;

  return (
    <div className="space-y-3 mb-5">
      {/* Row 1 */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative flex-1 min-w-[200px] max-w-[320px]">
          <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-text-tertiary" />
          <input
            type="text"
            placeholder="Search code, type, transporter..."
            value={filters.search}
            onChange={e => set('search', e.target.value)}
            className={`${inputClass} w-full pl-8`}
          />
        </div>

        <select value={filters.status} onChange={e => set('status', e.target.value)} className={selectClass}>
          <option value="">All Statuses</option>
          {STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
        </select>

        <select value={filters.waste_category} onChange={e => set('waste_category', e.target.value)} className={selectClass}>
          <option value="">All Categories</option>
          {WASTE_CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
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

        <button
          onClick={() => setExpanded(!expanded)}
          className="inline-flex items-center gap-1 px-2.5 py-1.5 text-[11px] font-medium text-text-secondary border border-border rounded-[var(--radius-sm)] bg-surface hover:bg-surface-sunken transition-colors"
        >
          {expanded ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
          {expanded ? 'Less' : 'More'}
        </button>

        <button
          onClick={() => onExport('xlsx')}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-[11px] font-medium text-white bg-primary-500 rounded-[var(--radius-sm)] hover:bg-primary-600 transition-colors"
        >
          Export
        </button>

        {hasFilters && (
          <button
            onClick={clear}
            className="inline-flex items-center gap-1 px-2 py-1.5 text-[11px] text-danger-600 hover:text-danger-700"
          >
            <XIcon size={12} /> Clear
          </button>
        )}
      </div>

      {/* Row 2 — Expanded */}
      {expanded && (
        <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-border">
          <select value={filters.waste_type} onChange={e => set('waste_type', e.target.value)} className={selectClass}>
            <option value="">All Waste Types</option>
            {WASTE_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
          </select>

          <input
            type="text"
            placeholder="Source Area"
            value={filters.source_area}
            onChange={e => set('source_area', e.target.value)}
            className={`${inputClass} w-[130px]`}
          />

          <input
            type="text"
            placeholder="Transporter"
            value={filters.transporter_name}
            onChange={e => set('transporter_name', e.target.value)}
            className={`${inputClass} w-[130px]`}
          />

          <input
            type="text"
            placeholder="Facility"
            value={filters.facility_name}
            onChange={e => set('facility_name', e.target.value)}
            className={`${inputClass} w-[130px]`}
          />

          <select value={filters.priority} onChange={e => set('priority', e.target.value)} className={selectClass}>
            <option value="">All Priorities</option>
            {PRIORITIES.map(p => <option key={p} value={p}>{p}</option>)}
          </select>

          <select value={filters.manifest_compliance_status} onChange={e => set('manifest_compliance_status', e.target.value)} className={selectClass}>
            <option value="">All Compliance</option>
            {COMPLIANCE_STATUSES.map(c => <option key={c} value={c}>{c}</option>)}
          </select>

          <label className="inline-flex items-center gap-1.5 text-[11px] text-text-secondary">
            <input
              type="checkbox"
              checked={filters.is_delayed === '1'}
              onChange={e => set('is_delayed', e.target.checked ? '1' : '')}
              className="rounded border-border"
            />
            Delayed Only
          </label>

          <div className="flex items-center gap-1.5 text-[11px] text-text-secondary">
            <span>Date:</span>
            <input type="date" value={filters.date_from} onChange={e => set('date_from', e.target.value)} className={`${inputClass} w-[130px]`} />
            <span>to</span>
            <input type="date" value={filters.date_to} onChange={e => set('date_to', e.target.value)} className={`${inputClass} w-[130px]`} />
          </div>
        </div>
      )}
    </div>
  );
}
