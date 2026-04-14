import type { Manifest } from '../hooks/useManifests';

interface Props {
  manifest: Manifest;
}

const stages = [
  { key: 'Draft', label: 'Created', includes: ['Draft', 'Prepared', 'Ready for Dispatch'] },
  { key: 'Dispatched', label: 'Dispatched', includes: ['Dispatched'] },
  { key: 'In Transit', label: 'In Transit', includes: ['In Transit'] },
  { key: 'Received', label: 'Received', includes: ['Received'] },
  { key: 'Completed', label: 'Completed', includes: ['Completed'] },
];

const statusOrder: Record<string, number> = {
  'Draft': 0, 'Prepared': 0, 'Ready for Dispatch': 0,
  'Dispatched': 1, 'In Transit': 2, 'Received': 3, 'Completed': 4,
  'Cancelled': -1, 'Rejected': -1, 'Under Review': -1,
};

export default function ChainOfCustodyTimeline({ manifest }: Props) {
  const currentIdx = statusOrder[manifest.status] ?? -1;
  const isCancelled = manifest.status === 'Cancelled' || manifest.status === 'Rejected';

  const getDate = (stageIdx: number): string | null => {
    if (stageIdx === 0) return manifest.created_at ? new Date(manifest.created_at).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: '2-digit' }) : null;
    if (stageIdx === 1) return manifest.dispatched_at ? new Date(manifest.dispatched_at).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: '2-digit' }) : null;
    if (stageIdx === 2) return manifest.dispatched_at && currentIdx >= 2 ? 'In transit' : null;
    if (stageIdx === 3) return manifest.received_at ? new Date(manifest.received_at).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: '2-digit' }) : null;
    if (stageIdx === 4) return manifest.completed_at ? new Date(manifest.completed_at).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: '2-digit' }) : null;
    return null;
  };

  if (isCancelled) {
    return (
      <div className="p-4 rounded-[var(--radius-md)] bg-gray-50 border border-gray-200 mb-5">
        <div className="flex items-center gap-2 text-[13px] text-gray-600">
          <span className="text-red-500 text-lg">✗</span>
          <span className="font-semibold">{manifest.status}</span>
          {manifest.cancellation_reason && <span className="text-[12px] text-gray-500">— {manifest.cancellation_reason}</span>}
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 rounded-[var(--radius-md)] bg-surface border border-border mb-5 overflow-x-auto">
      <div className="flex items-start justify-between min-w-[500px] relative">
        {/* Connecting line */}
        <div className="absolute top-4 left-[10%] right-[10%] h-[2px] bg-gray-200 z-0" />
        <div
          className="absolute top-4 left-[10%] h-[2px] bg-green-500 z-0 transition-all duration-500"
          style={{ width: currentIdx >= 0 ? `${Math.min(currentIdx / 4 * 80, 80)}%` : '0%' }}
        />

        {stages.map((stage, idx) => {
          const isComplete = idx < currentIdx;
          const isActive = idx === currentIdx;
          const isFuture = idx > currentIdx;
          const date = getDate(idx);
          const isDelayedTransit = idx === 2 && manifest.is_delayed && manifest.status === 'In Transit';

          return (
            <div key={stage.key} className="flex flex-col items-center z-10 flex-1">
              {/* Dot */}
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-[12px] font-bold transition-all duration-300 ${
                isComplete ? 'bg-green-500 text-white shadow-sm' :
                isActive ? (isDelayedTransit ? 'bg-red-500 text-white' : 'bg-primary-500 text-white shadow-md') :
                'bg-gray-200 text-gray-400'
              }`}>
                {isComplete ? '✓' : isActive ? (
                  <span className="relative flex h-2.5 w-2.5">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-75" />
                    <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-white" />
                  </span>
                ) : (idx + 1)}
              </div>

              {/* Label */}
              <span className={`text-[11px] mt-2 font-medium text-center ${
                isActive ? 'text-text-primary font-bold' : isComplete ? 'text-green-700' : 'text-text-tertiary'
              }`}>
                {stage.label}
              </span>

              {/* Date */}
              <span className={`text-[10px] mt-0.5 ${isComplete || isActive ? 'text-text-secondary' : 'text-text-tertiary'}`}>
                {date || (isFuture ? 'Pending' : '')}
              </span>

              {/* Delay warning */}
              {isDelayedTransit && (
                <span className="text-[9px] font-bold text-red-600 bg-red-50 px-1.5 py-0.5 rounded-full mt-1">
                  ⚠ Overdue
                </span>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
