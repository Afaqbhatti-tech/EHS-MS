import { Download, FileText, Image, FileSpreadsheet, Trash2 } from 'lucide-react';
import type { AttachmentFile } from '../hooks/useMom';

interface Props {
  attachments: AttachmentFile[];
  editable?: boolean;
  onRemove?: (path: string) => void;
}

function getFileIcon(filename: string) {
  const ext = filename.split('.').pop()?.toLowerCase();
  if (['jpg', 'jpeg', 'png', 'gif', 'webp'].includes(ext || '')) return { icon: Image, color: '#16A34A' };
  if (['xls', 'xlsx', 'csv'].includes(ext || '')) return { icon: FileSpreadsheet, color: '#16A34A' };
  return { icon: FileText, color: '#DC2626' };
}

export function MomAttachments({ attachments, editable, onRemove }: Props) {
  if (!attachments || attachments.length === 0) {
    return <p style={{ fontSize: 12, color: 'var(--color-text-tertiary)' }}>No attachments</p>;
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      {attachments.map((att, i) => {
        const { icon: Icon, color } = getFileIcon(att.filename);
        return (
          <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 10px', background: 'var(--color-surface-sunken)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-sm)' }}>
            <Icon size={16} style={{ color, flexShrink: 0 }} />
            <span style={{ flex: 1, fontSize: 12, fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {att.filename}
            </span>
            <a href={att.url} target="_blank" rel="noopener noreferrer" className="p-1 text-primary-600 hover:text-primary-700">
              <Download size={14} />
            </a>
            {editable && onRemove && (
              <button onClick={() => onRemove(att.path)} className="p-1 text-danger-500 hover:text-danger-700">
                <Trash2 size={14} />
              </button>
            )}
          </div>
        );
      })}
    </div>
  );
}
