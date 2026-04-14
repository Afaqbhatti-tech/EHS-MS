import { useState, useEffect } from 'react';
import { Eye, Pencil, Trash2, ChevronLeft, ChevronRight, AlertCircle } from 'lucide-react';
import { TrackerStatusBadge, ConditionBadge, CategoryBadge, OverdueBadge, DueSoonBadge, TuvBadge } from './TrackerBadges';
import { format } from 'date-fns';
import type { TrackerRecord } from '../hooks/useTracker';
import TypedDeleteConfirmModal from '../../../components/ui/TypedDeleteConfirmModal';

const STATUSES = ['Active', 'Inactive', 'Out of Service', 'Quarantined', 'Removed from Site', 'Under Maintenance'];

interface Props {
  items: TrackerRecord[];
  loading: boolean;
  pagination: { currentPage: number; lastPage: number; total: number; perPage: number };
  onPageChange: (page: number) => void;
  onView: (item: TrackerRecord) => void;
  onEdit: (item: TrackerRecord) => void;
  onDelete: (id: number) => void;
  onAddNew: () => void;
  showCategory?: boolean;
}

export function TrackerRecordTable({
  items, loading, pagination, onPageChange,
  onView, onEdit, onDelete, onAddNew,
  showCategory = true,
}: Props) {
  const [confirmDelete, setConfirmDelete] = useState<number | null>(null);

  const handleDelete = async (id: number) => {
    try { await onDelete(id); }
    catch (err) { console.error('Delete failed:', err); }
    setConfirmDelete(null);
  };

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return '—';
    try { return format(new Date(dateStr), 'dd MMM yyyy'); } catch { return dateStr; }
  };

  if (loading && items.length === 0) {
    return (
      <div className="bg-surface border border-border rounded-[var(--radius-md)] shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-surface-sunken border-b-2 border-border">
                {['Code', 'Name', 'Category', 'Condition', 'Status', 'Next Inspection', 'Actions'].map(h => (
                  <th key={h} className="px-3.5 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-text-tertiary">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {Array.from({ length: 5 }).map((_, i) => (
                <tr key={i} className="border-b border-border">
                  {Array.from({ length: 7 }).map((_, j) => (
                    <td key={j} className="px-3.5 py-3.5"><div className="skeleton h-4 w-full" /></td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    );
  }

  if (!loading && items.length === 0) {
    return (
      <div className="bg-surface border border-border rounded-[var(--radius-md)] shadow-sm py-16 flex flex-col items-center justify-center text-center">
        <AlertCircle size={48} className="text-text-tertiary mb-4" />
        <p className="text-[15px] font-semibold text-text-primary mb-1">No item records found</p>
        <p className="text-[13px] text-text-tertiary mb-5">Try adjusting your filters or add a new record</p>
        <button onClick={onAddNew} className="px-4 py-2 text-[13px] font-semibold bg-primary-600 text-white rounded-[var(--radius-md)] hover:bg-primary-700 transition-colors shadow-xs">
          + Add Item
        </button>
      </div>
    );
  }

  const { currentPage, lastPage, total, perPage } = pagination;
  const startItem = (currentPage - 1) * perPage + 1;
  const endItem = Math.min(currentPage * perPage, total);

  return (
    <div className="bg-surface border border-border rounded-[var(--radius-md)] shadow-sm overflow-hidden">
      <div className="overflow-x-auto table-responsive">
        <table className="w-full min-w-[700px]">
          <thead>
            <tr className="bg-surface-sunken border-b-2 border-border">
              <th className="px-3.5 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-text-tertiary">Code</th>
              <th className="px-3.5 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-text-tertiary">Name</th>
              {showCategory && <th className="px-3.5 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-text-tertiary">Category</th>}
              <th className="px-3.5 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-text-tertiary">Condition</th>
              <th className="px-3.5 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-text-tertiary">Status</th>
              <th className="px-3.5 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-text-tertiary">Next Inspection</th>
              <th className="px-3.5 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-text-tertiary hidden lg:table-cell">Location</th>
              <th className="px-3.5 py-3 text-center text-[11px] font-semibold uppercase tracking-wider text-text-tertiary w-[100px]">Actions</th>
            </tr>
          </thead>
          <tbody>
            {items.map(item => (
              <tr
                key={item.id}
                className={`border-b border-border transition-colors hover:bg-canvas cursor-pointer ${
                  item.is_overdue ? 'bg-danger-50/40 border-l-[3px] border-l-danger-500' : ''
                }`}
                onClick={() => onView(item)}
              >
                <td className="px-3.5 py-3 text-[13px] text-text-primary font-medium whitespace-nowrap">{item.record_code}</td>
                <td className="px-3.5 py-3">
                  <div className="text-[13px] text-text-primary font-medium max-w-[200px] truncate">{item.equipment_name}</div>
                  {item.item_subtype && <div className="text-[11px] text-text-tertiary">{item.item_subtype}</div>}
                </td>
                {showCategory && (
                  <td className="px-3.5 py-3">
                    <CategoryBadge label={item.category_label} color={item.category_color}
                      lightColor={item.category_light_color} textColor={item.category_text_color} />
                  </td>
                )}
                <td className="px-3.5 py-3"><ConditionBadge condition={item.condition} /></td>
                <td className="px-3.5 py-3"><TrackerStatusBadge status={item.status} /></td>
                <td className="px-3.5 py-3 whitespace-nowrap">
                  <div className={`text-[13px] ${item.is_overdue ? 'text-danger-600 font-semibold' : 'text-text-primary'}`}>
                    {formatDate(item.next_internal_inspection_date)}
                  </div>
                  {item.is_overdue && item.days_until_due !== null && <OverdueBadge daysOver={Math.abs(item.days_until_due)} />}
                  {item.due_soon && !item.is_overdue && item.days_until_due !== null && <DueSoonBadge daysUntil={item.days_until_due} />}
                  <TuvBadge isOverdue={item.is_tuv_overdue} daysUntil={item.days_until_tuv} />
                </td>
                <td className="px-3.5 py-3 text-[13px] text-text-secondary hidden lg:table-cell max-w-[140px] truncate">{item.location_area || '—'}</td>
                <td className="px-3.5 py-3 text-center" onClick={e => e.stopPropagation()}>
                  <div className="flex items-center justify-center gap-1 table-actions">
                    <button onClick={() => onView(item)} className="action-btn action-btn--view" title="View">
                      <Eye size={15} />
                    </button>
                    <button onClick={() => onEdit(item)} className="action-btn action-btn--edit" title="Edit">
                      <Pencil size={15} />
                    </button>
                    <button onClick={() => setConfirmDelete(item.id)} className="action-btn action-btn--delete" title="Delete">
                      <Trash2 size={15} />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {total > perPage && (
        <div className="flex items-center justify-between px-4 py-3 border-t border-border">
          <span className="text-[12px] text-text-tertiary">Showing {startItem}–{endItem} of {total}</span>
          <div className="flex items-center gap-1">
            <button onClick={() => onPageChange(currentPage - 1)} disabled={currentPage === 1}
              className="p-1.5 rounded-[var(--radius-sm)] text-text-tertiary hover:bg-surface-sunken disabled:opacity-30 transition-colors">
              <ChevronLeft size={16} />
            </button>
            {Array.from({ length: Math.min(lastPage, 5) }, (_, i) => {
              let pageNum: number;
              if (lastPage <= 5) pageNum = i + 1;
              else if (currentPage <= 3) pageNum = i + 1;
              else if (currentPage >= lastPage - 2) pageNum = lastPage - 4 + i;
              else pageNum = currentPage - 2 + i;
              return (
                <button key={pageNum} onClick={() => onPageChange(pageNum)}
                  className={`w-8 h-8 text-[12px] font-medium rounded-[var(--radius-sm)] transition-colors ${
                    pageNum === currentPage ? 'bg-primary-600 text-white' : 'text-text-secondary hover:bg-surface-sunken'
                  }`}>{pageNum}</button>
              );
            })}
            <button onClick={() => onPageChange(currentPage + 1)} disabled={currentPage === lastPage}
              className="p-1.5 rounded-[var(--radius-sm)] text-text-tertiary hover:bg-surface-sunken disabled:opacity-30 transition-colors">
              <ChevronRight size={16} />
            </button>
          </div>
        </div>
      )}

      {/* Delete confirmation */}
      <TypedDeleteConfirmModal
        open={!!confirmDelete}
        onClose={() => setConfirmDelete(null)}
        onConfirm={() => confirmDelete && handleDelete(confirmDelete)}
        itemType="Equipment"
        itemName={items.find(i => i.id === confirmDelete)?.equipment_name}
        message="This equipment record and all inspection logs will be moved to the recycle bin."
      />
    </div>
  );
}
