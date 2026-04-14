import { X as XIcon, ArrowRight } from 'lucide-react';
import { PointStatusBadge } from './PointStatusBadge';
import { PointPriorityBadge } from './PointPriorityBadge';
import { MomPointPhotos } from './MomPointPhotos';
import type { MomPointItem, PointPhoto } from '../hooks/useMom';

interface Props {
  point: MomPointItem;
  onClose: () => void;
  onEdit: () => void;
  onUploadPhoto?: (momId: string, pointId: number, files: File[], caption?: string) => Promise<{ photos: PointPhoto[] }>;
  onDeletePhoto?: (momId: string, pointId: number, photoId: number) => Promise<void>;
}

export function MomPointDetail({ point, onClose, onEdit, onUploadPhoto, onDeletePhoto }: Props) {
  return (
    <>
      <div className="mom-drawer-overlay" onClick={onClose} />
      <div className="mom-drawer" style={{ width: '100%', maxWidth: 480 }}>
        <div className="mom-drawer__header">
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span className="mom-code">{point.point_code}</span>
              <PointStatusBadge status={point.status} />
              <PointPriorityBadge priority={point.priority} />
            </div>
            <h3 style={{ fontSize: 15, fontWeight: 700, marginTop: 6 }}>{point.title}</h3>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-[var(--radius-sm)] hover:bg-surface-sunken"><XIcon size={18} /></button>
        </div>

        <div className="mom-drawer__body">
          {/* Details */}
          <div className="mom-section">
            <div className="mom-section__title">Details</div>
            {point.description && <p style={{ fontSize: 12, color: 'var(--color-text-secondary)', marginBottom: 12, lineHeight: 1.5 }}>{point.description}</p>}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2" style={{ fontSize: 12 }}>
              <div><span style={{ color: 'var(--color-text-tertiary)' }}>Category:</span> <span className="mom-category-badge">{point.category}</span></div>
              <div><span style={{ color: 'var(--color-text-tertiary)' }}>Raised By:</span> {point.raised_by || '—'}</div>
              <div><span style={{ color: 'var(--color-text-tertiary)' }}>Assigned To:</span> {point.assigned_to || '—'}</div>
              <div><span style={{ color: 'var(--color-text-tertiary)' }}>Due Date:</span> {point.due_date ? new Date(point.due_date).toLocaleDateString('en-GB') : '—'}</div>
            </div>
            <div style={{ marginTop: 8 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, marginBottom: 2 }}>
                <span style={{ color: 'var(--color-text-tertiary)' }}>Completion</span>
                <span style={{ fontWeight: 700 }}>{point.completion_percentage}%</span>
              </div>
              <div className="completion-bar">
                <div className="completion-bar__fill" style={{ width: `${point.completion_percentage}%` }} />
              </div>
            </div>
          </div>

          {/* Carry chain */}
          {point.carry_count > 0 && (
            <div className="mom-section" style={{ background: 'var(--color-warning-50)', borderColor: 'var(--color-warning-200)' }}>
              <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--color-warning-700)' }}>
                Carried forward {point.carry_count} time{point.carry_count > 1 ? 's' : ''}
              </div>
            </div>
          )}

          {/* Remarks */}
          {point.remarks && (
            <div className="mom-section">
              <div className="mom-section__title">Current Remarks</div>
              <p style={{ fontSize: 12, color: 'var(--color-text-secondary)', lineHeight: 1.5 }}>{point.remarks}</p>
            </div>
          )}

          {/* Resolution */}
          {point.resolution_summary && (
            <div className="mom-section" style={{ background: 'var(--color-success-50)', borderColor: 'var(--color-success-200)' }}>
              <div className="mom-section__title" style={{ color: 'var(--color-success-700)' }}>Resolution</div>
              <p style={{ fontSize: 12, color: 'var(--color-success-700)', lineHeight: 1.5 }}>{point.resolution_summary}</p>
              {point.resolved_at && <p style={{ fontSize: 10, color: 'var(--color-text-tertiary)', marginTop: 4 }}>Resolved: {new Date(point.resolved_at).toLocaleDateString('en-GB')}</p>}
            </div>
          )}

          {/* Photos */}
          {onUploadPhoto && onDeletePhoto && (
            <div className="mom-section">
              <MomPointPhotos
                photos={point.photos || []}
                momId={point.mom_id}
                pointId={point.id}
                onUpload={onUploadPhoto}
                onDelete={onDeletePhoto}
              />
            </div>
          )}

          {/* Update timeline */}
          {point.updates && point.updates.length > 0 && (
            <div className="mom-section">
              <div className="mom-section__title">Update Timeline</div>
              <div className="point-update-timeline">
                {point.updates.map(u => {
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
                          <span>W{u.week_number} · {u.year}</span>
                          <span>{u.created_at && new Date(u.created_at).toLocaleDateString('en-GB')}</span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        <div className="mom-drawer__footer">
          <button onClick={onEdit} className="px-4 py-2 text-[13px] font-semibold text-primary-600 border border-primary-200 rounded-[var(--radius-md)] hover:bg-primary-50">
            Edit Point
          </button>
          <button onClick={onClose} className="px-4 py-2 text-[13px] font-semibold border border-border rounded-[var(--radius-md)] bg-surface hover:bg-surface-sunken">
            Close
          </button>
        </div>
      </div>
    </>
  );
}
