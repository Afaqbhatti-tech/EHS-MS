import { getStatusColor, getStatusIcon } from '../../../config/wasteManifestConfig';

interface Props {
  status: string;
  size?: 'sm' | 'md';
  pulse?: boolean;
}

export default function ManifestStatusBadge({ status, size = 'sm', pulse }: Props) {
  const { bg, text } = getStatusColor(status);
  const icon = getStatusIcon(status);
  const showPulse = pulse || status === 'Dispatched' || status === 'In Transit';
  const isCompleted = status === 'Completed';
  const isCancelled = status === 'Cancelled';

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full font-medium leading-tight whitespace-nowrap ${size === 'md' ? 'px-3 py-1 text-[12px]' : 'px-2.5 py-[3px] text-[11px]'}`}
      style={{
        backgroundColor: bg,
        color: text,
        opacity: isCancelled ? 0.75 : 1,
      }}
    >
      {showPulse && !isCompleted && !isCancelled && (
        <span className="relative flex h-2 w-2">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full opacity-75" style={{ backgroundColor: text }} />
          <span className="relative inline-flex rounded-full h-2 w-2" style={{ backgroundColor: text }} />
        </span>
      )}
      <span>{icon}</span>
      <span>{status}</span>
    </span>
  );
}
