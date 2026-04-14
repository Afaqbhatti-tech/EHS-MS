import { useState, useEffect } from 'react';
import { Eye, Pencil, Trash2, ChevronLeft, ChevronRight, AlertCircle } from 'lucide-react';
import { HealthBadge, ItemStatusBadge, CategoryBadge, OverdueBadge, DueSoonBadge } from './ChecklistBadges';
import { format } from 'date-fns';
import type { ChecklistItem } from '../hooks/useChecklists';
import TypedDeleteConfirmModal from '../../../components/ui/TypedDeleteConfirmModal';

const STATUSES = ['Active', 'Inactive', 'Out of Service', 'Quarantined', 'Removed from Site'];

interface Props {
  items: ChecklistItem[];
  loading: boolean;
  pagination: { currentPage: number; lastPage: number; total: number; perPage: number };
  onPageChange: (page: number) => void;
  onView: (item: ChecklistItem) => void;
  onEdit: (item: ChecklistItem) => void;
  onDelete: (id: string) => void;
  onStatusChange: (id: string, data: { status: string }) => Promise<unknown>;
  onAddNew: () => void;
  showCategory?: boolean;
}

export function ChecklistTable({
  items, loading, pagination, onPageChange,
  onView, onEdit, onDelete, onStatusChange, onAddNew,
  showCategory = true,
}: Props) {
  const [statusDropdown, setStatusDropdown] = useState<string | null>(null);
  const [dropdownPos, setDropdownPos] = useState<{ top: number; left: number } | null>(null);
  const [changingStatus, setChangingStatus] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);

  useEffect(() => {
    if (!statusDropdown) return;
    const close = () => { setStatusDropdown(null); setDropdownPos(null); };
    window.addEventListener('click', close);
    window.addEventListener('scroll', close, true);
    return () => { window.removeEventListener('click', close); window.removeEventListener('scroll', close, true); };
  }, [statusDropdown]);

  const handleStatusChange = async (id: string, newStatus: string) => {
    setChangingStatus(id);
    try { await onStatusChange(id, { status: newStatus }); }
    catch (err) { console.error('Status change failed:', err); }
    finally { setChangingStatus(null); setStatusDropdown(null); }
  };

  const handleDelete = async (id: string) => {
    try { await onDelete(id); }
    catch (err) { console.error('Delete failed:', err); }
    setConfirmDelete(null);
  };

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return '—';
    try { return format(new Date(dateStr), 'dd MMM yyyy'); } catch { return dateStr; }
  };

  // Loading skeleton
  if (loading && items.length === 0) {
    return (
      <div className="bg-surface border border-border rounded-[var(--radius-md)] shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-surface-sunken border-b-2 border-border">
                {['Code', 'Name', 'Category', 'Health', 'Status', 'Next Inspection', 'Actions'].map(h => (
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

  // Empty state
  if (!loading && items.length === 0) {
    return (
      <div className="bg-surface border border-border rounded-[var(--radius-md)] shadow-sm py-16 flex flex-col items-center justify-center text-center">
        <AlertCircle size={48} className="text-text-tertiary mb-4" />
        <p className="text-[15px] font-semibold text-text-primary mb-1">No checklist items found</p>
        <p className="text-[13px] text-text-tertiary mb-5">Try adjusting your filters or add a new item</p>
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
              <th className="px-3.5 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-text-tertiary">Health</th>
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
                <td className="px-3.5 py-3 text-[13px] text-text-primary font-medium whitespace-nowrap">{item.item_code}</td>
                <td className="px-3.5 py-3">
                  <div className="text-[13px] text-text-primary font-medium max-w-[200px] truncate">{item.name}</div>
                  {item.item_type && <div className="text-[11px] text-text-tertiary">{item.item_type}</div>}
                </td>
                {showCategory && (
                  <td className="px-3.5 py-3">
                    <CategoryBadge
                      label={item.category_label}
                      color={item.category_color}
                      lightColor={item.category_light_color}
                      textColor={item.category_text_color}
                    />
                  </td>
                )}
                <td className="px-3.5 py-3"><HealthBadge condition={item.health_condition} /></td>
                <td className="px-3.5 py-3" onClick={e => e.stopPropagation()}>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      if (statusDropdown === item.id) {
                        setStatusDropdown(null);
                        setDropdownPos(null);
                      } else {
                        const rect = e.currentTarget.getBoundingClientRect();
                        const spaceBelow = window.innerHeight - rect.bottom;
                        const dropdownH = STATUSES.length * 30 + 8;
                        const top = spaceBelow < dropdownH ? rect.top - dropdownH : rect.bottom + 4;
                        setDropdownPos({ top, left: rect.left });
                        setStatusDropdown(item.id);
                      }
                    }}
                    disabled={changingStatus === item.id}
                    className="cursor-pointer"
                  >
                    {changingStatus === item.id ? (
                      <span className="text-[11px] text-text-tertiary">Updating...</span>
                    ) : (
                      <ItemStatusBadge status={item.status} />
                    )}
                  </button>
                </td>
                <td className="px-3.5 py-3 whitespace-nowrap">
                  <div className={`text-[13px] ${item.is_overdue ? 'text-danger-600 font-semibold' : 'text-text-primary'}`}>
                    {formatDate(item.next_internal_inspection_date)}
                  </div>
                  {item.is_overdue && item.days_until_due !== null && (
                    <OverdueBadge daysOver={Math.abs(item.days_until_due)} />
                  )}
                  {item.due_soon && !item.is_overdue && item.days_until_due !== null && (
                    <DueSoonBadge daysUntil={item.days_until_due} />
                  )}
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
                  }`}>
                  {pageNum}
                </button>
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
        itemType="Checklist Item"
        itemName={items.find(i => i.id === confirmDelete)?.name}
        message="This item and all inspection records will be moved to the recycle bin."
      />

      {/* Fixed status dropdown */}
      {statusDropdown && dropdownPos && (
        <div
          className="fixed z-[200] bg-surface border border-border rounded-lg shadow-xl py-0.5 min-w-[120px] animate-fadeIn"
          style={{ top: dropdownPos.top, left: dropdownPos.left }}
          onClick={e => e.stopPropagation()}
        >
          {STATUSES.map(s => (
            <button
              key={s}
              onClick={(e) => {
                e.stopPropagation();
                handleStatusChange(statusDropdown, s);
              }}
              className={`w-full text-left px-2.5 py-1 text-[11px] hover:bg-surface-sunken transition-colors ${
                items.find(i => i.id === statusDropdown)?.status === s ? 'font-semibold text-primary-600' : 'text-text-primary'
              }`}
            >
              {s}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
