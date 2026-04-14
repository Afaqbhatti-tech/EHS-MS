import { useState, useEffect } from 'react';
import { X as XIcon, Pencil, Calendar, MapPin, Building2, User, ShieldCheck, Clock, FileText, AlertTriangle, ChevronDown, ChevronRight, Plus, ArrowRight, CheckCircle, ExternalLink } from 'lucide-react';
import { PermitTypeBadge, PermitStatusBadge } from './PermitTypeBadge';
import { getPermitType } from '../config/permitTypes';
import { format } from 'date-fns';
import { api } from '../../../services/api';
import type { Permit } from '../hooks/usePermits';

interface Props {
  permit: Permit;
  onClose: () => void;
  onEdit: () => void;
}

function formatDate(dateStr: string | null) {
  if (!dateStr) return '\u2014';
  try { return format(new Date(dateStr), 'dd MMM yyyy'); } catch { return dateStr; }
}

function formatDateTime(dateStr: string | null) {
  if (!dateStr) return '\u2014';
  try { return format(new Date(dateStr), 'dd MMM yyyy, HH:mm'); } catch { return dateStr; }
}

function DetailRow({ label, value, icon: Icon }: { label: string; value: string | null | undefined; icon?: React.ComponentType<{ size: number; className?: string }> }) {
  return (
    <div className="flex items-start gap-3 py-2.5">
      {Icon && <Icon size={15} className="text-text-tertiary mt-0.5 shrink-0" />}
      <div className="min-w-0">
        <p className="text-[11px] font-medium text-text-tertiary uppercase tracking-wider">{label}</p>
        <p className="text-[13px] text-text-primary mt-0.5">{value || '\u2014'}</p>
      </div>
    </div>
  );
}

interface AmendmentSummary {
  id: string;
  amendment_code: string;
  revision_number: number;
  amendment_type: string;
  amendment_category: string;
  status: string;
  is_active_revision: boolean;
  requested_by: string | null;
  request_date: string | null;
  reviewed_by: string | null;
  reviewed_at: string | null;
  effective_from: string | null;
  changes_count: number;
}

interface PermitHistoryResponse {
  permit: {
    id: string;
    ref_number: string;
    current_revision_number: number;
    has_active_amendment: boolean;
    amendment_count: number;
  };
  amendments: AmendmentSummary[];
}

