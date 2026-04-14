import { getComplianceColor } from '../../../config/wasteManifestConfig';

interface Props {
  status: string;
  size?: 'xs' | 'sm';
}

export default function ComplianceBadge({ status, size = 'xs' }: Props) {
  const { bg, text } = getComplianceColor(status);

  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full font-medium leading-tight whitespace-nowrap ${size === 'xs' ? 'px-2 py-[2px] text-[10px]' : 'px-2.5 py-[3px] text-[11px]'}`}
      style={{ backgroundColor: bg, color: text }}
    >
      {status === 'Compliant' && '✓'}{status === 'Non-Compliant' && '✗'}{status === 'Pending' && '○'}
      {' '}{status}
    </span>
  );
}
