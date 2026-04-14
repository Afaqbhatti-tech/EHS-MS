import { X as XIcon, Pencil, Calendar, MapPin, Building2, User, ShieldCheck, Clock, Video } from 'lucide-react';
import { StatusBadge, PriorityBadge } from './StatusBadge';
import { format } from 'date-fns';
import type { Observation } from '../hooks/useObservations';

interface Props {
  observation: Observation;
  onClose: () => void;
  onEdit: () => void;
}

function formatDate(dateStr: string | null) {
  if (!dateStr) return '—';
  try { return format(new Date(dateStr), 'dd MMM yyyy'); } catch { return dateStr; }
}

function formatDateTime(dateStr: string | null) {
  if (!dateStr) return '—';
  try { return format(new Date(dateStr), 'dd MMM yyyy, HH:mm'); } catch { return dateStr; }
}

function DetailRow({ label, value, icon: Icon }: { label: string; value: string | null | undefined; icon?: React.ComponentType<{ size: number; className?: string }> }) {
  return (
    <div className="flex items-start gap-3 py-2.5">
      {Icon && <Icon size={15} className="text-text-tertiary mt-0.5 shrink-0" />}
      <div className="min-w-0">
        <p className="text-[11px] font-medium text-text-tertiary uppercase tracking-wider">{label}</p>
        <p className="text-[13px] text-text-primary mt-0.5">{value || '—'}</p>
      </div>
    </div>
  );
}

