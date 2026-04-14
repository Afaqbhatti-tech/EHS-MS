import { useState, useRef } from 'react';
import {
  Clock, MapPin, User, Shield, FileText, Camera, Plus, Edit, Trash2,
  CheckCircle, XCircle, AlertTriangle, Search, ChevronDown, Calendar,
  Upload, Download, Eye, X, Activity, Clipboard, UserCheck, Building,
  Phone, Briefcase, Heart, Stethoscope, Flame, Zap, MessageSquare,
  ArrowRightCircle,
} from 'lucide-react';
import Badge, { StatusBadge } from '../../../components/ui/Badge';
import Modal from '../../../components/ui/Modal';
import type {
  Incident, IncidentEvidenceItem, IncidentActionItem, IncidentLogItem,
} from '../useIncidents';
import { ROOT_CAUSE_CATEGORIES, INCIDENT_STATUSES } from '../useIncidents';

// ─── Constants ────────────────────────────────────

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:8000/api';
const STORAGE_BASE = API_BASE.replace('/api', '') + '/storage/';

type BadgeVariant = 'success' | 'warning' | 'danger' | 'info' | 'neutral' | 'primary';

const STATUS_BADGE_MAP: Record<string, BadgeVariant> = {
  Reported: 'info',
  'Under Investigation': 'primary',
  'Action Assigned': 'warning',
  'In Progress': 'warning',
  Closed: 'success',
  Reopened: 'danger',
  Escalated: 'danger',
};

const SEVERITY_BADGE_MAP: Record<string, BadgeVariant> = {
  Critical: 'danger',
  High: 'warning',
  Medium: 'info',
  Low: 'success',
};

const PRIORITY_BADGE_MAP: Record<string, BadgeVariant> = {
  High: 'danger',
  Medium: 'warning',
  Low: 'success',
};

const ACTION_STATUS_BADGE_MAP: Record<string, BadgeVariant> = {
  Pending: 'neutral',
  'In Progress': 'info',
  Completed: 'success',
  Overdue: 'danger',
};

// ─── Hook shape (prop interface) ──────────────────

interface IncidentHook {
  detail: Incident | undefined;
  detailQuery: { isLoading: boolean };
  selectedId: string | null;
  updateStatus: { mutateAsync: (args: { id: string; status: string; close_notes?: string }) => Promise<unknown> };
  assign: { mutateAsync: (args: { id: string; assigned_to_name: string }) => Promise<unknown> };
  addInvestigation: { mutateAsync: (args: { id: string; data: Record<string, unknown> }) => Promise<unknown> };
  addAction: { mutateAsync: (args: { id: string; data: Record<string, unknown> }) => Promise<unknown> };
  updateAction: { mutateAsync: (args: { incidentId: string; actionId: string; data: Record<string, unknown> }) => Promise<unknown> };
  deleteAction: { mutateAsync: (args: { incidentId: string; actionId: string }) => Promise<unknown> };
  uploadEvidence: { mutateAsync: (args: { id: string; files: File[]; related_type?: string }) => Promise<unknown> };
  deleteEvidence: { mutateAsync: (args: { incidentId: string; evidenceId: string }) => Promise<unknown> };
}

interface Props {
  hook: IncidentHook;
  onClose: () => void;
  onEdit?: () => void;
}

// ─── Main Component ───────────────────────────────