function PermitAmendmentsSection({ permitId }: { permitId: string }) {
  const [data, setData] = useState<PermitHistoryResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        setLoading(true);
        const res = await api.get<PermitHistoryResponse>(`/permit-amendments/permit/${permitId}/history`);
        if (!cancelled) setData(res);
      } catch {
        // non-critical section
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [permitId]);

  if (loading) {
    return (
      <div className="pt-4 border-t border-border">
        <div className="h-4 bg-surface-sunken rounded animate-pulse w-48 mb-2" />
        <div className="h-3 bg-surface-sunken rounded animate-pulse w-32" />
      </div>
    );
  }

  const amendments = data?.amendments || [];
  const permitInfo = data?.permit;
  const activeAmd = amendments.find(a => a.is_active_revision);
  const count = amendments.length;

  const statusColors: Record<string, { bg: string; text: string }> = {
    Draft: { bg: '#F3F4F6', text: '#374151' },
    Submitted: { bg: '#DBEAFE', text: '#1E40AF' },
    'Under Review': { bg: '#FFF7ED', text: '#C2410C' },
    Approved: { bg: '#D1FAE5', text: '#065F46' },
    Rejected: { bg: '#FEE2E2', text: '#991B1B' },
    'Approved with Comments': { bg: '#FFF7ED', text: '#C2410C' },
    Cancelled: { bg: '#F3F4F6', text: '#6B7280' },
  };

  return (
    <div className="pt-4 border-t border-border">
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <button
          onClick={() => setExpanded(!expanded)}
          className="flex items-center gap-2 text-[12px] font-semibold text-text-primary hover:text-primary-600 transition-colors"
        >
          {expanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
          <FileText size={14} className="text-text-tertiary" />
          Amendments
          {count > 0 && (
            <span className="inline-flex items-center justify-center px-1.5 py-0.5 text-[10px] font-semibold rounded-full bg-primary-100 text-primary-700">
              {count}
            </span>
          )}
          {permitInfo && permitInfo.current_revision_number > 0 && (
            <span
              style={{
                fontSize: 10, fontFamily: 'monospace', fontWeight: 700,
                padding: '1px 6px', borderRadius: 4,
                background: '#16A34A', color: '#fff',
              }}
            >
              Rev. {permitInfo.current_revision_number}
            </span>
          )}
        </button>
        <a
          href="/permit-amendments"
          className="inline-flex items-center gap-1 text-[10px] font-medium text-primary-600 hover:text-primary-700"
        >
          <Plus size={11} />
          Raise Amendment
        </a>
      </div>

      {/* Active Amendment Banner */}
      {activeAmd && (
        <div
          style={{
            background: 'rgba(22,163,74,0.06)', border: '1px solid var(--color-success-200)',
            borderRadius: 'var(--radius-md)', padding: '8px 12px', marginBottom: 8,
          }}
          className="flex items-center justify-between"
        >
          <div className="flex items-center gap-2">
            <CheckCircle size={13} style={{ color: 'var(--color-success-600)' }} />
            <span className="text-[11px] font-medium text-success-700">
              Active Revision: Rev.{activeAmd.revision_number} — {activeAmd.amendment_code}
            </span>
            {activeAmd.reviewed_at && (
              <span className="text-[10px] text-text-tertiary">
                Approved {formatDate(activeAmd.reviewed_at)}
              </span>
            )}
          </div>
        </div>
      )}

      {/* Expanded: Amendment List */}
      {expanded && (
        <div className="space-y-2 mt-2">
          {amendments.length === 0 ? (
            <p className="text-[11px] text-text-tertiary py-2">No amendments for this permit</p>
          ) : (
            amendments.slice(0, 5).map(amd => {
              const sc = statusColors[amd.status] || { bg: '#F3F4F6', text: '#6B7280' };
              return (
                <div
                  key={amd.id}
                  className="flex items-center gap-3 py-2 px-3 rounded-[var(--radius-sm)] bg-surface-sunken hover:bg-surface transition-colors"
                >
                  <span className="text-[11px] font-mono font-medium text-text-tertiary shrink-0">
                    {amd.amendment_code}
                  </span>
                  <span
                    style={{
                      fontSize: 9, fontFamily: 'monospace', fontWeight: 700,
                      padding: '1px 5px', borderRadius: 3,
                      background: amd.is_active_revision ? '#16A34A' : '#F0FDF4',
                      color: amd.is_active_revision ? '#fff' : '#15803D',
                    }}
                  >
                    Rev.{amd.revision_number}
                  </span>
                  <span
                    style={{
                      fontSize: 10, fontWeight: 500, padding: '1px 6px',
                      borderRadius: 4, background: sc.bg, color: sc.text,
                    }}
                  >
                    {amd.status}
                  </span>
                  <span className="text-[11px] text-text-secondary truncate flex-1">
                    {amd.amendment_type}
                  </span>
                  <span className="text-[10px] text-text-tertiary shrink-0">
                    {amd.changes_count} change{amd.changes_count !== 1 ? 's' : ''}
                  </span>
                </div>
              );
            })
          )}
          {amendments.length > 5 && (
            <a
              href="/permit-amendments"
              className="flex items-center gap-1 text-[11px] font-medium text-primary-600 hover:text-primary-700 pt-1"
            >
              View all {count} amendments <ExternalLink size={10} />
            </a>
          )}
        </div>
      )}
    </div>
  );
}

