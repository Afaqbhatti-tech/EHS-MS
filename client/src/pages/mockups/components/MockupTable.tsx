import { useState } from 'react';
import { Eye, Pencil, Trash2, ChevronLeft, ChevronRight, AlertCircle, ShieldCheck, AlertOctagon, MessageSquare, AlertTriangle, MapPin } from 'lucide-react';
import { format } from 'date-fns';
import type { Mockup } from '../hooks/useMockups';
import TypedDeleteConfirmModal from '../../../components/ui/TypedDeleteConfirmModal';
import { useAuth } from '../../../contexts/AuthContext';

interface Props {
  mockups: Mockup[];
  loading: boolean;
  pagination: { currentPage: number; lastPage: number; total: number; perPage: number };
  onPageChange: (page: number) => void;
  onView: (m: Mockup) => void;
  onEdit: (m: Mockup) => void;
  onDelete: (id: string) => void;
  onAddNew: () => void;
}

const STATUS_STYLES: Record<string, string> = {
  'Draft': 'bg-gray-100 text-gray-700 border-gray-200',
  'Submitted for Review': 'bg-blue-50 text-blue-700 border-blue-200',
  'Approved': 'bg-green-50 text-green-700 border-green-200',
  'Rejected': 'bg-red-50 text-red-700 border-red-200',
  'Approved with Comments': 'bg-amber-50 text-amber-700 border-amber-200',
  'Pending Compliance': 'bg-orange-50 text-orange-700 border-orange-200',
  'Comments Resolved': 'bg-emerald-50 text-emerald-700 border-emerald-200',
  'Re-submitted': 'bg-indigo-50 text-indigo-700 border-indigo-200',
  'Superseded': 'bg-gray-100 text-gray-500 border-gray-200',
};

const PRIORITY_COLORS: Record<string, string> = {
  Critical: 'bg-red-100 text-red-800', High: 'bg-amber-100 text-amber-800',
  Medium: 'bg-blue-100 text-blue-800', Low: 'bg-gray-100 text-gray-600',
};

