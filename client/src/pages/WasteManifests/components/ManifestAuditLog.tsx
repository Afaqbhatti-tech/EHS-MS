import type { ManifestLog } from '../hooks/useManifests';

interface Props {
  logs: ManifestLog[];
}

const actionColors: Record<string, { bg: string; text: string; dot: string }> = {
  'Manifest Created':     { bg: '#F3F4F6', text: '#374151', dot: '#9CA3AF' },
  'Status Changed':       { bg: '#DBEAFE', text: '#1E40AF', dot: '#3B82F6' },
  'Dispatch Confirmed':   { bg: '#FFF7ED', text: '#C2410C', dot: '#F59E0B' },
  'Receiving Confirmed':  { bg: '#F0FDFA', text: '#0F766E', dot: '#14B8A6' },
  'Disposal Confirmed':   { bg: '#F0FDF4', text: '#166534', dot: '#22C55E' },
  'Manifest Cancelled':   { bg: '#FEF2F2', text: '#991B1B', dot: '#EF4444' },
  'Manifest Rejected':    { bg: '#FEF2F2', text: '#991B1B', dot: '#EF4444' },
  'Attachment Uploaded':   { bg: '#F5F3FF', text: '#5B21B6', dot: '#8B5CF6' },
  'Attachment Removed':    { bg: '#F5F3FF', text: '#5B21B6', dot: '#8B5CF6' },
  'Manifest Updated':     { bg: '#F0F9FF', text: '#075985', dot: '#38BDF8' },
  'Compliance Updated':   { bg: '#FEF3C7', text: '#92400E', dot: '#D97706' },
};

const getColor = (action: string) => actionColors[action] || { bg: '#F3F4F6', text: '#374151', dot: '#9CA3AF' };

export default function ManifestAuditLog({ logs }: Props) {
  if (!logs?.length) {
    return <p className="text-[12px] text-text-tertiary p-4">No activity logged yet.</p>;
  }

  return (
    <div className="space-y-0">
      {logs.map((log, i) => {
        const color = getColor(log.action);
        return (
          <div key={log.id} className="flex gap-3 py-3 relative">
            {/* Timeline line */}
            {i < logs.length - 1 && (
              <div className="absolute left-[11px] top-[30px] bottom-0 w-[2px] bg-border" />
            )}
            {/* Dot */}
            <div className="w-6 h-6 rounded-full flex items-center justify-center shrink-0 z-10" style={{ backgroundColor: color.bg }}>
              <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: color.dot }} />
            </div>
            {/* Content */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-[12px] font-semibold" style={{ color: color.text }}>{log.action}</span>
                {log.from_status && log.to_status && (
                  <span className="text-[10px] text-text-tertiary">
                    {log.from_status} → {log.to_status}
                  </span>
                )}
              </div>
              {log.description && (
                <p className="text-[11px] text-text-secondary mt-0.5">{log.description}</p>
              )}
              <div className="flex items-center gap-2 mt-1">
                <span className="text-[10px] text-text-tertiary">
                  {log.performed_by_name || 'System'}
                  {log.performed_by_role && ` (${log.performed_by_role})`}
                </span>
                <span className="text-[10px] text-text-tertiary">
                  {log.created_at ? new Date(log.created_at).toLocaleString('en-GB', {
                    day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit',
                  }) : ''}
                </span>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