export default function IncidentDetail({ hook, onClose, onEdit }: Props) {
  const incident = hook.detail;
  const isLoading = hook.detailQuery.isLoading;

  // Local UI states
  const [showStatusDropdown, setShowStatusDropdown] = useState(false);
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [showCloseModal, setShowCloseModal] = useState(false);
  const [showInvestigationForm, setShowInvestigationForm] = useState(false);
  const [showActionForm, setShowActionForm] = useState(false);
  const [editingActionId, setEditingActionId] = useState<string | null>(null);
  const [showCompleteActionModal, setShowCompleteActionModal] = useState<string | null>(null);

  // Form states
  const [assignName, setAssignName] = useState('');
  const [closeNotes, setCloseNotes] = useState('');
  const [completionNotes, setCompletionNotes] = useState('');

  const [investigationForm, setInvestigationForm] = useState({
    investigation_date: new Date().toISOString().split('T')[0],
    immediate_cause: '',
    root_cause: '',
    root_cause_category: '',
    ppe_used: '' as '' | 'yes' | 'no',
    procedure_followed: '' as '' | 'yes' | 'no',
    supervision_adequate: '' as '' | 'yes' | 'no',
    training_adequate: '' as '' | 'yes' | 'no',
    witness_details: '',
    investigation_notes: '',
  });

  const [actionForm, setActionForm] = useState({
    title: '',
    description: '',
    assigned_to_name: '',
    due_date: '',
    priority: 'Medium',
  });

  const [actionStatusForm, setActionStatusForm] = useState<{ id: string; status: string } | null>(null);

  // Loading state
  if (isLoading) {
    return (
      <div className="fixed inset-0 z-50 flex justify-end">
        <div className="absolute inset-0 bg-black/30" onClick={onClose} />
        <div className="relative w-full max-w-[800px] bg-surface h-full flex items-center justify-center shadow-2xl overflow-hidden">
          <div className="text-center">
            <div className="w-8 h-8 border-2 border-primary-500 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
            <p className="text-sm text-text-secondary">Loading incident details...</p>
          </div>
        </div>
      </div>
    );
  }

  if (!incident) return null;

  const i = incident;

  // ─── Handlers ─────────────────────────────────

  const handleStatusChange = async (newStatus: string) => {
    setShowStatusDropdown(false);
    if (newStatus === 'Closed') {
      setShowCloseModal(true);
      return;
    }
    await hook.updateStatus.mutateAsync({ id: i.id, status: newStatus });
  };

  const handleCloseIncident = async () => {
    await hook.updateStatus.mutateAsync({ id: i.id, status: 'Closed', close_notes: closeNotes });
    setShowCloseModal(false);
    setCloseNotes('');
  };

  const handleAssign = async () => {
    if (!assignName.trim()) return;
    await hook.assign.mutateAsync({ id: i.id, assigned_to_name: assignName.trim() });
    setShowAssignModal(false);
    setAssignName('');
  };

  const handleInvestigationSubmit = async () => {
    if (!investigationForm.root_cause.trim()) return;
    const data: Record<string, unknown> = {
      investigation_date: investigationForm.investigation_date,
      immediate_cause: investigationForm.immediate_cause || null,
      root_cause: investigationForm.root_cause,
      root_cause_category: investigationForm.root_cause_category || null,
      ppe_used: investigationForm.ppe_used === 'yes' ? true : investigationForm.ppe_used === 'no' ? false : null,
      procedure_followed: investigationForm.procedure_followed === 'yes' ? true : investigationForm.procedure_followed === 'no' ? false : null,
      supervision_adequate: investigationForm.supervision_adequate === 'yes' ? true : investigationForm.supervision_adequate === 'no' ? false : null,
      training_adequate: investigationForm.training_adequate === 'yes' ? true : investigationForm.training_adequate === 'no' ? false : null,
      witness_details: investigationForm.witness_details || null,
      investigation_notes: investigationForm.investigation_notes || null,
    };
    await hook.addInvestigation.mutateAsync({ id: i.id, data });
    setShowInvestigationForm(false);
    setInvestigationForm({
      investigation_date: new Date().toISOString().split('T')[0],
      immediate_cause: '', root_cause: '', root_cause_category: '',
      ppe_used: '', procedure_followed: '', supervision_adequate: '', training_adequate: '',
      witness_details: '', investigation_notes: '',
    });
  };

  const handleActionSubmit = async () => {
    if (!actionForm.title.trim() || !actionForm.due_date) return;
    await hook.addAction.mutateAsync({ id: i.id, data: actionForm });
    setShowActionForm(false);
    setActionForm({ title: '', description: '', assigned_to_name: '', due_date: '', priority: 'Medium' });
  };

  const handleActionStatusUpdate = async (actionId: string, status: string) => {
    if (status === 'Completed') {
      setShowCompleteActionModal(actionId);
      return;
    }
    await hook.updateAction.mutateAsync({ incidentId: i.id, actionId, data: { status } });
    setActionStatusForm(null);
  };

  const handleCompleteAction = async () => {
    if (!showCompleteActionModal) return;
    await hook.updateAction.mutateAsync({
      incidentId: i.id,
      actionId: showCompleteActionModal,
      data: { status: 'Completed', completion_notes: completionNotes },
    });
    setShowCompleteActionModal(null);
    setCompletionNotes('');
  };

  const handleDeleteAction = async (actionId: string) => {
    if (!confirm('Are you sure you want to delete this action?')) return;
    await hook.deleteAction.mutateAsync({ incidentId: i.id, actionId });
  };

  const handleEvidenceUpload = async (files: FileList | null) => {
    if (!files?.length) return;
    await hook.uploadEvidence.mutateAsync({ id: i.id, files: Array.from(files) });
  };

  const handleDeleteEvidence = async (evidenceId: string) => {
    if (!confirm('Are you sure you want to delete this evidence?')) return;
    await hook.deleteEvidence.mutateAsync({ incidentId: i.id, evidenceId });
  };

  // Available status transitions
  const getAvailableStatuses = (): string[] => {
    return INCIDENT_STATUSES.filter(s => s !== i.status);
  };

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <div className="absolute inset-0 bg-black/30" onClick={onClose} />
      <div className="relative w-full max-w-[800px] bg-surface h-full flex flex-col shadow-2xl overflow-hidden animate-slideInRight">

        {/* ═══ HEADER ═══ */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border bg-canvas/50 shrink-0">
          <div className="min-w-0">
            <div className="flex items-center gap-3 flex-wrap">
              <h2 className="text-lg font-bold text-text-primary">{i.incident_code}</h2>
              <Badge variant={STATUS_BADGE_MAP[i.status] ?? 'neutral'} dot>{i.status}</Badge>
              <Badge variant={SEVERITY_BADGE_MAP[i.severity] ?? 'neutral'} dot>{i.severity}</Badge>
            </div>
            <p className="text-xs text-text-secondary mt-0.5 truncate">
              {i.incident_type}{i.incident_category ? ` - ${i.incident_category}` : ''}
            </p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            {/* Status dropdown */}
            <div className="relative">
              <button
                onClick={() => setShowStatusDropdown(!showStatusDropdown)}
                className="btn-secondary px-3 py-1.5 text-xs rounded-lg flex items-center gap-1.5"
              >
                <ArrowRightCircle size={13} /> Change Status <ChevronDown size={12} />
              </button>
              {showStatusDropdown && (
                <>
                  <div className="fixed inset-0 z-10" onClick={() => setShowStatusDropdown(false)} />
                  <div className="absolute right-0 mt-1 w-48 bg-surface border border-border rounded-xl shadow-lg z-20 py-1">
                    {getAvailableStatuses().map(status => (
                      <button
                        key={status}
                        onClick={() => handleStatusChange(status)}
                        className="w-full text-left px-3 py-2 text-xs hover:bg-canvas transition-colors flex items-center gap-2"
                      >
                        <Badge variant={STATUS_BADGE_MAP[status] ?? 'neutral'} dot>{status}</Badge>
                      </button>
                    ))}
                  </div>
                </>
              )}
            </div>
            {/* Edit button */}
            {onEdit && (
              <button
                onClick={onEdit}
                className="btn-secondary px-3 py-1.5 text-xs rounded-lg flex items-center gap-1.5"
              >
                <Edit size={13} /> Edit
              </button>
            )}
            {/* Assign button */}
            <button
              onClick={() => setShowAssignModal(true)}
              className="btn-secondary px-3 py-1.5 text-xs rounded-lg flex items-center gap-1.5"
            >
              <UserCheck size={13} /> Assign
            </button>
            {/* Close panel */}
            <button onClick={onClose} className="p-2 rounded-lg text-text-tertiary hover:bg-canvas transition-colors">
              <XIcon size={20} />
            </button>
          </div>
        </div>

        {/* ═══ SCROLLABLE CONTENT ═══ */}
        <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain px-6 py-5 space-y-5">

          {/* ─── 1. Basic Info ─── */}
          <SectionCard title="Basic Information" icon={<Clipboard size={14} />}>
            <InfoGrid>
              <InfoField label="Date" value={formatDate(i.incident_date)} icon={<Calendar size={12} />} />
              <InfoField label="Time" value={i.incident_time} icon={<Clock size={12} />} />
              <InfoField label="Location" value={i.location} icon={<MapPin size={12} />} />
              <InfoField label="Area" value={i.area} icon={<Building size={12} />} />
              <InfoField label="Department" value={i.department} icon={<Briefcase size={12} />} />
              <InfoField label="Type" value={i.incident_type} icon={<AlertTriangle size={12} />} />
              <InfoField label="Category" value={i.incident_category} icon={<FileText size={12} />} />
              <InfoField label="Severity" value={i.severity} icon={<Shield size={12} />} />
              <InfoField label="Reported By" value={i.reported_by_name} icon={<User size={12} />} />
              <InfoField label="Created At" value={formatDateTime(i.created_at)} icon={<Clock size={12} />} />
            </InfoGrid>
            {i.assigned_to_name && (
              <div className="mt-3 pt-3 border-t border-border">
                <InfoGrid>
                  <InfoField label="Assigned To" value={i.assigned_to_name} icon={<UserCheck size={12} />} highlight />
                </InfoGrid>
              </div>
            )}
          </SectionCard>

          {/* ─── 2. Description ─── */}
          <SectionCard title="Description" icon={<MessageSquare size={14} />}>
            <div className="space-y-3">
              <FullTextField label="What Happened" value={i.description} />
              <FullTextField label="Immediate Action Taken" value={i.immediate_action} />
              <FullTextField label="Remarks" value={i.remarks} />
            </div>
          </SectionCard>

          {/* ─── 3. Person Involved ─── */}
          <SectionCard title="Person Involved" icon={<User size={14} />}>
            <InfoGrid>
              <InfoField label="Affected Person" value={i.affected_person_name} icon={<User size={12} />} highlight />
              <InfoField label="Employee ID" value={i.employee_id} icon={<FileText size={12} />} />
              <InfoField label="Designation" value={i.designation} icon={<Briefcase size={12} />} />
              <InfoField label="Contractor" value={i.contractor_name} icon={<Building size={12} />} />
              <InfoField label="Contact" value={i.contact_number} icon={<Phone size={12} />} />
              <InfoField label="Supervisor" value={i.supervisor_name} icon={<UserCheck size={12} />} />
            </InfoGrid>
          </SectionCard>

          {/* ─── 4. Injury / Impact Details ─── */}
          <SectionCard title="Injury / Impact Details" icon={<Heart size={14} />}>
            <InfoGrid>
              <InfoField label="Injury Type" value={i.injury_type} icon={<Stethoscope size={12} />} />
              <InfoField label="Body Part Affected" value={i.body_part_affected} icon={<Heart size={12} />} />
            </InfoGrid>
            <div className="mt-3 flex flex-wrap gap-2">
              <BooleanFlag label="Medical Treatment" value={i.medical_treatment_required} />
              <BooleanFlag label="Lost Time Injury" value={i.lost_time_injury} />
              <BooleanFlag label="Hospitalization" value={i.hospitalization} />
              <BooleanFlag label="Property Damage" value={i.property_damage} />
              <BooleanFlag label="Equipment Damage" value={i.equipment_damage} />
              <BooleanFlag label="Environmental Impact" value={i.environmental_impact} />
            </div>
            {(i.financial_loss !== null || i.incident_outcome_summary) && (
              <div className="mt-3 pt-3 border-t border-border space-y-2">
                {i.financial_loss !== null && (
                  <div>
                    <span className="text-[10px] text-text-tertiary uppercase tracking-wide">Financial Loss</span>
                    <p className="text-sm font-semibold text-danger-600">
                      ${Number(i.financial_loss).toLocaleString()}
                    </p>
                  </div>
                )}
                <FullTextField label="Outcome Summary" value={i.incident_outcome_summary} />
              </div>
            )}
          </SectionCard>

          {/* ─── 5. Evidence ─── */}
          <EvidenceSection
            evidence={i.evidence ?? []}
            onUpload={handleEvidenceUpload}
            onDelete={handleDeleteEvidence}
          />

          {/* ─── 6. Investigation ─── */}
          <InvestigationSection
            incident={i}
            showForm={showInvestigationForm}
            setShowForm={setShowInvestigationForm}
            form={investigationForm}
            setForm={setInvestigationForm}
            onSubmit={handleInvestigationSubmit}
          />

          {/* ─── 7. Corrective Actions ─── */}
          <CorrectiveActionsSection
            incidentId={i.id}
            actions={i.actions ?? []}
            showForm={showActionForm}
            setShowForm={setShowActionForm}
            form={actionForm}
            setForm={setActionForm}
            onSubmit={handleActionSubmit}
            editingActionId={editingActionId}
            setEditingActionId={setEditingActionId}
            actionStatusForm={actionStatusForm}
            setActionStatusForm={setActionStatusForm}
            onStatusUpdate={handleActionStatusUpdate}
            onDelete={handleDeleteAction}
            onUpdateAction={hook.updateAction.mutateAsync}
          />

          {/* ─── 8. Close Info (if closed) ─── */}
          {i.status === 'Closed' && i.closed_at && (
            <SectionCard title="Closure Information" icon={<CheckCircle size={14} />}>
              <InfoGrid>
                <InfoField label="Closed By" value={i.closed_by_name} icon={<User size={12} />} />
                <InfoField label="Closed At" value={formatDateTime(i.closed_at)} icon={<Clock size={12} />} />
              </InfoGrid>
              {i.close_notes && (
                <div className="mt-3">
                  <FullTextField label="Closure Notes" value={i.close_notes} />
                </div>
              )}
            </SectionCard>
          )}

          {/* ─── 9. Audit History / Timeline ─── */}
          <TimelineSection logs={i.logs ?? []} />

        </div>
      </div>

      {/* ═══ MODALS ═══ */}

      {/* Assign Modal */}
      <Modal open={showAssignModal} onClose={() => setShowAssignModal(false)} title="Assign Incident" size="sm">
        <div className="space-y-3">
          <div>
            <label className="block text-xs font-medium text-text-secondary mb-1">Assigned To</label>
            <input
              type="text"
              value={assignName}
              onChange={e => setAssignName(e.target.value)}
              className="input-field w-full"
              placeholder="Enter person name..."
              autoFocus
            />
          </div>
        </div>
        <div className="flex justify-end gap-2 mt-5">
          <button onClick={() => setShowAssignModal(false)} className="btn-secondary px-4 py-2 text-sm rounded-lg">
            Cancel
          </button>
          <button onClick={handleAssign} disabled={!assignName.trim()} className="btn-primary px-4 py-2 text-sm rounded-lg disabled:opacity-50">
            Assign
          </button>
        </div>
      </Modal>

      {/* Close Modal */}
      <Modal open={showCloseModal} onClose={() => setShowCloseModal(false)} title="Close Incident" subtitle="Please provide closure notes for this incident.">
        <div className="space-y-3">
          <div>
            <label className="block text-xs font-medium text-text-secondary mb-1">Closure Notes</label>
            <textarea
              value={closeNotes}
              onChange={e => setCloseNotes(e.target.value)}
              className="input-field w-full"
              rows={4}
              placeholder="Summarize the resolution and any follow-up required..."
              autoFocus
            />
          </div>
        </div>
        <div className="flex justify-end gap-2 mt-5">
          <button onClick={() => setShowCloseModal(false)} className="btn-secondary px-4 py-2 text-sm rounded-lg">
            Cancel
          </button>
          <button onClick={handleCloseIncident} className="btn-primary px-4 py-2 text-sm rounded-lg">
            Close Incident
          </button>
        </div>
      </Modal>

      {/* Complete Action Modal */}
      <Modal
        open={!!showCompleteActionModal}
        onClose={() => { setShowCompleteActionModal(null); setCompletionNotes(''); }}
        title="Complete Action"
        subtitle="Provide notes about how this action was completed."
        size="sm"
      >
        <div>
          <label className="block text-xs font-medium text-text-secondary mb-1">Completion Notes</label>
          <textarea
            value={completionNotes}
            onChange={e => setCompletionNotes(e.target.value)}
            className="input-field w-full"
            rows={3}
            placeholder="Describe completion details..."
            autoFocus
          />
        </div>
        <div className="flex justify-end gap-2 mt-5">
          <button
            onClick={() => { setShowCompleteActionModal(null); setCompletionNotes(''); }}
            className="btn-secondary px-4 py-2 text-sm rounded-lg"
          >
            Cancel
          </button>
          <button onClick={handleCompleteAction} className="btn-primary px-4 py-2 text-sm rounded-lg">
            Mark Complete
          </button>
        </div>
      </Modal>
    </div>
  );
}

