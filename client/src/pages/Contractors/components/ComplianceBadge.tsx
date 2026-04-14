import { getComplianceColor } from '../../../config/contractorConfig';

interface Props {
  status: string;
  size?: 'xs' | 'sm';
}

export default function ComplianceBadge({ status, size = 'xs' }: Props) {
  const { bg, text } = getComplianceColor(status);

  const icon =
    status === 'Compliant' ? '\u2713' :
    status === 'Non-Compliant' ? '\u2717' :
    status === 'Partially Compliant' ? '\u25CB' :
    status === 'Suspended' ? '\u2717' :
    status === 'Under Review' ? '\u25CB' :
    '';

  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full font-medium leading-tight whitespace-nowrap ${
        size === 'xs' ? 'px-2 py-[2px] text-[10px]' : 'px-2.5 py-[3px] text-[11px]'
      }`}
      style={{ backgroundColor: bg, color: text }}
    >
      {icon} {status}
    </span>
  );
}
