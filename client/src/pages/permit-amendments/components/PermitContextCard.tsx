import { FileText, MapPin, Tag } from 'lucide-react';

interface Props {
  permitNumber: string | null;
  permitType: string | null;
  permitArea: string | null;
  permitId?: string;
}

export function PermitContextCard({ permitNumber, permitType, permitArea }: Props) {
  return (
    <div className="permit-context-card">
      <div className="flex items-center gap-2 mb-2">
        <FileText size={14} className="text-text-tertiary" />
        <span className="text-[11px] font-medium text-text-tertiary uppercase tracking-wider">Linked Permit</span>
      </div>
      <div className="grid grid-cols-3 gap-3">
        <div>
          <p className="text-[10px] text-text-tertiary uppercase">Permit No.</p>
          <p className="text-[13px] font-mono font-semibold text-text-primary">{permitNumber || '—'}</p>
        </div>
        <div>
          <p className="text-[10px] text-text-tertiary uppercase">Type</p>
          <div className="flex items-center gap-1 mt-0.5">
            <Tag size={11} className="text-text-tertiary" />
            <p className="text-[12px] text-text-primary">{permitType || '—'}</p>
          </div>
        </div>
        <div>
          <p className="text-[10px] text-text-tertiary uppercase">Area / Zone</p>
          <div className="flex items-center gap-1 mt-0.5">
            <MapPin size={11} className="text-text-tertiary" />
            <p className="text-[12px] text-text-primary">{permitArea || '—'}</p>
          </div>
        </div>
      </div>
    </div>
  );
}