// ═══════════════════════════════════════════════════
// Section Components
// ═══════════════════════════════════════════════════

function SectionCard({ title, icon, children, actions }: {
  title: string;
  icon?: React.ReactNode;
  children: React.ReactNode;
  actions?: React.ReactNode;
}) {
  return (
    <div className="bg-canvas rounded-xl border border-border">
      <div className="flex items-center justify-between px-4 py-3 border-b border-border">
        <h3 className="text-xs font-semibold text-text-secondary uppercase tracking-wide flex items-center gap-2">
          {icon && <span className="text-text-tertiary">{icon}</span>}
          {title}
        </h3>
        {actions}
      </div>
      <div className="p-4">{children}</div>
    </div>
  );
}

function InfoGrid({ children }: { children: React.ReactNode }) {
  return <div className="grid grid-cols-2 sm:grid-cols-3 gap-x-4 gap-y-3">{children}</div>;
}

function InfoField({ label, value, icon, highlight }: {
  label: string;
  value: string | null | undefined;
  icon?: React.ReactNode;
  highlight?: boolean;
}) {
  return (
    <div>
      <p className="text-[10px] text-text-tertiary uppercase tracking-wide flex items-center gap-1 mb-0.5">
        {icon && <span className="opacity-60">{icon}</span>}
        {label}
      </p>
      <p className={`text-sm ${highlight ? 'font-semibold text-primary-700' : 'text-text-primary'} ${!value ? 'text-text-tertiary italic' : ''}`}>
        {value || '\u2014'}
      </p>
    </div>
  );
}

