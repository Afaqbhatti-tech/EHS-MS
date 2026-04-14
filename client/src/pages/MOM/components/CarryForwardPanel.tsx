import { useState } from 'react';
import { X as XIcon, CheckSquare, Square, ArrowRight } from 'lucide-react';
import { PointStatusBadge } from './PointStatusBadge';
import type { MomPointItem } from '../hooks/useMom';

interface Props {
  points: MomPointItem[];
  fromWeek: number;
  onCarry: (pointIds: number[]) => Promise<void>;
  onClose: () => void;
}

export function CarryForwardPanel({ points, fromWeek, onCarry, onClose }: Props) {
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [carrying, setCarrying] = useState(false);

  const toggle = (id: number) => {
    setSelected(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const selectAll = () => setSelected(new Set(points.map(p => p.id)));
  const deselectAll = () => setSelected(new Set());

  const handleCarry = async () => {
    if (selected.size === 0) return;
    setCarrying(true);
    try {
      await onCarry(Array.from(selected));
      onClose();
    } finally {
      setCarrying(false);
    }
  };

  return (
    <div className="mom-modal-overlay" onClick={onClose}>
      <div className="mom-modal" onClick={e => e.stopPropagation()} style={{ maxWidth: 600, maxHeight: '85vh' }}>
        <div className="mom-modal__header">
          <div>
            <h3 style={{ fontSize: 15, fontWeight: 700 }}>Carry Forward from Week {fromWeek}</h3>
            <p style={{ fontSize: 12, color: 'var(--color-text-tertiary)', marginTop: 2 }}>Select unresolved points to bring into this week</p>
          </div>
          <button onClick={onClose} className="p-1 rounded-[var(--radius-sm)] hover:bg-surface-sunken"><XIcon size={16} /></button>
        </div>

        <div className="mom-modal__body">
          <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
            <button onClick={selectAll} className="text-[12px] font-semibold text-primary-600 hover:text-primary-700">Select All</button>
            <button onClick={deselectAll} className="text-[12px] font-semibold text-text-tertiary hover:text-text-secondary">Deselect All</button>
          </div>

          {points.length === 0 ? (
            <div style={{ textAlign: 'center', padding: 24, color: 'var(--color-text-tertiary)', fontSize: 13 }}>
              No unresolved points to carry forward.
            </div>
          ) : (
            points.map(p => (
              <div
                key={p.id}
                className={`carry-forward-item ${selected.has(p.id) ? 'carry-forward-item--selected' : ''}`}
                onClick={() => toggle(p.id)}
              >
                {selected.has(p.id) ? <CheckSquare size={16} style={{ color: 'var(--color-primary-600)', flexShrink: 0 }} /> : <Square size={16} style={{ color: 'var(--color-text-tertiary)', flexShrink: 0 }} />}
                <PointStatusBadge status={p.status} size="sm" />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 600, fontSize: 13, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.title}</div>
                  <div style={{ fontSize: 11, color: 'var(--color-text-tertiary)', display: 'flex', gap: 8 }}>
                    <span>{p.category}</span>
                    {p.assigned_to && <span>{p.assigned_to}</span>}
                    {p.carry_count > 0 && <span className="carry-badge">Carried {p.carry_count}x</span>}
                  </div>
                </div>
              </div>
            ))
          )}

          {selected.size > 0 && (
            <div style={{ marginTop: 12, padding: '8px 12px', background: 'var(--color-primary-50)', border: '1px solid var(--color-primary-200)', borderRadius: 'var(--radius-md)', fontSize: 13, fontWeight: 600, color: 'var(--color-primary-700)' }}>
              {selected.size} point{selected.size !== 1 ? 's' : ''} selected to carry forward
            </div>
          )}
        </div>

        <div className="mom-modal__footer">
          <button onClick={onClose}
            className="px-4 py-2 text-[13px] font-semibold border border-border rounded-[var(--radius-md)] bg-surface hover:bg-surface-sunken">
            Cancel
          </button>
          <button onClick={handleCarry} disabled={carrying || selected.size === 0}
            className="px-4 py-2 text-[13px] font-semibold text-white bg-primary-600 rounded-[var(--radius-md)] hover:bg-primary-700 shadow-xs disabled:opacity-40 flex items-center gap-1.5">
            <ArrowRight size={14} />
            {carrying ? 'Carrying...' : `Carry Forward ${selected.size} Point${selected.size !== 1 ? 's' : ''}`}
          </button>
        </div>
      </div>
    </div>
  );
}
