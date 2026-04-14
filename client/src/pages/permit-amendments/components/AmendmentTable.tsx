import {
  Eye,
  Pencil,
  Trash2,
  ChevronLeft,
  ChevronRight,
  AlertCircle,
} from 'lucide-react';
import { format } from 'date-fns';
import type { Amendment } from '../hooks/useAmendments';
import AmendmentStatusBadge from './AmendmentStatusBadge';
import AmendmentCategoryBadge from './AmendmentCategoryBadge';
import RevisionBadge from './RevisionBadge';
import AmendmentTypeBadge from './AmendmentTypeBadge';

/* ── Helpers ──────────────────────────────────────── */

const formatDate = (dateStr: string | null | undefined): string => {
  if (!dateStr) return '\u2014';
  try {
    return format(new Date(dateStr), 'dd MMM yyyy');
  } catch {
    return dateStr;
  }
};

const SKELETON_ROWS = 8;
const COLUMN_HEADERS = [
  'AMD Code',
  'Permit',
  'Rev',
  'Title',
  'Type',
  'Category',
  'Status',
  'Requested By',
  'Changes',
  'Effective',
  'Actions',
];

/* ── Component ────────────────────────────────────── */

interface Props {
  amendments: Amendment[];
  loading: boolean;
  onView: (a: Amendment) => void;
  onEdit: (a: Amendment) => void;
  onDelete: (a: Amendment) => void;
  pagination: {
    current_page: number;
    last_page: number;
    total: number;
  };
  onPageChange: (page: number) => void;
}

