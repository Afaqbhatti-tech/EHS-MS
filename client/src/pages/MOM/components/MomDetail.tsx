import { useState, useEffect } from 'react';
import { X as XIcon, Pencil, ArrowLeft, ArrowRight, Plus, ChevronRight } from 'lucide-react';
import { MomWeekBadge } from './MomWeekBadge';
import { MomStatusBadge } from './MomStatusBadge';
import { PointStatusBadge } from './PointStatusBadge';
import { MomPointList } from './MomPointList';
import { MomPointForm } from './MomPointForm';
import { CarryForwardPanel } from './CarryForwardPanel';
import { MomAttachments } from './MomAttachments';
import type { MomDetail as MomDetailType, MomPointItem, PointPhoto } from '../hooks/useMom';

interface Props {
  momId: string;
  onClose: () => void;
  onEdit: () => void;
  getMomDetail: (id: string) => Promise<MomDetailType>;
  addPoint: (momId: string, data: Record<string, unknown>) => Promise<unknown>;
  updatePoint: (momId: string, pointId: number, data: Record<string, unknown>) => Promise<unknown>;
  deletePoint: (momId: string, pointId: number) => Promise<void>;
  carryForward: (momId: string, pointIds: number[]) => Promise<unknown>;
  onRefresh: () => void;
  onViewMom?: (id: string) => void;
  uploadPointPhoto?: (momId: string, pointId: number, files: File[], caption?: string) => Promise<{ photos: PointPhoto[] }>;
  deletePointPhoto?: (momId: string, pointId: number, photoId: number) => Promise<void>;
}

type Tab = 'details' | 'points' | 'open' | 'history' | 'analytics';

