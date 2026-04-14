import { Eye, Pencil, Trash2, FileText, Paperclip } from 'lucide-react';
import { useState } from 'react';
import { MomWeekBadge } from './MomWeekBadge';
import { MomStatusBadge } from './MomStatusBadge';
import type { MomListItem } from '../hooks/useMom';
import TypedDeleteConfirmModal from '../../../components/ui/TypedDeleteConfirmModal';

interface Props {
  moms: MomListItem[];
  loading: boolean;
  pagination: { currentPage: number; lastPage: number; total: number; perPage: number };
  onPageChange: (page: number) => void;
  onView: (m: MomListItem) => void;
  onEdit: (m: MomListItem) => void;
  onDelete: (id: string) => void;
  onAddNew: () => void;
}

export function MomTable({ moms, loading, pagination, onPageChange, onView, onEdit, onDelete, onAddNew }: Props) {
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const handleDelete = (id: string) => {
    onDelete(id);
    setDeleteId(null);
  };

  if (loading) {
    return (
      <div className="mom-table-wrap">
        <table className="mom-table">
          <thead>
            <tr>
              {['MOM Code', 'Week', 'Date', 'Title', 'Type', 'Points', 'Overdue', 'Status', '', 'Actions'].map(h => (
                <th key={h}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {Array.from({ length: 5 }).map((_, i) => (
              <tr key={i}>
                {Array.from({ length: 10 }).map((_, j) => (
                  <td key={j}><div className="mom-skeleton" style={{ height: 16, width: j === 3 ? 180 : 80 }} /></td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  }

  if (moms.length === 0) {
    return (
      <div className="mom-table-wrap">
        <div className="mom-empty">
          <FileText className="mom-empty__icon" />
          <div className="mom-empty__title">No MOMs found</div>
          <div className="mom-empty__text">Create your first Weekly MOM to start tracking meeting action items.</div>
          <button
            onClick={onAddNew}
            className="inline-flex items-center gap-1.5 px-4 py-2 text-[13px] font-semibold text-white bg-primary-600 rounded-[var(--radius-md)] hover:bg-primary-700 transition-colors"
          >
            + New MOM
          </button>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="mom-table-wrap">
        <table className="mom-table">
          <thead>
            <tr>
              <th>MOM Code</th>
              <th>Week</th>
              <th>Date</th>
              <th>Title</th>
              <th>Type</th>
              <th>Points</th>
              <th>Overdue</th>
              <th>Status</th>
              <th style={{ width: 32 }}></th>
              <th style={{ width: 100 }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {moms.map(m => {
              const rowCls = m.overdue_points > 0
                ? 'mom-row--has-overdue'
                : m.open_points > 0
                  ? 'mom-row--has-open'
                  : m.status === 'Closed'
                    ? 'mom-row--closed'
                    : '';
              return (
                <tr key={m.id} className={rowCls}>
                  <td>
                    <span className="mom-code">{m.mom_code}</span>
                  </td>
                  <td>
                    {m.week_number && m.year ? <MomWeekBadge week_number={m.week_number} year={m.year} size="sm" /> : '—'}
                  </td>
                  <td style={{ fontSize: 12, whiteSpace: 'nowrap' }}>
                    {m.meeting_date ? new Date(m.meeting_date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : '—'}
                  </td>
                  <td style={{ fontWeight: 600, maxWidth: 220, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {m.title || '—'}
                  </td>
                  <td>
                    {m.meeting_type && (
                      <span className="mom-category-badge">{m.meeting_type.replace(' HSE Meeting', '').replace(' Meeting', '')}</span>
                    )}
                  </td>
                  <td>
                    <div className="mom-stat-pills">
                      <span className="mom-stat-pill mom-stat-pill--total">{m.total_points}</span>
                      {m.open_points > 0 && <span className="mom-stat-pill mom-stat-pill--open">{m.open_points} open</span>}
                    </div>
                  </td>
                  <td>
                    {m.overdue_points > 0 && (
                      <span className="mom-stat-pill mom-stat-pill--overdue">{m.overdue_points}</span>
                    )}
                  </td>
                  <td><MomStatusBadge status={m.status} /></td>
                  <td>
                    {m.has_attachments && <Paperclip size={14} style={{ color: 'var(--color-text-tertiary)' }} />}
                  </td>
                  <td>
                    <div className="flex items-center justify-center gap-1 table-actions">
                      <button onClick={() => onView(m)} className="action-btn action-btn--view" title="View">
                        <Eye size={15} />
                      </button>
                      <button onClick={() => onEdit(m)} className="action-btn action-btn--edit" title="Edit">
                        <Pencil size={15} />
                      </button>
                      <button onClick={() => setDeleteId(m.id)} className="action-btn action-btn--delete" title="Delete">
                        <Trash2 size={15} />
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {pagination.lastPage > 1 && (
        <div className="mom-pagination">
          <span>Showing {((pagination.currentPage - 1) * pagination.perPage) + 1}–{Math.min(pagination.currentPage * pagination.perPage, pagination.total)} of {pagination.total}</span>
          <div className="mom-pagination__pages">
            <button
              className="mom-pagination__btn"
              onClick={() => onPageChange(pagination.currentPage - 1)}
              disabled={pagination.currentPage <= 1}
            >
              &lsaquo;
            </button>
            {Array.from({ length: pagination.lastPage }, (_, i) => i + 1)
              .filter(p => p === 1 || p === pagination.lastPage || Math.abs(p - pagination.currentPage) <= 2)
              .map((p, idx, arr) => (
                <span key={p} style={{ display: 'contents' }}>
                  {idx > 0 && arr[idx - 1] !== p - 1 && <span style={{ padding: '0 4px', color: 'var(--color-text-tertiary)' }}>...</span>}
                  <button
                    className={`mom-pagination__btn ${p === pagination.currentPage ? 'mom-pagination__btn--active' : ''}`}
                    onClick={() => onPageChange(p)}
                  >
                    {p}
                  </button>
                </span>
              ))}
            <button
              className="mom-pagination__btn"
              onClick={() => onPageChange(pagination.currentPage + 1)}
              disabled={pagination.currentPage >= pagination.lastPage}
            >
              &rsaquo;
            </button>
          </div>
        </div>
      )}

      {/* Delete confirmation */}
      <TypedDeleteConfirmModal
        open={!!deleteId}
        onClose={() => setDeleteId(null)}
        onConfirm={() => deleteId && handleDelete(deleteId)}
        itemType="MOM"
        itemName={moms.find(m => m.id === deleteId)?.title}
        message="This MOM and all associated points and updates will be moved to the recycle bin."
      />
    </>
  );
}
