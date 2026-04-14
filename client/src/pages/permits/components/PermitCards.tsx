import { Eye, Pencil, Trash2, MapPin, Calendar, User } from 'lucide-react';
import { PermitTypeBadge, PermitStatusBadge } from './PermitTypeBadge';
import { getPermitType } from '../config/permitTypes';
import { format, differenceInDays } from 'date-fns';
import type { Permit } from '../hooks/usePermits';

interface Props {
  permits: Permit[];
  loading: boolean;
  onView: (permit: Permit) => void;
  onEdit: (permit: Permit) => void;
  onDelete: (id: string) => void;
}

function getTimeStatus(p: Permit): { label: string; color: string } | null {
  if (p.status === 'Expired') return { label: 'Expired', color: 'var(--color-danger-600)' };
  if (p.status !== 'Active') return null;
  if (!p.permit_date_end) return null;
  const daysLeft = differenceInDays(new Date(p.permit_date_end), new Date());
  if (daysLeft < 0) return { label: 'Expired', color: 'var(--color-danger-600)' };
  if (daysLeft <= 3) return { label: `Expires in ${daysLeft}d`, color: 'var(--color-warning-600)' };
  return { label: `${daysLeft}d active`, color: 'var(--color-success-600)' };
}

export function PermitCards({ permits, loading, onView, onEdit, onDelete }: Props) {
  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return '\u2014';
    try { return format(new Date(dateStr), 'dd MMM yyyy'); } catch { return dateStr; }
  };

  if (loading && permits.length === 0) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="bg-surface border border-border rounded-[var(--radius-lg)] shadow-sm overflow-hidden">
            <div className="h-[5px] skeleton" />
            <div className="p-5">
              <div className="skeleton h-4 w-full mb-3" />
              <div className="skeleton h-5 w-3/4 mb-4" />
              <div className="skeleton h-3 w-1/2 mb-2" />
              <div className="skeleton h-3 w-2/3" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (!loading && permits.length === 0) {
    return null;
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
      {permits.map((p, i) => {
        const config = getPermitType(p.permit_type);
        const timeStatus = getTimeStatus(p);

        return (
          <div
            key={p.id}
            className="group flex flex-col bg-surface border border-border rounded-[var(--radius-lg)] shadow-sm hover:shadow-md transition-all hover:-translate-y-0.5 cursor-pointer overflow-hidden animate-fadeInUp"
            style={{ animationDelay: `${Math.min(i * 30, 300)}ms` }}
            onClick={() => onView(p)}
          >
            {/* Top color bar */}
            <div className="h-[5px] shrink-0" style={{ backgroundColor: config?.color || 'var(--color-neutral-400)' }} />

            <div className="flex-1 flex flex-col p-5">
              {/* Type + Status row */}
              <div className="flex items-center justify-between gap-2 mb-3">
                <PermitTypeBadge type={p.permit_type} size="sm" />
                <PermitStatusBadge status={p.status} />
              </div>

              {/* Title - reserved height for 2 lines */}
              <h3 className="text-[14px] font-semibold text-text-primary mb-1 line-clamp-2 leading-snug min-h-[2.5rem]">
                {p.title}
              </h3>

              {/* Permit number */}
              <span className="inline-block font-mono text-[11px] text-text-secondary bg-surface-sunken px-1.5 py-0.5 rounded-[var(--radius-xs)] border border-border">
                {p.permit_number}
              </span>

              {/* Spacer + Divider + Meta pushed to bottom */}
              <div className="mt-auto pt-3">
                <div className="border-t border-border mb-3" />

                {/* Meta info */}
                <div className="flex flex-wrap gap-x-4 gap-y-1.5 min-h-[1.25rem]">
                  {p.area && (
                    <div className="flex items-center gap-1.5 text-[12px] text-text-secondary">
                      <MapPin size={12} className="text-text-tertiary shrink-0" />
                      <span className="truncate max-w-[100px]">{p.area}</span>
                    </div>
                  )}
                  <div className="flex items-center gap-1.5 text-[12px] text-text-secondary">
                    <Calendar size={12} className="text-text-tertiary shrink-0" />
                    <span>{formatDate(p.permit_date)}</span>
                  </div>
                  {p.issued_to && (
                    <div className="flex items-center gap-1.5 text-[12px] text-text-secondary">
                      <User size={12} className="text-text-tertiary shrink-0" />
                      <span className="truncate max-w-[100px]">{p.issued_to}</span>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Footer - pinned to bottom */}
            <div className="shrink-0 flex items-center justify-between px-5 py-3 bg-surface-sunken border-t border-border">
              {timeStatus ? (
                <span className="text-[11px] font-semibold" style={{ color: timeStatus.color }}>
                  {timeStatus.label}
                </span>
              ) : (
                <span className="text-[11px] text-text-tertiary">
                  {formatDate(p.permit_date)}
                </span>
              )}
              <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity" onClick={e => e.stopPropagation()}>
                <button onClick={() => onView(p)} className="action-btn action-btn--view" title="View">
                  <Eye size={15} />
                </button>
                <button onClick={() => onEdit(p)} className="action-btn action-btn--edit" title="Edit">
                  <Pencil size={15} />
                </button>
                <button onClick={() => onDelete(p.id)} className="action-btn action-btn--delete" title="Delete">
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
