import React from 'react';
import { DOCUMENT_TYPES, DOCUMENT_CATEGORIES, STATUSES, CONFIDENTIALITY_LEVELS, PRIORITIES } from '../../../config/documentControlConfig';
import type { DcFilters } from '../hooks/useDocuments';

interface Props {
  filters: DcFilters;
  onChange: (f: DcFilters) => void;
  onReset: () => void;
}

export default function DocumentFilters({ filters, onChange, onReset }: Props) {
  const set = (key: keyof DcFilters, value: string) => onChange({ ...filters, [key]: value, page: 1 });

  const hasActive = Object.entries(filters).some(([k, v]) =>
    !['sort_by', 'sort_dir', 'per_page', 'page', 'search'].includes(k) && v !== '' && v !== undefined
  );

  return (
    <div className="dc-filters">
      <div className="dc-filters-row">
        <select value={filters.document_type} onChange={e => set('document_type', e.target.value)}>
          <option value="">All Types</option>
          {DOCUMENT_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
        </select>
        <select value={filters.document_category} onChange={e => set('document_category', e.target.value)}>
          <option value="">All Categories</option>
          {DOCUMENT_CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
        </select>
        <select value={filters.status} onChange={e => set('status', e.target.value)}>
          <option value="">All Statuses</option>
          {STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
        </select>
        <select value={filters.confidentiality_level} onChange={e => set('confidentiality_level', e.target.value)}>
          <option value="">All Confidentiality</option>
          {CONFIDENTIALITY_LEVELS.map(l => <option key={l} value={l}>{l}</option>)}
        </select>
        <select value={filters.priority} onChange={e => set('priority', e.target.value)}>
          <option value="">All Priorities</option>
          {PRIORITIES.map(p => <option key={p} value={p}>{p}</option>)}
        </select>
      </div>
      <div className="dc-filters-row">
        <input type="text" placeholder="Department" value={filters.department} onChange={e => set('department', e.target.value)} />
        <input type="text" placeholder="Site" value={filters.site} onChange={e => set('site', e.target.value)} />
        <input type="text" placeholder="Area" value={filters.area} onChange={e => set('area', e.target.value)} />
        <select value={filters.is_expired} onChange={e => set('is_expired', e.target.value)}>
          <option value="">Expiry Status</option>
          <option value="1">Expired</option>
          <option value="0">Not Expired</option>
        </select>
        <select value={filters.is_overdue_review} onChange={e => set('is_overdue_review', e.target.value)}>
          <option value="">Review Status</option>
          <option value="1">Overdue Review</option>
          <option value="0">Review OK</option>
        </select>
        {hasActive && (
          <button className="dc-filter-reset" onClick={onReset}>Clear Filters</button>
        )}
      </div>
    </div>
  );
}