const AmendmentTable = ({
  amendments,
  loading,
  onView,
  onEdit,
  onDelete,
  pagination,
  onPageChange,
}: Props) => {
  const { current_page, last_page, total } = pagination;
  const perPage = amendments.length || 20;
  const startItem = (current_page - 1) * perPage + 1;
  const endItem = Math.min(current_page * perPage, total);

  /* Row CSS class based on flags */
  const rowClassName = (a: Amendment): string => {
    const classes: string[] = ['amendment-row--clickable'];
    if (a.is_major_change_flagged) classes.push('amendment-row--major');
    if (a.status === 'Submitted' || a.status === 'Under Review')
      classes.push('amendment-row--pending-review');
    if (a.is_active_revision) classes.push('amendment-row--active-revision');
    return classes.join(' ');
  };

  /* ── Loading skeleton ───────────────────────────── */
  if (loading && amendments.length === 0) {
    return (
      <div className="amendment-table-wrap">
        <table className="amendment-table">
          <thead>
            <tr>
              {COLUMN_HEADERS.map((h) => (
                <th key={h}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {Array.from({ length: SKELETON_ROWS }).map((_, i) => (
              <tr key={i}>
                {COLUMN_HEADERS.map((_, j) => (
                  <td key={j}>
                    <div className="skeleton" style={{ height: 14, width: '80%' }} />
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  }

  /* ── Empty state ────────────────────────────────── */
  if (!loading && amendments.length === 0) {
    return (
      <div
        className="amendment-table-wrap"
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '64px 20px',
          textAlign: 'center',
        }}
      >
        <AlertCircle
          size={48}
          style={{ color: 'var(--color-text-tertiary)', marginBottom: 16 }}
        />
        <p
          style={{
            fontSize: 15,
            fontWeight: 600,
            color: 'var(--color-text-primary)',
            marginBottom: 4,
          }}
        >
          No amendments found
        </p>
        <p
          style={{
            fontSize: 13,
            color: 'var(--color-text-tertiary)',
          }}
        >
          Try adjusting your filters or create a new amendment
        </p>
      </div>
    );
  }

  /* ── Table ──────────────────────────────────────── */
  return (
    <div className="amendment-table-wrap">
      <table className="amendment-table">
        <thead>
          <tr>
            {COLUMN_HEADERS.map((h) => (
              <th key={h}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {amendments.map((a) => (
            <tr
              key={a.id}
              className={rowClassName(a)}
              onClick={() => onView(a)}
            >
              {/* 1. AMD Code */}
              <td>
                <span className="amendment-code">{a.amendment_code}</span>
              </td>

              {/* 2. Permit */}
              <td>
                <div style={{ lineHeight: 1.3 }}>
                  <span
                    style={{
                      fontSize: 13,
                      fontWeight: 600,
                      color: 'var(--color-text-primary)',
                      display: 'block',
                    }}
                  >
                    {a.permit?.ref_number || a.permit_number_snapshot || '\u2014'}
                  </span>
                  <span
                    style={{
                      fontSize: 11,
                      color: 'var(--color-text-tertiary)',
                    }}
                  >
                    {a.permit?.permit_type || a.permit_type_snapshot || ''}
                  </span>
                </div>
              </td>

              {/* 3. Revision */}
              <td>
                <RevisionBadge
                  revision={a.revision_number}
                  isActive={a.is_active_revision}
                />
              </td>

              {/* 4. Title */}
              <td>
                <span
                  style={{
                    fontSize: 13,
                    fontWeight: 600,
                    color: 'var(--color-text-primary)',
                    display: '-webkit-box',
                    WebkitLineClamp: 2,
                    WebkitBoxOrient: 'vertical',
                    overflow: 'hidden',
                    maxWidth: 220,
                  }}
                  title={a.amendment_title}
                >
                  {a.amendment_title}
                </span>
              </td>

              {/* 5. Type */}
              <td>
                <AmendmentTypeBadge type={a.amendment_type} size="xs" />
              </td>

              {/* 6. Category */}
              <td>
                <AmendmentCategoryBadge
                  category={a.amendment_category as 'Minor' | 'Major'}
                />
              </td>

              {/* 7. Status */}
              <td>
                <AmendmentStatusBadge status={a.status} size="sm" />
              </td>

              {/* 8. Requested By */}
              <td>
                <div style={{ lineHeight: 1.3 }}>
                  <span
                    style={{
                      fontSize: 13,
                      color: 'var(--color-text-primary)',
                      display: 'block',
                    }}
                  >
                    {a.requested_by_user?.name || a.requested_by || '\u2014'}
                  </span>
                  <span
                    style={{
                      fontSize: 11,
                      color: 'var(--color-text-tertiary)',
                    }}
                  >
                    {formatDate(a.request_date)}
                  </span>
                </div>
              </td>

              {/* 9. Changes count */}
              <td>
                <span
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    minWidth: 24,
                    height: 22,
                    padding: '0 7px',
                    borderRadius: 'var(--radius-full)',
                    fontSize: 11,
                    fontWeight: 700,
                    background:
                      (a.changes_count ?? a.change_count ?? 0) > 0
                        ? 'var(--color-primary-50)'
                        : 'var(--color-surface-sunken)',
                    color:
                      (a.changes_count ?? a.change_count ?? 0) > 0
                        ? 'var(--color-primary-700)'
                        : 'var(--color-text-tertiary)',
                    border: '1px solid var(--color-border)',
                  }}
                >
                  {a.changes_count ?? a.change_count ?? 0}
                </span>
              </td>

              {/* 10. Effective date */}
              <td style={{ whiteSpace: 'nowrap', fontSize: 13, color: 'var(--color-text-secondary)' }}>
                {formatDate(a.effective_from)}
              </td>

              {/* 11. Actions */}
              <td onClick={(e) => e.stopPropagation()}>
                <div className="flex items-center justify-center gap-1 table-actions">
                  <button className="action-btn action-btn--view" onClick={() => onView(a)} title="View">
                    <Eye size={15} />
                  </button>
                  <button className="action-btn action-btn--edit" onClick={() => onEdit(a)} title="Edit">
                    <Pencil size={15} />
                  </button>
                  <button className="action-btn action-btn--delete" onClick={() => onDelete(a)} title="Delete">
                    <Trash2 size={15} />
                  </button>
                </div>
              </td>

            </tr>
          ))}
        </tbody>
      </table>

      {/* ── Pagination ─────────────────────────────── */}
      {total > perPage && (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '10px 14px',
            borderTop: '1px solid var(--color-border)',
          }}
        >
          <span
            style={{
              fontSize: 12,
              color: 'var(--color-text-tertiary)',
            }}
          >
            Showing {startItem}&ndash;{endItem} of {total}
          </span>

          <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            <button
              type="button"
              onClick={() => onPageChange(current_page - 1)}
              disabled={current_page === 1}
              style={{
                padding: 6,
                borderRadius: 'var(--radius-sm)',
                background: 'transparent',
                border: 'none',
                cursor: current_page === 1 ? 'default' : 'pointer',
                color: 'var(--color-text-tertiary)',
                opacity: current_page === 1 ? 0.3 : 1,
              }}
            >
              <ChevronLeft size={16} />
            </button>

            {Array.from({ length: Math.min(last_page, 5) }, (_, i) => {
              let pageNum: number;
              if (last_page <= 5) {
                pageNum = i + 1;
              } else if (current_page <= 3) {
                pageNum = i + 1;
              } else if (current_page >= last_page - 2) {
                pageNum = last_page - 4 + i;
              } else {
                pageNum = current_page - 2 + i;
              }
              return (
                <button
                  key={pageNum}
                  type="button"
                  onClick={() => onPageChange(pageNum)}
                  style={{
                    width: 32,
                    height: 32,
                    fontSize: 12,
                    fontWeight: 600,
                    borderRadius: 'var(--radius-sm)',
                    border: 'none',
                    cursor: 'pointer',
                    transition: 'background 0.12s, color 0.12s',
                    background:
                      pageNum === current_page
                        ? 'var(--color-primary-600)'
                        : 'transparent',
                    color:
                      pageNum === current_page
                        ? '#fff'
                        : 'var(--color-text-secondary)',
                  }}
                >
                  {pageNum}
                </button>
              );
            })}

            <button
              type="button"
              onClick={() => onPageChange(current_page + 1)}
              disabled={current_page === last_page}
              style={{
                padding: 6,
                borderRadius: 'var(--radius-sm)',
                background: 'transparent',
                border: 'none',
                cursor: current_page === last_page ? 'default' : 'pointer',
                color: 'var(--color-text-tertiary)',
                opacity: current_page === last_page ? 0.3 : 1,
              }}
            >
              <ChevronRight size={16} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default AmendmentTable;
