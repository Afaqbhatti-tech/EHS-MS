import { format } from 'date-fns';
import { CheckCircle, Clock, XCircle, ArrowRight } from 'lucide-react';
import AmendmentStatusBadge from './AmendmentStatusBadge';
import RevisionBadge from './RevisionBadge';
import type { Amendment } from '../hooks/useAmendments';

interface Props {
  amendments: Amendment[];
  currentRevision: number;
  onView?: (amendment: Amendment) => void;
}

function formatDate(d: string | null) {
  if (!d) return '—';
  try { return format(new Date(d), 'dd MMM yyyy'); } catch { return d; }
}

export function RevisionHistoryTimeline({ amendments, currentRevision, onView }: Props) {
  const sorted = [...amendments].sort((a, b) => a.revision_number - b.revision_number);

  return (
    <div className="revision-timeline">
      {/* Rev 0: Original Permit */}
      <div className="revision-timeline__node">
        <div
          className="revision-timeline__dot"
          style={{ backgroundColor: currentRevision === 0 ? 'var(--color-success-600)' : 'var(--color-border-strong)' }}
        />
        {sorted.length > 0 && <div className="revision-timeline__line" />}
        <div className="revision-timeline__card">
          <div className="flex items-center gap-2">
            <RevisionBadge revision={0} isActive={currentRevision === 0} />
            <span className="text-[12px] font-medium text-text-primary">Original Permit</span>
          </div>
          <p className="text-[11px] text-text-tertiary mt-0.5">Initial permit issuance</p>
        </div>
      </div>

      {sorted.map((amd, i) => {
        const isActive = amd.is_active_revision;
        const isApproved = amd.status === 'Approved' || amd.status === 'Approved with Comments';
        const isRejected = amd.status === 'Rejected';
        const isPending = amd.status === 'Submitted' || amd.status === 'Under Review';

        let dotColor = 'var(--color-border-strong)';
        let StatusIcon = Clock;
        if (isActive || isApproved) { dotColor = 'var(--color-success-600)'; StatusIcon = CheckCircle; }
        else if (isRejected) { dotColor = 'var(--color-danger-500)'; StatusIcon = XCircle; }
        else if (isPending) { dotColor = 'var(--color-warning-500)'; StatusIcon = Clock; }

        return (
          <div key={amd.id} className="revision-timeline__node">
            <div className="revision-timeline__dot" style={{ backgroundColor: dotColor }} />
            {i < sorted.length - 1 && <div className="revision-timeline__line" />}
            <div
              className={`revision-timeline__card ${isActive ? 'revision-timeline__card--active' : ''}`}
              onClick={() => onView?.(amd)}
              style={{ cursor: onView ? 'pointer' : undefined }}
            >
              <div className="flex items-center gap-2 flex-wrap">
                <RevisionBadge revision={amd.revision_number} isActive={isActive} />
                <span className="text-[11px] font-mono text-text-tertiary">{amd.amendment_code}</span>
                <AmendmentStatusBadge status={amd.status} size="xs" />
              </div>
              <div className="flex items-center gap-1.5 mt-1">
                <StatusIcon size={12} style={{ color: dotColor }} />
                <span className="text-[12px] text-text-primary">{amd.amendment_type}</span>
              </div>
              <div className="flex items-center gap-2 mt-1 text-[10px] text-text-tertiary">
                <span>{amd.requested_by || '—'}</span>
                <span>•</span>
                <span>{formatDate(amd.request_date)}</span>
                {amd.changes_count !== undefined && (
                  <>
                    <span>•</span>
                    <span>{amd.changes_count} change{amd.changes_count !== 1 ? 's' : ''}</span>
                  </>
                )}
              </div>
              {onView && (
                <button
                  className="flex items-center gap-1 mt-1.5 text-[10px] font-medium text-primary-600 hover:text-primary-700"
                  onClick={(e) => { e.stopPropagation(); onView(amd); }}
                >
                  View Details <ArrowRight size={10} />
                </button>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
