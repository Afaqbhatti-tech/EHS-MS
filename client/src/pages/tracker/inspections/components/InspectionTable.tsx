import { Paperclip, Eye, Pencil, Trash2, ChevronLeft, ChevronRight } from 'lucide-react';
import { InspectionResultBadge, CategoryBadge, ConditionBadge } from '../../components/TrackerBadges';
import { format } from 'date-fns';
import type { TrackerInspection } from '../../hooks/useTracker';

interface Props {
  items: TrackerInspection[];
  loading: boolean;
  pagination: { currentPage: number; lastPage: number; total: number; perPage: number };
  onPageChange: (page: number) => void;
  onView: (item: TrackerInspection) => void;
  onEdit: (item: TrackerInspection) => void;
  onDelete: (item: TrackerInspection) => void;
}

function formatDate(dateStr: string | null) {
  if (!dateStr) return '—';
  try { return format(new Date(dateStr), 'dd MMM yyyy'); } catch { return dateStr; }
}

function getAttachmentCount(log: TrackerInspection): number {
  let count = 0;
  if (log.checklist_file_path || log.checklist_file_url) count++;
  if (log.checklist_image_path || log.checklist_image_url) count++;
  if (log.additional_image_urls?.length) count += log.additional_image_urls.length;
  if (log.supporting_doc_urls?.length) count += log.supporting_doc_urls.length;
  return count;
}