function FullTextField({ label, value }: { label: string; value: string | null | undefined }) {
  if (!value) return null;
  return (
    <div>
      <p className="text-[10px] text-text-tertiary uppercase tracking-wide mb-1">{label}</p>
      <p className="text-sm text-text-primary whitespace-pre-wrap leading-relaxed bg-surface/50 rounded-lg px-3 py-2 border border-border/50">
        {value}
      </p>
    </div>
  );
}

function BooleanFlag({ label, value }: { label: string; value: boolean }) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-medium ${
        value
          ? 'bg-red-50 text-red-700 border border-red-200'
          : 'bg-gray-50 text-gray-500 border border-gray-200'
      }`}
    >
      {value ? <CheckCircle size={11} /> : <XCircle size={11} />}
      {label}
    </span>
  );
}

// ─── Evidence Section ─────────────────────────────

function EvidenceSection({ evidence, onUpload, onDelete }: {
  evidence: IncidentEvidenceItem[];
  onUpload: (files: FileList | null) => void;
  onDelete: (id: string) => void;
}) {
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  return (
    <SectionCard
      title={`Evidence (${evidence.length})`}
      icon={<Camera size={14} />}
      actions={
        <label className="btn-secondary px-3 py-1.5 text-xs rounded-lg cursor-pointer inline-flex items-center gap-1.5 hover:bg-surface transition-colors">
          <Upload size={12} /> Upload
          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept="image/*,.pdf,.doc,.docx,.xls,.xlsx,.csv,.ppt,.pptx,.txt"
            className="hidden"
            onChange={e => { onUpload(e.target.files); if (fileInputRef.current) fileInputRef.current.value = ''; }}
          />
        </label>
      }
    >
      {evidence.length === 0 ? (
        <div className="text-center py-8">
          <Camera size={32} className="mx-auto text-text-tertiary/40 mb-2" />
          <p className="text-sm text-text-tertiary">No evidence uploaded yet</p>
          <p className="text-xs text-text-tertiary/70 mt-0.5">Upload photos, documents, or other files</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {evidence.map(ev => {
            const isImage = ev.file_type?.startsWith('image/');
            const fileUrl = `${STORAGE_BASE}${ev.file_path}`;
            return (
              <div key={ev.id} className="border border-border rounded-xl overflow-hidden bg-surface group relative">
                {isImage ? (
                  <div className="relative h-28 cursor-pointer" onClick={() => setPreviewUrl(fileUrl)}>
                    <img src={fileUrl} alt={ev.original_name} className="w-full h-full object-cover" />
                    <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors flex items-center justify-center opacity-0 group-hover:opacity-100">
                      <Eye size={20} className="text-white drop-shadow-lg" />
                    </div>
                  </div>
                ) : (
                  <div className="h-28 flex items-center justify-center bg-gray-50">
                    <FileText size={28} className="text-text-tertiary" />
                  </div>
                )}
                <div className="p-2.5">
                  <p className="text-xs font-medium text-text-primary truncate" title={ev.original_name}>
                    {ev.original_name}
                  </p>
                  <p className="text-[10px] text-text-tertiary mt-0.5">
                    {ev.uploaded_by} &middot; {formatDate(ev.created_at)}
                  </p>
                </div>
                {/* Actions overlay */}
                <div className="absolute top-1.5 right-1.5 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <a
                    href={fileUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="p-1.5 rounded-lg bg-white/90 text-text-secondary hover:text-primary-600 shadow-sm transition-colors"
                    title="Download"
                  >
                    <Download size={12} />
                  </a>
                  <button
                    onClick={() => onDelete(ev.id)}
                    className="p-1.5 rounded-lg bg-white/90 text-text-secondary hover:text-danger-600 shadow-sm transition-colors"
                    title="Delete"
                  >
                    <Trash2 size={12} />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Image Preview Overlay */}
      {previewUrl && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70" onClick={() => setPreviewUrl(null)}>
          <div className="relative max-w-[90vw] max-h-[90vh]">
            <img src={previewUrl} alt="Preview" className="max-w-full max-h-[85vh] object-contain rounded-lg shadow-2xl" />
            <button
              onClick={() => setPreviewUrl(null)}
              className="absolute -top-3 -right-3 p-2 rounded-full bg-white shadow-lg text-text-primary hover:bg-gray-100 transition-colors"
            >
              <XIcon size={16} />
            </button>
          </div>
        </div>
      )}
    </SectionCard>
  );
}

// ─── Investigation Section ────────────────────────

interface InvestigationFormState {
  investigation_date: string;
  immediate_cause: string;
  root_cause: string;
  root_cause_category: string;
  ppe_used: '' | 'yes' | 'no';
  procedure_followed: '' | 'yes' | 'no';
  supervision_adequate: '' | 'yes' | 'no';
  training_adequate: '' | 'yes' | 'no';
  witness_details: string;
  investigation_notes: string;
}

function InvestigationSection({ incident, showForm, setShowForm, form, setForm, onSubmit }: {
  incident: Incident;
  showForm: boolean;
  setShowForm: (v: boolean) => void;
  form: InvestigationFormState;
  setForm: (f: InvestigationFormState) => void;
  onSubmit: () => void;
}) {
  const hasInvestigation = !!incident.root_cause;

  return (
    <SectionCard
      title="Investigation"
      icon={<Search size={14} />}
      actions={
        !hasInvestigation && !showForm ? (
          <button
            onClick={() => setShowForm(true)}
            className="btn-secondary px-3 py-1.5 text-xs rounded-lg flex items-center gap-1.5"
          >
            <Plus size={12} /> Add Investigation
          </button>
        ) : undefined
      }
    >
      {hasInvestigation ? (
        <div className="space-y-4">
          <InfoGrid>
            <InfoField label="Investigated By" value={incident.investigated_by_name} icon={<User size={12} />} />
            <InfoField label="Investigation Date" value={formatDate(incident.investigation_date)} icon={<Calendar size={12} />} />
            <InfoField label="Root Cause Category" value={incident.root_cause_category} icon={<AlertTriangle size={12} />} />
          </InfoGrid>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mt-3">
            <AssessmentBadge label="PPE Used" value={incident.ppe_used} />
            <AssessmentBadge label="Procedure Followed" value={incident.procedure_followed} />
            <AssessmentBadge label="Supervision Adequate" value={incident.supervision_adequate} />
            <AssessmentBadge label="Training Adequate" value={incident.training_adequate} />
          </div>

          <div className="space-y-2 mt-3">
            <FullTextField label="Immediate Cause" value={incident.immediate_cause} />
            <FullTextField label="Root Cause" value={incident.root_cause} />
            <FullTextField label="Witness Details" value={incident.witness_details} />
            <FullTextField label="Investigation Notes" value={incident.investigation_notes} />
          </div>
        </div>
      ) : !showForm ? (
        <div className="text-center py-8">
          <Search size={32} className="mx-auto text-text-tertiary/40 mb-2" />
          <p className="text-sm text-text-tertiary">No investigation recorded yet</p>
          <p className="text-xs text-text-tertiary/70 mt-0.5">Add investigation findings once the inquiry is complete</p>
        </div>
      ) : null}

      {showForm && (
        <div className="border border-primary-200 rounded-xl p-4 bg-primary-50/20 space-y-4">
          <h4 className="text-sm font-semibold text-text-primary flex items-center gap-2">
            <Search size={14} /> Investigation Details
          </h4>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-text-secondary mb-1">Investigation Date</label>
              <input
                type="date"
                value={form.investigation_date}
                onChange={e => setForm({ ...form, investigation_date: e.target.value })}
                className="input-field w-full"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-text-secondary mb-1">Root Cause Category</label>
              <select
                value={form.root_cause_category}
                onChange={e => setForm({ ...form, root_cause_category: e.target.value })}
                className="input-field w-full"
              >
                <option value="">Select category...</option>
                {ROOT_CAUSE_CATEGORIES.map(c => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-text-secondary mb-1">Immediate Cause</label>
            <textarea
              value={form.immediate_cause}
              onChange={e => setForm({ ...form, immediate_cause: e.target.value })}
              className="input-field w-full"
              rows={2}
              placeholder="What was the immediate cause of the incident?"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-text-secondary mb-1">
              Root Cause <span className="text-danger-500">*</span>
            </label>
            <textarea
              value={form.root_cause}
              onChange={e => setForm({ ...form, root_cause: e.target.value })}
              className="input-field w-full"
              rows={2}
              placeholder="What was the underlying root cause?"
            />
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <YesNoSelect
              label="PPE Used?"
              value={form.ppe_used}
              onChange={v => setForm({ ...form, ppe_used: v })}
            />
            <YesNoSelect
              label="Procedure Followed?"
              value={form.procedure_followed}
              onChange={v => setForm({ ...form, procedure_followed: v })}
            />
            <YesNoSelect
              label="Supervision Adequate?"
              value={form.supervision_adequate}
              onChange={v => setForm({ ...form, supervision_adequate: v })}
            />
            <YesNoSelect
              label="Training Adequate?"
              value={form.training_adequate}
              onChange={v => setForm({ ...form, training_adequate: v })}
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-text-secondary mb-1">Witness Details</label>
            <textarea
              value={form.witness_details}
              onChange={e => setForm({ ...form, witness_details: e.target.value })}
              className="input-field w-full"
              rows={2}
              placeholder="Names and statements of witnesses..."
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-text-secondary mb-1">Investigation Notes</label>
            <textarea
              value={form.investigation_notes}
              onChange={e => setForm({ ...form, investigation_notes: e.target.value })}
              className="input-field w-full"
              rows={2}
              placeholder="Additional investigation notes..."
            />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <button onClick={() => setShowForm(false)} className="btn-secondary px-4 py-2 text-xs rounded-lg">
              Cancel
            </button>
            <button
              onClick={onSubmit}
              disabled={!form.root_cause.trim()}
              className="btn-primary px-4 py-2 text-xs rounded-lg disabled:opacity-50 flex items-center gap-1.5"
            >
              <CheckCircle size={13} /> Save Investigation
            </button>
          </div>
        </div>
      )}
    </SectionCard>
  );
}

function YesNoSelect({ label, value, onChange }: {
  label: string;
  value: '' | 'yes' | 'no';
  onChange: (v: '' | 'yes' | 'no') => void;
}) {
  return (
    <div>
      <label className="block text-xs font-medium text-text-secondary mb-1">{label}</label>
      <select
        value={value}
        onChange={e => onChange(e.target.value as '' | 'yes' | 'no')}
        className="input-field w-full"
      >
        <option value="">N/A</option>
        <option value="yes">Yes</option>
        <option value="no">No</option>
      </select>
    </div>
  );
}

function AssessmentBadge({ label, value }: { label: string; value: boolean | null }) {
  if (value === null || value === undefined) {
    return (
      <div className="flex flex-col items-center gap-1 px-2 py-2 rounded-lg bg-gray-50 border border-gray-200">
        <span className="text-[10px] text-text-tertiary uppercase tracking-wide text-center leading-tight">{label}</span>
        <span className="text-xs text-gray-400 font-medium">N/A</span>
      </div>
    );
  }
  return (
    <div className={`flex flex-col items-center gap-1 px-2 py-2 rounded-lg border ${
      value ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'
    }`}>
      <span className="text-[10px] text-text-tertiary uppercase tracking-wide text-center leading-tight">{label}</span>
      <span className={`text-xs font-semibold flex items-center gap-1 ${value ? 'text-green-700' : 'text-red-700'}`}>
        {value ? <CheckCircle size={11} /> : <XCircle size={11} />}
        {value ? 'Yes' : 'No'}
      </span>
    </div>
  );
}

// ─── Corrective Actions Section ───────────────────

interface ActionFormState {
  title: string;
  description: string;
  assigned_to_name: string;
  due_date: string;
  priority: string;
}

function CorrectiveActionsSection({
  incidentId, actions, showForm, setShowForm, form, setForm, onSubmit,
  editingActionId, setEditingActionId, actionStatusForm, setActionStatusForm,
  onStatusUpdate, onDelete, onUpdateAction,
}: {
  incidentId: string;
  actions: IncidentActionItem[];
  showForm: boolean;
  setShowForm: (v: boolean) => void;
  form: ActionFormState;
  setForm: (f: ActionFormState) => void;
  onSubmit: () => void;
  editingActionId: string | null;
  setEditingActionId: (id: string | null) => void;
  actionStatusForm: { id: string; status: string } | null;
  setActionStatusForm: (f: { id: string; status: string } | null) => void;
  onStatusUpdate: (actionId: string, status: string) => void;
  onDelete: (actionId: string) => void;
  onUpdateAction: (args: { incidentId: string; actionId: string; data: Record<string, unknown> }) => Promise<unknown>;
}) {
  const [editForm, setEditForm] = useState<ActionFormState>({
    title: '', description: '', assigned_to_name: '', due_date: '', priority: 'Medium',
  });

  const startEditing = (action: IncidentActionItem) => {
    setEditingActionId(action.id);
    setEditForm({
      title: action.title,
      description: action.description ?? '',
      assigned_to_name: action.assigned_to_name ?? '',
      due_date: action.due_date ?? '',
      priority: action.priority,
    });
  };

  const handleEditSave = async (actionId: string) => {
    await onUpdateAction({ incidentId, actionId, data: editForm });
    setEditingActionId(null);
  };

  return (
    <SectionCard
      title={`Corrective Actions (${actions.length})`}
      icon={<Clipboard size={14} />}
      actions={
        <button
          onClick={() => setShowForm(true)}
          className="btn-secondary px-3 py-1.5 text-xs rounded-lg flex items-center gap-1.5"
        >
          <Plus size={12} /> Add Action
        </button>
      }
    >
      {actions.length === 0 && !showForm ? (
        <div className="text-center py-8">
          <Clipboard size={32} className="mx-auto text-text-tertiary/40 mb-2" />
          <p className="text-sm text-text-tertiary">No corrective actions yet</p>
          <p className="text-xs text-text-tertiary/70 mt-0.5">Add actions to address the incident findings</p>
        </div>
      ) : (
        <div className="space-y-3">
          {actions.map(action => (
            <div key={action.id} className="border border-border rounded-xl overflow-hidden bg-surface">
              {editingActionId === action.id ? (
                /* Edit mode */
                <div className="p-4 space-y-3">
                  <h4 className="text-xs font-semibold text-text-secondary uppercase">Edit Action</h4>
                  <div>
                    <label className="block text-xs font-medium text-text-secondary mb-1">Title *</label>
                    <input
                      type="text"
                      value={editForm.title}
                      onChange={e => setEditForm({ ...editForm, title: e.target.value })}
                      className="input-field w-full"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-text-secondary mb-1">Description</label>
                    <textarea
                      value={editForm.description}
                      onChange={e => setEditForm({ ...editForm, description: e.target.value })}
                      className="input-field w-full"
                      rows={2}
                    />
                  </div>
                  <div className="grid grid-cols-3 gap-3">
                    <div>
                      <label className="block text-xs font-medium text-text-secondary mb-1">Assigned To</label>
                      <input
                        type="text"
                        value={editForm.assigned_to_name}
                        onChange={e => setEditForm({ ...editForm, assigned_to_name: e.target.value })}
                        className="input-field w-full"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-text-secondary mb-1">Due Date *</label>
                      <input
                        type="date"
                        value={editForm.due_date}
                        onChange={e => setEditForm({ ...editForm, due_date: e.target.value })}
                        className="input-field w-full"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-text-secondary mb-1">Priority</label>
                      <select
                        value={editForm.priority}
                        onChange={e => setEditForm({ ...editForm, priority: e.target.value })}
                        className="input-field w-full"
                      >
                        <option value="Low">Low</option>
                        <option value="Medium">Medium</option>
                        <option value="High">High</option>
                      </select>
                    </div>
                  </div>
                  <div className="flex justify-end gap-2 pt-1">
                    <button onClick={() => setEditingActionId(null)} className="btn-secondary px-3 py-1.5 text-xs rounded-lg">
                      Cancel
                    </button>
                    <button
                      onClick={() => handleEditSave(action.id)}
                      disabled={!editForm.title.trim() || !editForm.due_date}
                      className="btn-primary px-3 py-1.5 text-xs rounded-lg disabled:opacity-50"
                    >
                      Save Changes
                    </button>
                  </div>
                </div>
              ) : (
                /* View mode */
                <div className="p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h4 className="text-sm font-semibold text-text-primary">{action.title}</h4>
                        <Badge variant={ACTION_STATUS_BADGE_MAP[action.status] ?? 'neutral'} dot>
                          {action.status}
                        </Badge>
                        <Badge variant={PRIORITY_BADGE_MAP[action.priority] ?? 'neutral'}>
                          {action.priority}
                        </Badge>
                      </div>
                      {action.description && (
                        <p className="text-xs text-text-secondary mt-1.5 leading-relaxed">{action.description}</p>
                      )}
                      <div className="flex items-center gap-4 mt-2 text-[11px] text-text-tertiary flex-wrap">
                        {action.assigned_to_name && (
                          <span className="flex items-center gap-1">
                            <User size={11} /> {action.assigned_to_name}
                          </span>
                        )}
                        {action.due_date && (
                          <span className="flex items-center gap-1">
                            <Calendar size={11} /> Due: {formatDate(action.due_date)}
                          </span>
                        )}
                        {action.completed_at && (
                          <span className="flex items-center gap-1 text-green-600">
                            <CheckCircle size={11} /> Completed: {formatDate(action.completed_at)}
                          </span>
                        )}
                      </div>
                      {action.completion_notes && (
                        <div className="mt-2 bg-green-50 border border-green-200 rounded-lg px-3 py-2">
                          <p className="text-xs text-green-800">
                            <span className="font-medium">Completion Notes:</span> {action.completion_notes}
                          </p>
                        </div>
                      )}
                    </div>

                    {/* Action buttons */}
                    <div className="flex items-center gap-1 shrink-0">
                      {action.status !== 'Completed' && (
                        <>
                          {/* Status change dropdown */}
                          <div className="relative">
                            <button
                              onClick={() =>
                                setActionStatusForm(
                                  actionStatusForm?.id === action.id ? null : { id: action.id, status: action.status }
                                )
                              }
                              className="p-1.5 rounded-lg text-text-tertiary hover:bg-canvas hover:text-primary-600 transition-colors"
                              title="Change Status"
                            >
                              <ChevronDown size={14} />
                            </button>
                            {actionStatusForm?.id === action.id && (
                              <>
                                <div className="fixed inset-0 z-10" onClick={() => setActionStatusForm(null)} />
                                <div className="absolute right-0 mt-1 w-40 bg-surface border border-border rounded-xl shadow-lg z-20 py-1">
                                  {['Pending', 'In Progress', 'Completed', 'Overdue']
                                    .filter(s => s !== action.status)
                                    .map(status => (
                                      <button
                                        key={status}
                                        onClick={() => onStatusUpdate(action.id, status)}
                                        className="w-full text-left px-3 py-2 text-xs hover:bg-canvas transition-colors flex items-center gap-2"
                                      >
                                        <Badge variant={ACTION_STATUS_BADGE_MAP[status] ?? 'neutral'} dot>
                                          {status}
                                        </Badge>
                                      </button>
                                    ))}
                                </div>
                              </>
                            )}
                          </div>

                          <button
                            onClick={() => startEditing(action)}
                            className="p-1.5 rounded-lg text-text-tertiary hover:bg-canvas hover:text-primary-600 transition-colors"
                            title="Edit"
                          >
                            <Edit size={14} />
                          </button>
                        </>
                      )}
                      <button
                        onClick={() => onDelete(action.id)}
                        className="p-1.5 rounded-lg text-text-tertiary hover:bg-canvas hover:text-danger-600 transition-colors"
                        title="Delete"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Add Action Form */}
      {showForm && (
        <div className={`border border-primary-200 rounded-xl p-4 bg-primary-50/20 space-y-3 ${actions.length > 0 ? 'mt-3' : ''}`}>
          <h4 className="text-sm font-semibold text-text-primary flex items-center gap-2">
            <Plus size={14} /> New Corrective Action
          </h4>
          <div>
            <label className="block text-xs font-medium text-text-secondary mb-1">
              Title <span className="text-danger-500">*</span>
            </label>
            <input
              type="text"
              value={form.title}
              onChange={e => setForm({ ...form, title: e.target.value })}
              className="input-field w-full"
              placeholder="Action title..."
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-text-secondary mb-1">Description</label>
            <textarea
              value={form.description}
              onChange={e => setForm({ ...form, description: e.target.value })}
              className="input-field w-full"
              rows={2}
              placeholder="Describe the corrective action..."
            />
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-medium text-text-secondary mb-1">Assigned To</label>
              <input
                type="text"
                value={form.assigned_to_name}
                onChange={e => setForm({ ...form, assigned_to_name: e.target.value })}
                className="input-field w-full"
                placeholder="Person name"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-text-secondary mb-1">
                Due Date <span className="text-danger-500">*</span>
              </label>
              <input
                type="date"
                value={form.due_date}
                onChange={e => setForm({ ...form, due_date: e.target.value })}
                className="input-field w-full"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-text-secondary mb-1">Priority</label>
              <select
                value={form.priority}
                onChange={e => setForm({ ...form, priority: e.target.value })}
                className="input-field w-full"
              >
                <option value="Low">Low</option>
                <option value="Medium">Medium</option>
                <option value="High">High</option>
              </select>
            </div>
          </div>
          <div className="flex justify-end gap-2 pt-1">
            <button onClick={() => setShowForm(false)} className="btn-secondary px-4 py-2 text-xs rounded-lg">
              Cancel
            </button>
            <button
              onClick={onSubmit}
              disabled={!form.title.trim() || !form.due_date}
              className="btn-primary px-4 py-2 text-xs rounded-lg disabled:opacity-50 flex items-center gap-1.5"
            >
              <Plus size={13} /> Add Action
            </button>
          </div>
        </div>
      )}
    </SectionCard>
  );
}

// ─── Timeline / Audit History Section ─────────────

const LOG_TYPE_CONFIG: Record<string, { icon: React.ReactNode; color: string }> = {
  created: { icon: <Plus size={12} />, color: 'bg-green-100 text-green-600 border-green-200' },
  status_changed: { icon: <ArrowRightCircle size={12} />, color: 'bg-blue-100 text-blue-600 border-blue-200' },
  investigation_added: { icon: <Search size={12} />, color: 'bg-purple-100 text-purple-600 border-purple-200' },
  action_added: { icon: <Clipboard size={12} />, color: 'bg-amber-100 text-amber-600 border-amber-200' },
  action_updated: { icon: <Edit size={12} />, color: 'bg-amber-100 text-amber-600 border-amber-200' },
  action_completed: { icon: <CheckCircle size={12} />, color: 'bg-green-100 text-green-600 border-green-200' },
  action_removed: { icon: <Trash2 size={12} />, color: 'bg-red-100 text-red-600 border-red-200' },
  evidence_uploaded: { icon: <Upload size={12} />, color: 'bg-indigo-100 text-indigo-600 border-indigo-200' },
  evidence_removed: { icon: <Trash2 size={12} />, color: 'bg-red-100 text-red-600 border-red-200' },
  assigned: { icon: <UserCheck size={12} />, color: 'bg-cyan-100 text-cyan-600 border-cyan-200' },
  edited: { icon: <Edit size={12} />, color: 'bg-gray-100 text-gray-600 border-gray-200' },
  closed: { icon: <CheckCircle size={12} />, color: 'bg-green-100 text-green-600 border-green-200' },
  reopened: { icon: <AlertTriangle size={12} />, color: 'bg-rose-100 text-rose-600 border-rose-200' },
  escalated: { icon: <Flame size={12} />, color: 'bg-red-100 text-red-600 border-red-200' },
};

const DEFAULT_LOG_CONFIG = { icon: <Activity size={12} />, color: 'bg-gray-100 text-gray-600 border-gray-200' };

function TimelineSection({ logs }: { logs: IncidentLogItem[] }) {
  return (
    <SectionCard title={`Audit History (${logs.length})`} icon={<Clock size={14} />}>
      {logs.length === 0 ? (
        <div className="text-center py-8">
          <Clock size={32} className="mx-auto text-text-tertiary/40 mb-2" />
          <p className="text-sm text-text-tertiary">No activity recorded yet</p>
        </div>
      ) : (
        <div className="relative">
          {/* Connecting line */}
          <div className="absolute left-[15px] top-4 bottom-4 w-px bg-border" />

          <div className="space-y-0">
            {logs.map((log, idx) => {
              const config = LOG_TYPE_CONFIG[log.action_type] ?? DEFAULT_LOG_CONFIG;
              return (
                <div key={log.id} className="flex gap-3 relative pb-4">
                  {/* Icon circle */}
                  <div
                    className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 z-10 border ${config.color}`}
                  >
                    {config.icon}
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0 pt-0.5">
                    <p className="text-sm text-text-primary leading-snug">
                      {log.description || log.action_type.replace(/_/g, ' ')}
                    </p>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-[10px] text-text-tertiary flex items-center gap-1">
                        <User size={9} /> {log.user_name}
                      </span>
                      <span className="text-[10px] text-text-tertiary flex items-center gap-1">
                        <Clock size={9} /> {formatDateTime(log.created_at)}
                      </span>
                    </div>
                    {log.old_value && log.new_value && (
                      <div className="mt-1.5 text-[11px] flex items-center gap-1.5">
                        <span className="line-through text-red-400 bg-red-50 px-1.5 py-0.5 rounded">{log.old_value}</span>
                        <ArrowRightCircle size={10} className="text-text-tertiary shrink-0" />
                        <span className="text-green-600 font-medium bg-green-50 px-1.5 py-0.5 rounded">{log.new_value}</span>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </SectionCard>
  );
}

// ═══════════════════════════════════════════════════
// Utility Functions
// ═══════════════════════════════════════════════════

function formatDate(dateStr: string | null | undefined): string | null {
  if (!dateStr) return null;
  try {
    return new Date(dateStr).toLocaleDateString('en-GB', {
      day: '2-digit', month: 'short', year: 'numeric',
    });
  } catch {
    return dateStr;
  }
}

function formatDateTime(dateStr: string | null | undefined): string | null {
  if (!dateStr) return null;
  try {
    return new Date(dateStr).toLocaleDateString('en-GB', {
      day: '2-digit', month: 'short', year: 'numeric',
      hour: '2-digit', minute: '2-digit',
    });
  } catch {
    return dateStr;
  }
}
