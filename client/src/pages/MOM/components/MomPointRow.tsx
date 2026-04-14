import { useState } from 'react';
import { ChevronDown, Pencil, Trash2, ArrowRight } from 'lucide-react';
import { PointStatusBadge } from './PointStatusBadge';
import { PointPriorityBadge } from './PointPriorityBadge';
import { MomPointPhotos } from './MomPointPhotos';
import type { MomPointItem, PointPhoto } from '../hooks/useMom';

interface Props {
  point: MomPointItem;
  onUpdate: (pointId: number, data: Record<string, unknown>) => Promise<void>;
  onEdit: () => void;
  onDelete: () => void;
  onUploadPhoto?: (momId: string, pointId: number, files: File[], caption?: string) => Promise<{ photos: PointPhoto[] }>;
  onDeletePhoto?: (momId: string, pointId: number, photoId: number) => Promise<void>;
}

const STATUS_OPTIONS = ['Open', 'In Progress', 'Resolved', 'Closed', 'Pending', 'Blocked'];

export function MomPointRow({ point, onUpdate, onEdit, onDelete, onUploadPhoto, onDeletePhoto }: Props) {
  const [expanded, setExpanded] = useState(false);
  const [updating, setUpdating] = useState(false);
  const [quickStatus, setQuickStatus] = useState(point.status);
  const [quickCompletion, setQuickCompletion] = useState(point.completion_percentage);
  const [quickNote, setQuickNote] = useState('');

  const rowCls = point.is_overdue
    ? 'mom-point-row--overdue'
    : point.status === 'Open' || point.status === 'Pending' || point.status === 'Blocked'
      ? 'mom-point-row--open'
      : point.status === 'In Progress'
        ? 'mom-point-row--in-progress'
        : point.status === 'Resolved'
          ? 'mom-point-row--resolved'
          : point.status === 'Carried Forward'
            ? 'mom-point-row--carried'
            : 'mom-point-row--closed';

  const handleQuickUpdate = async () => {
    if (quickStatus !== point.status && !quickNote.trim()) return;
    setUpdating(true);
    try {
      await onUpdate(point.id, {
        status: quickStatus,
        completion_percentage: quickCompletion,
        update_note: quickNote || 'Status updated',
      });
      setQuickNote('');
    } finally {
      setUpdating(false);
    }
  };

  return (
    <div className={`mom-point-row ${rowCls}`}>
      {/* Header */}
      <div className="mom-point-row__header flex-wrap" onClick={() => setExpanded(!expanded)}>
        <span className="mom-point-number">{point.point_number}</span>
        <PointStatusBadge status={point.status} size="sm" />
        <span className="flex-1 min-w-0" style={{ fontWeight: 600, fontSize: 13, color: 'var(--color-text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {point.title}
        </span>
        <span className="mom-category-badge hidden sm:inline-flex">{point.category}</span>
        {point.assigned_to && (
          <span className="hidden sm:inline" style={{ fontSize: 11, color: 'var(--color-text-secondary)', whiteSpace: 'nowrap' }}>{point.assigned_to}</span>
        )}
        {point.due_date && (
          <span style={{ fontSize: 11, color: point.is_overdue ? 'var(--color-danger-600)' : 'var(--color-text-tertiary)', whiteSpace: 'nowrap', fontWeight: point.is_overdue ? 700 : 400 }}>
            {point.is_overdue && `${point.days_overdue}d overdue`}
            {!point.is_overdue && new Date(point.due_date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })}
          </span>
        )}
        <PointPriorityBadge priority={point.priority} />
        {point.carry_count > 0 && (
          <span className="carry-badge">
            <ArrowRight size={10} />
            {point.carry_count}x
          </span>
        )}
        <div className="flex gap-0.5 shrink-0" onClick={e => e.stopPropagation()}>
          <button onClick={onEdit} className="p-1 rounded-[var(--radius-sm)] text-text-tertiary hover:text-info-600 hover:bg-info-50">
            <Pencil size={13} />
          </button>
          <button onClick={onDelete} className="p-1 rounded-[var(--radius-sm)] text-text-tertiary hover:text-danger-600 hover:bg-danger-50">
            <Trash2 size={13} />
          </button>
        </div>
        <ChevronDown size={14} style={{ color: 'var(--color-text-tertiary)', transform: expanded ? 'rotate(180deg)' : 'none', transition: 'transform 0.15s', flexShrink: 0 }} />
      </div>

      {/* Expanded body */}
      {expanded && (
        <div className="mom-point-row__body">
          {/* Description */}
          {point.description && (
            <p style={{ fontSize: 12, color: 'var(--color-text-secondary)', marginBottom: 12, lineHeight: 1.5 }}>
              {point.description}
            </p>
          )}

          {/* Completion bar */}
          <div style={{ marginBottom: 12 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, marginBottom: 2 }}>
              <span style={{ color: 'var(--color-text-tertiary)' }}>Completion</span>
              <span style={{ fontWeight: 700 }}>{point.completion_percentage}%</span>
            </div>
            <div className="completion-bar">
              <div className="completion-bar__fill" style={{ width: `${point.completion_percentage}%` }} />
            </div>
          </div>

          {/* Remarks */}
          {point.remarks && (
            <div style={{ padding: '8px 10px', background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-sm)', fontSize: 12, color: 'var(--color-text-secondary)', marginBottom: 12 }}>
              <span style={{ fontSize: 10, fontWeight: 600, color: 'var(--color-text-tertiary)', textTransform: 'uppercase' }}>Remarks: </span>
              {point.remarks}
            </div>
          )}

          {/* Carry info */}
          {point.carry_count > 0 && (
            <div style={{ fontSize: 11, color: 'var(--color-text-tertiary)', marginBottom: 12 }}>
              Originally raised in a previous MOM. Carried forward {point.carry_count} time{point.carry_count > 1 ? 's' : ''}.
            </div>
          )}

          {/* Quick update form */}
          <div style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)', padding: 12, marginBottom: 12 }}>
            <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', color: 'var(--color-text-tertiary)', marginBottom: 8 }}>Quick Update</div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mb-2">
              <select value={quickStatus} onChange={e => setQuickStatus(e.target.value)}
                className="px-3 py-[6px] text-[12px] border border-border rounded-[var(--radius-sm)] bg-surface focus:outline-none">
                {STATUS_OPTIONS.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <input type="range" min={0} max={100} step={5} value={quickCompletion} onChange={e => setQuickCompletion(parseInt(e.target.value))} style={{ flex: 1, accentColor: 'var(--color-primary-600)' }} />
                <span className="text-[11px] font-semibold" style={{ width: 32 }}>{quickCompletion}%</span>
              </div>
            </div>
            <textarea value={quickNote} onChange={e => setQuickNote(e.target.value)} rows={2} placeholder="Update note (required if status changes)..."
              className="w-full px-3 py-[6px] text-[12px] border border-border rounded-[var(--radius-sm)] bg-surface focus:outline-none focus:border-primary-400 resize-y mb-2" />
            <button onClick={handleQuickUpdate} disabled={updating || (quickStatus !== point.status && !quickNote.trim())}
              className="px-3 py-[5px] text-[12px] font-semibold text-white bg-primary-600 rounded-[var(--radius-sm)] hover:bg-primary-700 disabled:opacity-40 disabled:cursor-not-allowed">
              {updating ? 'Saving...' : 'Save Update'}
            </button>
          </div>

          {/* Photos */}
          {onUploadPhoto && onDeletePhoto && (
            <div style={{ marginBottom: 12 }}>
              <MomPointPhotos
                photos={point.photos || []}
                momId={point.mom_id}
                pointId={point.id}
                onUpload={onUploadPhoto}
                onDelete={onDeletePhoto}
              />
            </div>
          )}

          {/* Recent updates */}
          {point.updates && point.updates.length > 0 && (
            <div>
              <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', color: 'var(--color-text-tertiary)', marginBottom: 8 }}>Update History</div>
              <div className="point-update-timeline">
                {point.updates.slice(0, 3).map(u => {
                  const dotCls = (u.new_status || '').toLowerCase().replace(/\s+/g, '-');
                  return (
                    <div key={u.id} className="point-update-item">
                      <div className={`point-update-item__dot point-update-item__dot--${dotCls || 'default'}`} />
                      <div className="point-update-item__content">
                        {u.old_status && u.new_status && u.old_status !== u.new_status && (
                          <div className="point-update-item__status-change">
                            <PointStatusBadge status={u.old_status} size="sm" />
                            <ArrowRight size={12} />
                            <PointStatusBadge status={u.new_status} size="sm" />
                          </div>
                        )}
                        <div style={{ color: 'var(--color-text-secondary)' }}>{u.update_note}</div>
                        <div style={{ display: 'flex', gap: 8, marginTop: 4, fontSize: 10, color: 'var(--color-text-tertiary)' }}>
                          <span>{u.updated_by_name}</span>
                          <span>{u.created_at && new Date(u.created_at).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}</span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
