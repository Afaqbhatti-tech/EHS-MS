import { useState, useEffect, useRef } from 'react';
import { Search, MoreVertical, Eye, Pencil, Trash2 } from 'lucide-react';
import { PointStatusBadge } from './PointStatusBadge';
import { PointPriorityBadge } from './PointPriorityBadge';
import { MomPointUpdateModal } from './MomPointUpdateModal';
import type { MomPointItem } from '../hooks/useMom';
import { useToast } from '../../../components/ui/Toast';

interface Props {
  searchPoints: (filters: Record<string, unknown>) => Promise<{ data: MomPointItem[]; total: number; page: number; per_page: number; last_page: number }>;
  onUpdatePoint?: (momId: string, pointId: number, data: Record<string, unknown>) => Promise<unknown>;
  onDeletePoint?: (momId: string, pointId: number) => Promise<void>;
  onViewPoint?: (momId: string) => void;
}

const STATUS_OPTIONS = ['Open', 'In Progress', 'Pending', 'Blocked', 'Resolved', 'Closed'];

function ActionMenu({ point, onView, onEdit, onDelete }: {
  point: MomPointItem;
  onView: () => void;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center justify-center w-9 h-9 rounded-[var(--radius-sm)] text-gray-700 hover:text-text-primary hover:bg-surface-sunken transition-colors"
        title="Actions"
      >
        <MoreVertical size={18} strokeWidth={2} />
      </button>
      {open && (
        <div className="absolute right-0 top-full mt-1 z-30 w-[140px] bg-surface border border-border rounded-[var(--radius-md)] shadow-lg py-1 animate-fadeInUp">
          <button
            onClick={() => { setOpen(false); onView(); }}
            className="w-full flex items-center gap-2.5 px-3 py-2 text-[12px] text-text-primary hover:bg-surface-sunken transition-colors"
          >
            <Eye size={13} className="text-text-tertiary" />
            View
          </button>
          <button
            onClick={() => { setOpen(false); onEdit(); }}
            className="w-full flex items-center gap-2.5 px-3 py-2 text-[12px] text-text-primary hover:bg-surface-sunken transition-colors"
          >
            <Pencil size={13} className="text-text-tertiary" />
            Edit
          </button>
          <button
            onClick={() => { setOpen(false); onDelete(); }}
            className="w-full flex items-center gap-2.5 px-3 py-2 text-[12px] text-danger-600 hover:bg-danger-50 transition-colors"
          >
            <Trash2 size={13} />
            Delete
          </button>
        </div>
      )}
    </div>
  );
}