export function MockupTable({ mockups, loading, pagination, onPageChange, onView, onEdit, onDelete, onAddNew }: Props) {
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
  const { hasRole } = useAuth();

  const fmtDate = (d: string | null) => { if (!d) return '—'; try { return format(new Date(d), 'dd MMM yy'); } catch { return d; } };

  const handleDelete = async (id: string) => {
    try { await onDelete(id); } catch (err) { console.error('Delete failed:', err); }
    setConfirmDelete(null);
  };

  if (loading && mockups.length === 0) {
    return (
      <div className="bg-surface border border-border rounded-[var(--radius-md)] shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead><tr className="bg-surface-sunken border-b-2 border-border">
              {['ID', 'Title', 'Type', 'RAMS', 'Contractor', 'Status', 'Rev', 'Tag', 'Actions'].map(h => (
                <th key={h} className="px-3 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-text-tertiary">{h}</th>
              ))}
            </tr></thead>
            <tbody>{Array.from({ length: 5 }).map((_, i) => (
              <tr key={i} className="border-b border-border">{Array.from({ length: 9 }).map((_, j) => (
                <td key={j} className="px-3 py-3"><div className="skeleton h-4 w-full" /></td>
              ))}</tr>
            ))}</tbody>
          </table>
        </div>
      </div>
    );
  }

  if (!loading && mockups.length === 0) {
    return (
      <div className="bg-surface border border-border rounded-[var(--radius-md)] shadow-sm py-16 flex flex-col items-center justify-center text-center">
        <AlertCircle size={48} className="text-text-tertiary mb-4" />
        <p className="text-[15px] font-semibold text-text-primary mb-1">No mock-ups found</p>
        <p className="text-[13px] text-text-tertiary mb-5">Try adjusting your filters or create a new mock-up</p>
        <button onClick={onAddNew} className="px-4 py-2 text-[13px] font-semibold bg-primary-600 text-white rounded-[var(--radius-md)] hover:bg-primary-700 transition-colors shadow-xs">+ New Mock-Up</button>
      </div>
    );
  }

  const { currentPage, lastPage, total, perPage } = pagination;
  const startItem = (currentPage - 1) * perPage + 1;
  const endItem = Math.min(currentPage * perPage, total);

  return (
    <div className="bg-surface border border-border rounded-[var(--radius-md)] shadow-sm overflow-hidden">
      <div className="overflow-x-auto table-responsive">
        <table className="w-full min-w-[900px]">
          <thead><tr className="bg-surface-sunken border-b-2 border-border">
            <th className="px-3 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-text-tertiary">ID</th>
            <th className="px-3 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-text-tertiary">Title</th>
            <th className="px-3 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-text-tertiary hidden lg:table-cell">Type</th>
            <th className="px-3 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-text-tertiary hidden lg:table-cell">RAMS</th>
            <th className="px-3 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-text-tertiary hidden lg:table-cell">Contractor</th>
            <th className="px-3 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-text-tertiary">Status</th>
            <th className="px-3 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-text-tertiary">Rev</th>
            <th className="px-3 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-text-tertiary hidden xl:table-cell">Tag</th>
            <th className="px-3 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-text-tertiary hidden xl:table-cell">Date</th>
            <th className="px-3 py-3 text-center text-[11px] font-semibold uppercase tracking-wider text-text-tertiary w-[90px]">Actions</th>
          </tr></thead>
          <tbody>
            {mockups.map(m => {
              const tag = [m.phase, m.zone, m.trim_line].filter(Boolean).join(' / ');
              const isPendingCompliance = m.approval_status === 'Approved with Comments' || m.compliance_status === 'Pending';
              return (
                <tr key={m.id} className={`border-b border-border transition-colors hover:bg-canvas cursor-pointer ${
                  m.approval_status === 'Rejected' ? 'bg-danger-50/30 border-l-[3px] border-l-danger-400' :
                  isPendingCompliance ? 'bg-amber-50/30 border-l-[3px] border-l-amber-500' :
                  m.can_proceed ? 'border-l-[3px] border-l-green-500' : ''
                }`} onClick={() => onView(m)}>
                  <td className="px-3 py-3 text-[12px] font-mono font-medium whitespace-nowrap text-text-primary">{m.ref_number}</td>
                  <td className="px-3 py-3 max-w-[180px]">
                    <div className="text-[13px] text-text-primary font-medium truncate">{m.title}</div>
                    {m.supervisor_name && <div className="text-[11px] text-text-tertiary truncate mt-0.5">{m.supervisor_name}</div>}
                  </td>
                  <td className="px-3 py-3 text-[12px] text-text-secondary hidden lg:table-cell">{m.mockup_type || '—'}</td>
                  <td className="px-3 py-3 text-[12px] hidden lg:table-cell">
                    {m.rams_document ? (
                      <div>
                        <div className="font-mono text-text-primary">{m.rams_document.ref_number}</div>
                        <div className="text-[10px] text-text-tertiary truncate max-w-[120px]">{m.rams_document.title}</div>
                      </div>
                    ) : <span className="text-text-tertiary">—</span>}
                  </td>
                  <td className="px-3 py-3 text-[12px] text-text-secondary hidden lg:table-cell">{m.contractor || '—'}</td>
                  <td className="px-3 py-3">
                    <div className="flex items-center gap-1">
                      <span className={`inline-flex items-center px-2 py-[2px] rounded-full text-[10px] font-semibold leading-tight border ${STATUS_STYLES[m.approval_status] || 'bg-gray-100 text-gray-600 border-gray-200'}`}>
                        {m.approval_status}
                      </span>
                      {m.can_proceed && <ShieldCheck size={13} className="text-green-600" title="Can Proceed" />}
                      {isPendingCompliance && <AlertTriangle size={13} className="text-orange-600" title="Pending Compliance" />}
                      {m.unresolved_comment_count > 0 && (
                        <span className="inline-flex items-center gap-0.5 text-amber-600" title={`${m.unresolved_comment_count} unresolved`}>
                          <MessageSquare size={11} /><span className="text-[10px] font-bold">{m.unresolved_comment_count}</span>
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="px-3 py-3 text-[12px] font-mono text-text-secondary">{m.revision_number}</td>
                  <td className="px-3 py-3 hidden xl:table-cell">
                    {tag ? (
                      <span className="inline-flex items-center gap-1 text-[10px] px-1.5 py-0.5 bg-surface-sunken rounded border border-border text-text-secondary">
                        <MapPin size={10} /> {tag}
                      </span>
                    ) : '—'}
                  </td>
                  <td className="px-3 py-3 text-[11px] text-text-tertiary hidden xl:table-cell">{fmtDate(m.mockup_date || m.created_at)}</td>
                  <td className="px-3 py-3 text-center" onClick={e => e.stopPropagation()}>
                    <div className="table-actions flex items-center justify-center gap-1">
                      <button onClick={() => onView(m)} className="action-btn action-btn--view" title="View"><Eye size={15} /></button>
                      <button onClick={() => onEdit(m)} className="action-btn action-btn--edit" title="Edit"><Pencil size={15} /></button>
                      <button onClick={() => setConfirmDelete(m.id)} className="action-btn action-btn--delete" title="Delete"><Trash2 size={15} /></button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {total > perPage && (
        <div className="flex items-center justify-between px-4 py-3 border-t border-border">
          <span className="text-[12px] text-text-tertiary">Showing {startItem}–{endItem} of {total}</span>
          <div className="flex items-center gap-1">
            <button onClick={() => onPageChange(currentPage - 1)} disabled={currentPage === 1} className="p-1.5 rounded-[var(--radius-sm)] text-text-tertiary hover:bg-surface-sunken disabled:opacity-30 transition-colors"><ChevronLeft size={16} /></button>
            {Array.from({ length: Math.min(lastPage, 5) }, (_, i) => {
              let pageNum: number;
              if (lastPage <= 5) pageNum = i + 1;
              else if (currentPage <= 3) pageNum = i + 1;
              else if (currentPage >= lastPage - 2) pageNum = lastPage - 4 + i;
              else pageNum = currentPage - 2 + i;
              return (
                <button key={pageNum} onClick={() => onPageChange(pageNum)} className={`w-8 h-8 text-[12px] font-medium rounded-[var(--radius-sm)] transition-colors ${pageNum === currentPage ? 'bg-primary-600 text-white' : 'text-text-secondary hover:bg-surface-sunken'}`}>
                  {pageNum}
                </button>
              );
            })}
            <button onClick={() => onPageChange(currentPage + 1)} disabled={currentPage === lastPage} className="p-1.5 rounded-[var(--radius-sm)] text-text-tertiary hover:bg-surface-sunken disabled:opacity-30 transition-colors"><ChevronRight size={16} /></button>
          </div>
        </div>
      )}

      <TypedDeleteConfirmModal open={!!confirmDelete} onClose={() => setConfirmDelete(null)} onConfirm={() => confirmDelete && handleDelete(confirmDelete)} itemType="Mock-Up" itemName={mockups.find(m => m.id === confirmDelete)?.title} message="This mock-up and all its data will be moved to the recycle bin." />
    </div>
  );
}
