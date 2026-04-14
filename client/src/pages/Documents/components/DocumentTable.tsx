import React from 'react';
import { Eye, Pencil, Trash2 } from 'lucide-react';
import DocumentStatusBadge from './DocumentStatusBadge';
import RevisionBadge from './RevisionBadge';
import DocumentExpiryBadge from './DocumentExpiryBadge';
import type { DcDocument, DcFilters } from '../hooks/useDocuments';

interface Props {
  documents: DcDocument[];
  loading: boolean;
  filters: DcFilters;
  onSort: (field: string) => void;
  onView: (doc: DcDocument) => void;
  onEdit: (doc: DcDocument) => void;
  onDelete: (doc: DcDocument) => void;
  pagination: { total: number; page: number; per_page: number; last_page: number };
  onPageChange: (page: number) => void;
}

export default function DocumentTable({ documents, loading, filters, onSort, onView, onEdit, onDelete, pagination, onPageChange }: Props) {
  const sortIcon = (field: string) => {
    if (filters.sort_by !== field) return '↕';
    return filters.sort_dir === 'asc' ? '↑' : '↓';
  };

  const rowBorder = (d: DcDocument) => {
    if (d.is_expired) return '3px solid var(--color-danger)';
    if (d.is_overdue_review || d.is_expiring_soon) return '3px solid var(--color-warning)';
    if (d.status === 'Active') return '3px solid var(--color-success)';
    return undefined;
  };

  if (loading && documents.length === 0) {
    return <div className="dc-loading">Loading documents...</div>;
  }

  return (
    <div className="dc-table-wrap">
      <table className="dc-table">
        <thead>
          <tr>
            <th onClick={() => onSort('document_code')} style={{ cursor: 'pointer' }}>Code {sortIcon('document_code')}</th>
            <th onClick={() => onSort('document_title')} style={{ cursor: 'pointer' }}>Document {sortIcon('document_title')}</th>
            <th>Category</th>
            <th>Revision</th>
            <th onClick={() => onSort('status')} style={{ cursor: 'pointer' }}>Status {sortIcon('status')}</th>
            <th>Owner</th>
            <th>Department</th>
            <th onClick={() => onSort('next_review_date')} style={{ cursor: 'pointer' }}>Review {sortIcon('next_review_date')}</th>
            <th onClick={() => onSort('expiry_date')} style={{ cursor: 'pointer' }}>Expiry {sortIcon('expiry_date')}</th>
            <th>Links</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {documents.length === 0 && (
            <tr><td colSpan={11} className="dc-table-empty">No documents found</td></tr>
          )}
          {documents.map(d => (
            <tr key={d.id} style={{ borderLeft: rowBorder(d), opacity: d.status === 'Obsolete' ? 0.7 : 1 }}>
              <td><span className="dc-code-badge">{d.document_code}</span></td>
              <td>
                <div className="dc-doc-cell">
                  <span className="dc-doc-title" onClick={() => onView(d)}>{d.document_title}</span>
                  <span className="dc-doc-type">{d.document_type}</span>
                </div>
              </td>
              <td className="dc-text-sm">{d.document_category || '—'}</td>
              <td>
                <RevisionBadge
                  revision={d.current_revision_number || 'Rev 00'}
                  isActive={d.status === 'Active'}
                  isSuperseded={d.status === 'Superseded'}
                />
              </td>
              <td><DocumentStatusBadge status={d.status} /></td>
              <td className="dc-text-sm">{d.owner || '—'}</td>
              <td className="dc-text-sm">{d.department || '—'}</td>
              <td><DocumentExpiryBadge date={d.next_review_date} /></td>
              <td><DocumentExpiryBadge date={d.expiry_date} /></td>
              <td className="dc-text-sm">{(d.links_count ?? 0) > 0 ? `🔗 ${d.links_count}` : '—'}</td>
              <td>
                <div className="flex items-center justify-center gap-1 table-actions" onClick={(e) => e.stopPropagation()}>
                  <button className="action-btn action-btn--view" title="View" onClick={() => onView(d)}>
                    <Eye size={15} />
                  </button>
                  {!['Obsolete', 'Archived'].includes(d.status) && (
                    <button className="action-btn action-btn--edit" title="Edit" onClick={() => onEdit(d)}>
                      <Pencil size={15} />
                    </button>
                  )}
                  <button className="action-btn action-btn--delete" title="Delete" onClick={() => onDelete(d)}>
                    <Trash2 size={15} />
                  </button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {pagination.last_page > 1 && (
        <div className="dc-pagination">
          <span className="dc-pagination-info">
            Showing {((pagination.page - 1) * pagination.per_page) + 1}–{Math.min(pagination.page * pagination.per_page, pagination.total)} of {pagination.total}
          </span>
          <div className="dc-pagination-btns">
            <button disabled={pagination.page <= 1} onClick={() => onPageChange(pagination.page - 1)}>Previous</button>
            <button disabled={pagination.page >= pagination.last_page} onClick={() => onPageChange(pagination.page + 1)}>Next</button>
          </div>
        </div>
      )}
    </div>
  );
}
