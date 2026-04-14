import { format } from 'date-fns';
import { Clock, CheckCircle, XCircle, Send, AlertTriangle, FileText, Pencil, Trash2, Upload, ArrowRight } from 'lucide-react';
import type { AmendmentLog } from '../hooks/useAmendments';

interface Props {
  logs: AmendmentLog[];
}

const ACTION_CONFIG: Record<string, { icon: React.ComponentType<{ size: number; className?: string }>; color: string }> = {
  'Amendment Created':       { icon: FileText,      color: '#1F8034' },
  'Amendment Updated':       { icon: Pencil,        color: '#0284C7' },
  'Amendment Deleted':       { icon: Trash2,        color: '#DC2626' },
  'Submitted for Review':    { icon: Send,          color: '#1E40AF' },
  'Marked Under Review':     { icon: Clock,         color: '#C2410C' },
  'Approved':                { icon: CheckCircle,   color: '#16A34A' },
  'Rejected':                { icon: XCircle,       color: '#DC2626' },
  'Approved with Comments':  { icon: AlertTriangle, color: '#D97706' },
  'Cancelled':               { icon: XCircle,       color: '#6B7280' },
  'Change Row Added':        { icon: ArrowRight,    color: '#0284C7' },
  'Attachment Uploaded':      { icon: Upload,        color: '#059669' },
};

function formatTimestamp(ts: string | null) {
  if (!ts) return '—';
  try { return format(new Date(ts), 'dd MMM yyyy, HH:mm'); } catch { return ts; }
}

export function AmendmentAuditLog({ logs }: Props) {
  if (!logs || logs.length === 0) {
    return (
      <div className="amendment-audit-log__empty">
        <Clock size={20} className="text-text-tertiary" />
        <p className="text-[12px] text-text-tertiary">No activity recorded yet</p>
      </div>
    );
  }

  return (
    <div className="amendment-audit-log">
      {logs.map((log, i) => {
        const config = ACTION_CONFIG[log.action] || { icon: Clock, color: '#9CA3AF' };
        const Icon = config.icon;
        return (
          <div key={log.id || i} className="amendment-audit-log__entry">
            <div className="amendment-audit-log__dot" style={{ backgroundColor: config.color }} />
            {i < logs.length - 1 && <div className="amendment-audit-log__line" />}
            <div className="amendment-audit-log__content">
              <div className="flex items-center gap-2 mb-0.5">
                <Icon size={13} style={{ color: config.color }} />
                <span className="text-[12px] font-semibold text-text-primary">{log.action}</span>
              </div>
              {log.description && (
                <p className="text-[11px] text-text-secondary mt-0.5">{log.description}</p>
              )}
              {log.from_status && log.to_status && (
                <p className="text-[10px] text-text-tertiary mt-0.5">
                  {log.from_status} → {log.to_status}
                </p>
              )}
              <div className="flex items-center gap-2 mt-1">
                <span className="text-[10px] text-text-tertiary">
                  {log.performed_by_name || 'System'}
                  {log.performed_by_role && log.performed_by_role !== 'unknown' ? ` (${log.performed_by_role})` : ''}
                </span>
                <span className="text-[10px] text-text-disabled">•</span>
                <span className="text-[10px] text-text-tertiary">{formatTimestamp(log.created_at)}</span>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
