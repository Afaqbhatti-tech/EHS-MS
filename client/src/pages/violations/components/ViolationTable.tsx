import { Eye, Pencil, Trash2, ChevronLeft, ChevronRight } from 'lucide-react';
import { StatusBadge } from '../../../components/ui/Badge';

interface Violation {
  id: string;
  violation_code: string;
  violation_date: string;
  location: string | null;
  violator_name: string;
  violation_type: string;
  violation_category: string;
  severity: string;
  status: string;
  assigned_to_name: string | null;
  contractor_name: string | null;
}

interface Props {
  violations: Violation[];
  total: number;
  page: number;
  lastPage: number;
  isLoading: boolean;
  onView: (id: string) => void;
  onEdit?: (id: string) => void;
  onDelete?: (id: string) => void;
  onPageChange: (page: number) => void;
}

const severityColors: Record<string, string> = {
  Low: 'bg-info-100 text-info-700',
  Medium: 'bg-warning-100 text-warning-700',
  High: 'bg-danger-100 text-danger-700',
  Critical: 'bg-danger-200 text-danger-800 font-semibold',
};

export default function ViolationTable({ violations, total, page, lastPage, isLoading, onView, onEdit, onDelete, onPageChange }: Props) {
  if (isLoading) {
    return (
      <div className="bg-surface rounded-xl border border-border overflow-hidden">
        <div className="p-8 text-center text-text-secondary">Loading violations...</div>
      </div>
    );
  }

  if (!violations.length) {
    return (
      <div className="bg-surface rounded-xl border border-border overflow-hidden">
        <div className="p-12 text-center">
          <p className="text-text-secondary text-sm">No violations found</p>
          <p className="text-text-tertiary text-xs mt-1">Try adjusting your filters or report a new violation</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-surface rounded-xl border border-border overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-canvas border-b border-border">
              <th className="text-left px-4 py-3 text-xs font-semibold text-text-secondary uppercase tracking-wide">ID</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-text-secondary uppercase tracking-wide">Date</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-text-secondary uppercase tracking-wide">Location</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-text-secondary uppercase tracking-wide">Violator</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-text-secondary uppercase tracking-wide">Type</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-text-secondary uppercase tracking-wide">Category</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-text-secondary uppercase tracking-wide">Severity</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-text-secondary uppercase tracking-wide">Status</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-text-secondary uppercase tracking-wide">Assigned To</th>
              <th className="text-center px-4 py-3 text-xs font-semibold text-text-secondary uppercase tracking-wide">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {violations.map(v => (
              <tr key={v.id} className="hover:bg-canvas/50 transition-colors cursor-pointer" onClick={() => onView(v.id)}>
                <td className="px-4 py-3 font-mono text-xs font-semibold text-primary-700">{v.violation_code}</td>
                <td className="px-4 py-3 text-text-secondary whitespace-nowrap">{v.violation_date}</td>
                <td className="px-4 py-3 text-text-primary truncate max-w-[140px]">{v.location || '—'}</td>
                <td className="px-4 py-3 text-text-primary font-medium truncate max-w-[140px]">{v.violator_name}</td>
                <td className="px-4 py-3 text-text-secondary text-xs">{v.violation_type}</td>
                <td className="px-4 py-3 text-text-secondary text-xs truncate max-w-[120px]">{v.violation_category}</td>
                <td className="px-4 py-3">
                  <span className={`inline-block px-2 py-0.5 rounded-full text-xs ${severityColors[v.severity] ?? 'bg-neutral-100 text-neutral-600'}`}>
                    {v.severity}
                  </span>
                </td>
                <td className="px-4 py-3"><StatusBadge status={v.status} /></td>
                <td className="px-4 py-3 text-text-secondary text-xs truncate max-w-[120px]">{v.assigned_to_name || '—'}</td>
                <td className="px-3.5 py-3 text-center" onClick={e => e.stopPropagation()}>
                  <div className="flex items-center justify-center gap-1 table-actions">
                    <button onClick={() => onView(v.id)} className="action-btn action-btn--view" title="View">
                      <Eye size={15} />
                    </button>
                    {onEdit && (
                      <button onClick={() => onEdit(v.id)} className="action-btn action-btn--edit" title="Edit">
                        <Pencil size={15} />
                      </button>
                    )}
                    {onDelete && (
                      <button onClick={() => onDelete(v.id)} className="action-btn action-btn--delete" title="Delete">
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
      <div className="flex items-center justify-between px-4 py-3 border-t border-border bg-canvas/50">
        <p className="text-xs text-text-secondary">
          Showing {((page - 1) * 20) + 1}–{Math.min(page * 20, total)} of {total}
        </p>
        <div className="flex items-center gap-1">
          <button onClick={() => onPageChange(page - 1)} disabled={page <= 1}
            className="p-1.5 rounded-lg text-text-tertiary hover:text-text-primary hover:bg-canvas disabled:opacity-30 disabled:cursor-not-allowed transition-colors">
            <ChevronLeft size={16} />
          </button>
          <span className="px-2 text-xs font-medium text-text-secondary">{page} / {lastPage}</span>
          <button onClick={() => onPageChange(page + 1)} disabled={page >= lastPage}
            className="p-1.5 rounded-lg text-text-tertiary hover:text-text-primary hover:bg-canvas disabled:opacity-30 disabled:cursor-not-allowed transition-colors">
            <ChevronRight size={16} />
          </button>
        </div>
      </div>
    </div>
  );
}