export function InspectionTable({ items, loading, pagination, onPageChange, onView, onEdit, onDelete }: Props) {
  if (loading) {
    return (
      <div className="bg-surface border border-border rounded-[var(--radius-md)] overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[700px]">
            <thead>
              <tr className="bg-surface-sunken border-b-2 border-border">
                {['Log Code', 'Equipment', 'Date', 'Type', 'Inspector', 'Result', 'Condition', 'Attachments', ''].map(h => (
                  <th key={h} className="px-3 py-2.5 text-left text-[11px] font-semibold text-text-tertiary uppercase tracking-wider">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {[1, 2, 3, 4, 5].map(i => (
                <tr key={i} className="border-b border-border">
                  {[1, 2, 3, 4, 5, 6, 7, 8, 9].map(j => (
                    <td key={j} className="px-3 py-3"><div className="skeleton h-4 w-16" /></td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="bg-surface border border-border rounded-[var(--radius-md)] p-12 text-center">
        <Eye size={36} className="mx-auto text-text-tertiary mb-3" />
        <p className="text-[14px] font-medium text-text-secondary mb-1">No inspections found</p>
        <p className="text-[12px] text-text-tertiary">Adjust filters or record a new inspection</p>
      </div>
    );
  }

  const { currentPage, lastPage, total, perPage } = pagination;
  const start = (currentPage - 1) * perPage + 1;
  const end = Math.min(currentPage * perPage, total);

  const pages: number[] = [];
  for (let p = Math.max(1, currentPage - 2); p <= Math.min(lastPage, currentPage + 2); p++) {
    pages.push(p);
  }

  return (
    <div className="bg-surface border border-border rounded-[var(--radius-md)] overflow-hidden">
      <div className="overflow-x-auto table-responsive">
        <table className="w-full min-w-[800px]">
          <thead>
            <tr className="bg-surface-sunken border-b-2 border-border">
              <th className="px-3 py-2.5 text-left text-[11px] font-semibold text-text-tertiary uppercase tracking-wider">Log Code</th>
              <th className="px-3 py-2.5 text-left text-[11px] font-semibold text-text-tertiary uppercase tracking-wider">Equipment</th>
              <th className="px-3 py-2.5 text-left text-[11px] font-semibold text-text-tertiary uppercase tracking-wider">Date</th>
              <th className="px-3 py-2.5 text-left text-[11px] font-semibold text-text-tertiary uppercase tracking-wider">Type</th>
              <th className="px-3 py-2.5 text-left text-[11px] font-semibold text-text-tertiary uppercase tracking-wider hidden lg:table-cell">Inspector</th>
              <th className="px-3 py-2.5 text-left text-[11px] font-semibold text-text-tertiary uppercase tracking-wider">Result</th>
              <th className="px-3 py-2.5 text-left text-[11px] font-semibold text-text-tertiary uppercase tracking-wider hidden lg:table-cell">Condition</th>
              <th className="px-3 py-2.5 text-center text-[11px] font-semibold text-text-tertiary uppercase tracking-wider w-[60px]">Files</th>
              <th className="px-3 py-2.5 text-right text-[11px] font-semibold text-text-tertiary uppercase tracking-wider w-[100px]">Actions</th>
            </tr>
          </thead>
          <tbody>
            {items.map(log => {
              const attachCount = getAttachmentCount(log);
              return (
                <tr
                  key={log.id}
                  className={`border-b border-border hover:bg-canvas transition-colors cursor-pointer ${log.overdue_at_time ? 'bg-danger-50/30' : ''}`}
                  onClick={() => onView(log)}
                >
                  <td className="px-3 py-2.5">
                    <span className="text-[12px] font-mono font-semibold text-text-tertiary">{log.log_code}</span>
                  </td>
                  <td className="px-3 py-2.5">
                    <div className="flex items-center gap-2">
                      <div>
                        <div className="text-[13px] font-medium text-text-primary">{log.record?.equipment_name || '—'}</div>
                        <div className="flex items-center gap-1.5 mt-0.5">
                          {log.record?.category && (
                            <CategoryBadge
                              label={log.record.category.label}
                              color={log.record.category.color}
                              lightColor={log.record.category.light_color}
                              textColor={log.record.category.text_color}
                            />
                          )}
                          {log.record?.item_subtype && (
                            <span className="text-[10px] text-text-tertiary">{log.record.item_subtype}</span>
                          )}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="px-3 py-2.5">
                    <div className="text-[12px] text-text-primary">{formatDate(log.inspection_date)}</div>
                    {log.overdue_at_time && (
                      <span className="inline-flex items-center px-1.5 py-[1px] text-[9px] font-bold rounded bg-warning-50 text-warning-700 border border-warning-200 mt-0.5">
                        Was overdue
                      </span>
                    )}
                  </td>
                  <td className="px-3 py-2.5">
                    <span className="text-[12px] text-text-secondary">{log.inspection_type}</span>
                  </td>
                  <td className="px-3 py-2.5 hidden lg:table-cell">
                    <div className="text-[12px] text-text-primary">{log.inspector_name}</div>
                    {log.inspector_company && (
                      <div className="text-[10px] text-text-tertiary">{log.inspector_company}</div>
                    )}
                  </td>
                  <td className="px-3 py-2.5">
                    <InspectionResultBadge result={log.result} />
                  </td>
                  <td className="px-3 py-2.5 hidden lg:table-cell">
                    <ConditionBadge condition={log.condition_found} />
                  </td>
                  <td className="px-3 py-2.5 text-center">
                    {attachCount > 0 && (
                      <span className="inline-flex items-center gap-0.5 text-[11px] font-medium text-primary-600">
                        <Paperclip size={12} />
                        {attachCount}
                      </span>
                    )}
                  </td>
                  <td className="px-3 py-2.5 text-right">
                    <div className="flex items-center justify-end gap-0.5">
                      <button
                        onClick={e => { e.stopPropagation(); onView(log); }}
                        className="p-1.5 rounded-[var(--radius-sm)] text-text-tertiary hover:text-primary-600 hover:bg-primary-50 transition-colors"
                        title="View details"
                      >
                        <Eye size={14} />
                      </button>
                      <button
                        onClick={e => { e.stopPropagation(); onEdit(log); }}
                        className="p-1.5 rounded-[var(--radius-sm)] text-text-tertiary hover:text-amber-600 hover:bg-amber-50 transition-colors"
                        title="Edit inspection"
                      >
                        <Pencil size={14} />
                      </button>
                      <button
                        onClick={e => { e.stopPropagation(); onDelete(log); }}
                        className="p-1.5 rounded-[var(--radius-sm)] text-text-tertiary hover:text-danger-600 hover:bg-danger-50 transition-colors"
                        title="Delete inspection"
                      >
                        <Trash2 size={14} />
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
      {lastPage > 1 && (
        <div className="flex items-center justify-between px-4 py-3 border-t border-border bg-surface-sunken/30">
          <span className="text-[12px] text-text-tertiary">
            Showing {start}–{end} of {total}
          </span>
          <div className="flex items-center gap-1">
            <button
              onClick={() => onPageChange(currentPage - 1)}
              disabled={currentPage <= 1}
              className="p-1.5 rounded-[var(--radius-sm)] text-text-tertiary hover:text-text-primary hover:bg-surface disabled:opacity-30 transition-colors"
            >
              <ChevronLeft size={16} />
            </button>
            {pages.map(p => (
              <button
                key={p}
                onClick={() => onPageChange(p)}
                className={`w-8 h-8 rounded-[var(--radius-sm)] text-[12px] font-medium transition-colors ${
                  p === currentPage
                    ? 'bg-primary-600 text-white shadow-xs'
                    : 'text-text-secondary hover:bg-surface'
                }`}
              >
                {p}
              </button>
            ))}
            <button
              onClick={() => onPageChange(currentPage + 1)}
              disabled={currentPage >= lastPage}
              className="p-1.5 rounded-[var(--radius-sm)] text-text-tertiary hover:text-text-primary hover:bg-surface disabled:opacity-30 transition-colors"
            >
              <ChevronRight size={16} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