export function PermitDetail({ permit, onClose, onEdit }: Props) {
  const p = permit;
  const typeConfig = getPermitType(p.permit_type);
  const apiBase = (import.meta.env.VITE_API_URL?.replace('/api', '') || 'http://localhost:8000') + '/storage';

  return (
    <>
      <div className="drawer-overlay" onClick={onClose} />
      <div className="drawer-panel">
        {/* Header */}
        <div
          className="sticky top-0 bg-surface z-10 border-b border-border px-6 py-4"
          style={typeConfig ? { borderTop: `4px solid ${typeConfig.color}` } : undefined}
        >
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                <span className="text-[13px] font-mono font-medium text-text-tertiary">{p.permit_number}</span>
                <PermitStatusBadge status={p.status} />
              </div>
              <PermitTypeBadge type={p.permit_type} size="md" />
              <h2 className="text-[16px] font-bold text-text-primary mt-2 leading-snug">{p.title}</h2>
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
            <DetailRow label="Permit Date" value={formatDate(p.permit_date)} icon={Calendar} />
            <DetailRow label="End Date" value={formatDate(p.permit_date_end)} icon={Calendar} />
            {(p.start_time || p.end_time) && (
              <>
                <DetailRow label="Start Time" value={p.start_time} icon={Clock} />
                <DetailRow label="End Time" value={p.end_time} icon={Clock} />
              </>
            )}
            <DetailRow label="Area / Zone" value={p.area} icon={MapPin} />
            <DetailRow label="Activity Type" value={p.activity_type} icon={FileText} />
            <DetailRow label="Contractor" value={p.contractor} icon={Building2} />
            <DetailRow label="Issued To" value={p.issued_to} icon={User} />
            <DetailRow label="Approved By" value={p.approved_by} icon={ShieldCheck} />
            {p.approved_at && <DetailRow label="Approved At" value={formatDateTime(p.approved_at)} icon={Calendar} />}
          </div>

          {/* Description */}
          {p.description && (
            <div>
              <h3 className="text-[12px] font-semibold text-text-tertiary uppercase tracking-wider mb-2">Description</h3>
              <p className="text-[13px] text-text-primary leading-relaxed bg-surface-sunken rounded-[var(--radius-md)] p-4 whitespace-pre-wrap">
                {p.description}
              </p>
            </div>
          )}

          {/* Safety Measures */}
          {p.safety_measures && (
            <div>
              <h3 className="text-[12px] font-semibold text-text-tertiary uppercase tracking-wider mb-2 flex items-center gap-1.5">
                <AlertTriangle size={13} className="text-warning-600" />
                Safety Measures
              </h3>
              <p className="text-[13px] text-text-primary leading-relaxed bg-warning-50/50 border border-warning-100 rounded-[var(--radius-md)] p-4 whitespace-pre-wrap">
                {p.safety_measures}
              </p>
            </div>
          )}

          {/* PPE Requirements */}
          {p.ppe_requirements && (
            <div>
              <h3 className="text-[12px] font-semibold text-text-tertiary uppercase tracking-wider mb-2">PPE Requirements</h3>
              <p className="text-[13px] text-text-primary leading-relaxed bg-surface-sunken rounded-[var(--radius-md)] p-4 whitespace-pre-wrap">
                {p.ppe_requirements}
              </p>
            </div>
          )}

          {/* Notes */}
          {p.notes && (
            <div>
              <h3 className="text-[12px] font-semibold text-text-tertiary uppercase tracking-wider mb-2">Notes</h3>
              <p className="text-[13px] text-text-primary leading-relaxed bg-surface-sunken rounded-[var(--radius-md)] p-4 whitespace-pre-wrap">
                {p.notes}
              </p>
            </div>
          )}

          {/* Attachments */}
          {p.attachments?.length > 0 && (
            <div>
              <h3 className="text-[12px] font-semibold text-text-tertiary uppercase tracking-wider mb-3">Attachments</h3>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {p.attachments.map((url, i) => {
                  const fullUrl = `${apiBase}/${url}`;
                  return (
                    <a key={i} href={fullUrl} target="_blank" rel="noopener noreferrer">
                      <img
                        src={fullUrl}
                        alt={`Attachment ${i + 1}`}
                        className="w-full h-[100px] object-cover rounded-[var(--radius-md)] border border-border hover:opacity-80 transition-opacity"
                      />
                    </a>
                  );
                })}
              </div>
            </div>
          )}

          {/* Primary Image */}
          {p.image_url && !p.attachments?.length && (
            <div>
              <h3 className="text-[12px] font-semibold text-text-tertiary uppercase tracking-wider mb-3">Permit Image</h3>
              <a href={p.image_url} target="_blank" rel="noopener noreferrer">
                <img
                  src={p.image_url}
                  alt="Permit"
                  className="max-w-full max-h-[300px] object-contain rounded-[var(--radius-md)] border border-border hover:opacity-80 transition-opacity cursor-pointer"
                />
              </a>
            </div>
          )}

          {/* Amendments Section */}
          <PermitAmendmentsSection permitId={p.id} />

          {/* Audit Trail */}
          <div className="pt-4 border-t border-border">
            <div className="flex items-center gap-1 text-[11px] text-text-tertiary">
              <Clock size={12} />
              <span>Created {formatDateTime(p.created_at)}</span>
              {p.updated_at !== p.created_at && (
                <span className="ml-2">| Updated {formatDateTime(p.updated_at)}</span>
              )}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
