import { useState } from 'react';
import {
  X, Shield, FileText, Download, Clock, MapPin, User, CheckCircle,
  AlertTriangle, Radio, Megaphone, Users, Wrench, Calendar, ExternalLink,
  Loader2, ChevronDown, ChevronUp,
} from 'lucide-react';
import { StatusBadge } from '../../../components/ui/Badge';
import type { Erp } from '../useErps';

// ─── Constants ───────────────────────────────────────

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:8000/api';
const STORAGE_BASE = API_BASE.replace('/api', '') + '/storage/';

type BadgeVariant = 'success' | 'warning' | 'danger' | 'info' | 'neutral';

const RISK_COLORS: Record<string, string> = {
  Low: 'bg-green-100 text-green-700',
  Medium: 'bg-amber-100 text-amber-700',
  High: 'bg-red-100 text-red-700',
  Critical: 'bg-red-200 text-red-800 font-bold',
};

// Extended Erp type for detail endpoint fields not in the list type
interface ErpDetail extends Erp {
  project?: string | null;
  area?: string | null;
  zone?: string | null;
  department?: string | null;
  purpose?: string | null;
  trigger_conditions?: string | null;
  incident_controller?: string | null;
  emergency_coordinator?: string | null;
  alarm_method?: string | null;
  assembly_point?: string | null;
  muster_point?: string | null;
  communication_method?: string | null;
  radio_channel?: string | null;
  review_frequency?: string | null;
  revision_number?: number | string | null;
  file_path?: string | null;
  drawings_path?: string | null;
  sop_path?: string | null;
  approval_date?: string | null;
  recent_drills?: Array<{
    id: string;
    drill_code: string;
    title: string;
    status: string;
    planned_date: string;
  }>;
  logs?: Array<{
    id: string;
    action_type: string;
    description: string | null;
    old_value: string | null;
    new_value: string | null;
    user_name: string | null;
    created_at: string;
  }>;
}

// ─── Props ───────────────────────────────────────────

interface Props {
  erp: Erp | null;
  isLoading: boolean;
  onClose: () => void;
  onApprove?: (id: number) => Promise<void>;
  onEdit?: () => void;
}

// ─── Component ───────────────────────────────────────