export function MomDetail({
  momId, onClose, onEdit, getMomDetail,
  addPoint, updatePoint, deletePoint, carryForward, onRefresh, onViewMom,
  uploadPointPhoto, deletePointPhoto,
}: Props) {
  const [mom, setMom] = useState<MomDetailType | null>(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<Tab>('details');
  const [showPointForm, setShowPointForm] = useState(false);
  const [editingPoint, setEditingPoint] = useState<MomPointItem | null>(null);
  const [showCarryPanel, setShowCarryPanel] = useState(false);

  const loadDetail = async () => {
    setLoading(true);
    try {
      const data = await getMomDetail(momId);
      setMom(data);
    } catch (err) {
      console.error('Failed to load MOM detail:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadDetail(); }, [momId]);

  const handleAddPoint = async (data: Record<string, unknown>) => {
    if (!mom) return;
    await addPoint(mom.id, data);
    await loadDetail();
  };

  const handleUpdatePoint = async (pointId: number, data: Record<string, unknown>) => {
    if (!mom) return;
    await updatePoint(mom.id, pointId, data);
    await loadDetail();
  };

  const handleDeletePoint = async (pointId: number) => {
    if (!mom) return;
    if (!confirm('Delete this point?')) return;
    await deletePoint(mom.id, pointId);
    await loadDetail();
  };

  const handleCarryForward = async (pointIds: number[]) => {
    if (!mom) return;
    await carryForward(mom.id, pointIds);
    await loadDetail();
    onRefresh();
  };

  if (loading || !mom) {
    return (
      <>
        <div className="mom-drawer-overlay" onClick={onClose} />
        <div className="mom-drawer mom-drawer--wide">
          <div className="mom-drawer__header">
            <div className="mom-skeleton" style={{ width: 200, height: 20 }} />
            <button onClick={onClose} className="p-1.5 rounded-[var(--radius-sm)] hover:bg-surface-sunken"><XIcon size={18} /></button>
          </div>
          <div className="mom-drawer__body" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <div className="mom-skeleton" style={{ width: 120, height: 20 }} />
          </div>
        </div>
      </>
    );
  }

  const openPointCount = mom.points.filter(p => ['Open', 'In Progress', 'Pending', 'Blocked'].includes(p.status)).length;
  const allUpdates = mom.points.flatMap(p => (p.updates || []).map(u => ({ ...u, point_title: p.title, point_code: p.point_code }))).sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

  // Compute live point counts from mom.points so summary always reflects latest data
  const totalPoints = mom.points.length;
  const liveOpenPoints = mom.points.filter(p => p.status === 'Open').length;
  const liveInProgressPoints = mom.points.filter(p => ['In Progress', 'Pending', 'Blocked'].includes(p.status)).length;
  const liveResolvedPoints = mom.points.filter(p => p.status === 'Resolved').length;
  const liveClosedPoints = mom.points.filter(p => p.status === 'Closed').length;

  return (
    <>
      <div className="mom-drawer-overlay" onClick={onClose} />
      <div className="mom-drawer mom-drawer--wide">
        {/* Header */}
        <div className="mom-drawer__header" style={{ flexDirection: 'column', alignItems: 'stretch', gap: 8 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span className="mom-code">{mom.mom_code}</span>
              {mom.week_number && mom.year && <MomWeekBadge week_number={mom.week_number} year={mom.year} />}
              <MomStatusBadge status={mom.status} />
            </div>
            <div style={{ display: 'flex', gap: 4 }}>
              <button onClick={onEdit} className="p-1.5 rounded-[var(--radius-sm)] text-text-tertiary hover:text-primary-600 hover:bg-primary-50" title="Edit">
                <Pencil size={16} />
              </button>
              <button onClick={onClose} className="p-1.5 rounded-[var(--radius-sm)] hover:bg-surface-sunken"><XIcon size={18} /></button>
            </div>
          </div>
          <h2 style={{ fontSize: 16, fontWeight: 700 }}>{mom.title}</h2>
          <div className="flex flex-wrap gap-x-3 gap-y-1" style={{ fontSize: 12, color: 'var(--color-text-tertiary)' }}>
            <span>{mom.meeting_date && new Date(mom.meeting_date).toLocaleDateString('en-GB', { weekday: 'short', day: '2-digit', month: 'short', year: 'numeric' })}</span>
            {mom.chaired_by && <span>Chaired by {mom.chaired_by}</span>}
            {mom.attendees && mom.attendees.length > 0 && <span>{mom.attendees.length} attendees</span>}
          </div>
        </div>

        {/* Tabs */}
        <div className="mom-tabs" style={{ paddingLeft: 20 }}>
          <button className={`mom-tab ${tab === 'details' ? 'mom-tab--active' : ''}`} onClick={() => setTab('details')}>Details</button>
          <button className={`mom-tab ${tab === 'points' ? 'mom-tab--active' : ''}`} onClick={() => setTab('points')}>
            Action Points <span className="mom-tab__count">{mom.points.length}</span>
          </button>
          <button className={`mom-tab ${tab === 'open' ? 'mom-tab--active' : ''}`} onClick={() => setTab('open')}>
            Open Items <span className="mom-tab__count">{openPointCount}</span>
          </button>
          <button className={`mom-tab ${tab === 'history' ? 'mom-tab--active' : ''}`} onClick={() => setTab('history')}>History</button>
        </div>

        {/* Body */}
        <div className="mom-drawer__body">
          {/* TAB: Details */}
          {tab === 'details' && (
            <div className="grid grid-cols-1 lg:grid-cols-[1fr_280px] gap-4">
              <div>
                {/* Meeting Info */}
                <div className="mom-section">
                  <div className="mom-section__title">Meeting Information</div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2" style={{ fontSize: 12 }}>
                    <div><span style={{ color: 'var(--color-text-tertiary)' }}>Date:</span> {mom.meeting_date && new Date(mom.meeting_date).toLocaleDateString('en-GB')}</div>
                    <div><span style={{ color: 'var(--color-text-tertiary)' }}>Time:</span> {mom.meeting_time || '—'}</div>
                    <div><span style={{ color: 'var(--color-text-tertiary)' }}>Location:</span> {mom.meeting_location || '—'}</div>
                    <div><span style={{ color: 'var(--color-text-tertiary)' }}>Type:</span> {mom.meeting_type || '—'}</div>
                    <div><span style={{ color: 'var(--color-text-tertiary)' }}>Client:</span> {mom.client_name || '—'}</div>
                    <div><span style={{ color: 'var(--color-text-tertiary)' }}>Site/Project:</span> {mom.site_project || '—'}</div>
                  </div>
                </div>

                {/* Attendees */}
                {mom.attendees && mom.attendees.length > 0 && (
                  <div className="mom-section">
                    <div className="mom-section__title">Attendees ({mom.attendees.length})</div>
                    <table className="mom-attendees-table">
                      <thead><tr><th>Name</th><th>Company</th><th>Role</th></tr></thead>
                      <tbody>
                        {mom.attendees.map((a, i) => (
                          <tr key={i}><td>{a.name}</td><td>{a.company || '—'}</td><td>{a.role || '—'}</td></tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}

                {/* Summary */}
                {mom.summary && (
                  <div className="mom-section">
                    <div className="mom-section__title">Meeting Summary</div>
                    <p style={{ fontSize: 12, color: 'var(--color-text-secondary)', lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>{mom.summary}</p>
                  </div>
                )}

                {/* Attachments */}
                <div className="mom-section">
                  <div className="mom-section__title">Attachments</div>
                  <MomAttachments attachments={mom.attachment_urls || []} />
                </div>
              </div>

              {/* Right column */}
              <div>
                {/* Week nav */}
                {(mom.previous_mom || mom.next_mom) && (
                  <div className="mom-week-nav">
                    {mom.previous_mom ? (
                      <button className="mom-week-nav__link" onClick={() => onViewMom?.(mom.previous_mom!.id)}>
                        <ArrowLeft size={14} /> W{mom.previous_mom.week_number}
                      </button>
                    ) : <span />}
                    {mom.next_mom ? (
                      <button className="mom-week-nav__link" onClick={() => onViewMom?.(mom.next_mom!.id)}>
                        W{mom.next_mom.week_number} <ArrowRight size={14} />
                      </button>
                    ) : <span />}
                  </div>
                )}

                {/* Previous MOM summary */}
                {mom.previous_mom && (
                  <div className="mom-section" style={{ fontSize: 12 }}>
                    <div className="mom-section__title">Previous Week</div>
                    <p style={{ color: 'var(--color-text-secondary)' }}>
                      Week {mom.previous_mom.week_number} had {mom.previous_mom.total_points ?? 0} points,
                      {' '}{mom.previous_mom.open_points ?? 0} still open
                    </p>
                  </div>
                )}

                {/* Stats summary */}
                <div className="mom-section">
                  <div className="mom-section__title">Point Summary</div>
                  {[
                    { label: 'Open', count: liveOpenPoints, total: totalPoints, color: '#DC2626' },
                    { label: 'In Progress', count: liveInProgressPoints, total: totalPoints, color: '#0284C7' },
                    { label: 'Resolved', count: liveResolvedPoints, total: totalPoints, color: '#16A34A' },
                    { label: 'Closed', count: liveClosedPoints, total: totalPoints, color: '#9CA3AF' },
                  ].map(s => (
                    <div key={s.label} style={{ marginBottom: 8 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, marginBottom: 2 }}>
                        <span style={{ color: 'var(--color-text-tertiary)' }}>{s.label}</span>
                        <span style={{ fontWeight: 700 }}>{s.count}/{s.total || 0}</span>
                      </div>
                      <div style={{ height: 4, background: 'var(--color-border)', borderRadius: 'var(--radius-full)', overflow: 'hidden' }}>
                        <div style={{ height: '100%', width: `${s.total ? (s.count / s.total) * 100 : 0}%`, background: s.color, borderRadius: 'var(--radius-full)' }} />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* TAB: Action Points */}
          {tab === 'points' && (
            <div>
              {/* Carry Forward Banner */}
              {mom.previous_mom_open_points && mom.previous_mom_open_points.length > 0 && (
                <div className="mom-carry-banner">
                  <div className="mom-carry-banner__text">
                    Week {mom.previous_mom?.week_number} had {mom.previous_mom_open_points.length} unresolved points
                  </div>
                  <button onClick={() => setShowCarryPanel(true)}
                    className="inline-flex items-center gap-1 px-3 py-1.5 text-[12px] font-semibold text-warning-700 bg-warning-100 rounded-[var(--radius-md)] hover:bg-warning-200">
                    View & Carry Forward <ChevronRight size={14} />
                  </button>
                </div>
              )}

              {/* Stats */}
              <div className="mom-stat-pills flex-wrap" style={{ marginBottom: 12 }}>
                <span className="mom-stat-pill mom-stat-pill--total">Total: {totalPoints}</span>
                <span className="mom-stat-pill mom-stat-pill--open">Open: {liveOpenPoints}</span>
                <span className="mom-stat-pill" style={{ background: '#DBEAFE', color: '#1E40AF' }}>In Progress: {liveInProgressPoints}</span>
                <span className="mom-stat-pill" style={{ background: '#D1FAE5', color: '#065F46' }}>Resolved: {liveResolvedPoints}</span>
                {mom.overdue_points > 0 && <span className="mom-stat-pill mom-stat-pill--overdue">Overdue: {mom.overdue_points}</span>}
              </div>

              <button onClick={() => { setEditingPoint(null); setShowPointForm(true); }}
                className="inline-flex items-center gap-1.5 px-4 py-2 text-[13px] font-semibold text-white bg-primary-600 rounded-[var(--radius-md)] hover:bg-primary-700 mb-3">
                <Plus size={16} /> Add Point
              </button>

              <MomPointList
                points={mom.points}
                onUpdatePoint={handleUpdatePoint}
                onEditPoint={p => { setEditingPoint(p); setShowPointForm(true); }}
                onDeletePoint={handleDeletePoint}
                onUploadPhoto={uploadPointPhoto}
                onDeletePhoto={deletePointPhoto}
              />
            </div>
          )}

          {/* TAB: Open Items */}
          {tab === 'open' && (
            <div>
              <div style={{ marginBottom: 12, fontSize: 13, color: 'var(--color-text-secondary)' }}>
                Showing all unresolved points from this MOM.
              </div>
              {mom.points.filter(p => ['Open', 'In Progress', 'Pending', 'Blocked'].includes(p.status)).length === 0 ? (
                <div style={{ textAlign: 'center', padding: 32, color: 'var(--color-text-tertiary)', fontSize: 13 }}>
                  All points are resolved or closed.
                </div>
              ) : (
                mom.points.filter(p => ['Open', 'In Progress', 'Pending', 'Blocked'].includes(p.status)).map(p => (
                  <div key={p.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-sm)', marginBottom: 6, borderLeft: `3px solid ${p.is_overdue ? '#DC2626' : p.status === 'In Progress' ? '#0284C7' : '#F59E0B'}` }}>
                    <div style={{ flex: 1 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <PointStatusBadge status={p.status} size="sm" />
                        <span style={{ fontWeight: 600, fontSize: 13 }}>{p.title}</span>
                      </div>
                      <div style={{ fontSize: 11, color: 'var(--color-text-tertiary)', display: 'flex', gap: 8, marginTop: 2, marginLeft: 2 }}>
                        <span>{p.category}</span>
                        {p.assigned_to && <span>{p.assigned_to}</span>}
                        {p.carry_count > 0 && <span className="carry-badge">Carried {p.carry_count}x</span>}
                        {p.is_overdue && <span style={{ color: '#DC2626', fontWeight: 700 }}>{p.days_overdue}d overdue</span>}
                      </div>
                    </div>
                    <select
                      value={p.status}
                      onChange={async (e) => {
                        await handleUpdatePoint(p.id, { status: e.target.value, update_note: `Status changed to ${e.target.value}` });
                      }}
                      className="px-2 py-1 text-[11px] border border-border rounded-[var(--radius-sm)] bg-surface focus:outline-none"
                      style={{ minWidth: 90 }}
                    >
                      {['Open', 'In Progress', 'Pending', 'Blocked', 'Resolved', 'Closed'].map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
                  </div>
                ))
              )}
            </div>
          )}

          {/* TAB: History */}
          {tab === 'history' && (
            <div>
              {allUpdates.length === 0 ? (
                <div style={{ textAlign: 'center', padding: 32, color: 'var(--color-text-tertiary)', fontSize: 13 }}>
                  No update history yet.
                </div>
              ) : (
                <div className="point-update-timeline">
                  {allUpdates.map((u, i) => {
                    const dotCls = (u.new_status || '').toLowerCase().replace(/\s+/g, '-');
                    return (
                      <div key={i} className="point-update-item">
                        <div className={`point-update-item__dot point-update-item__dot--${dotCls || 'default'}`} />
                        <div className="point-update-item__content">
                          <div style={{ fontWeight: 600, fontSize: 12, marginBottom: 2, color: 'var(--color-text-primary)' }}>
                            {(u as any).point_title}
                            <span className="mom-code" style={{ marginLeft: 6, fontSize: 10 }}>{(u as any).point_code}</span>
                          </div>
                          {u.old_status && u.new_status && u.old_status !== u.new_status && (
                            <div className="point-update-item__status-change">
                              <PointStatusBadge status={u.old_status} size="sm" /> <ArrowRight size={12} /> <PointStatusBadge status={u.new_status} size="sm" />
                            </div>
                          )}
                          <div style={{ color: 'var(--color-text-secondary)', fontSize: 12 }}>{u.update_note}</div>
                          <div style={{ fontSize: 10, color: 'var(--color-text-tertiary)', marginTop: 4 }}>
                            {u.updated_by_name} · {u.created_at && new Date(u.created_at).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Point Form Modal */}
      {showPointForm && (
        <MomPointForm
          point={editingPoint}
          onSubmit={async (data) => {
            if (editingPoint) {
              await handleUpdatePoint(editingPoint.id, data);
            } else {
              await handleAddPoint(data);
            }
          }}
          onClose={() => { setShowPointForm(false); setEditingPoint(null); }}
        />
      )}

      {/* Carry Forward Panel */}
      {showCarryPanel && mom.previous_mom_open_points && (
        <CarryForwardPanel
          points={mom.previous_mom_open_points}
          fromWeek={mom.previous_mom?.week_number || 0}
          onCarry={handleCarryForward}
          onClose={() => setShowCarryPanel(false)}
        />
      )}
    </>
  );
}