export function MomOpenItemsView({ searchPoints, onUpdatePoint, onDeletePoint, onViewPoint }: Props) {
  const toast = useToast();
  const [points, setPoints] = useState<MomPointItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [pagination, setPagination] = useState({ total: 0, page: 1, lastPage: 1 });
  const [editingPoint, setEditingPoint] = useState<MomPointItem | null>(null);
  const [deletingPoint, setDeletingPoint] = useState<MomPointItem | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [filters, setFilters] = useState({
    search: '',
    status: 'Open',
    assigned_to: '',
    category: '',
    priority: '',
    overdue: '',
    page: 1,
    per_page: 25,
  });

  const fetchData = async () => {
    setLoading(true);
    try {
      const params: Record<string, unknown> = {};
      Object.entries(filters).forEach(([k, v]) => { if (v) params[k] = v; });
      const result = await searchPoints(params);
      setPoints(result.data || []);
      setPagination({ total: result.total, page: result.page, lastPage: result.last_page });
    } catch (err) {
      console.error('Failed to search points:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, [filters]);

  const updateFilter = (key: string, value: string | number) => {
    setFilters(prev => ({ ...prev, [key]: value, page: key === 'page' ? (value as number) : 1 }));
  };

  const handleQuickStatus = async (point: MomPointItem, newStatus: string) => {
    if (!onUpdatePoint || !point.mom_id) return;
    try {
      await onUpdatePoint(point.mom_id, point.id, { status: newStatus, update_note: `Status changed to ${newStatus}` });
      await fetchData();
    } catch (err: any) {
      toast.error(err.message || 'Failed to update');
    }
  };

  const handleModalSubmit = async (pointId: number, data: Record<string, unknown>) => {
    if (!onUpdatePoint || !editingPoint?.mom_id) return;
    await onUpdatePoint(editingPoint.mom_id, pointId, data);
    await fetchData();
  };

  const handleDelete = async () => {
    if (!deletingPoint || !onDeletePoint) return;
    setDeleteLoading(true);
    try {
      await onDeletePoint(deletingPoint.mom_id, deletingPoint.id);
      setDeletingPoint(null);
      await fetchData();
      toast.success('Point deleted');
    } catch (err: any) {
      toast.error(err.message || 'Failed to delete');
    } finally {
      setDeleteLoading(false);
    }
  };

  const colCount = 8 + (onUpdatePoint ? 2 : 0);

  return (
    <div>
      {/* Filters */}
      <div className="mom-filter-row">
        <div style={{ position: 'relative', flex: '1 1 200px' }}>
          <Search size={15} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--color-text-tertiary)' }} />
          <input type="text" placeholder="Search points..." value={filters.search} onChange={e => updateFilter('search', e.target.value)}
            className="w-full pl-8 pr-3 py-[7px] text-[13px] border border-border rounded-[var(--radius-md)] bg-surface focus:outline-none focus:border-primary-400" />
        </div>
        <select value={filters.status} onChange={e => updateFilter('status', e.target.value)}
          className="px-3 py-[7px] text-[13px] border border-border rounded-[var(--radius-md)] bg-surface focus:outline-none min-w-[130px]">
          <option value="">All Status</option>
          {STATUS_OPTIONS.map(s => <option key={s} value={s}>{s}</option>)}
        </select>
        <input type="text" placeholder="Assigned to" value={filters.assigned_to} onChange={e => updateFilter('assigned_to', e.target.value)}
          className="px-3 py-[7px] text-[13px] border border-border rounded-[var(--radius-md)] bg-surface focus:outline-none w-full sm:w-[140px]" />
        <label className="flex items-center gap-2 text-[12px] font-semibold text-text-secondary cursor-pointer">
          <input type="checkbox" checked={filters.overdue === '1'} onChange={e => updateFilter('overdue', e.target.checked ? '1' : '')} className="accent-danger-600" />
          Overdue Only
        </label>
      </div>

      {/* Table */}
      <div className="mom-table-wrap">
        <table className="mom-table">
          <thead>
            <tr>
              <th>Code</th>
              <th>Title</th>
              <th>MOM Week</th>
              <th>Status</th>
              <th>Priority</th>
              <th>Assigned To</th>
              <th>Due Date</th>
              <th>Carry</th>
              {onUpdatePoint && <th style={{ width: 90, fontSize: 10, whiteSpace: 'nowrap' }}>Quick Status</th>}
              {onUpdatePoint && <th style={{ width: 36 }}></th>}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <tr key={i}>{Array.from({ length: colCount }).map((_, j) => <td key={j}><div className="mom-skeleton" style={{ height: 14, width: 80 }} /></td>)}</tr>
              ))
            ) : points.length === 0 ? (
              <tr><td colSpan={colCount} style={{ textAlign: 'center', padding: 32, color: 'var(--color-text-tertiary)' }}>No points found.</td></tr>
            ) : (
              points.map(p => (
                <tr key={p.id} style={p.is_overdue ? { borderLeft: '3px solid #DC2626' } : undefined}>
                  <td><span className="mom-code" style={{ fontSize: 10 }}>{p.point_code}</span></td>
                  <td style={{ fontWeight: 600, maxWidth: 220, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.title}</td>
                  <td style={{ fontSize: 11 }}>{p.mom ? `W${p.mom.week_number}` : '—'}</td>
                  <td><PointStatusBadge status={p.status} size="sm" /></td>
                  <td><PointPriorityBadge priority={p.priority} /></td>
                  <td style={{ fontSize: 12 }}>{p.assigned_to || '—'}</td>
                  <td style={{ fontSize: 12, color: p.is_overdue ? '#DC2626' : undefined, fontWeight: p.is_overdue ? 700 : 400 }}>
                    {p.due_date ? new Date(p.due_date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' }) : '—'}
                    {p.is_overdue && ` (${p.days_overdue}d)`}
                  </td>
                  <td>{p.carry_count > 0 && <span className="carry-badge">{p.carry_count}x</span>}</td>
                  {onUpdatePoint && (
                    <td style={{ padding: '2px 4px' }}>
                      <select
                        value={p.status}
                        onChange={e => handleQuickStatus(p, e.target.value)}
                        className="px-1.5 py-0.5 text-[10px] border border-border rounded-[var(--radius-sm)] bg-surface focus:outline-none"
                        style={{ width: 82 }}
                      >
                        {STATUS_OPTIONS.map(s => <option key={s} value={s}>{s}</option>)}
                      </select>
                    </td>
                  )}
                  {onUpdatePoint && (
                    <td style={{ padding: '2px 4px' }}>
                      <ActionMenu
                        point={p}
                        onView={() => onViewPoint?.(p.mom_id)}
                        onEdit={() => setEditingPoint(p)}
                        onDelete={() => setDeletingPoint(p)}
                      />
                    </td>
                  )}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {pagination.lastPage > 1 && (
        <div className="mom-pagination">
          <span>{pagination.total} items</span>
          <div className="mom-pagination__pages">
            <button className="mom-pagination__btn" onClick={() => updateFilter('page', pagination.page - 1)} disabled={pagination.page <= 1}>&lsaquo;</button>
            {Array.from({ length: pagination.lastPage }, (_, i) => i + 1).filter(p => p === 1 || p === pagination.lastPage || Math.abs(p - pagination.page) <= 2).map(p => (
              <button key={p} className={`mom-pagination__btn ${p === pagination.page ? 'mom-pagination__btn--active' : ''}`} onClick={() => updateFilter('page', p)}>{p}</button>
            ))}
            <button className="mom-pagination__btn" onClick={() => updateFilter('page', pagination.page + 1)} disabled={pagination.page >= pagination.lastPage}>&rsaquo;</button>
          </div>
        </div>
      )}

      {/* Edit Modal */}
      {editingPoint && onUpdatePoint && (
        <MomPointUpdateModal
          point={editingPoint}
          onSubmit={handleModalSubmit}
          onClose={() => setEditingPoint(null)}
        />
      )}

      {/* Delete Confirmation */}
      {deletingPoint && (
        <div className="mom-modal-overlay" onClick={() => !deleteLoading && setDeletingPoint(null)}>
          <div className="mom-modal" onClick={e => e.stopPropagation()} style={{ maxWidth: 400 }}>
            <div className="mom-modal__header">
              <h3 style={{ fontSize: 14, fontWeight: 700 }}>Delete Point</h3>
            </div>
            <div className="mom-modal__body">
              <p className="text-[13px] text-text-secondary">
                Are you sure you want to delete <strong>{deletingPoint.point_code}</strong> — "{deletingPoint.title}"?
              </p>
              <p className="text-[11px] text-text-tertiary mt-2">This action cannot be undone.</p>
            </div>
            <div className="mom-modal__footer">
              <button onClick={() => setDeletingPoint(null)} disabled={deleteLoading}
                className="px-4 py-2 text-[13px] font-semibold border border-border rounded-[var(--radius-md)] bg-surface hover:bg-surface-sunken">
                Cancel
              </button>
              <button onClick={handleDelete} disabled={deleteLoading}
                className="px-4 py-2 text-[13px] font-semibold text-white bg-danger-600 rounded-[var(--radius-md)] hover:bg-danger-700 shadow-xs disabled:opacity-40">
                {deleteLoading ? 'Deleting...' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
