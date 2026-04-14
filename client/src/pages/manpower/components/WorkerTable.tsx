import { useState, useEffect } from 'react';
import { Eye, Pencil, Trash2, ChevronLeft, ChevronRight, Users, AlertTriangle } from 'lucide-react';
import { InductionBadge, WorkerStatusBadge } from './InductionBadge';
import { format, differenceInDays } from 'date-fns';
import type { Worker } from '../hooks/useManpower';
import TypedDeleteConfirmModal from '../../../components/ui/TypedDeleteConfirmModal';

const WORKER_STATUSES = ['Active', 'Inactive', 'Suspended', 'Demobilised'];

interface Props {
  workers: Worker[];
  loading: boolean;
  pagination: { currentPage: number; lastPage: number; total: number; perPage: number };
  onPageChange: (page: number) => void;
  onView: (worker: Worker) => void;
  onEdit: (worker: Worker) => void;
  onDelete: (id: string) => void;
  onStatusChange?: (id: string, data: Record<string, unknown>) => Promise<unknown>;
  onAddNew: () => void;
}

export function WorkerTable({
  workers, loading, pagination, onPageChange,
  onView, onEdit, onDelete, onStatusChange, onAddNew,
}: Props) {
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
  const [statusDropdown, setStatusDropdown] = useState<string | null>(null);
  const [dropdownPos, setDropdownPos] = useState<{ top: number; left: number } | null>(null);
  const [changingStatus, setChangingStatus] = useState<string | null>(null);

  useEffect(() => {
    if (!statusDropdown) return;
    const close = () => { setStatusDropdown(null); setDropdownPos(null); };
    window.addEventListener('click', close);
    window.addEventListener('scroll', close, true);
    return () => { window.removeEventListener('click', close); window.removeEventListener('scroll', close, true); };
  }, [statusDropdown]);

  const handleStatusChange = async (id: string, newStatus: string) => {
    if (!onStatusChange) return;
    setChangingStatus(id);
    try { await onStatusChange(id, { status: newStatus }); }
    catch (err) { console.error('Status change failed:', err); }
    finally { setChangingStatus(null); setStatusDropdown(null); setDropdownPos(null); }
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

  const isRecentlyJoined = (dateStr: string | null) => {
    if (!dateStr) return false;
    try {
      return differenceInDays(new Date(), new Date(dateStr)) <= 7;
    } catch { return false; }
  };

  const isNotInductedActive = (w: Worker) =>
    w.status === 'Active' && w.induction_status !== 'Done';

  const isDemobilised = (w: Worker) => w.status === 'Demobilised';

  const isLegacyReviewCandidate = (w: Worker) =>
    w.id_number && w.id_number.trim() !== '' && (!w.iqama_number || w.iqama_number.trim() === '');

  const HEADERS = ['Worker ID', 'Name', 'Profession', 'Company', 'Department', 'Joined', 'Induction', 'Status', 'Days', 'Actions'];

  // Loading skeleton
  if (loading && workers.length === 0) {
    return (
      <div className="bg-surface border border-border rounded-[var(--radius-md)] shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-surface-sunken border-b-2 border-border">
                {HEADERS.map(h => (
                  <th key={h} className="px-3.5 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-text-tertiary">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {Array.from({ length: 5 }).map((_, i) => (
                <tr key={i} className="border-b border-border">
                  {Array.from({ length: HEADERS.length }).map((_, j) => (
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
  if (!loading && workers.length === 0) {
    return (
      <div className="bg-surface border border-border rounded-[var(--radius-md)] shadow-sm py-16 flex flex-col items-center justify-center text-center">
        <Users size={48} className="text-text-tertiary mb-4" />
        <p className="text-[15px] font-semibold text-text-primary mb-1">No workers found</p>
        <p className="text-[13px] text-text-tertiary mb-5">Adjust your filters or add your first worker</p>
        <button onClick={onAddNew} className="px-4 py-2 text-[13px] font-semibold bg-primary-600 text-white rounded-[var(--radius-md)] hover:bg-primary-700 transition-colors shadow-xs">
          + Add Worker
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
              <th className="px-3.5 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-text-tertiary">Worker ID</th>
              <th className="px-3.5 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-text-tertiary">Name</th>
              <th className="px-3.5 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-text-tertiary">Profession</th>
              <th className="px-3.5 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-text-tertiary">Company</th>
              <th className="px-3.5 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-text-tertiary hidden lg:table-cell">Department</th>
              <th className="px-3.5 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-text-tertiary">Joined</th>
              <th className="px-3.5 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-text-tertiary">Induction</th>
              <th className="px-3.5 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-text-tertiary">Status</th>
              <th className="px-3.5 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-text-tertiary hidden xl:table-cell">Days</th>
              <th className="px-3.5 py-3 text-center text-[11px] font-semibold uppercase tracking-wider text-text-tertiary w-[100px]">Actions</th>
            </tr>
          </thead>
          <tbody>
            {workers.map(w => {
              const notInducted = isNotInductedActive(w);
              const demob = isDemobilised(w);
              const recent = isRecentlyJoined(w.joining_date);

              const legacyCandidate = isLegacyReviewCandidate(w);

              return (
                <tr
                  key={w.id}
                  className={`border-b border-border transition-colors hover:bg-canvas cursor-pointer ${
                    notInducted ? 'border-l-[3px] border-l-warning-500 bg-warning-50/30' : ''
                  } ${demob ? 'opacity-55' : ''}`}
                  onClick={() => onView(w)}
                >
                  <td className="px-3.5 py-3 whitespace-nowrap">
                    <span className="font-mono text-[12px] font-medium text-text-secondary bg-surface-sunken px-[7px] py-0.5 rounded-[var(--radius-xs)] border border-border inline-block">
                      {w.worker_id}
                    </span>
                  </td>
                  <td className="px-3.5 py-3 text-[13px] text-text-primary font-semibold whitespace-nowrap">
                    <div className="flex items-center gap-2">
                      {w.name}
                      {recent && (
                        <span className="px-1.5 py-0.5 text-[9px] font-bold text-white bg-blue-500 border border-blue-600 rounded-full uppercase">New</span>
                      )}
                      {legacyCandidate && (
                        <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 text-[9px] font-bold text-warning-700 bg-warning-100 border border-warning-300 rounded-full uppercase" title="Has ID number but missing Iqama — review needed">
                          <AlertTriangle size={10} />
                          ID Review
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="px-3.5 py-3 text-[13px] text-text-secondary">
                    {w.profession ? (
                      <span className="inline-flex items-center px-2 py-0.5 text-[11px] font-medium bg-indigo-100 text-indigo-800 border border-indigo-200 rounded-full">
                        {w.profession}
                      </span>
                    ) : '\u2014'}
                  </td>
                  <td className="px-3.5 py-3 text-[13px] text-text-secondary max-w-[150px] truncate">{w.company || '\u2014'}</td>
                  <td className="px-3.5 py-3 text-[13px] text-text-secondary hidden lg:table-cell">{w.department || '\u2014'}</td>
                  <td className="px-3.5 py-3 text-[13px] text-text-secondary whitespace-nowrap">{formatDate(w.joining_date)}</td>
                  <td className="px-3.5 py-3"><InductionBadge status={w.induction_status} /></td>
                  <td className="px-3.5 py-3" onClick={e => e.stopPropagation()}>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        if (!onStatusChange) { onView(w); return; }
                        if (statusDropdown === w.id) {
                          setStatusDropdown(null);
                          setDropdownPos(null);
                        } else {
                          const rect = e.currentTarget.getBoundingClientRect();
                          const spaceBelow = window.innerHeight - rect.bottom;
                          const dropdownH = WORKER_STATUSES.length * 30 + 8;
                          const top = spaceBelow < dropdownH ? rect.top - dropdownH : rect.bottom + 4;
                          setDropdownPos({ top, left: rect.left });
                          setStatusDropdown(w.id);
                        }
                      }}
                      disabled={changingStatus === w.id}
                      className="cursor-pointer"
                    >
                      {changingStatus === w.id ? (
                        <span className="text-[11px] text-text-tertiary">Updating...</span>
                      ) : (
                        <WorkerStatusBadge status={w.status} />
                      )}
                    </button>
                  </td>
                  <td className="px-3.5 py-3 text-[12px] text-text-tertiary hidden xl:table-cell">{w.days_on_site > 0 ? `${w.days_on_site}d` : '\u2014'}</td>
                  <td className="px-3.5 py-3 text-center" onClick={e => e.stopPropagation()}>
                    <div className="flex items-center justify-center gap-1 table-actions">
                      <button onClick={() => onView(w)} className="action-btn action-btn--view" title="View">
                        <Eye size={15} />
                      </button>
                      <button onClick={() => onEdit(w)} className="action-btn action-btn--edit" title="Edit">
                        <Pencil size={15} />
                      </button>
                      <button
                        onClick={() => setConfirmDelete(w.id)}
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
                      ? 'bg-primary-600 text-white'
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
        itemType="Worker"
        itemName={workers.find(w => w.id === confirmDelete)?.name}
        message="This worker will be moved to the recycle bin and can be restored later."
      />

      {/* Fixed status dropdown */}
      {statusDropdown && dropdownPos && (
        <div
          className="fixed z-[200] bg-surface border border-border rounded-lg shadow-xl py-0.5 min-w-[120px] animate-fadeIn"
          style={{ top: dropdownPos.top, left: dropdownPos.left }}
          onClick={e => e.stopPropagation()}
        >
          {WORKER_STATUSES.map(s => (
            <button
              key={s}
              onClick={(e) => {
                e.stopPropagation();
                handleStatusChange(statusDropdown, s);
              }}
              className={`w-full text-left px-2.5 py-1 text-[11px] hover:bg-surface-sunken transition-colors ${
                workers.find(w => w.id === statusDropdown)?.status === s ? 'font-semibold text-primary-600' : 'text-text-primary'
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
