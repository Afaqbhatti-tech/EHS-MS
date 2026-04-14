import { Eye, Pencil, Trash2, Building2, Calendar, Clock } from 'lucide-react';
import { InductionBadge, WorkerStatusBadge } from './InductionBadge';
import { format } from 'date-fns';
import type { Worker } from '../hooks/useManpower';

interface Props {
  workers: Worker[];
  loading: boolean;
  onView: (worker: Worker) => void;
  onEdit: (worker: Worker) => void;
  onDelete: (id: string) => void;
}

function getAvatarColor(name: string): string {
  const colors = [
    '#1F8034', '#7C3AED', '#059669', '#D97706', '#DC2626',
    '#0891B2', '#4F46E5', '#B45309', '#0D9488', '#9333EA',
  ];
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  return colors[Math.abs(hash) % colors.length];
}

function getInitials(name: string): string {
  return name
    .split(' ')
    .map(w => w[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();
}

export function WorkerCards({ workers, loading, onView, onEdit, onDelete }: Props) {
  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return '\u2014';
    try { return format(new Date(dateStr), 'dd MMM yyyy'); } catch { return dateStr; }
  };

  if (loading && workers.length === 0) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="bg-surface border border-border rounded-[var(--radius-lg)] shadow-sm overflow-hidden">
            <div className="p-5">
              <div className="flex items-center gap-3 mb-4">
                <div className="skeleton w-12 h-12 rounded-full" />
                <div className="flex-1">
                  <div className="skeleton h-4 w-3/4 mb-2" />
                  <div className="skeleton h-3 w-1/2" />
                </div>
              </div>
              <div className="skeleton h-3 w-2/3 mb-2" />
              <div className="skeleton h-3 w-1/2" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (!loading && workers.length === 0) {
    return null;
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
      {workers.map((w, i) => {
        const avatarColor = getAvatarColor(w.name);
        const initials = getInitials(w.name);
        const isDemob = w.status === 'Demobilised';

        return (
          <div
            key={w.id}
            className={`group flex flex-col bg-surface border border-border rounded-[var(--radius-lg)] shadow-sm hover:shadow-md transition-all hover:-translate-y-0.5 cursor-pointer overflow-hidden animate-fadeInUp ${isDemob ? 'opacity-55' : ''}`}
            style={{ animationDelay: `${Math.min(i * 30, 300)}ms` }}
            onClick={() => onView(w)}
          >
            <div className="flex-1 flex flex-col p-5">
              {/* Avatar + Name + Status */}
              <div className="flex items-start gap-3 mb-3">
                <div
                  className="w-12 h-12 rounded-full flex items-center justify-center text-[14px] font-bold text-white shrink-0"
                  style={{ backgroundColor: avatarColor }}
                >
                  {initials}
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="text-[15px] font-semibold text-text-primary truncate leading-snug">{w.name}</h3>
                  <span className="font-mono text-[11px] text-text-tertiary">{w.worker_id}</span>
                  <div className="flex items-center gap-1.5 mt-1.5 flex-wrap">
                    <WorkerStatusBadge status={w.status} />
                    <InductionBadge status={w.induction_status} />
                  </div>
                </div>
              </div>

              {/* Detail rows - pushed to bottom */}
              <div className="mt-auto pt-3">
                <div className="border-t border-border mb-3" />

                <div className="space-y-1.5 min-h-[3.5rem]">
                  {w.profession && (
                    <span className="inline-flex items-center px-2 py-0.5 text-[11px] font-semibold bg-indigo-100 text-indigo-800 border border-indigo-200 rounded-[var(--radius-xs)]">
                      {w.profession}
                    </span>
                  )}
                  {w.company && (
                    <div className="flex items-center gap-2 text-[12px] text-text-secondary">
                      <Building2 size={12} className="text-text-tertiary shrink-0" />
                      <span className="truncate">{w.company}</span>
                    </div>
                  )}
                  <div className="flex items-center gap-4">
                    <div className="flex items-center gap-1.5 text-[12px] text-text-secondary">
                      <Calendar size={12} className="text-text-tertiary shrink-0" />
                      <span>{formatDate(w.joining_date)}</span>
                    </div>
                    {w.days_on_site > 0 && (
                      <div className="flex items-center gap-1.5 text-[12px] text-text-secondary">
                        <Clock size={12} className="text-text-tertiary shrink-0" />
                        <span>{w.days_on_site}d on site</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Footer - pinned to bottom */}
            <div className="shrink-0 flex items-center justify-between px-5 py-3 bg-surface-sunken border-t border-border">
              <span className="font-mono text-[11px] text-text-tertiary">{w.worker_id}</span>
              <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity" onClick={e => e.stopPropagation()}>
                <button onClick={() => onView(w)} className="action-btn action-btn--view" title="View">
                  <Eye size={15} />
                </button>
                <button onClick={() => onEdit(w)} className="action-btn action-btn--edit" title="Edit">
                  <Pencil size={15} />
                </button>
                <button onClick={() => onDelete(w.id)} className="action-btn action-btn--delete" title="Delete">
                  <Trash2 size={15} />
                </button>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