export function ObservationDetail({ observation, onClose, onEdit }: Props) {
  const obs = observation;
  const apiBase = (import.meta.env.VITE_API_URL?.replace('/api', '') || 'http://localhost:8000') + '/storage';

  return (
    <>
      <div className="drawer-overlay" onClick={onClose} />
      <div className="drawer-panel">
        {/* Header */}
        <div className="sticky top-0 bg-surface z-10 border-b border-border px-6 py-4" style={{ borderTop: '4px solid var(--color-primary-500)' }}>
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2 mb-1 flex-wrap">
                <span className="text-[13px] font-mono font-medium text-text-tertiary">{obs.observation_id}</span>
                <StatusBadge status={obs.status} />
                <PriorityBadge priority={obs.priority} />
              </div>
              <p className="text-[11px] text-text-tertiary">
                Observed on {formatDateTime(obs.observation_date)}
              </p>
            </div>
            <div className="flex items-center gap-1 shrink-0">
              <button onClick={onEdit} className="p-2 rounded-[var(--radius-sm)] text-text-tertiary hover:text-warning-600 hover:bg-warning-50 transition-colors" title="Edit">
                <Pencil size={16} />
              </button>
              <button onClick={onClose} className="p-2 rounded-[var(--radius-sm)] text-text-tertiary hover:text-text-primary hover:bg-surface-sunken transition-colors">
                <XIcon size={18} />
              </button>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Info Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-1 bg-surface-sunken rounded-[var(--radius-md)] p-4">
            <DetailRow label="Area / Zone" value={obs.area} icon={MapPin} />
            <DetailRow label="Contractor" value={obs.contractor} icon={Building2} />
            <DetailRow label="Category" value={obs.category} />
            <DetailRow label="Observation Type" value={obs.observation_type} />
            <DetailRow label="Reporting Officer" value={obs.reporting_officer_name} icon={User} />
            <DetailRow label="Responsible Supervisor" value={obs.responsible_supervisor} icon={User} />
            <DetailRow label="Target Date" value={formatDate(obs.proposed_rectification_date)} icon={Calendar} />
            <DetailRow label="Verified By" value={obs.verified_by} icon={ShieldCheck} />
            {obs.verified_date && <DetailRow label="Verified Date" value={formatDate(obs.verified_date)} icon={Calendar} />}
            <DetailRow label="Escalation" value={obs.escalation_required ? 'Yes' : 'No'} />
          </div>

          {/* Description */}
          <div>
            <h3 className="text-[12px] font-semibold text-text-tertiary uppercase tracking-wider mb-2">Description</h3>
            <p className="text-[13px] text-text-primary leading-relaxed bg-surface-sunken rounded-[var(--radius-md)] p-4 whitespace-pre-wrap">
              {obs.description || '—'}
            </p>
          </div>

          {/* Immediate Action */}
          {obs.immediate_action && (
            <div>
              <h3 className="text-[12px] font-semibold text-text-tertiary uppercase tracking-wider mb-2">Immediate Action Taken</h3>
              <p className="text-[13px] text-text-primary leading-relaxed bg-surface-sunken rounded-[var(--radius-md)] p-4 whitespace-pre-wrap">
                {obs.immediate_action}
              </p>
            </div>
          )}

          {/* Photos & Videos */}
          {(obs.before_photos?.length > 0 || obs.after_photos?.length > 0) && (
            <div>
              <h3 className="text-[12px] font-semibold text-text-tertiary uppercase tracking-wider mb-3">Attachments</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <p className="text-[11px] font-medium text-text-tertiary mb-2">Before Rectification</p>
                  {obs.before_photos?.length > 0 ? (
                    <div className="space-y-2">
                      {obs.before_photos.map((url, i) => {
                        const fullUrl = `${apiBase}/${url}`;
                        const isVid = /\.(mp4|mov|avi|webm|3gp)$/i.test(url);
                        return isVid ? (
                          <div key={i} className="relative rounded-[var(--radius-md)] border border-border overflow-hidden">
                            <video
                              src={fullUrl}
                              controls
                              preload="metadata"
                              className="w-full h-[150px] object-cover bg-black"
                            />
                            <div className="absolute top-2 left-2 bg-black/60 text-white text-[10px] font-semibold px-2 py-0.5 rounded-[4px] flex items-center gap-1 pointer-events-none">
                              <Video size={11} /> Video
                            </div>
                          </div>
                        ) : (
                          <a key={i} href={fullUrl} target="_blank" rel="noopener noreferrer">
                            <img
                              src={fullUrl}
                              alt={`Before ${i + 1}`}
                              className="w-full h-[150px] object-cover rounded-[var(--radius-md)] border border-border hover:opacity-80 transition-opacity"
                            />
                          </a>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="h-[150px] bg-surface-sunken rounded-[var(--radius-md)] flex items-center justify-center text-[12px] text-text-tertiary">No media</div>
                  )}
                </div>
                <div>
                  <p className="text-[11px] font-medium text-text-tertiary mb-2">After Rectification</p>
                  {obs.after_photos?.length > 0 ? (
                    <div className="space-y-2">
                      {obs.after_photos.map((url, i) => {
                        const fullUrl = `${apiBase}/${url}`;
                        const isVid = /\.(mp4|mov|avi|webm|3gp)$/i.test(url);
                        return isVid ? (
                          <div key={i} className="relative rounded-[var(--radius-md)] border border-border overflow-hidden">
                            <video
                              src={fullUrl}
                              controls
                              preload="metadata"
                              className="w-full h-[150px] object-cover bg-black"
                            />
                            <div className="absolute top-2 left-2 bg-black/60 text-white text-[10px] font-semibold px-2 py-0.5 rounded-[4px] flex items-center gap-1 pointer-events-none">
                              <Video size={11} /> Video
                            </div>
                          </div>
                        ) : (
                          <a key={i} href={fullUrl} target="_blank" rel="noopener noreferrer">
                            <img
                              src={fullUrl}
                              alt={`After ${i + 1}`}
                              className="w-full h-[150px] object-cover rounded-[var(--radius-md)] border border-border hover:opacity-80 transition-opacity"
                            />
                          </a>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="h-[150px] bg-surface-sunken rounded-[var(--radius-md)] flex items-center justify-center text-[12px] text-text-tertiary">No media</div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Audit Trail */}
          <div className="pt-4 border-t border-border">
            <div className="flex items-center gap-1 text-[11px] text-text-tertiary">
              <Clock size={12} />
              <span>Created {formatDateTime(obs.created_at)}</span>
              {obs.updated_at !== obs.created_at && (
                <span className="ml-2">| Updated {formatDateTime(obs.updated_at)}</span>
              )}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
