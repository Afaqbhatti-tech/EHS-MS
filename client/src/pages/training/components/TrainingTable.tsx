import { useState } from 'react';
import { Eye, Pencil, Trash2, ChevronLeft, ChevronRight, Award, FileText } from 'lucide-react';
import { TrainingStatusBadge, TopicBadge } from './TrainingStatusBadge';
import type { TrainingRecord } from '../hooks/useTraining';

interface Props {
  records: TrainingRecord[];
  loading: boolean;
  pagination: { currentPage: number; lastPage: number; total: number; perPage: number };
  onPageChange: (page: number) => void;
  onView: (record: TrainingRecord) => void;
  onEdit?: (record: TrainingRecord) => void;
  onDelete?: (id: string) => void;
  onAddNew?: () => void;
}

export function TrainingTable({ records, loading, pagination, onPageChange, onView, onEdit, onDelete, onAddNew }: Props) {
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);

  const handleDelete = (id: string) => {
    if (!onDelete) return;
    if (confirmDelete === id) {
      onDelete(id);
      setConfirmDelete(null);
    } else {
      setConfirmDelete(id);
      setTimeout(() => setConfirmDelete(null), 3000);
    }
  };

  if (loading) {
    return (
      <div className="bg-surface border border-border rounded-[var(--radius-lg)] overflow-hidden">
        <div className="animate-pulse">
          <div className="h-10 bg-surface-sunken border-b border-border" />
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="h-14 border-b border-border flex items-center px-4 gap-4">
              <div className="h-3 bg-surface-sunken rounded w-20" />
              <div className="h-3 bg-surface-sunken rounded w-32" />
              <div className="h-3 bg-surface-sunken rounded w-28" />
              <div className="h-3 bg-surface-sunken rounded w-20" />
              <div className="h-3 bg-surface-sunken rounded w-16" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (records.length === 0) {
    return (
      <div className="bg-surface border border-border rounded-[var(--radius-lg)] p-12 text-center">
        <Award size={32} className="text-text-tertiary mx-auto mb-3" />
        <h3 className="text-[15px] font-semibold text-text-primary mb-1">No Training Records</h3>
        <p className="text-[13px] text-text-tertiary mb-4">Start by adding a training record for a worker.</p>
        {onAddNew && <button onClick={onAddNew} className="px-4 py-2 text-[13px] font-semibold text-white bg-primary-600 rounded-[var(--radius-md)] hover:bg-primary-700 transition-colors shadow-xs">Add Record</button>}
      </div>
    );
  }

  return (
    <div className="bg-surface border border-border rounded-[var(--radius-lg)] overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-[13px]">
          <thead>
            <tr className="bg-surface-sunken border-b border-border">
              <th className="text-left px-4 py-2.5 font-semibold text-text-tertiary text-[11px] uppercase tracking-wider">Record ID</th>
              <th className="text-left px-4 py-2.5 font-semibold text-text-tertiary text-[11px] uppercase tracking-wider">Worker</th>
              <th className="text-left px-4 py-2.5 font-semibold text-text-tertiary text-[11px] uppercase tracking-wider">Topic</th>
              <th className="text-left px-4 py-2.5 font-semibold text-text-tertiary text-[11px] uppercase tracking-wider">Training Date</th>
              <th className="text-left px-4 py-2.5 font-semibold text-text-tertiary text-[11px] uppercase tracking-wider">Expiry</th>
              <th className="text-left px-4 py-2.5 font-semibold text-text-tertiary text-[11px] uppercase tracking-wider">Status</th>
              <th className="text-left px-4 py-2.5 font-semibold text-text-tertiary text-[11px] uppercase tracking-wider">Result</th>
              <th className="text-center px-4 py-2.5 font-semibold text-text-tertiary text-[11px] uppercase tracking-wider">Days</th>
              <th className="text-left px-4 py-2.5 font-semibold text-text-tertiary text-[11px] uppercase tracking-wider">Trainer</th>
              <th className="text-center px-4 py-2.5 font-semibold text-text-tertiary text-[11px] uppercase tracking-wider w-[100px]">Actions</th>
            </tr>
          </thead>
          <tbody>
            {records.map(r => (
              <tr key={r.id} className="border-b border-border hover:bg-surface-sunken/50 transition-colors group cursor-pointer" onClick={() => onView(r)}>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-1.5">
                    <span className="font-mono text-[12px] text-primary-600 font-medium">{r.record_id}</span>
                    {r.certificate_file_name && <FileText size={12} className="text-primary-400" title="Has attachment" />}
                  </div>
                </td>
                <td className="px-4 py-3">
                  <p className="font-medium text-text-primary truncate max-w-[160px]">{r.worker?.name || '-'}</p>
                  <p className="text-[11px] text-text-tertiary">{r.worker?.worker_id} {r.worker?.profession ? `\u00B7 ${r.worker.profession}` : ''}</p>
                </td>
                <td className="px-4 py-3">
                  {r.topic ? (
                    <TopicBadge topic={r.topic} />
                  ) : (
                    <span className="text-text-secondary">{r.topic_label}</span>
                  )}
                </td>
                <td className="px-4 py-3 text-text-secondary whitespace-nowrap">{r.training_date || '-'}</td>
                <td className="px-4 py-3 text-text-secondary whitespace-nowrap">{r.expiry_date || 'No expiry'}</td>
                <td className="px-4 py-3">
                  <TrainingStatusBadge status={r.status} />
                </td>
                <td className="px-4 py-3 text-text-secondary text-[12px]">{r.result_status || '-'}</td>
                <td className="px-4 py-3 text-center">
                  {r.days_until_expiry !== null ? (
                    <span className={`text-[12px] font-medium ${r.days_until_expiry < 0 ? 'text-danger-600' : r.days_until_expiry <= 30 ? 'text-warning-600' : 'text-success-600'}`}>
                      {r.days_until_expiry}d
                    </span>
                  ) : '-'}
                </td>
                <td className="px-4 py-3 text-text-secondary truncate max-w-[120px]">{r.trainer_name || '-'}</td>
                <td className="px-3.5 py-3 text-center" onClick={e => e.stopPropagation()}>
                  <div className="flex items-center justify-center gap-1 table-actions">
                    <button onClick={() => onView(r)} className="action-btn action-btn--view" title="View">
                      <Eye size={15} />
                    </button>
                    {onEdit && (
                      <button onClick={() => onEdit(r)} className="action-btn action-btn--edit" title="Edit">
                        <Pencil size={15} />
                      </button>
                    )}
                    {onDelete && (
                      <button onClick={() => handleDelete(r.id)} className={`action-btn action-btn--delete ${confirmDelete === r.id ? 'text-white !bg-danger-600' : ''}`} title={confirmDelete === r.id ? 'Click again to confirm' : 'Delete'}>
                        <Trash2 size={15} />
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      <div className="flex items-center justify-between px-4 py-3 bg-surface-sunken border-t border-border">
        <p className="text-[12px] text-text-tertiary">
          Showing {((pagination.currentPage - 1) * pagination.perPage) + 1}-{Math.min(pagination.currentPage * pagination.perPage, pagination.total)} of {pagination.total}
        </p>
        <div className="flex items-center gap-1">
          <button
            onClick={() => onPageChange(pagination.currentPage - 1)}
            disabled={pagination.currentPage <= 1}
            className="p-1.5 text-text-tertiary hover:text-text-primary hover:bg-surface rounded-[var(--radius-sm)] disabled:opacity-30 transition-colors"
          >
            <ChevronLeft size={16} />
          </button>
          <span className="px-3 py-1 text-[12px] font-medium text-text-secondary">
            {pagination.currentPage} / {pagination.lastPage}
          </span>
          <button
            onClick={() => onPageChange(pagination.currentPage + 1)}
            disabled={pagination.currentPage >= pagination.lastPage}
            className="p-1.5 text-text-tertiary hover:text-text-primary hover:bg-surface rounded-[var(--radius-sm)] disabled:opacity-30 transition-colors"
          >
            <ChevronRight size={16} />
          </button>
        </div>
      </div>
    </div>
  );
}
