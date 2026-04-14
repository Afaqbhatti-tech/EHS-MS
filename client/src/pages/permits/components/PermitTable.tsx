import { useState, useEffect } from 'react';
import { Eye, Pencil, Trash2, ChevronLeft, ChevronRight, AlertCircle } from 'lucide-react';
import { PermitTypeBadge, PermitStatusBadge } from './PermitTypeBadge';
import { PERMIT_STATUSES } from '../config/permitTypes';
import { format, differenceInDays } from 'date-fns';
import TypedDeleteConfirmModal from '../../../components/ui/TypedDeleteConfirmModal';
import type { Permit } from '../hooks/usePermits';

interface Props {
  permits: Permit[];
  loading: boolean;
  pagination: { currentPage: number; lastPage: number; total: number; perPage: number };
  onPageChange: (page: number) => void;
  onView: (permit: Permit) => void;
  onEdit: (permit: Permit) => void;
  onDelete: (id: string) => void;
  onStatusChange: (id: string, data: { status: string }) => Promise<unknown>;
  onAddNew: () => void;
}

export function PermitTable({
  permits, loading, pagination, onPageChange,
  onView, onEdit, onDelete, onStatusChange, onAddNew,
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
    try {
      await onStatusChange(id, { status: newStatus });
    } catch (err) {
      console.error('Status change failed:', err);
    } finally {
      setChangingStatus(null);
      setStatusDropdown(null);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await onDelete(id);
    } catch (err) {
      console.error('Delete failed:', err);
    }
    setConfirmDelete(null);
  };

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return '\u2014';
    try { return format(new Date(dateStr), 'dd MMM yyyy'); } catch { return dateStr; }
  };

  const isExpired = (p: Permit) => p.status === 'Expired';
  const isExpiringSoon = (p: Permit) => {
    if (p.status !== 'Active' || !p.permit_date_end) return false;
    const daysLeft = differenceInDays(new Date(p.permit_date_end), new Date());
    return daysLeft >= 0 && daysLeft <= 3;
  };

  // Loading skeleton
  if (loading && permits.length === 0) {
    return (
      <div className="bg-surface border border-border rounded-[var(--radius-md)] shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-surface-sunken border-b-2 border-border">
                {['Permit No.', 'Type', 'Title', 'Area', 'Date', 'End Date', 'Status', 'Issued To', 'Actions'].map(h => (
                  <th key={h} className="px-3.5 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-text-tertiary">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {Array.from({ length: 5 }).map((_, i) => (
                <tr key={i} className="border-b border-border">
                  {Array.from({ length: 9 }).map((_, j) => (
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
  if (!loading && permits.length === 0) {
    return (
      <div className="bg-surface border border-border rounded-[var(--radius-md)] shadow-sm py-16 flex flex-col items-center justify-center text-center">
        <AlertCircle size={48} className="text-text-tertiary mb-4" />
        <p className="text-[15px] font-semibold text-text-primary mb-1">No permits found</p>
        <p className="text-[13px] text-text-tertiary mb-5">Try adjusting your filters or create a new permit</p>
        <button onClick={onAddNew} className="px-4 py-2 text-[13px] font-semibold bg-primary-600 text-white rounded-[var(--radius-md)] hover:bg-primary-700 transition-colors shadow-xs">
          + New Permit
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
        <table className="w-full min-w-[800px]">
          <thead>
            <tr className="bg-surface-sunken border-b-2 border-border">
              <th className="px-3.5 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-text-tertiary">Permit No.</th>
              <th className="px-3.5 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-text-tertiary">Type</th>
              <th className="px-3.5 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-text-tertiary">Title</th>
              <th className="px-3.5 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-text-tertiary hidden lg:table-cell">Area</th>
              <th className="px-3.5 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-text-tertiary">Date</th>
              <th className="px-3.5 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-text-tertiary">End Date</th>
              <th className="px-3.5 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-text-tertiary">Status</th>
              <th className="px-3.5 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-text-tertiary hidden lg:table-cell">Issued To</th>
              <th className="px-3.5 py-3 text-center text-[11px] font-semibold uppercase tracking-wider text-text-tertiary w-[100px]">Actions</th>
            </tr>
          </thead>
          <tbody>
            {permits.map(p => {
              const expired = isExpired(p);
              const expiringSoon = isExpiringSoon(p);
              return (
                <tr
                  key={p.id}
                  className={`border-b border-border transition-colors hover:bg-canvas cursor-pointer ${
                    expired ? 'bg-danger-50/30 border-l-[3px] border-l-danger-500' :
                    expiringSoon ? 'bg-warning-50/30 border-l-[3px] border-l-warning-500' : ''
                  }`}
                  onClick={() => onView(p)}
                >
                  <td className="px-3.5 py-3">
                    <span className="font-mono text-[12px] text-text-secondary bg-surface-sunken px-[7px] py-0.5 rounded-[var(--radius-xs)] border border-border inline-block">
                      {p.permit_number}
                    </span>
                  </td>
                  <td className="px-3.5 py-3">
                    <PermitTypeBadge type={p.permit_type} size="sm" />
                  </td>
                  <td className="px-3.5 py-3 text-[13px] text-text-primary max-w-[180px] truncate" title={p.title}>
                    {p.title}
                  </td>
                  <td className="px-3.5 py-3 text-[13px] text-text-secondary hidden lg:table-cell">{p.area || '\u2014'}</td>
                  <td className="px-3.5 py-3 text-[13px] text-text-primary whitespace-nowrap">{formatDate(p.permit_date)}</td>
                  <td className="px-3.5 py-3 text-[13px] text-text-secondary whitespace-nowrap">{formatDate(p.permit_date_end)}</td>
                  <td className="px-3.5 py-3" onClick={e => e.stopPropagation()}>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        if (statusDropdown === p.id) {
                          setStatusDropdown(null);
                          setDropdownPos(null);
                        } else {
                          const rect = e.currentTarget.getBoundingClientRect();
                          const spaceBelow = window.innerHeight - rect.bottom;
                          const dropdownH = PERMIT_STATUSES.length * 30 + 8;
                          const top = spaceBelow < dropdownH ? rect.top - dropdownH : rect.bottom + 4;
                          setDropdownPos({ top, left: rect.left });
                          setStatusDropdown(p.id);
                        }
                      }}
                      disabled={changingStatus === p.id}
                      className="cursor-pointer"
                    >
                      {changingStatus === p.id ? (
                        <span className="text-[11px] text-text-tertiary">Updating...</span>
                      ) : (
                        <PermitStatusBadge status={p.status} />
                      )}
                    </button>
                  </td>
                  <td className="px-3.5 py-3 text-[13px] text-text-secondary hidden lg:table-cell">{p.issued_to || '\u2014'}</td>
                  <td className="px-3.5 py-3 text-center" onClick={e => e.stopPropagation()}>
                    <div className="flex items-center justify-center gap-1 table-actions">
                      <button onClick={() => onView(p)} className="action-btn action-btn--view" title="View">
                        <Eye size={15} />
                      </button>
                      <button onClick={() => onEdit(p)} className="action-btn action-btn--edit" title="Edit">
                        <Pencil size={15} />
                      </button>
                      <button
                        onClick={() => setConfirmDelete(p.id)}
                        className="action-btn action-btn--delete"
                        title="Delete"
                      >
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
      {total > perPage && (
        <div className="flex items-center justify-between px-4 py-3 border-t border-border">
          <span className="text-[12px] text-text-tertiary">
            Showing {startItem}\u2013{endItem} of {total}
          </span>
          <div className="flex items-center gap-1">
            <button
              onClick={() => onPageChange(currentPage - 1)}
              disabled={currentPage === 1}
              className="p-1.5 rounded-[var(--radius-sm)] text-text-tertiary hover:bg-surface-sunken disabled:opacity-30 transition-colors"
            >
              <ChevronLeft size={16} />
            </button>
            {Array.from({ length: Math.min(lastPage, 5) }, (_, i) => {
              let pageNum: number;
              if (lastPage <= 5) {
                pageNum = i + 1;
              } else if (currentPage <= 3) {
                pageNum = i + 1;
              } else if (currentPage >= lastPage - 2) {
                pageNum = lastPage - 4 + i;
              } else {
                pageNum = currentPage - 2 + i;
              }
              return (
                <button
                  key={pageNum}
                  onClick={() => onPageChange(pageNum)}
                  className={`w-8 h-8 text-[12px] font-medium rounded-[var(--radius-sm)] transition-colors ${
                    pageNum === currentPage
                      ? 'bg-primary-600 text-text-inverse'
                      : 'text-text-secondary hover:bg-surface-sunken'
                  }`}
                >
                  {pageNum}
                </button>
              );
            })}
            <button
              onClick={() => onPageChange(currentPage + 1)}
              disabled={currentPage === lastPage}
              className="p-1.5 rounded-[var(--radius-sm)] text-text-tertiary hover:bg-surface-sunken disabled:opacity-30 transition-colors"
            >
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
        itemType="Permit"
        itemName={permits.find(p => p.id === confirmDelete)?.permit_number}
        message="This permit will be moved to the recycle bin and can be recovered later."
      />

      {/* Fixed status dropdown */}
      {statusDropdown && dropdownPos && (
        <div
          className="fixed z-[200] bg-surface border border-border rounded-lg shadow-xl py-0.5 min-w-[120px] animate-fadeIn"
          style={{ top: dropdownPos.top, left: dropdownPos.left }}
          onClick={e => e.stopPropagation()}
        >
          {PERMIT_STATUSES.map(s => (
            <button
              key={s}
              onClick={(e) => {
                e.stopPropagation();
                handleStatusChange(statusDropdown, s);
              }}
              className={`w-full text-left px-2.5 py-1 text-[11px] hover:bg-surface-sunken transition-colors ${
                permits.find(p => p.id === statusDropdown)?.status === s ? 'font-semibold text-primary-600' : 'text-text-primary'
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
