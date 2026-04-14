import { useState } from 'react';
import { X as XIcon } from 'lucide-react';
import { PointStatusBadge } from './PointStatusBadge';
import type { MomPointItem } from '../hooks/useMom';

interface Props {
  point: MomPointItem;
  onSubmit: (pointId: number, data: Record<string, unknown>) => Promise<void>;
  onClose: () => void;
}

const STATUS_OPTIONS = ['Open', 'In Progress', 'Resolved', 'Closed', 'Pending', 'Blocked'];
const PRIORITY_OPTIONS = ['Low', 'Medium', 'High', 'Critical'];

export function MomPointUpdateModal({ point, onSubmit, onClose }: Props) {
  const [status, setStatus] = useState(point.status);
  const [priority, setPriority] = useState(point.priority || 'Medium');
  const [assignedTo, setAssignedTo] = useState(point.assigned_to || '');
  const [completion, setCompletion] = useState(point.completion_percentage);
  const [dueDate, setDueDate] = useState(point.due_date || '');
  const [remarks, setRemarks] = useState(point.remarks || '');
  const [note, setNote] = useState('');
  const [saving, setSaving] = useState(false);

  const statusChanged = status !== point.status;

  const handleSubmit = async () => {
    if (statusChanged && !note.trim()) return;
    setSaving(true);
    try {
      await onSubmit(point.id, {
        status,
        priority,
        assigned_to: assignedTo || undefined,
        completion_percentage: completion,
        due_date: dueDate || undefined,
        remarks: remarks || undefined,
        update_note: note || 'Updated',
      });
      onClose();
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="mom-modal-overlay" onClick={onClose}>
      <div className="mom-modal" onClick={e => e.stopPropagation()} style={{ maxWidth: 480 }}>
        <div className="mom-modal__header">
          <div style={{ minWidth: 0 }}>
            <h3 style={{ fontSize: 14, fontWeight: 700, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              Update: {point.title}
            </h3>
            <span style={{ fontSize: 10, color: 'var(--color-text-tertiary)' }}>{point.point_code}</span>
          </div>
          <button onClick={onClose} className="p-1 rounded-[var(--radius-sm)] hover:bg-surface-sunken shrink-0"><XIcon size={16} /></button>
        </div>
        <div className="mom-modal__body" style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {/* Current Status */}
          <div>
            <div style={{ fontSize: 11, color: 'var(--color-text-tertiary)', marginBottom: 4 }}>Current Status</div>
            <PointStatusBadge status={point.status} />
          </div>

          {/* Two-column: Status + Priority */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div>
              <label className="block text-[11px] font-semibold text-text-tertiary uppercase mb-1">Status</label>
              <select value={status} onChange={e => setStatus(e.target.value)}
                className="w-full px-3 py-2 text-[13px] border border-border rounded-[var(--radius-md)] bg-surface focus:outline-none focus:border-primary-400">
                {STATUS_OPTIONS.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-[11px] font-semibold text-text-tertiary uppercase mb-1">Priority</label>
              <select value={priority} onChange={e => setPriority(e.target.value)}
                className="w-full px-3 py-2 text-[13px] border border-border rounded-[var(--radius-md)] bg-surface focus:outline-none focus:border-primary-400">
                {PRIORITY_OPTIONS.map(p => <option key={p} value={p}>{p}</option>)}
              </select>
            </div>
          </div>

          {/* Two-column: Assigned To + Due Date */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div>
              <label className="block text-[11px] font-semibold text-text-tertiary uppercase mb-1">Assigned To</label>
              <input type="text" value={assignedTo} onChange={e => setAssignedTo(e.target.value)}
                placeholder="Person name..."
                className="w-full px-3 py-2 text-[13px] border border-border rounded-[var(--radius-md)] bg-surface focus:outline-none focus:border-primary-400" />
            </div>
            <div>
              <label className="block text-[11px] font-semibold text-text-tertiary uppercase mb-1">Due Date</label>
              <input type="date" value={dueDate} onChange={e => setDueDate(e.target.value)}
                className="w-full px-3 py-2 text-[13px] border border-border rounded-[var(--radius-md)] bg-surface focus:outline-none focus:border-primary-400" />
            </div>
          </div>

          {/* Completion slider - show for In Progress / Resolved */}
          {(status === 'In Progress' || status === 'Resolved') && (
            <div>
              <label className="block text-[11px] font-semibold text-text-tertiary uppercase mb-1">Completion %</label>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <input type="range" min={0} max={100} step={5} value={completion} onChange={e => setCompletion(parseInt(e.target.value))} style={{ flex: 1, accentColor: 'var(--color-primary-600)' }} />
                <span className="text-[13px] font-bold" style={{ width: 40, textAlign: 'right' }}>{completion}%</span>
              </div>
            </div>
          )}

          {/* Remarks */}
          <div>
            <label className="block text-[11px] font-semibold text-text-tertiary uppercase mb-1">Remarks</label>
            <textarea value={remarks} onChange={e => setRemarks(e.target.value)} rows={2} placeholder="Any remarks..."
              className="w-full px-3 py-2 text-[13px] border border-border rounded-[var(--radius-md)] bg-surface focus:outline-none focus:border-primary-400 resize-y" />
          </div>

          {/* Update Note */}
          <div>
            <label className="block text-[11px] font-semibold text-text-tertiary uppercase mb-1">
              Update Note {statusChanged ? <span className="text-danger-600">*</span> : ''}
            </label>
            <textarea value={note} onChange={e => setNote(e.target.value)} rows={2} placeholder="Describe what was done / what changed..."
              className="w-full px-3 py-2 text-[13px] border border-border rounded-[var(--radius-md)] bg-surface focus:outline-none focus:border-primary-400 resize-y" />
            {statusChanged && !note.trim() && (
              <p className="text-[10px] text-danger-600 mt-1">Note is required when changing status</p>
            )}
          </div>
        </div>
        <div className="mom-modal__footer">
          <button onClick={onClose} disabled={saving}
            className="px-4 py-2 text-[13px] font-semibold border border-border rounded-[var(--radius-md)] bg-surface hover:bg-surface-sunken">
            Cancel
          </button>
          <button onClick={handleSubmit} disabled={saving || (statusChanged && !note.trim())}
            className="px-4 py-2 text-[13px] font-semibold text-white bg-primary-600 rounded-[var(--radius-md)] hover:bg-primary-700 shadow-xs disabled:opacity-40">
            {saving ? 'Saving...' : 'Save Update'}
          </button>
        </div>
      </div>
    </div>
  );
}