export default function ErpDetailDrawer({ erp: rawErp, isLoading, onClose, onApprove, onEdit }: Props) {
  const erp = rawErp as ErpDetail | null;
  const [isApproving, setIsApproving] = useState(false);
  const [showLogs, setShowLogs] = useState(false);

  const handleApprove = async () => {
    if (!erp || !onApprove) return;
    setIsApproving(true);
    try {
      await onApprove(Number(erp.id));
    } finally {
      setIsApproving(false);
    }
  };

  const canApprove = erp && onApprove && (erp.status === 'Draft' || erp.status === 'Under Review');

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/30 backdrop-blur-[1px]" onClick={onClose} />

      {/* Panel */}
      <div className="relative w-full sm:w-[640px] bg-surface h-full flex flex-col shadow-2xl overflow-hidden">
        {/* ── Loading state ───────────────────────── */}
        {isLoading && (
          <div className="flex-1 flex items-center justify-center">
            <Loader2 size={28} className="animate-spin text-primary-500" />
          </div>
        )}

        {/* ── Empty state ────────────────────────── */}
        {!isLoading && !erp && (
          <div className="flex-1 flex flex-col items-center justify-center gap-2 text-text-tertiary">
            <Shield size={32} />
            <p className="text-sm">ERP not found</p>
            <button onClick={onClose} className="text-xs text-primary-600 hover:underline mt-2">Close</button>
          </div>
        )}

        {/* ── Populated state ────────────────────── */}
        {!isLoading && erp && (
          <>
            {/* Header */}
            <div className="px-6 py-4 border-b border-border bg-surface shrink-0">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  {/* Code + Status */}
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-mono text-[12px] text-text-secondary bg-surface-sunken px-2 py-0.5 rounded-[var(--radius-sm)]">
                      {erp.erp_code}
                    </span>
                    <StatusBadge status={erp.status} />
                    {erp.risk_level && (
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium ${RISK_COLORS[erp.risk_level] ?? 'bg-gray-100 text-gray-600'}`}>
                        {erp.risk_level}
                      </span>
                    )}
                  </div>

                  {/* Title */}
                  <h2 className="text-[18px] font-bold text-text-primary mt-2 leading-tight">
                    {erp.title}
                  </h2>

                  {/* Version + Revision */}
                  <div className="flex items-center gap-3 mt-1.5 text-[12px] text-text-secondary">
                    {erp.version != null && (
                      <span>Version {erp.version}</span>
                    )}
                    {erp.revision_number != null && (
                      <span className="inline-flex items-center px-1.5 py-0.5 rounded bg-surface-sunken text-[11px] font-medium text-text-secondary">
                        Rev. {erp.revision_number}
                      </span>
                    )}
                    {erp.erp_type && (
                      <span className="text-text-tertiary">{erp.erp_type}</span>
                    )}
                  </div>
                </div>

                <button
                  onClick={onClose}
                  className="p-2 rounded-[var(--radius-sm)] text-text-tertiary hover:bg-surface-sunken hover:text-text-secondary transition-colors shrink-0"
                >
                  <XIcon size={18} />
                </button>
              </div>

              {/* Action buttons */}
              <div className="flex items-center gap-2 mt-3">
                {canApprove && (
                  <button
                    onClick={handleApprove}
                    disabled={isApproving}
                    className="px-3 py-1.5 text-[12px] font-medium text-white bg-green-600 rounded-[var(--radius-sm)] hover:bg-green-700 disabled:opacity-50 transition-colors inline-flex items-center gap-1.5"
                  >
                    {isApproving ? <Loader2 size={12} className="animate-spin" /> : <CheckCircle size={12} />}
                    Approve
                  </button>
                )}
                {onEdit && (
                  <button
                    onClick={onEdit}
                    className="px-3 py-1.5 text-[12px] font-medium text-text-secondary bg-surface border border-border rounded-[var(--radius-sm)] hover:bg-surface-sunken transition-colors"
                  >
                    Edit
                  </button>
                )}
              </div>
            </div>

            {/* Body - scrollable */}
            <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain px-6 py-5 space-y-4">
              {/* ── Planning Details ──────────────── */}
              <Section title="Planning Details" icon={<Shield size={14} />}>
                <Grid>
                  <Field label="Type" value={erp.erp_type} />
                  <Field label="Risk Level" value={erp.risk_level} />
                  <Field label="Site" value={erp.site} />
                  <Field label="Project" value={erp.project} />
                  <Field label="Area" value={erp.area} />
                  <Field label="Zone" value={erp.zone} />
                  <Field label="Department" value={erp.department} />
                </Grid>
              </Section>

              {/* ── Scenario ─────────────────────── */}
              {(erp.description || erp.scope || erp.purpose || erp.trigger_conditions) && (
                <Section title="Scenario" icon={<AlertTriangle size={14} />}>
                  {erp.description && (
                    <div className="mb-3">
                      <FieldLabel>Scenario Description</FieldLabel>
                      <p className="text-[13px] text-text-primary whitespace-pre-wrap">{erp.description}</p>
                    </div>
                  )}
                  {erp.scope && (
                    <div className="mb-3">
                      <FieldLabel>Scope</FieldLabel>
                      <p className="text-[13px] text-text-primary whitespace-pre-wrap">{erp.scope}</p>
                    </div>
                  )}
                  {erp.purpose && (
                    <div className="mb-3">
                      <FieldLabel>Purpose</FieldLabel>
                      <p className="text-[13px] text-text-primary whitespace-pre-wrap">{erp.purpose}</p>
                    </div>
                  )}
                  {erp.trigger_conditions && (
                    <div>
                      <FieldLabel>Trigger Conditions</FieldLabel>
                      <p className="text-[13px] text-text-primary whitespace-pre-wrap">{erp.trigger_conditions}</p>
                    </div>
                  )}
                </Section>
              )}

              {/* ── Response Structure ───────────── */}
              <Section title="Response Structure" icon={<Radio size={14} />}>
                <Grid>
                  <Field label="Incident Controller" value={erp.incident_controller} />
                  <Field label="Emergency Coordinator" value={erp.emergency_coordinator} />
                  <Field label="Alarm Method" value={erp.alarm_method} />
                  <Field label="Assembly Point" value={erp.assembly_point} />
                  <Field label="Muster Point" value={erp.muster_point} />
                  <Field label="Communication Method" value={erp.communication_method} />
                  <Field label="Radio Channel" value={erp.radio_channel} />
                </Grid>

                {/* Emergency Contacts */}
                {erp.emergency_contacts && erp.emergency_contacts.length > 0 && (
                  <div className="mt-4">
                    <FieldLabel>Emergency Contacts</FieldLabel>
                    <div className="space-y-2 mt-1">
                      {erp.emergency_contacts.map((contact, idx) => (
                        <div
                          key={idx}
                          className="flex items-center gap-3 px-3 py-2 bg-surface-sunken rounded-[var(--radius-sm)] text-[12px]"
                        >
                          <User size={12} className="text-text-tertiary shrink-0" />
                          <span className="font-medium text-text-primary">{String(contact.name ?? contact.role ?? `Contact ${idx + 1}`)}</span>
                          {contact.phone && <span className="text-text-secondary">{String(contact.phone)}</span>}
                          {contact.email && <span className="text-text-tertiary">{String(contact.email)}</span>}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </Section>

              {/* ── Equipment ────────────────────── */}
              {erp.equipment_required && erp.equipment_required.length > 0 && (
                <Section title="Required Equipment" icon={<Wrench size={14} />}>
                  <div className="flex flex-wrap gap-2">
                    {erp.equipment_required.map((item, idx) => (
                      <span
                        key={idx}
                        className="inline-flex items-center px-2.5 py-1 bg-surface-sunken rounded-full text-[12px] text-text-primary"
                      >
                        {item}
                      </span>
                    ))}
                  </div>
                </Section>
              )}

              {/* ── Documents ────────────────────── */}
              {(erp.file_path || erp.drawings_path || erp.sop_path || (erp.attachments && erp.attachments.length > 0)) && (
                <Section title="Documents" icon={<FileText size={14} />}>
                  <div className="space-y-2">
                    {erp.file_path && (
                      <DocumentLink label="ERP Document" path={erp.file_path} />
                    )}
                    {erp.drawings_path && (
                      <DocumentLink label="Drawings / Maps" path={erp.drawings_path} />
                    )}
                    {erp.sop_path && (
                      <DocumentLink label="SOP Document" path={erp.sop_path} />
                    )}
                    {erp.attachments && erp.attachments.length > 0 && erp.attachments.map((att, idx) => (
                      <DocumentLink key={idx} label={att.originalName || `Attachment ${idx + 1}`} path={att.filename} />
                    ))}
                  </div>
                </Section>
              )}

              {/* ── Review Info ───────────────────── */}
              <Section title="Review Information" icon={<Calendar size={14} />}>
                <Grid>
                  <Field label="Review Frequency" value={erp.review_frequency} />
                  <Field label="Next Review Date" value={formatDate(erp.next_review_date)} />
                  <Field label="Approval Date" value={formatDate(erp.approval_date ?? erp.approved_at)} />
                  <Field label="Approved By" value={erp.approved_by_name} />
                  <Field label="Prepared By" value={erp.prepared_by_name} />
                  <Field label="Effective Date" value={formatDate(erp.effective_date)} />
                </Grid>
              </Section>

              {/* ── Linked Drills ─────────────────── */}
              {erp.recent_drills && erp.recent_drills.length > 0 && (
                <Section title="Linked Drills" icon={<Megaphone size={14} />}>
                  <div className="space-y-2">
                    {erp.recent_drills.map(drill => (
                      <div
                        key={drill.id}
                        className="flex items-center justify-between px-3 py-2.5 bg-surface-sunken rounded-[var(--radius-sm)] hover:bg-gray-100 transition-colors"
                      >
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            <span className="font-mono text-[11px] text-primary-600 font-medium">
                              {drill.drill_code}
                            </span>
                            <StatusBadge status={drill.status} />
                          </div>
                          <p className="text-[12px] text-text-primary mt-0.5 truncate">{drill.title}</p>
                        </div>
                        <span className="text-[11px] text-text-tertiary shrink-0 ml-3">
                          {formatDate(drill.planned_date)}
                        </span>
                      </div>
                    ))}
                  </div>
                </Section>
              )}

              {/* ── Remarks ──────────────────────── */}
              {erp.remarks && (
                <Section title="Remarks" icon={<FileText size={14} />}>
                  <p className="text-[13px] text-text-primary whitespace-pre-wrap">{erp.remarks}</p>
                </Section>
              )}

              {/* ── Audit Log ────────────────────── */}
              {erp.logs && erp.logs.length > 0 && (
                <div className="border border-border rounded-[var(--radius-lg)] overflow-hidden">
                  <button
                    onClick={() => setShowLogs(prev => !prev)}
                    className="w-full flex items-center justify-between px-4 py-3 text-left hover:bg-surface-sunken transition-colors"
                  >
                    <div className="flex items-center gap-2">
                      <Clock size={14} className="text-text-tertiary" />
                      <span className="text-[12px] font-semibold text-text-secondary uppercase tracking-wide">
                        Audit Log ({erp.logs.length})
                      </span>
                    </div>
                    {showLogs ? <ChevronUp size={14} className="text-text-tertiary" /> : <ChevronDown size={14} className="text-text-tertiary" />}
                  </button>

                  {showLogs && (
                    <div className="px-4 pb-4 space-y-0">
                      {erp.logs.map((log, idx) => (
                        <div key={log.id} className="flex gap-3 pt-3 relative">
                          {/* Timeline line */}
                          {idx < erp.logs!.length - 1 && (
                            <div className="absolute left-[11px] top-[36px] bottom-0 w-px bg-border" />
                          )}

                          {/* Dot */}
                          <div className="w-[22px] h-[22px] rounded-full border-2 border-border bg-surface flex items-center justify-center shrink-0 z-10">
                            <div className="w-2 h-2 rounded-full bg-text-tertiary" />
                          </div>

                          {/* Content */}
                          <div className="flex-1 min-w-0 pb-3">
                            <p className="text-[12px] text-text-primary leading-relaxed">
                              {log.description || log.action_type.replace(/_/g, ' ')}
                            </p>
                            <div className="flex items-center gap-2 mt-0.5">
                              {log.user_name && (
                                <span className="text-[10px] text-text-secondary font-medium">{log.user_name}</span>
                              )}
                              <span className="text-[10px] text-text-tertiary">
                                {new Date(log.created_at).toLocaleString()}
                              </span>
                            </div>
                            {log.old_value && log.new_value && (
                              <p className="text-[10px] mt-1 text-text-secondary">
                                <span className="line-through text-danger-400">{log.old_value}</span>
                                {' \u2192 '}
                                <span className="text-green-600 font-medium">{log.new_value}</span>
                              </p>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* ── Meta ─────────────────────────── */}
              <div className="text-[11px] text-text-tertiary flex items-center gap-4 pt-2 border-t border-border">
                <span>Created: {new Date(erp.created_at).toLocaleString()}</span>
                {erp.created_by_name && <span>by {erp.created_by_name}</span>}
                <span>Updated: {new Date(erp.updated_at).toLocaleString()}</span>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

// ─── Shared sub-components ───────────────────────────

function Section({ title, icon, children }: { title: string; icon?: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="bg-surface border border-border rounded-[var(--radius-lg)] p-4">
      <div className="flex items-center gap-2 mb-3">
        {icon && <span className="text-text-tertiary">{icon}</span>}
        <h3 className="text-[11px] font-semibold text-text-secondary uppercase tracking-wide">{title}</h3>
      </div>
      {children}
    </div>
  );
}

function Grid({ children }: { children: React.ReactNode }) {
  return <div className="grid grid-cols-2 sm:grid-cols-3 gap-x-4 gap-y-2.5">{children}</div>;
}

function Field({ label, value }: { label: string; value: string | number | null | undefined }) {
  const display = value != null && value !== '' ? String(value) : null;
  return (
    <div>
      <p className="text-[10px] text-text-tertiary uppercase tracking-wide">{label}</p>
      <p className={`text-[13px] ${display ? 'text-text-primary' : 'text-text-tertiary italic'}`}>
        {display ?? '\u2014'}
      </p>
    </div>
  );
}

function FieldLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-[10px] text-text-tertiary uppercase tracking-wide mb-1">{children}</p>
  );
}

function DocumentLink({ label, path }: { label: string; path: string }) {
  const url = path.startsWith('http') ? path : `${STORAGE_BASE}${path}`;
  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      className="flex items-center gap-3 px-3 py-2.5 bg-surface-sunken rounded-[var(--radius-sm)] hover:bg-gray-100 transition-colors group"
    >
      <FileText size={16} className="text-text-tertiary group-hover:text-primary-500 shrink-0" />
      <span className="text-[12px] text-text-primary group-hover:text-primary-600 truncate flex-1">{label}</span>
      <Download size={14} className="text-text-tertiary group-hover:text-primary-500 shrink-0" />
    </a>
  );
}

function formatDate(value: string | null | undefined): string | null {
  if (!value) return null;
  try {
    return new Date(value).toLocaleDateString('en-GB', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  } catch {
    return value;
  }
}
