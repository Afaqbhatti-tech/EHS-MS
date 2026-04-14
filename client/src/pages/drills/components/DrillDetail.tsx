import { useState, useMemo, useEffect } from 'react';
import {
  X, Calendar, Clock, Users, Eye, AlertTriangle, CheckCircle, Plus,
  Upload, Trash2, Edit3, FileText, ClipboardList, XCircle,
  PlayCircle, Star, UserPlus, MapPin, ExternalLink, Loader2,
} from 'lucide-react';
import Badge from '../../../components/ui/Badge';
import Modal from '../../../components/ui/Modal';
import SelectWithOther from '../../../components/ui/SelectWithOther';
import type {
  MockDrill, DrillParticipant, DrillObservation, DrillAction,
  DrillEvaluation, DrillLog, DrillResource, DrillEvidence,
} from '../useDrills';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:8000/api';
const STORAGE_BASE = API_BASE.replace('/api', '') + '/storage/';

// ─── Props ──────────────────────────────────────

interface Props {
  drill: MockDrill | null;
  isLoading: boolean;
  onClose: () => void;
  onConduct: (id: number, data: Record<string, unknown>) => Promise<void>;
  onClose_drill: (id: number, data: Record<string, unknown>) => Promise<void>;
  onCancel: (id: number, data: Record<string, unknown>) => Promise<void>;
  onAddParticipant: (drillId: number, data: Record<string, unknown>) => Promise<void>;
  onUpdateParticipant: (drillId: number, participantId: number, data: Record<string, unknown>) => Promise<void>;
  onRemoveParticipant: (drillId: number, participantId: number) => Promise<void>;
  onBulkAddParticipants: (drillId: number, participants: Record<string, unknown>[]) => Promise<void>;
  onAddResource: (drillId: number, data: Record<string, unknown>) => Promise<void>;
  onUpdateResource: (drillId: number, resourceId: number, data: Record<string, unknown>) => Promise<void>;
  onRemoveResource: (drillId: number, resourceId: number) => Promise<void>;
  onAddObservation: (drillId: number, data: Record<string, unknown>) => Promise<void>;
  onUpdateObservation: (drillId: number, obsId: number, data: Record<string, unknown>) => Promise<void>;
  onDeleteObservation: (drillId: number, obsId: number) => Promise<void>;
  onAddAction: (drillId: number, data: Record<string, unknown>) => Promise<void>;
  onUpdateAction: (drillId: number, actionId: number, data: Record<string, unknown>) => Promise<void>;
  onSaveEvaluation: (drillId: number, data: Record<string, unknown>) => Promise<void>;
  onUploadEvidence: (drillId: number, files: File[], linkedType: string, linkedId?: number) => Promise<void>;
}

// ─── Tab type ──────────────────────────────────

type Tab = 'overview' | 'participants' | 'resources' | 'observations' | 'actions' | 'evaluation' | 'evidence' | 'log';

// ─── Dropdown option arrays ─────────────────────

const RESOURCE_TYPES = ['Fire Equipment', 'First Aid', 'Communication', 'PPE', 'Vehicle', 'Signage', 'Other'] as const;
const OBSERVATION_CATEGORIES = ['Response Time', 'Communication', 'Evacuation', 'Equipment', 'Coordination', 'Safety', 'Awareness', 'Procedure', 'Other'] as const;

// ─── Status helpers ────────────────────────────

const drillStatusStyles: Record<string, string> = {
  Planned: 'bg-neutral-100 text-neutral-700',
  Scheduled: 'bg-blue-100 text-blue-600',
  'In Progress': 'bg-amber-100 text-amber-700',
  Conducted: 'bg-[#EDE9FE] text-[#5B21B6]',
  'Under Review': 'bg-amber-50 text-amber-700',
  Closed: 'bg-green-100 text-green-700',
  Cancelled: 'bg-neutral-100 text-neutral-500',
};

function DrillStatusBadge({ status }: { status: string }) {
  const cls = drillStatusStyles[status] ?? 'bg-neutral-100 text-neutral-600';
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-[3px] rounded-full text-[11px] font-medium leading-tight ${cls}`}>
      <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${
        cls.includes('green') ? 'bg-green-500' :
        cls.includes('red') ? 'bg-red-500' :
        cls.includes('blue') ? 'bg-blue-500' :
        cls.includes('amber') ? 'bg-amber-500' :
        cls.includes('#5B21B6') ? 'bg-purple-500' :
        'bg-neutral-400'
      }`} />
      {status}
    </span>
  );
}

const severityColors: Record<string, string> = {
  Low: 'bg-blue-100 text-blue-700',
  Medium: 'bg-amber-100 text-amber-700',
  High: 'bg-red-100 text-red-700',
  Critical: 'bg-red-200 text-red-800 font-bold',
};

const priorityColors: Record<string, string> = {
  Low: 'bg-blue-100 text-blue-700',
  Medium: 'bg-amber-100 text-amber-700',
  High: 'bg-red-100 text-red-700',
  Critical: 'bg-red-200 text-red-800 font-bold',
};

const obsTypeColors: Record<string, string> = {
  Positive: 'bg-green-100 text-green-700',
  Negative: 'bg-red-100 text-red-700',
  Improvement: 'bg-amber-100 text-amber-700',
  General: 'bg-neutral-100 text-neutral-700',
};

const actionStatusColors: Record<string, string> = {
  Open: 'bg-blue-100 text-blue-700',
  'In Progress': 'bg-amber-100 text-amber-700',
  Completed: 'bg-green-100 text-green-700',
  Closed: 'bg-green-100 text-green-700',
  Overdue: 'bg-red-100 text-red-700',
};

const logDotColors: Record<string, string> = {
  created: 'bg-neutral-400',
  conducted: 'bg-purple-500',
  observation_added: 'bg-orange-500',
  observation_updated: 'bg-orange-400',
  observation_deleted: 'bg-orange-300',
  action_added: 'bg-amber-500',
  action_updated: 'bg-amber-400',
  evaluated: 'bg-blue-500',
  evaluation_saved: 'bg-blue-500',
  closed: 'bg-green-500',
  cancelled: 'bg-red-500',
  participant_added: 'bg-indigo-400',
  participant_removed: 'bg-indigo-300',
  resource_added: 'bg-teal-400',
  resource_removed: 'bg-teal-300',
  evidence_uploaded: 'bg-cyan-500',
  status_changed: 'bg-purple-400',
};

// ─── Date/Time helpers ─────────────────────────

function fmtDate(d: string | null | undefined): string {
  if (!d) return '--';
  try {
    return new Date(d).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
  } catch {
    return d;
  }
}

function fmtDateTime(d: string | null | undefined): string {
  if (!d) return '--';
  try {
    return new Date(d).toLocaleString('en-GB', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
  } catch {
    return d;
  }
}

function fmtTime(d: string | null | undefined): string {
  if (!d) return '--';
  try {
    return new Date(d).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
  } catch {
    return d;
  }
}

function timeDiffMinutes(start: string | null | undefined, end: string | null | undefined): string {
  if (!start || !end) return '--';
  try {
    const diff = Math.round((new Date(end).getTime() - new Date(start).getTime()) / 60000);
    if (diff < 0) return '--';
    return `${diff} min`;
  } catch {
    return '--';
  }
}

// ─── Main Component ────────────────────────────

export default function DrillDetail({
  drill: d, isLoading, onClose,
  onConduct, onClose_drill, onCancel,
  onAddParticipant, onUpdateParticipant, onRemoveParticipant, onBulkAddParticipants,
  onAddResource, onUpdateResource, onRemoveResource,
  onAddObservation, onUpdateObservation, onDeleteObservation,
  onAddAction, onUpdateAction,
  onSaveEvaluation,
  onUploadEvidence,
}: Props) {
  const [activeTab, setActiveTab] = useState<Tab>('overview');

  // Modal states
  const [showConductModal, setShowConductModal] = useState(false);
  const [showCloseModal, setShowCloseModal] = useState(false);
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [showParticipantModal, setShowParticipantModal] = useState(false);
  const [showBulkParticipantModal, setShowBulkParticipantModal] = useState(false);
  const [showResourceModal, setShowResourceModal] = useState(false);
  const [showObservationModal, setShowObservationModal] = useState(false);
  const [showActionModal, setShowActionModal] = useState(false);
  const [showEditParticipantModal, setShowEditParticipantModal] = useState(false);
  const [showEditResourceModal, setShowEditResourceModal] = useState(false);

  // Edit targets
  const [editParticipant, setEditParticipant] = useState<DrillParticipant | null>(null);
  const [editResource, setEditResource] = useState<DrillResource | null>(null);

  // Submitting state
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Loading / empty
  if (isLoading || !d) {
    return (
      <>
        <div className="fixed inset-0 bg-black/40 z-40" onClick={onClose} />
        <div className="fixed inset-y-0 right-0 w-full sm:w-[720px] bg-surface shadow-xl z-50 flex items-center justify-center">
          <div className="flex flex-col items-center gap-3 text-text-secondary">
            <Loader2 size={28} className="animate-spin" />
            <p className="text-sm">Loading drill details...</p>
          </div>
        </div>
      </>
    );
  }

  const drillId = Number(d.id);
  const participants = d.participants ?? [];
  const resources = d.resources ?? [];
  const observations = d.observations ?? [];
  const actions = d.actions ?? [];
  const evaluation = d.evaluation ?? null;
  const evidence = d.evidence ?? [];
  const logs = d.logs ?? [];

  const isPlanned = d.status === 'Planned' || d.status === 'Scheduled';
  const isConducted = d.status === 'Conducted' || d.status === 'Under Review';
  const isClosed = d.status === 'Closed';
  const isCancelled = d.status === 'Cancelled';
  const isActive = !isClosed && !isCancelled;

  const tabs: { id: Tab; label: string; count?: number }[] = [
    { id: 'overview', label: 'Overview' },
    { id: 'participants', label: 'Participants', count: participants.length },
    { id: 'resources', label: 'Resources', count: resources.length },
    { id: 'observations', label: 'Observations', count: observations.length },
    { id: 'actions', label: 'Actions', count: actions.length },
    { id: 'evaluation', label: 'Evaluation' },
    { id: 'evidence', label: 'Evidence', count: evidence.length },
    { id: 'log', label: 'Audit Log' },
  ];

  return (
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 bg-black/40 z-40" onClick={onClose} />

      {/* Drawer */}
      <div className="fixed inset-y-0 right-0 w-full sm:w-[720px] bg-surface shadow-xl z-50 flex flex-col overflow-hidden animate-slideInRight">
        {/* ── HEADER ────────────────────────────────── */}
        <div className="shrink-0 border-b border-border">
          {/* Top row */}
          <div className="flex items-start justify-between px-6 pt-5 pb-3">
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2.5 flex-wrap">
                <span className="font-mono text-xs font-bold text-primary-700 bg-primary-50 px-2 py-0.5 rounded">{d.drill_code}</span>
                <DrillStatusBadge status={d.status} />
                {d.drill_type && (
                  <Badge variant="neutral">{d.drill_type}</Badge>
                )}
              </div>
              <h2 className="text-lg font-bold text-text-primary mt-1.5 line-clamp-2">{d.title}</h2>
              {d.erp && (
                <div className="flex items-center gap-1.5 mt-1 text-xs text-text-secondary">
                  <ExternalLink size={11} />
                  <span>Linked to ERP: <span className="font-semibold text-primary-600">{d.erp.erp_code}</span> - {d.erp.title}</span>
                </div>
              )}
            </div>
            <button onClick={onClose} className="p-2 rounded-lg text-text-tertiary hover:bg-canvas hover:text-text-primary transition-colors shrink-0 ml-3">
              <XIcon size={20} />
            </button>
          </div>

          {/* Quick stats row */}
          <div className="flex items-center gap-4 px-6 pb-3 overflow-x-auto text-xs text-text-secondary">
            <span className="flex items-center gap-1.5 whitespace-nowrap"><Calendar size={12} /> {fmtDate(d.planned_date)}</span>
            <span className="flex items-center gap-1.5 whitespace-nowrap"><Clock size={12} /> {d.total_duration_minutes ? `${d.total_duration_minutes} min` : '--'}</span>
            <span className="flex items-center gap-1.5 whitespace-nowrap"><Users size={12} /> {participants.length} participants</span>
            <span className="flex items-center gap-1.5 whitespace-nowrap"><Eye size={12} /> {observations.length} obs</span>
            <span className="flex items-center gap-1.5 whitespace-nowrap"><ClipboardList size={12} /> {actions.length} actions</span>
            {evaluation?.final_score != null && (
              <span className="flex items-center gap-1.5 whitespace-nowrap"><Star size={12} className="text-amber-500" /> {evaluation.final_score}%</span>
            )}
          </div>

          {/* Action buttons */}
          <div className="flex items-center gap-2 px-6 pb-3 flex-wrap">
            {isPlanned && (
              <button onClick={() => setShowConductModal(true)} className="btn-primary px-4 py-1.5 text-xs rounded-lg flex items-center gap-1.5">
                <PlayCircle size={13} /> Conduct Drill
              </button>
            )}
            {isConducted && (
              <button onClick={() => setShowCloseModal(true)} className="btn-primary px-4 py-1.5 text-xs rounded-lg flex items-center gap-1.5">
                <CheckCircle size={13} /> Close Drill
              </button>
            )}
            {isActive && (
              <button onClick={() => setShowCancelModal(true)} className="btn-secondary px-3 py-1.5 text-xs rounded-lg flex items-center gap-1.5 text-danger-600 hover:bg-danger-50">
                <XCircle size={13} /> Cancel
              </button>
            )}
          </div>
        </div>

        {/* ── TABS ──────────────────────────────────── */}
        <div className="flex border-b border-border px-6 bg-surface overflow-x-auto shrink-0">
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-1.5 px-3 py-2.5 text-xs font-medium border-b-2 transition-colors whitespace-nowrap ${
                activeTab === tab.id
                  ? 'border-primary-500 text-primary-700'
                  : 'border-transparent text-text-secondary hover:text-text-primary'
              }`}
            >
              {tab.label}
              {tab.count !== undefined && tab.count > 0 && (
                <span className="px-1.5 py-0.5 text-[10px] font-bold bg-neutral-100 text-neutral-600 rounded-full">{tab.count}</span>
              )}
            </button>
          ))}
        </div>

        {/* ── CONTENT ───────────────────────────────── */}
        <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain px-6 py-5">
          {activeTab === 'overview' && <OverviewTab drill={d} participants={participants} observations={observations} actions={actions} evaluation={evaluation} />}
          {activeTab === 'participants' && (
            <ParticipantsTab
              participants={participants}
              isActive={isActive}
              onAdd={() => setShowParticipantModal(true)}
              onBulkAdd={() => setShowBulkParticipantModal(true)}
              onEdit={(p) => { setEditParticipant(p); setShowEditParticipantModal(true); }}
              onRemove={(pId) => onRemoveParticipant(drillId, Number(pId))}
            />
          )}
          {activeTab === 'resources' && (
            <ResourcesTab
              resources={resources}
              isActive={isActive}
              onAdd={() => setShowResourceModal(true)}
              onEdit={(r) => { setEditResource(r); setShowEditResourceModal(true); }}
              onRemove={(rId) => onRemoveResource(drillId, Number(rId))}
            />
          )}
          {activeTab === 'observations' && (
            <ObservationsTab
              observations={observations}
              isActive={isActive}
              onAdd={() => setShowObservationModal(true)}
              onDelete={(oId) => onDeleteObservation(drillId, Number(oId))}
            />
          )}
          {activeTab === 'actions' && (
            <ActionsTab
              actions={actions}
              isActive={isActive}
              onAdd={() => setShowActionModal(true)}
              onUpdate={(aId, data) => onUpdateAction(drillId, Number(aId), data)}
            />
          )}
          {activeTab === 'evaluation' && (
            <EvaluationTab
              evaluation={evaluation}
              drillId={drillId}
              isActive={isActive}
              onSave={onSaveEvaluation}
            />
          )}
          {activeTab === 'evidence' && (
            <EvidenceTab
              evidence={evidence}
              drillId={drillId}
              isActive={isActive}
              onUpload={onUploadEvidence}
            />
          )}
          {activeTab === 'log' && <AuditLogTab logs={logs} />}
        </div>
      </div>

      {/* ── MODALS ────────────────────────────────── */}

      {/* Conduct Drill Modal */}
      <ConductModal
        open={showConductModal}
        onClose={() => setShowConductModal(false)}
        onSubmit={async (data) => {
          setIsSubmitting(true);
          try { await onConduct(drillId, data); setShowConductModal(false); } finally { setIsSubmitting(false); }
        }}
        isSubmitting={isSubmitting}
      />

      {/* Close Drill Modal */}
      <CloseDrillModal
        open={showCloseModal}
        onClose={() => setShowCloseModal(false)}
        drill={d}
        onSubmit={async (data) => {
          setIsSubmitting(true);
          try { await onClose_drill(drillId, data); setShowCloseModal(false); } finally { setIsSubmitting(false); }
        }}
        isSubmitting={isSubmitting}
      />

      {/* Cancel Modal */}
      <CancelModal
        open={showCancelModal}
        onClose={() => setShowCancelModal(false)}
        onSubmit={async (data) => {
          setIsSubmitting(true);
          try { await onCancel(drillId, data); setShowCancelModal(false); } finally { setIsSubmitting(false); }
        }}
        isSubmitting={isSubmitting}
      />

      {/* Add Participant Modal */}
      <ParticipantFormModal
        open={showParticipantModal}
        onClose={() => setShowParticipantModal(false)}
        onSubmit={async (data) => {
          setIsSubmitting(true);
          try { await onAddParticipant(drillId, data); setShowParticipantModal(false); } finally { setIsSubmitting(false); }
        }}
        isSubmitting={isSubmitting}
        title="Add Participant"
      />

      {/* Edit Participant Modal */}
      <ParticipantFormModal
        open={showEditParticipantModal}
        onClose={() => { setShowEditParticipantModal(false); setEditParticipant(null); }}
        onSubmit={async (data) => {
          if (!editParticipant) return;
          setIsSubmitting(true);
          try { await onUpdateParticipant(drillId, Number(editParticipant.id), data); setShowEditParticipantModal(false); setEditParticipant(null); } finally { setIsSubmitting(false); }
        }}
        isSubmitting={isSubmitting}
        title="Edit Participant"
        initial={editParticipant}
      />

      {/* Bulk Add Participants Modal */}
      <BulkParticipantModal
        open={showBulkParticipantModal}
        onClose={() => setShowBulkParticipantModal(false)}
        onSubmit={async (rows) => {
          setIsSubmitting(true);
          try { await onBulkAddParticipants(drillId, rows); setShowBulkParticipantModal(false); } finally { setIsSubmitting(false); }
        }}
        isSubmitting={isSubmitting}
      />

      {/* Add Resource Modal */}
      <ResourceFormModal
        open={showResourceModal}
        onClose={() => setShowResourceModal(false)}
        onSubmit={async (data) => {
          setIsSubmitting(true);
          try { await onAddResource(drillId, data); setShowResourceModal(false); } finally { setIsSubmitting(false); }
        }}
        isSubmitting={isSubmitting}
        title="Add Resource"
      />

      {/* Edit Resource Modal */}
      <ResourceFormModal
        open={showEditResourceModal}
        onClose={() => { setShowEditResourceModal(false); setEditResource(null); }}
        onSubmit={async (data) => {
          if (!editResource) return;
          setIsSubmitting(true);
          try { await onUpdateResource(drillId, Number(editResource.id), data); setShowEditResourceModal(false); setEditResource(null); } finally { setIsSubmitting(false); }
        }}
        isSubmitting={isSubmitting}
        title="Edit Resource"
        initial={editResource}
      />

      {/* Add Observation Modal */}
      <ObservationFormModal
        open={showObservationModal}
        onClose={() => setShowObservationModal(false)}
        onSubmit={async (data) => {
          setIsSubmitting(true);
          try { await onAddObservation(drillId, data); setShowObservationModal(false); } finally { setIsSubmitting(false); }
        }}
        isSubmitting={isSubmitting}
      />

      {/* Add Action Modal */}
      <ActionFormModal
        open={showActionModal}
        onClose={() => setShowActionModal(false)}
        onSubmit={async (data) => {
          setIsSubmitting(true);
          try { await onAddAction(drillId, data); setShowActionModal(false); } finally { setIsSubmitting(false); }
        }}
        isSubmitting={isSubmitting}
        observations={observations}
      />
    </>
  );
}

// ═══════════════════════════════════════════════════
// TAB COMPONENTS
// ═══════════════════════════════════════════════════

// ─── Overview Tab ──────────────────────────────

function OverviewTab({ drill: d, participants, observations, actions, evaluation }: {
  drill: MockDrill; participants: DrillParticipant[]; observations: DrillObservation[];
  actions: DrillAction[]; evaluation: DrillEvaluation | null;
}) {
  const positiveObs = observations.filter(o => o.observation_type === 'Positive').length;
  const negativeObs = observations.filter(o => o.observation_type === 'Negative').length;
  const totalObs = observations.length;

  const openActions = actions.filter(a => a.status === 'Open' || a.status === 'In Progress').length;
  const closedActions = actions.filter(a => a.status === 'Completed' || a.status === 'Closed').length;
  const overdueActions = actions.filter(a => a.status !== 'Completed' && a.status !== 'Closed' && a.due_date && new Date(a.due_date) < new Date()).length;

  return (
    <div className="flex gap-5">
      {/* Left Column - 60% */}
      <div className="flex-[3] space-y-5 min-w-0">
        {/* Planning Details */}
        <Section title="Planning Details">
          <Grid>
            <Field label="Type" value={d.drill_type} />
            <Field label="ERP" value={d.erp ? `${d.erp.erp_code} - ${d.erp.title}` : null} />
            <Field label="Location" value={d.location} />
            <Field label="Area" value={d.area} />
            <Field label="Department" value={d.department} />
            <Field label="Planned Date" value={fmtDate(d.planned_date)} />
            <Field label="Planned Time" value={d.planned_time ?? '--'} />
            <Field label="Responsible Person" value={d.responsible_person} />
            <Field label="Conducted By" value={d.conducted_by} />
            <Field label="Observed By" value={d.observed_by} />
            <Field label="Notification" value={d.notification_method} />
            <Field label="Announced" value={d.drill_announced != null ? (d.drill_announced ? 'Yes' : 'No') : null} />
            <Field label="Pre-drill Briefing" value={d.pre_drill_briefing != null ? (d.pre_drill_briefing ? 'Yes' : 'No') : null} />
            <Field label="Weather" value={d.weather_conditions} />
            <Field label="Expected Participants" value={d.expected_participants?.toString()} />
            <Field label="Actual Participants" value={d.actual_participants?.toString()} />
          </Grid>
        </Section>

        {/* Scenario */}
        {(d.scenario || d.description || d.objectives) && (
          <Section title="Scenario & Objectives">
            {d.scenario && (
              <div className="mb-3">
                <p className="text-[10px] text-text-tertiary uppercase tracking-wide mb-1">Scenario Description</p>
                <p className="text-sm text-text-primary whitespace-pre-wrap">{d.scenario}</p>
              </div>
            )}
            {d.description && (
              <div className="mb-3">
                <p className="text-[10px] text-text-tertiary uppercase tracking-wide mb-1">Description</p>
                <p className="text-sm text-text-primary whitespace-pre-wrap">{d.description}</p>
              </div>
            )}
            {d.objectives && d.objectives.length > 0 && (
              <div>
                <p className="text-[10px] text-text-tertiary uppercase tracking-wide mb-1">Objectives</p>
                <ul className="list-disc list-inside text-sm text-text-primary space-y-0.5">
                  {d.objectives.map((obj, i) => <li key={i}>{obj}</li>)}
                </ul>
              </div>
            )}
          </Section>
        )}

        {/* Timing (if conducted) */}
        {d.actual_start && (
          <Section title="Timing">
            <div className="space-y-3">
              <TimelineEvent label="Actual Start" time={fmtDateTime(d.actual_start)} diff={null} dotColor="bg-blue-500" />
              {d.actual_end && (
                <TimelineEvent label="Actual End" time={fmtDateTime(d.actual_end)} diff={timeDiffMinutes(d.actual_start, d.actual_end)} dotColor="bg-green-500" />
              )}
            </div>
          </Section>
        )}

        {/* Remarks */}
        {d.remarks && (
          <Section title="Remarks">
            <p className="text-sm text-text-primary whitespace-pre-wrap">{d.remarks}</p>
          </Section>
        )}

        {/* Close info */}
        {d.closed_at && (
          <Section title="Closure">
            <Grid>
              <Field label="Closed By" value={d.closed_by_name} />
              <Field label="Closed At" value={fmtDateTime(d.closed_at)} />
            </Grid>
            {d.close_notes && (
              <div className="mt-3">
                <p className="text-[10px] text-text-tertiary uppercase tracking-wide mb-1">Close Notes</p>
                <p className="text-sm text-text-primary whitespace-pre-wrap">{d.close_notes}</p>
              </div>
            )}
          </Section>
        )}

        {/* Cancellation info */}
        {d.cancelled_at && (
          <Section title="Cancellation">
            <Grid>
              <Field label="Cancelled At" value={fmtDateTime(d.cancelled_at)} />
            </Grid>
            {d.cancel_reason && (
              <div className="mt-3">
                <p className="text-[10px] text-text-tertiary uppercase tracking-wide mb-1">Reason</p>
                <p className="text-sm text-text-primary whitespace-pre-wrap">{d.cancel_reason}</p>
              </div>
            )}
          </Section>
        )}
      </div>

      {/* Right Column - 40% */}
      <div className="flex-[2] space-y-5 min-w-0">
        {/* ERP Reference */}
        {d.erp && (
          <Section title="ERP Reference">
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <span className="font-mono text-xs font-bold text-primary-700">{d.erp.erp_code}</span>
                <Badge variant="info">{d.erp.erp_type}</Badge>
              </div>
              <p className="text-sm font-medium text-text-primary">{d.erp.title}</p>
            </div>
          </Section>
        )}

        {/* Quick Stats */}
        <Section title="Quick Stats">
          <div className="space-y-3">
            {/* Observation types bar */}
            <div>
              <p className="text-[10px] text-text-tertiary uppercase tracking-wide mb-1.5">Observations ({totalObs})</p>
              {totalObs > 0 ? (
                <div className="h-3 rounded-full overflow-hidden flex bg-neutral-100">
                  {positiveObs > 0 && (
                    <div className="bg-green-400 h-full" style={{ width: `${(positiveObs / totalObs) * 100}%` }} title={`Positive: ${positiveObs}`} />
                  )}
                  {negativeObs > 0 && (
                    <div className="bg-red-400 h-full" style={{ width: `${(negativeObs / totalObs) * 100}%` }} title={`Negative: ${negativeObs}`} />
                  )}
                  {(totalObs - positiveObs - negativeObs) > 0 && (
                    <div className="bg-amber-300 h-full" style={{ width: `${((totalObs - positiveObs - negativeObs) / totalObs) * 100}%` }} title={`Other: ${totalObs - positiveObs - negativeObs}`} />
                  )}
                </div>
              ) : (
                <div className="h-3 rounded-full bg-neutral-100" />
              )}
              <div className="flex items-center gap-3 mt-1 text-[10px] text-text-tertiary">
                <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-green-400" /> Positive: {positiveObs}</span>
                <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-red-400" /> Negative: {negativeObs}</span>
                <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-amber-300" /> Other: {totalObs - positiveObs - negativeObs}</span>
              </div>
            </div>

            {/* Action summary */}
            <div>
              <p className="text-[10px] text-text-tertiary uppercase tracking-wide mb-1.5">Actions ({actions.length})</p>
              <div className="flex items-center gap-3 text-xs">
                <span className="text-blue-600 font-semibold">{openActions} Open</span>
                <span className="text-green-600 font-semibold">{closedActions} Closed</span>
                {overdueActions > 0 && <span className="text-red-600 font-semibold">{overdueActions} Overdue</span>}
              </div>
            </div>
          </div>
        </Section>

        {/* Evaluation summary */}
        {evaluation && evaluation.final_score != null && (
          <Section title="Evaluation Summary">
            <div className="flex items-center gap-4">
              <div className={`w-16 h-16 rounded-full flex items-center justify-center text-lg font-bold border-4 ${
                evaluation.final_score >= 80 ? 'border-green-400 text-green-700 bg-green-50' :
                evaluation.final_score >= 60 ? 'border-amber-400 text-amber-700 bg-amber-50' :
                'border-red-400 text-red-700 bg-red-50'
              }`}>
                {evaluation.final_score}%
              </div>
              <div>
                <Badge variant={evaluation.final_score >= 80 ? 'success' : evaluation.final_score >= 60 ? 'warning' : 'danger'}>
                  {evaluation.final_score >= 80 ? 'Satisfactory' : evaluation.final_score >= 60 ? 'Needs Improvement' : 'Unsatisfactory'}
                </Badge>
                {evaluation.objectives_met != null && (
                  <p className="text-xs text-text-secondary mt-1">
                    Objectives: {evaluation.objectives_met ? 'Met' : 'Not Met'}
                  </p>
                )}
              </div>
            </div>
          </Section>
        )}
      </div>
    </div>
  );
}

// ─── Timeline Event ────────────────────────────

function TimelineEvent({ label, time, diff, dotColor }: { label: string; time: string; diff: string | null; dotColor: string }) {
  return (
    <div className="flex items-start gap-3">
      <div className={`w-3 h-3 rounded-full ${dotColor} mt-1 shrink-0`} />
      <div className="flex-1">
        <div className="flex items-center justify-between">
          <p className="text-xs font-medium text-text-primary">{label}</p>
          {diff && <span className="text-[10px] text-text-tertiary">{diff}</span>}
        </div>
        <p className="text-xs text-text-secondary">{time}</p>
      </div>
    </div>
  );
}

// ─── Participants Tab ──────────────────────────

function ParticipantsTab({ participants, isActive, onAdd, onBulkAdd, onEdit, onRemove }: {
  participants: DrillParticipant[];
  isActive: boolean;
  onAdd: () => void;
  onBulkAdd: () => void;
  onEdit: (p: DrillParticipant) => void;
  onRemove: (id: string) => void;
}) {
  return (
    <div className="space-y-4">
      {isActive && (
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold text-text-primary">Participants ({participants.length})</h3>
          <div className="flex items-center gap-2">
            <button onClick={onBulkAdd} className="btn-secondary px-3 py-1.5 text-xs rounded-lg flex items-center gap-1">
              <UserPlus size={12} /> Bulk Add
            </button>
            <button onClick={onAdd} className="btn-primary px-3 py-1.5 text-xs rounded-lg flex items-center gap-1">
              <Plus size={12} /> Add Participant
            </button>
          </div>
        </div>
      )}

      {participants.length === 0 ? (
        <EmptyState message="No participants added yet" />
      ) : (
        <div className="border border-border rounded-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-canvas border-b border-border">
                  <th className="text-left px-3 py-2.5 text-[10px] font-semibold text-text-secondary uppercase tracking-wide">Name</th>
                  <th className="text-left px-3 py-2.5 text-[10px] font-semibold text-text-secondary uppercase tracking-wide">Employee ID</th>
                  <th className="text-left px-3 py-2.5 text-[10px] font-semibold text-text-secondary uppercase tracking-wide">Role</th>
                  <th className="text-left px-3 py-2.5 text-[10px] font-semibold text-text-secondary uppercase tracking-wide">Department</th>
                  <th className="text-left px-3 py-2.5 text-[10px] font-semibold text-text-secondary uppercase tracking-wide">Attendance</th>
                  {isActive && <th className="text-center px-3 py-2.5 text-[10px] font-semibold text-text-secondary uppercase tracking-wide w-20">Actions</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {participants.map(p => (
                  <tr key={p.id} className="hover:bg-canvas/50 transition-colors">
                    <td className="px-3 py-2.5 text-text-primary font-medium text-xs">{p.name}</td>
                    <td className="px-3 py-2.5 text-text-secondary text-xs font-mono">{p.employee_id || '--'}</td>
                    <td className="px-3 py-2.5 text-text-secondary text-xs">{p.role_in_drill || '--'}</td>
                    <td className="px-3 py-2.5 text-text-secondary text-xs">{p.department || '--'}</td>
                    <td className="px-3 py-2.5">
                      <Badge variant={p.attendance_status === 'Present' ? 'success' : p.attendance_status === 'Absent' ? 'danger' : 'neutral'}>
                        {p.attendance_status}
                      </Badge>
                    </td>
                    {isActive && (
                      <td className="px-3 py-2.5 text-center">
                        <div className="flex items-center justify-center gap-1">
                          <button onClick={() => onEdit(p)} className="p-1 text-text-tertiary hover:text-primary-600 transition-colors" title="Edit">
                            <Edit3 size={13} />
                          </button>
                          <button onClick={() => { if (confirm('Remove this participant?')) onRemove(p.id); }} className="p-1 text-text-tertiary hover:text-danger-600 transition-colors" title="Remove">
                            <Trash2 size={13} />
                          </button>
                        </div>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Resources Tab ─────────────────────────────

function ResourcesTab({ resources, isActive, onAdd, onEdit, onRemove }: {
  resources: DrillResource[];
  isActive: boolean;
  onAdd: () => void;
  onEdit: (r: DrillResource) => void;
  onRemove: (id: string) => void;
}) {
  return (
    <div className="space-y-4">
      {isActive && (
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold text-text-primary">Resources ({resources.length})</h3>
          <button onClick={onAdd} className="btn-primary px-3 py-1.5 text-xs rounded-lg flex items-center gap-1">
            <Plus size={12} /> Add Resource
          </button>
        </div>
      )}

      {resources.length === 0 ? (
        <EmptyState message="No resources added yet" />
      ) : (
        <div className="border border-border rounded-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-canvas border-b border-border">
                  <th className="text-left px-3 py-2.5 text-[10px] font-semibold text-text-secondary uppercase tracking-wide">Equipment / Name</th>
                  <th className="text-left px-3 py-2.5 text-[10px] font-semibold text-text-secondary uppercase tracking-wide">Type</th>
                  <th className="text-center px-3 py-2.5 text-[10px] font-semibold text-text-secondary uppercase tracking-wide">Qty</th>
                  <th className="text-left px-3 py-2.5 text-[10px] font-semibold text-text-secondary uppercase tracking-wide">Status</th>
                  <th className="text-left px-3 py-2.5 text-[10px] font-semibold text-text-secondary uppercase tracking-wide">Remarks</th>
                  {isActive && <th className="text-center px-3 py-2.5 text-[10px] font-semibold text-text-secondary uppercase tracking-wide w-20">Actions</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {resources.map(r => (
                  <tr key={r.id} className="hover:bg-canvas/50 transition-colors">
                    <td className="px-3 py-2.5 text-text-primary font-medium text-xs">{r.name}</td>
                    <td className="px-3 py-2.5 text-text-secondary text-xs">{r.resource_type}</td>
                    <td className="px-3 py-2.5 text-center text-text-secondary text-xs">{r.quantity ?? '--'}</td>
                    <td className="px-3 py-2.5">
                      <Badge variant={r.status === 'Available' ? 'success' : r.status === 'Functional' ? 'success' : r.status === 'Unavailable' ? 'danger' : 'neutral'}>
                        {r.status}
                      </Badge>
                    </td>
                    <td className="px-3 py-2.5 text-text-secondary text-xs truncate max-w-[120px]">{r.remarks || '--'}</td>
                    {isActive && (
                      <td className="px-3 py-2.5 text-center">
                        <div className="flex items-center justify-center gap-1">
                          <button onClick={() => onEdit(r)} className="p-1 text-text-tertiary hover:text-primary-600 transition-colors" title="Edit">
                            <Edit3 size={13} />
                          </button>
                          <button onClick={() => { if (confirm('Remove this resource?')) onRemove(r.id); }} className="p-1 text-text-tertiary hover:text-danger-600 transition-colors" title="Remove">
                            <Trash2 size={13} />
                          </button>
                        </div>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Observations Tab ──────────────────────────

function ObservationsTab({ observations, isActive, onAdd, onDelete }: {
  observations: DrillObservation[];
  isActive: boolean;
  onAdd: () => void;
  onDelete: (id: string) => void;
}) {
  const [filter, setFilter] = useState<string>('All');
  const filterOptions = ['All', 'Positive', 'Negative', 'Critical', 'High'];

  const filtered = useMemo(() => {
    if (filter === 'All') return observations;
    if (filter === 'Critical' || filter === 'High') return observations.filter(o => o.severity === filter);
    return observations.filter(o => o.observation_type === filter);
  }, [observations, filter]);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-1">
          {filterOptions.map(f => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-2.5 py-1 text-xs font-medium rounded-lg transition-colors ${
                filter === f
                  ? 'bg-primary-100 text-primary-700'
                  : 'text-text-secondary hover:bg-canvas'
              }`}
            >
              {f}
              {f !== 'All' && (
                <span className="ml-1 text-[10px]">
                  ({f === 'Critical' || f === 'High'
                    ? observations.filter(o => o.severity === f).length
                    : observations.filter(o => o.observation_type === f).length})
                </span>
              )}
            </button>
          ))}
        </div>
        {isActive && (
          <button onClick={onAdd} className="btn-primary px-3 py-1.5 text-xs rounded-lg flex items-center gap-1">
            <Plus size={12} /> Add Observation
          </button>
        )}
      </div>

      {filtered.length === 0 ? (
        <EmptyState message="No observations found" />
      ) : (
        <div className="space-y-3">
          {filtered.map(o => (
            <div key={o.id} className="border border-border rounded-xl p-4 bg-canvas hover:shadow-sm transition-shadow">
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap mb-1.5">
                    {o.severity && (
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-medium ${severityColors[o.severity] ?? 'bg-neutral-100 text-neutral-600'}`}>{o.severity}</span>
                    )}
                    {o.category && <Badge variant="neutral">{o.category}</Badge>}
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-medium ${obsTypeColors[o.observation_type] ?? 'bg-neutral-100 text-neutral-600'}`}>{o.observation_type}</span>
                  </div>
                  <p className="text-sm text-text-primary">{o.description}</p>
                  <div className="flex items-center gap-3 mt-2 text-[10px] text-text-tertiary">
                    {o.observed_by_name && <span className="flex items-center gap-1"><Users size={10} /> {o.observed_by_name}</span>}
                    {o.area && <span className="flex items-center gap-1"><MapPin size={10} /> {o.area}</span>}
                    <span>{fmtDateTime(o.created_at)}</span>
                  </div>
                </div>
                {isActive && (
                  <button
                    onClick={() => { if (confirm('Delete this observation?')) onDelete(o.id); }}
                    className="p-1.5 text-text-tertiary hover:text-danger-600 transition-colors shrink-0"
                    title="Delete"
                  >
                    <Trash2 size={14} />
                  </button>
                )}
              </div>
              {/* Photos */}
              {o.photos && o.photos.length > 0 && (
                <div className="flex items-center gap-2 mt-3 overflow-x-auto">
                  {o.photos.map((p, i) => (
                    <a key={i} href={`${STORAGE_BASE}${p.filename}`} target="_blank" rel="noopener noreferrer" className="shrink-0">
                      <img src={`${STORAGE_BASE}${p.filename}`} alt={p.originalName} className="w-16 h-16 object-cover rounded-lg border border-border" />
                    </a>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Actions Tab ───────────────────────────────

function ActionsTab({ actions, isActive, onAdd, onUpdate }: {
  actions: DrillAction[];
  isActive: boolean;
  onAdd: () => void;
  onUpdate: (id: string, data: Record<string, unknown>) => void;
}) {
  const [filter, setFilter] = useState<string>('All');
  const filterOptions = ['All', 'Open', 'Overdue', 'Closed'];

  const now = new Date();
  const enriched = useMemo(() => actions.map(a => ({
    ...a,
    isOverdue: a.status !== 'Completed' && a.status !== 'Closed' && a.due_date ? new Date(a.due_date) < now : false,
  })), [actions]);

  const filtered = useMemo(() => {
    if (filter === 'All') return enriched;
    if (filter === 'Overdue') return enriched.filter(a => a.isOverdue);
    if (filter === 'Closed') return enriched.filter(a => a.status === 'Completed' || a.status === 'Closed');
    if (filter === 'Open') return enriched.filter(a => a.status === 'Open' || a.status === 'In Progress');
    return enriched;
  }, [enriched, filter]);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-1">
          {filterOptions.map(f => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-2.5 py-1 text-xs font-medium rounded-lg transition-colors ${
                filter === f
                  ? 'bg-primary-100 text-primary-700'
                  : 'text-text-secondary hover:bg-canvas'
              }`}
            >
              {f}
              {f === 'Overdue' && (
                <span className="ml-1 text-[10px]">({enriched.filter(a => a.isOverdue).length})</span>
              )}
            </button>
          ))}
        </div>
        {isActive && (
          <button onClick={onAdd} className="btn-primary px-3 py-1.5 text-xs rounded-lg flex items-center gap-1">
            <Plus size={12} /> Add Action
          </button>
        )}
      </div>

      {filtered.length === 0 ? (
        <EmptyState message="No actions found" />
      ) : (
        <div className="border border-border rounded-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-canvas border-b border-border">
                  <th className="text-left px-3 py-2.5 text-[10px] font-semibold text-text-secondary uppercase tracking-wide">Title</th>
                  <th className="text-left px-3 py-2.5 text-[10px] font-semibold text-text-secondary uppercase tracking-wide">Assigned To</th>
                  <th className="text-left px-3 py-2.5 text-[10px] font-semibold text-text-secondary uppercase tracking-wide">Due Date</th>
                  <th className="text-left px-3 py-2.5 text-[10px] font-semibold text-text-secondary uppercase tracking-wide">Priority</th>
                  <th className="text-left px-3 py-2.5 text-[10px] font-semibold text-text-secondary uppercase tracking-wide">Status</th>
                  {isActive && <th className="text-center px-3 py-2.5 text-[10px] font-semibold text-text-secondary uppercase tracking-wide w-24">Actions</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {filtered.map(a => (
                  <tr key={a.id} className={`hover:bg-canvas/50 transition-colors ${a.isOverdue ? 'bg-danger-50/40 border-l-2 border-l-danger-500' : ''}`}>
                    <td className="px-3 py-2.5">
                      <p className="text-text-primary font-medium text-xs truncate max-w-[160px]">{a.title}</p>
                      {a.description && <p className="text-[10px] text-text-tertiary truncate max-w-[160px]">{a.description}</p>}
                    </td>
                    <td className="px-3 py-2.5 text-text-secondary text-xs">{a.assigned_to_name || '--'}</td>
                    <td className="px-3 py-2.5 text-xs whitespace-nowrap">
                      <span className={a.isOverdue ? 'text-danger-600 font-semibold' : 'text-text-secondary'}>
                        {a.due_date ? fmtDate(a.due_date) : '--'}
                      </span>
                      {a.isOverdue && <span className="ml-1 text-[9px] font-bold text-danger-600 uppercase">Overdue</span>}
                    </td>
                    <td className="px-3 py-2.5">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-medium ${priorityColors[a.priority] ?? 'bg-neutral-100 text-neutral-600'}`}>{a.priority}</span>
                    </td>
                    <td className="px-3 py-2.5">
                      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium ${actionStatusColors[a.status] ?? 'bg-neutral-100 text-neutral-600'}`}>{a.status}</span>
                    </td>
                    {isActive && (
                      <td className="px-3 py-2.5 text-center">
                        <div className="flex items-center justify-center gap-1">
                          {a.status === 'Open' && (
                            <button onClick={() => onUpdate(a.id, { status: 'In Progress' })} className="text-[10px] text-info-600 hover:underline font-medium">Start</button>
                          )}
                          {(a.status === 'Open' || a.status === 'In Progress') && (
                            <button
                              onClick={() => {
                                const notes = prompt('Completion notes:');
                                if (notes !== null) onUpdate(a.id, { status: 'Completed', completion_notes: notes, completed_at: new Date().toISOString() });
                              }}
                              className="text-[10px] text-green-600 hover:underline font-medium ml-1"
                            >
                              Complete
                            </button>
                          )}
                        </div>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Evaluation Tab ────────────────────────────

function EvaluationTab({ evaluation, drillId, isActive, onSave }: {
  evaluation: DrillEvaluation | null;
  drillId: number;
  isActive: boolean;
  onSave: (drillId: number, data: Record<string, unknown>) => Promise<void>;
}) {
  const [isEditing, setIsEditing] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const defaultForm = {
    overall_rating: evaluation?.final_score ?? 0,
    communication_rating: evaluation?.communication_score ?? 0,
    coordination_rating: evaluation?.team_coordination_score ?? 0,
    equipment_readiness_rating: evaluation?.equipment_readiness_score ?? 0,
    response_time_minutes: evaluation?.response_time_score ?? 0,
    evacuation_time_minutes: evaluation?.erp_compliance_score ?? 0,
    objectives_met: evaluation?.drill_effectiveness ?? null,
    strengths: evaluation?.strengths ?? '',
    weaknesses: evaluation?.weaknesses ?? '',
    improvements: evaluation?.overall_notes ?? '',
    recommendations: evaluation?.recommendations ?? '',
  };

  const [form, setForm] = useState(defaultForm);

  useEffect(() => {
    setForm({
      overall_rating: evaluation?.final_score ?? 0,
      communication_rating: evaluation?.communication_score ?? 0,
      coordination_rating: evaluation?.team_coordination_score ?? 0,
      equipment_readiness_rating: evaluation?.equipment_readiness_score ?? 0,
      response_time_minutes: evaluation?.response_time_score ?? 0,
      evacuation_time_minutes: evaluation?.erp_compliance_score ?? 0,
      objectives_met: evaluation?.drill_effectiveness ?? null,
      strengths: evaluation?.strengths ?? '',
      weaknesses: evaluation?.weaknesses ?? '',
      improvements: evaluation?.overall_notes ?? '',
      recommendations: evaluation?.recommendations ?? '',
    });
  }, [evaluation]);

  const autoScore = useMemo(() => {
    const scores = [form.communication_rating, form.coordination_rating, form.equipment_readiness_rating].filter(s => s > 0);
    if (scores.length === 0) return form.overall_rating;
    return Math.round(scores.reduce((sum, s) => sum + s, 0) / scores.length);
  }, [form.communication_rating, form.coordination_rating, form.equipment_readiness_rating, form.overall_rating]);

  const resultLabel = autoScore >= 80 ? 'Satisfactory' : autoScore >= 60 ? 'Needs Improvement' : 'Unsatisfactory';
  const resultVariant = autoScore >= 80 ? 'success' : autoScore >= 60 ? 'warning' : 'danger';

  const handleSave = async () => {
    setIsSubmitting(true);
    try {
      await onSave(drillId, { ...form, overall_rating: autoScore || form.overall_rating });
      setIsEditing(false);
    } finally {
      setIsSubmitting(false);
    }
  };

  // No evaluation yet
  if (!evaluation && !isEditing) {
    return (
      <div className="space-y-4">
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex items-start gap-3">
          <AlertTriangle size={18} className="text-amber-600 shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-medium text-amber-800">Evaluation Not Completed</p>
            <p className="text-xs text-amber-600 mt-0.5">This drill has not been evaluated yet. Complete the evaluation to finalize the drill review.</p>
          </div>
        </div>
        {isActive && (
          <button onClick={() => setIsEditing(true)} className="btn-primary px-4 py-2 text-sm rounded-lg w-full flex items-center justify-center gap-2">
            <ClipboardList size={14} /> Complete Evaluation
          </button>
        )}
      </div>
    );
  }

  // Display / Edit mode
  return (
    <div className="space-y-5">
      {/* Scores display */}
      {!isEditing && evaluation && (
        <>
          {/* Final score circle + rating */}
          <div className="flex items-center gap-5">
            <div className={`w-20 h-20 rounded-full flex items-center justify-center text-xl font-bold border-4 ${
              (evaluation.final_score ?? 0) >= 80 ? 'border-green-400 text-green-700 bg-green-50' :
              (evaluation.final_score ?? 0) >= 60 ? 'border-amber-400 text-amber-700 bg-amber-50' :
              'border-red-400 text-red-700 bg-red-50'
            }`}>
              {evaluation.final_score ?? 0}%
            </div>
            <div>
              <Badge variant={resultVariant}>{resultLabel}</Badge>
              {evaluation.objectives_met != null && (
                <p className="text-xs text-text-secondary mt-1.5 flex items-center gap-1">
                  {evaluation.objectives_met ? <CheckCircle size={12} className="text-green-500" /> : <XCircle size={12} className="text-red-500" />}
                  Objectives {evaluation.objectives_met ? 'Met' : 'Not Met'}
                </p>
              )}
              {evaluation.evaluated_by_name && (
                <p className="text-[10px] text-text-tertiary mt-1">Evaluated by {evaluation.evaluated_by_name} on {fmtDate(evaluation.evaluated_at)}</p>
              )}
            </div>
          </div>

          {/* Score bars */}
          <Section title="Score Breakdown">
            <div className="space-y-3">
              <ScoreBar label="Communication" value={evaluation.communication_rating ?? 0} />
              <ScoreBar label="Coordination" value={evaluation.coordination_rating ?? 0} />
              <ScoreBar label="Equipment Readiness" value={evaluation.equipment_readiness_rating ?? 0} />
            </div>
          </Section>

          {/* Timing */}
          <Section title="Response Metrics">
            <Grid>
              <Field label="Response Time" value={evaluation.response_time_minutes != null ? `${evaluation.response_time_minutes} min` : null} />
              <Field label="Evacuation Time" value={evaluation.evacuation_time_minutes != null ? `${evaluation.evacuation_time_minutes} min` : null} />
            </Grid>
          </Section>

          {/* Text fields */}
          {evaluation.strengths && (
            <Section title="Strengths">
              <p className="text-sm text-text-primary whitespace-pre-wrap">{evaluation.strengths}</p>
            </Section>
          )}
          {evaluation.weaknesses && (
            <Section title="Weaknesses">
              <p className="text-sm text-text-primary whitespace-pre-wrap">{evaluation.weaknesses}</p>
            </Section>
          )}
          {evaluation.improvements && (
            <Section title="Improvements Needed">
              <p className="text-sm text-text-primary whitespace-pre-wrap">{evaluation.improvements}</p>
            </Section>
          )}
          {evaluation.recommendations && (
            <Section title="Recommendations">
              <p className="text-sm text-text-primary whitespace-pre-wrap">{evaluation.recommendations}</p>
            </Section>
          )}

          {isActive && (
            <button onClick={() => setIsEditing(true)} className="btn-secondary px-4 py-2 text-sm rounded-lg w-full flex items-center justify-center gap-2">
              <Edit3 size={14} /> Edit Evaluation
            </button>
          )}
        </>
      )}

      {/* Evaluation form */}
      {isEditing && (
        <div className="space-y-4">
          {/* Score inputs */}
          <Section title="Scores (0-100)">
            <div className="space-y-4">
              <ScoreInput label="Communication Rating" value={form.communication_rating} onChange={(v) => setForm(prev => ({ ...prev, communication_rating: v }))} />
              <ScoreInput label="Coordination Rating" value={form.coordination_rating} onChange={(v) => setForm(prev => ({ ...prev, coordination_rating: v }))} />
              <ScoreInput label="Equipment Readiness" value={form.equipment_readiness_rating} onChange={(v) => setForm(prev => ({ ...prev, equipment_readiness_rating: v }))} />
            </div>
          </Section>

          {/* Auto-calculated score */}
          <div className="bg-canvas rounded-xl border border-border p-4 text-center">
            <p className="text-[10px] text-text-tertiary uppercase tracking-wide mb-2">Calculated Overall Score</p>
            <div className="flex items-center justify-center gap-4">
              <div className={`w-16 h-16 rounded-full flex items-center justify-center text-lg font-bold border-4 ${
                autoScore >= 80 ? 'border-green-400 text-green-700 bg-green-50' :
                autoScore >= 60 ? 'border-amber-400 text-amber-700 bg-amber-50' :
                'border-red-400 text-red-700 bg-red-50'
              }`}>
                {autoScore}%
              </div>
              <Badge variant={resultVariant}>{resultLabel}</Badge>
            </div>
          </div>

          {/* Overall result selector */}
          <Section title="Overall Result">
            <div className="flex items-center gap-2">
              {(['Satisfactory', 'Needs Improvement', 'Unsatisfactory'] as const).map(opt => {
                const isSelected = resultLabel === opt;
                const colors = opt === 'Satisfactory' ? 'bg-green-100 text-green-700 border-green-300' :
                  opt === 'Needs Improvement' ? 'bg-amber-100 text-amber-700 border-amber-300' :
                  'bg-red-100 text-red-700 border-red-300';
                return (
                  <div
                    key={opt}
                    className={`flex-1 text-center px-3 py-2 rounded-lg border text-xs font-medium transition-all ${
                      isSelected ? `${colors} border-2` : 'bg-canvas border-border text-text-tertiary'
                    }`}
                  >
                    {opt}
                  </div>
                );
              })}
            </div>
          </Section>

          {/* Objectives met */}
          <Section title="Objectives Met?">
            <div className="flex items-center gap-3">
              <label className="flex items-center gap-2 text-xs cursor-pointer">
                <input type="radio" name="objectives_met" checked={form.objectives_met === true} onChange={() => setForm(prev => ({ ...prev, objectives_met: true }))} className="accent-primary-600" />
                Yes
              </label>
              <label className="flex items-center gap-2 text-xs cursor-pointer">
                <input type="radio" name="objectives_met" checked={form.objectives_met === false} onChange={() => setForm(prev => ({ ...prev, objectives_met: false }))} className="accent-primary-600" />
                No
              </label>
            </div>
          </Section>

          {/* Response metrics */}
          <Section title="Response Metrics">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-text-secondary mb-1">Response Time (min)</label>
                <input type="number" min={0} value={form.response_time_minutes || ''} onChange={e => setForm(prev => ({ ...prev, response_time_minutes: Number(e.target.value) }))}
                  className="input-field w-full" placeholder="0" />
              </div>
              <div>
                <label className="block text-xs font-medium text-text-secondary mb-1">Evacuation Time (min)</label>
                <input type="number" min={0} value={form.evacuation_time_minutes || ''} onChange={e => setForm(prev => ({ ...prev, evacuation_time_minutes: Number(e.target.value) }))}
                  className="input-field w-full" placeholder="0" />
              </div>
            </div>
          </Section>

          {/* Text areas */}
          <div>
            <label className="block text-xs font-medium text-text-secondary mb-1">Strengths</label>
            <textarea value={form.strengths} onChange={e => setForm(prev => ({ ...prev, strengths: e.target.value }))} className="input-field w-full" rows={2} placeholder="What went well..." />
          </div>
          <div>
            <label className="block text-xs font-medium text-text-secondary mb-1">Weaknesses</label>
            <textarea value={form.weaknesses} onChange={e => setForm(prev => ({ ...prev, weaknesses: e.target.value }))} className="input-field w-full" rows={2} placeholder="Areas of concern..." />
          </div>
          <div>
            <label className="block text-xs font-medium text-text-secondary mb-1">Improvements Needed</label>
            <textarea value={form.improvements} onChange={e => setForm(prev => ({ ...prev, improvements: e.target.value }))} className="input-field w-full" rows={2} placeholder="Suggested improvements..." />
          </div>
          <div>
            <label className="block text-xs font-medium text-text-secondary mb-1">Recommendations</label>
            <textarea value={form.recommendations} onChange={e => setForm(prev => ({ ...prev, recommendations: e.target.value }))} className="input-field w-full" rows={2} placeholder="Recommendations for future drills..." />
          </div>

          {/* Save / Cancel */}
          <div className="flex justify-end gap-2 pt-2">
            <button onClick={() => { setIsEditing(false); setForm(defaultForm); }} className="btn-secondary px-4 py-2 text-xs rounded-lg" disabled={isSubmitting}>Cancel</button>
            <button onClick={handleSave} className="btn-primary px-4 py-2 text-xs rounded-lg flex items-center gap-1.5" disabled={isSubmitting}>
              {isSubmitting && <Loader2 size={13} className="animate-spin" />}
              Save Evaluation
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Score Bar ─────────────────────────────────

function ScoreBar({ label, value }: { label: string; value: number }) {
  const color = value >= 80 ? 'bg-green-500' : value >= 60 ? 'bg-amber-500' : 'bg-red-500';
  return (
    <div>
      <div className="flex items-center justify-between mb-1">
        <span className="text-xs text-text-secondary">{label}</span>
        <span className="text-xs font-semibold text-text-primary">{value}%</span>
      </div>
      <div className="h-2 rounded-full bg-neutral-100 overflow-hidden">
        <div className={`h-full rounded-full transition-all duration-500 ${color}`} style={{ width: `${Math.min(value, 100)}%` }} />
      </div>
    </div>
  );
}

// ─── Score Input ───────────────────────────────

function ScoreInput({ label, value, onChange }: { label: string; value: number; onChange: (v: number) => void }) {
  const color = value >= 80 ? 'bg-green-500' : value >= 60 ? 'bg-amber-500' : value > 0 ? 'bg-red-500' : 'bg-neutral-200';
  return (
    <div>
      <div className="flex items-center justify-between mb-1">
        <label className="text-xs font-medium text-text-secondary">{label}</label>
        <input
          type="number"
          min={0}
          max={100}
          value={value || ''}
          onChange={e => onChange(Math.min(100, Math.max(0, Number(e.target.value))))}
          className="input-field w-16 text-xs text-center py-1"
          placeholder="0"
        />
      </div>
      <div className="h-2 rounded-full bg-neutral-100 overflow-hidden">
        <div className={`h-full rounded-full transition-all duration-300 ${color}`} style={{ width: `${Math.min(value, 100)}%` }} />
      </div>
    </div>
  );
}

// ─── Evidence Tab ──────────────────────────────

function EvidenceTab({ evidence, drillId, isActive, onUpload }: {
  evidence: DrillEvidence[];
  drillId: number;
  isActive: boolean;
  onUpload: (drillId: number, files: File[], linkedType: string, linkedId?: number) => Promise<void>;
}) {
  const sections = ['Drill', 'Observation', 'Action', 'Evaluation', 'Attendance'] as const;
  const [uploading, setUploading] = useState<string | null>(null);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>, section: string) => {
    const files = e.target.files;
    if (!files?.length) return;
    setUploading(section);
    try {
      await onUpload(drillId, Array.from(files), section);
    } finally {
      setUploading(null);
      e.target.value = '';
    }
  };

  const groupedEvidence = useMemo(() => {
    const grouped: Record<string, DrillEvidence[]> = {};
    sections.forEach(s => { grouped[s] = []; });
    evidence.forEach(e => {
      const type = e.linked_type || 'Drill';
      if (!grouped[type]) grouped[type] = [];
      grouped[type].push(e);
    });
    return grouped;
  }, [evidence]);

  return (
    <div className="space-y-5">
      {sections.map(section => {
        const items = groupedEvidence[section] || [];
        return (
          <div key={section}>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-xs font-semibold text-text-secondary uppercase tracking-wide">{section} Evidence ({items.length})</h3>
              {isActive && (
                <label className="btn-secondary px-2.5 py-1 text-[10px] rounded-lg cursor-pointer inline-flex items-center gap-1">
                  {uploading === section ? <Loader2 size={10} className="animate-spin" /> : <Upload size={10} />}
                  Upload
                  <input type="file" multiple accept="image/*,.pdf,.doc,.docx,.xls,.xlsx,.csv,.ppt,.pptx,.txt" className="hidden" onChange={e => handleFileChange(e, section)} disabled={!!uploading} />
                </label>
              )}
            </div>
            {items.length === 0 ? (
              <div className="border border-dashed border-border rounded-xl p-4 text-center text-[10px] text-text-tertiary">No files uploaded</div>
            ) : (
              <div className="grid grid-cols-3 gap-2">
                {items.map(ev => {
                  const isImage = ev.file_type?.startsWith('image/');
                  return (
                    <a key={ev.id} href={`${STORAGE_BASE}${ev.file_path}`} target="_blank" rel="noopener noreferrer" className="border border-border rounded-xl overflow-hidden bg-canvas hover:shadow-sm transition-shadow group">
                      {isImage ? (
                        <img src={`${STORAGE_BASE}${ev.file_path}`} alt={ev.original_name ?? ''} className="w-full h-24 object-cover" />
                      ) : (
                        <div className="h-24 flex items-center justify-center bg-neutral-50">
                          <FileText size={24} className="text-text-tertiary" />
                        </div>
                      )}
                      <div className="p-2">
                        <p className="text-[10px] font-medium text-text-primary truncate">{ev.original_name || 'File'}</p>
                        <p className="text-[9px] text-text-tertiary mt-0.5">{ev.file_size ? `${(ev.file_size / 1024).toFixed(0)} KB` : ''}</p>
                      </div>
                    </a>
                  );
                })}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

// ─── Audit Log Tab ─────────────────────────────

function AuditLogTab({ logs }: { logs: DrillLog[] }) {
  if (!logs.length) {
    return <EmptyState message="No audit log entries" />;
  }

  return (
    <div className="space-y-0">
      {logs.map((log, idx) => {
        const dotColor = logDotColors[log.action_type] ?? 'bg-neutral-400';
        return (
          <div key={log.id} className="flex gap-3 pb-4 relative">
            {idx < logs.length - 1 && <div className="absolute left-[7px] top-6 bottom-0 w-px bg-border" />}
            <div className={`w-4 h-4 rounded-full ${dotColor} mt-0.5 shrink-0 z-10 ring-2 ring-surface`} />
            <div className="flex-1 min-w-0">
              <p className="text-xs font-medium text-text-primary capitalize">{(log.action_type || '').replace(/_/g, ' ')}</p>
              {log.description && <p className="text-xs text-text-secondary mt-0.5">{log.description}</p>}
              <div className="flex items-center gap-2 mt-0.5">
                {log.user_name && <span className="text-[10px] text-text-tertiary font-medium">{log.user_name}</span>}
                <span className="text-[10px] text-text-tertiary">{fmtDateTime(log.created_at)}</span>
              </div>
              {log.old_value && log.new_value && (
                <p className="text-[10px] mt-1 text-text-secondary">
                  <span className="line-through text-danger-400">{log.old_value}</span>
                  {' -> '}
                  <span className="text-green-600 font-medium">{log.new_value}</span>
                </p>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ═══════════════════════════════════════════════════
// MODAL COMPONENTS
// ═══════════════════════════════════════════════════

// ─── Conduct Drill Modal ───────────────────────

function ConductModal({ open, onClose, onSubmit, isSubmitting }: {
  open: boolean; onClose: () => void;
  onSubmit: (data: Record<string, unknown>) => Promise<void>;
  isSubmitting: boolean;
}) {
  const [form, setForm] = useState({
    actual_start_time: '',
    actual_end_time: '',
    alarm_trigger_time: '',
    first_response_time: '',
    evacuation_start_time: '',
    evacuation_complete_time: '',
    muster_complete_time: '',
    response_complete_time: '',
    actual_response: '',
  });

  const handleSubmit = async () => {
    if (!form.actual_start_time) return;
    await onSubmit(form);
    setForm({
      actual_start_time: '', actual_end_time: '', alarm_trigger_time: '',
      first_response_time: '', evacuation_start_time: '', evacuation_complete_time: '',
      muster_complete_time: '', response_complete_time: '', actual_response: '',
    });
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Conduct Drill"
      subtitle="Record drill execution timing and details"
      size="lg"
      footer={
        <>
          <button onClick={onClose} className="btn-secondary px-4 py-2 text-sm rounded-lg" disabled={isSubmitting}>Cancel</button>
          <button onClick={handleSubmit} className="btn-primary px-4 py-2 text-sm rounded-lg flex items-center gap-1.5" disabled={isSubmitting || !form.actual_start_time}>
            {isSubmitting && <Loader2 size={14} className="animate-spin" />}
            Conduct Drill
          </button>
        </>
      }
    >
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-medium text-text-secondary mb-1">Actual Start Time *</label>
            <input type="datetime-local" value={form.actual_start_time} onChange={e => setForm(prev => ({ ...prev, actual_start_time: e.target.value }))}
              className="input-field w-full" required />
          </div>
          <div>
            <label className="block text-xs font-medium text-text-secondary mb-1">Actual End Time</label>
            <input type="datetime-local" value={form.actual_end_time} onChange={e => setForm(prev => ({ ...prev, actual_end_time: e.target.value }))}
              className="input-field w-full" />
          </div>
        </div>

        <div className="border-t border-border pt-3">
          <p className="text-xs font-semibold text-text-secondary mb-3">Timing Events</p>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-text-secondary mb-1">Alarm Trigger Time</label>
              <input type="datetime-local" value={form.alarm_trigger_time} onChange={e => setForm(prev => ({ ...prev, alarm_trigger_time: e.target.value }))}
                className="input-field w-full" />
            </div>
            <div>
              <label className="block text-xs font-medium text-text-secondary mb-1">First Response Time</label>
              <input type="datetime-local" value={form.first_response_time} onChange={e => setForm(prev => ({ ...prev, first_response_time: e.target.value }))}
                className="input-field w-full" />
            </div>
            <div>
              <label className="block text-xs font-medium text-text-secondary mb-1">Evacuation Start</label>
              <input type="datetime-local" value={form.evacuation_start_time} onChange={e => setForm(prev => ({ ...prev, evacuation_start_time: e.target.value }))}
                className="input-field w-full" />
            </div>
            <div>
              <label className="block text-xs font-medium text-text-secondary mb-1">Evacuation Complete</label>
              <input type="datetime-local" value={form.evacuation_complete_time} onChange={e => setForm(prev => ({ ...prev, evacuation_complete_time: e.target.value }))}
                className="input-field w-full" />
            </div>
            <div>
              <label className="block text-xs font-medium text-text-secondary mb-1">Muster Complete</label>
              <input type="datetime-local" value={form.muster_complete_time} onChange={e => setForm(prev => ({ ...prev, muster_complete_time: e.target.value }))}
                className="input-field w-full" />
            </div>
            <div>
              <label className="block text-xs font-medium text-text-secondary mb-1">Response Complete</label>
              <input type="datetime-local" value={form.response_complete_time} onChange={e => setForm(prev => ({ ...prev, response_complete_time: e.target.value }))}
                className="input-field w-full" />
            </div>
          </div>
        </div>

        <div>
          <label className="block text-xs font-medium text-text-secondary mb-1">Actual Response / Notes</label>
          <textarea value={form.actual_response} onChange={e => setForm(prev => ({ ...prev, actual_response: e.target.value }))}
            className="input-field w-full" rows={3} placeholder="Describe the actual response during the drill..." />
        </div>
      </div>
    </Modal>
  );
}

// ─── Close Drill Modal ─────────────────────────

function CloseDrillModal({ open, onClose, drill, onSubmit, isSubmitting }: {
  open: boolean; onClose: () => void; drill: MockDrill;
  onSubmit: (data: Record<string, unknown>) => Promise<void>;
  isSubmitting: boolean;
}) {
  const [closeNotes, setCloseNotes] = useState('');

  const participants = drill.participants ?? [];
  const observations = drill.observations ?? [];
  const actions = drill.actions ?? [];
  const evaluation = drill.evaluation;

  const openActions = actions.filter(a => a.status === 'Open' || a.status === 'In Progress');
  const hasEvaluation = evaluation && evaluation.final_score != null;

  const warnings: string[] = [];
  if (participants.length === 0) warnings.push('No participants have been recorded for this drill.');
  if (observations.length === 0) warnings.push('No observations have been recorded.');
  if (openActions.length > 0) warnings.push(`There are ${openActions.length} open action(s) that have not been completed.`);
  if (!hasEvaluation) warnings.push('Drill evaluation has not been completed.');

  const handleSubmit = async () => {
    await onSubmit({ close_notes: closeNotes });
    setCloseNotes('');
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Close Drill"
      subtitle={`Close drill ${drill.drill_code}`}
      size="md"
      footer={
        <>
          <button onClick={onClose} className="btn-secondary px-4 py-2 text-sm rounded-lg" disabled={isSubmitting}>Cancel</button>
          <button onClick={handleSubmit} className="btn-primary px-4 py-2 text-sm rounded-lg flex items-center gap-1.5" disabled={isSubmitting}>
            {isSubmitting && <Loader2 size={14} className="animate-spin" />}
            Close Drill
          </button>
        </>
      }
    >
      <div className="space-y-4">
        {warnings.length > 0 && (
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 space-y-2">
            <div className="flex items-center gap-2">
              <AlertTriangle size={16} className="text-amber-600 shrink-0" />
              <p className="text-sm font-medium text-amber-800">Validation Warnings</p>
            </div>
            <ul className="list-disc list-inside text-xs text-amber-700 space-y-1">
              {warnings.map((w, i) => <li key={i}>{w}</li>)}
            </ul>
            <p className="text-[10px] text-amber-600 mt-1">You can still close the drill with these warnings.</p>
          </div>
        )}

        <div className="bg-canvas rounded-xl border border-border p-3">
          <div className="grid grid-cols-2 gap-2 text-xs">
            <div>
              <span className="text-text-tertiary">Participants:</span>
              <span className="ml-1 font-medium text-text-primary">{participants.length}</span>
            </div>
            <div>
              <span className="text-text-tertiary">Observations:</span>
              <span className="ml-1 font-medium text-text-primary">{observations.length}</span>
            </div>
            <div>
              <span className="text-text-tertiary">Actions:</span>
              <span className="ml-1 font-medium text-text-primary">{actions.length} ({openActions.length} open)</span>
            </div>
            <div>
              <span className="text-text-tertiary">Evaluation:</span>
              <span className={`ml-1 font-medium ${hasEvaluation ? 'text-green-600' : 'text-amber-600'}`}>
                {hasEvaluation ? `${evaluation!.final_score}%` : 'Not completed'}
              </span>
            </div>
          </div>
        </div>

        <div>
          <label className="block text-xs font-medium text-text-secondary mb-1">Close Notes</label>
          <textarea value={closeNotes} onChange={e => setCloseNotes(e.target.value)}
            className="input-field w-full" rows={3} placeholder="Add any closure notes or remarks..." />
        </div>
      </div>
    </Modal>
  );
}

// ─── Cancel Modal ──────────────────────────────

function CancelModal({ open, onClose, onSubmit, isSubmitting }: {
  open: boolean; onClose: () => void;
  onSubmit: (data: Record<string, unknown>) => Promise<void>;
  isSubmitting: boolean;
}) {
  const [reason, setReason] = useState('');

  const handleSubmit = async () => {
    if (!reason.trim()) return;
    await onSubmit({ cancellation_reason: reason });
    setReason('');
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Cancel Drill"
      subtitle="This action cannot be undone"
      size="sm"
      footer={
        <>
          <button onClick={onClose} className="btn-secondary px-4 py-2 text-sm rounded-lg" disabled={isSubmitting}>Go Back</button>
          <button onClick={handleSubmit} className="px-4 py-2 text-sm rounded-lg bg-danger-600 text-white hover:bg-danger-700 transition-colors flex items-center gap-1.5" disabled={isSubmitting || !reason.trim()}>
            {isSubmitting && <Loader2 size={14} className="animate-spin" />}
            Cancel Drill
          </button>
        </>
      }
    >
      <div className="space-y-3">
        <div className="bg-danger-50 border border-danger-200 rounded-xl p-3 flex items-start gap-2">
          <AlertTriangle size={16} className="text-danger-600 shrink-0 mt-0.5" />
          <p className="text-xs text-danger-700">Cancelling this drill will mark it as cancelled. This action cannot be reversed.</p>
        </div>
        <div>
          <label className="block text-xs font-medium text-text-secondary mb-1">Cancellation Reason *</label>
          <textarea value={reason} onChange={e => setReason(e.target.value)}
            className="input-field w-full" rows={3} placeholder="Provide a reason for cancellation..." required />
        </div>
      </div>
    </Modal>
  );
}

// ─── Participant Form Modal ────────────────────

function ParticipantFormModal({ open, onClose, onSubmit, isSubmitting, title, initial }: {
  open: boolean; onClose: () => void;
  onSubmit: (data: Record<string, unknown>) => Promise<void>;
  isSubmitting: boolean;
  title: string;
  initial?: DrillParticipant | null;
}) {
  const [form, setForm] = useState({
    name: '',
    employee_id: '',
    role_in_drill: '',
    department: '',
    designation: '',
    attendance_status: 'Present',
    performance_rating: '',
    remarks: '',
  });

  useEffect(() => {
    if (initial) {
      setForm({
        name: initial.name || '',
        employee_id: initial.employee_id || '',
        role_in_drill: initial.role_in_drill || '',
        department: initial.department || '',
        designation: initial.designation || '',
        attendance_status: initial.attendance_status || 'Present',
        performance_rating: initial.performance_rating?.toString() || '',
        remarks: initial.remarks || '',
      });
    } else {
      setForm({ name: '', employee_id: '', role_in_drill: '', department: '', designation: '', attendance_status: 'Present', performance_rating: '', remarks: '' });
    }
  }, [initial, open]);

  const handleSubmit = async () => {
    if (!form.name.trim()) return;
    await onSubmit({
      ...form,
      performance_rating: form.performance_rating ? Number(form.performance_rating) : null,
    });
    setForm({ name: '', employee_id: '', role_in_drill: '', department: '', designation: '', attendance_status: 'Present', performance_rating: '', remarks: '' });
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={title}
      size="md"
      footer={
        <>
          <button onClick={onClose} className="btn-secondary px-4 py-2 text-sm rounded-lg" disabled={isSubmitting}>Cancel</button>
          <button onClick={handleSubmit} className="btn-primary px-4 py-2 text-sm rounded-lg flex items-center gap-1.5" disabled={isSubmitting || !form.name.trim()}>
            {isSubmitting && <Loader2 size={14} className="animate-spin" />}
            {initial ? 'Update' : 'Add'} Participant
          </button>
        </>
      }
    >
      <div className="space-y-3">
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-medium text-text-secondary mb-1">Name *</label>
            <input type="text" value={form.name} onChange={e => setForm(prev => ({ ...prev, name: e.target.value }))}
              className="input-field w-full" placeholder="Full name" />
          </div>
          <div>
            <label className="block text-xs font-medium text-text-secondary mb-1">Employee ID</label>
            <input type="text" value={form.employee_id} onChange={e => setForm(prev => ({ ...prev, employee_id: e.target.value }))}
              className="input-field w-full" placeholder="e.g., EMP-001" />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-medium text-text-secondary mb-1">Role in Drill</label>
            <input type="text" value={form.role_in_drill} onChange={e => setForm(prev => ({ ...prev, role_in_drill: e.target.value }))}
              className="input-field w-full" placeholder="e.g., Fire Warden" />
          </div>
          <div>
            <label className="block text-xs font-medium text-text-secondary mb-1">Department</label>
            <input type="text" value={form.department} onChange={e => setForm(prev => ({ ...prev, department: e.target.value }))}
              className="input-field w-full" placeholder="Department" />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-medium text-text-secondary mb-1">Designation</label>
            <input type="text" value={form.designation} onChange={e => setForm(prev => ({ ...prev, designation: e.target.value }))}
              className="input-field w-full" placeholder="Job title" />
          </div>
          <div>
            <label className="block text-xs font-medium text-text-secondary mb-1">Attendance</label>
            <select value={form.attendance_status} onChange={e => setForm(prev => ({ ...prev, attendance_status: e.target.value }))}
              className="input-field w-full">
              <option value="Present">Present</option>
              <option value="Absent">Absent</option>
              <option value="Late">Late</option>
              <option value="Excused">Excused</option>
            </select>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-medium text-text-secondary mb-1">Performance Rating (0-10)</label>
            <input type="number" min={0} max={10} value={form.performance_rating} onChange={e => setForm(prev => ({ ...prev, performance_rating: e.target.value }))}
              className="input-field w-full" placeholder="0-10" />
          </div>
        </div>
        <div>
          <label className="block text-xs font-medium text-text-secondary mb-1">Remarks</label>
          <textarea value={form.remarks} onChange={e => setForm(prev => ({ ...prev, remarks: e.target.value }))}
            className="input-field w-full" rows={2} placeholder="Additional notes..." />
        </div>
      </div>
    </Modal>
  );
}

// ─── Bulk Participant Modal ────────────────────

function BulkParticipantModal({ open, onClose, onSubmit, isSubmitting }: {
  open: boolean; onClose: () => void;
  onSubmit: (rows: Record<string, unknown>[]) => Promise<void>;
  isSubmitting: boolean;
}) {
  const [rows, setRows] = useState<Array<{ name: string; employee_id: string; role_in_drill: string; department: string }>>([
    { name: '', employee_id: '', role_in_drill: '', department: '' },
    { name: '', employee_id: '', role_in_drill: '', department: '' },
    { name: '', employee_id: '', role_in_drill: '', department: '' },
  ]);

  const addRow = () => setRows(prev => [...prev, { name: '', employee_id: '', role_in_drill: '', department: '' }]);
  const removeRow = (idx: number) => setRows(prev => prev.filter((_, i) => i !== idx));
  const updateRow = (idx: number, field: string, value: string) => {
    setRows(prev => prev.map((r, i) => i === idx ? { ...r, [field]: value } : r));
  };

  const validRows = rows.filter(r => r.name.trim());

  const handleSubmit = async () => {
    if (validRows.length === 0) return;
    await onSubmit(validRows.map(r => ({ ...r, attendance_status: 'Present' })));
    setRows([
      { name: '', employee_id: '', role_in_drill: '', department: '' },
      { name: '', employee_id: '', role_in_drill: '', department: '' },
      { name: '', employee_id: '', role_in_drill: '', department: '' },
    ]);
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Bulk Add Participants"
      subtitle={`${validRows.length} valid row(s) ready`}
      size="lg"
      footer={
        <>
          <button onClick={onClose} className="btn-secondary px-4 py-2 text-sm rounded-lg" disabled={isSubmitting}>Cancel</button>
          <button onClick={handleSubmit} className="btn-primary px-4 py-2 text-sm rounded-lg flex items-center gap-1.5" disabled={isSubmitting || validRows.length === 0}>
            {isSubmitting && <Loader2 size={14} className="animate-spin" />}
            Add {validRows.length} Participant{validRows.length !== 1 ? 's' : ''}
          </button>
        </>
      }
    >
      <div className="space-y-2">
        <div className="grid grid-cols-[1fr_1fr_1fr_1fr_32px] gap-2 text-[10px] font-semibold text-text-secondary uppercase tracking-wide px-1">
          <span>Name *</span><span>Employee ID</span><span>Role</span><span>Department</span><span />
        </div>
        {rows.map((row, idx) => (
          <div key={idx} className="grid grid-cols-[1fr_1fr_1fr_1fr_32px] gap-2 items-center">
            <input type="text" value={row.name} onChange={e => updateRow(idx, 'name', e.target.value)}
              className="input-field text-xs py-1.5" placeholder="Name" />
            <input type="text" value={row.employee_id} onChange={e => updateRow(idx, 'employee_id', e.target.value)}
              className="input-field text-xs py-1.5" placeholder="ID" />
            <input type="text" value={row.role_in_drill} onChange={e => updateRow(idx, 'role_in_drill', e.target.value)}
              className="input-field text-xs py-1.5" placeholder="Role" />
            <input type="text" value={row.department} onChange={e => updateRow(idx, 'department', e.target.value)}
              className="input-field text-xs py-1.5" placeholder="Dept" />
            <button onClick={() => removeRow(idx)} className="p-1 text-text-tertiary hover:text-danger-600 transition-colors" disabled={rows.length <= 1}>
              <Trash2 size={13} />
            </button>
          </div>
        ))}
        <button onClick={addRow} className="btn-secondary px-3 py-1.5 text-xs rounded-lg flex items-center gap-1 mt-2">
          <Plus size={12} /> Add Row
        </button>
      </div>
    </Modal>
  );
}

// ─── Resource Form Modal ───────────────────────

function ResourceFormModal({ open, onClose, onSubmit, isSubmitting, title, initial }: {
  open: boolean; onClose: () => void;
  onSubmit: (data: Record<string, unknown>) => Promise<void>;
  isSubmitting: boolean;
  title: string;
  initial?: DrillResource | null;
}) {
  const [form, setForm] = useState({
    name: '',
    resource_type: '',
    quantity: '',
    status: 'Available',
    remarks: '',
  });

  useEffect(() => {
    if (initial) {
      setForm({
        name: initial.name || '',
        resource_type: initial.resource_type || '',
        quantity: initial.quantity?.toString() || '',
        status: initial.status || 'Available',
        remarks: initial.remarks || '',
      });
    } else {
      setForm({ name: '', resource_type: '', quantity: '', status: 'Available', remarks: '' });
    }
  }, [initial, open]);

  const handleSubmit = async () => {
    if (!form.name.trim()) return;
    await onSubmit({
      ...form,
      quantity: form.quantity ? Number(form.quantity) : null,
    });
    setForm({ name: '', resource_type: '', quantity: '', status: 'Available', remarks: '' });
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={title}
      size="md"
      footer={
        <>
          <button onClick={onClose} className="btn-secondary px-4 py-2 text-sm rounded-lg" disabled={isSubmitting}>Cancel</button>
          <button onClick={handleSubmit} className="btn-primary px-4 py-2 text-sm rounded-lg flex items-center gap-1.5" disabled={isSubmitting || !form.name.trim()}>
            {isSubmitting && <Loader2 size={14} className="animate-spin" />}
            {initial ? 'Update' : 'Add'} Resource
          </button>
        </>
      }
    >
      <div className="space-y-3">
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-medium text-text-secondary mb-1">Equipment / Name *</label>
            <input type="text" value={form.name} onChange={e => setForm(prev => ({ ...prev, name: e.target.value }))}
              className="input-field w-full" placeholder="e.g., Fire Extinguisher" />
          </div>
          <div>
            <label className="block text-xs font-medium text-text-secondary mb-1">Type</label>
            <SelectWithOther
              options={[...RESOURCE_TYPES]}
              value={form.resource_type}
              onChange={(v) => setForm(prev => ({ ...prev, resource_type: v }))}
              placeholder="Select type..."
              selectClassName="input-field w-full"
              inputClassName="input-field w-full"
            />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-medium text-text-secondary mb-1">Quantity</label>
            <input type="number" min={0} value={form.quantity} onChange={e => setForm(prev => ({ ...prev, quantity: e.target.value }))}
              className="input-field w-full" placeholder="0" />
          </div>
          <div>
            <label className="block text-xs font-medium text-text-secondary mb-1">Status</label>
            <select value={form.status} onChange={e => setForm(prev => ({ ...prev, status: e.target.value }))}
              className="input-field w-full">
              <option value="Available">Available</option>
              <option value="Functional">Functional</option>
              <option value="Unavailable">Unavailable</option>
              <option value="Defective">Defective</option>
              <option value="Not Checked">Not Checked</option>
            </select>
          </div>
        </div>
        <div>
          <label className="block text-xs font-medium text-text-secondary mb-1">Remarks</label>
          <textarea value={form.remarks} onChange={e => setForm(prev => ({ ...prev, remarks: e.target.value }))}
            className="input-field w-full" rows={2} placeholder="Additional notes..." />
        </div>
      </div>
    </Modal>
  );
}

// ─── Observation Form Modal ────────────────────

function ObservationFormModal({ open, onClose, onSubmit, isSubmitting }: {
  open: boolean; onClose: () => void;
  onSubmit: (data: Record<string, unknown>) => Promise<void>;
  isSubmitting: boolean;
}) {
  const [form, setForm] = useState({
    observation_type: 'Positive',
    category: '',
    description: '',
    severity: '',
    area: '',
    observed_by_name: '',
  });

  const handleSubmit = async () => {
    if (!form.description.trim()) return;
    await onSubmit(form);
    setForm({ observation_type: 'Positive', category: '', description: '', severity: '', area: '', observed_by_name: '' });
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Add Observation"
      size="md"
      footer={
        <>
          <button onClick={onClose} className="btn-secondary px-4 py-2 text-sm rounded-lg" disabled={isSubmitting}>Cancel</button>
          <button onClick={handleSubmit} className="btn-primary px-4 py-2 text-sm rounded-lg flex items-center gap-1.5" disabled={isSubmitting || !form.description.trim()}>
            {isSubmitting && <Loader2 size={14} className="animate-spin" />}
            Add Observation
          </button>
        </>
      }
    >
      <div className="space-y-3">
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-medium text-text-secondary mb-1">Observation Type *</label>
            <select value={form.observation_type} onChange={e => setForm(prev => ({ ...prev, observation_type: e.target.value }))}
              className="input-field w-full">
              <option value="Positive">Positive</option>
              <option value="Negative">Negative</option>
              <option value="Improvement">Improvement</option>
              <option value="General">General</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-text-secondary mb-1">Category</label>
            <SelectWithOther
              options={[...OBSERVATION_CATEGORIES]}
              value={form.category}
              onChange={(v) => setForm(prev => ({ ...prev, category: v }))}
              placeholder="Select..."
              selectClassName="input-field w-full"
              inputClassName="input-field w-full"
            />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-medium text-text-secondary mb-1">Severity</label>
            <select value={form.severity} onChange={e => setForm(prev => ({ ...prev, severity: e.target.value }))}
              className="input-field w-full">
              <option value="">Select...</option>
              <option value="Low">Low</option>
              <option value="Medium">Medium</option>
              <option value="High">High</option>
              <option value="Critical">Critical</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-text-secondary mb-1">Area</label>
            <input type="text" value={form.area} onChange={e => setForm(prev => ({ ...prev, area: e.target.value }))}
              className="input-field w-full" placeholder="Location / area" />
          </div>
        </div>
        <div>
          <label className="block text-xs font-medium text-text-secondary mb-1">Description *</label>
          <textarea value={form.description} onChange={e => setForm(prev => ({ ...prev, description: e.target.value }))}
            className="input-field w-full" rows={3} placeholder="Describe the observation..." />
        </div>
        <div>
          <label className="block text-xs font-medium text-text-secondary mb-1">Observed By</label>
          <input type="text" value={form.observed_by_name} onChange={e => setForm(prev => ({ ...prev, observed_by_name: e.target.value }))}
            className="input-field w-full" placeholder="Observer name" />
        </div>
      </div>
    </Modal>
  );
}

// ─── Action Form Modal ─────────────────────────

function ActionFormModal({ open, onClose, onSubmit, isSubmitting, observations }: {
  open: boolean; onClose: () => void;
  onSubmit: (data: Record<string, unknown>) => Promise<void>;
  isSubmitting: boolean;
  observations: DrillObservation[];
}) {
  const [form, setForm] = useState({
    title: '',
    description: '',
    assigned_to_name: '',
    due_date: '',
    priority: 'Medium',
    observation_id: '',
  });

  const handleSubmit = async () => {
    if (!form.title.trim() || !form.due_date) return;
    await onSubmit({
      ...form,
      observation_id: form.observation_id || null,
    });
    setForm({ title: '', description: '', assigned_to_name: '', due_date: '', priority: 'Medium', observation_id: '' });
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Add Corrective Action"
      size="md"
      footer={
        <>
          <button onClick={onClose} className="btn-secondary px-4 py-2 text-sm rounded-lg" disabled={isSubmitting}>Cancel</button>
          <button onClick={handleSubmit} className="btn-primary px-4 py-2 text-sm rounded-lg flex items-center gap-1.5" disabled={isSubmitting || !form.title.trim() || !form.due_date}>
            {isSubmitting && <Loader2 size={14} className="animate-spin" />}
            Add Action
          </button>
        </>
      }
    >
      <div className="space-y-3">
        <div>
          <label className="block text-xs font-medium text-text-secondary mb-1">Title *</label>
          <input type="text" value={form.title} onChange={e => setForm(prev => ({ ...prev, title: e.target.value }))}
            className="input-field w-full" placeholder="Action title" />
        </div>
        <div>
          <label className="block text-xs font-medium text-text-secondary mb-1">Description</label>
          <textarea value={form.description} onChange={e => setForm(prev => ({ ...prev, description: e.target.value }))}
            className="input-field w-full" rows={2} placeholder="Action description..." />
        </div>
        {observations.length > 0 && (
          <div>
            <label className="block text-xs font-medium text-text-secondary mb-1">Linked Observation</label>
            <select value={form.observation_id} onChange={e => setForm(prev => ({ ...prev, observation_id: e.target.value }))}
              className="input-field w-full">
              <option value="">None</option>
              {observations.map(o => (
                <option key={o.id} value={o.id}>{o.observation_type} - {o.description.substring(0, 60)}{o.description.length > 60 ? '...' : ''}</option>
              ))}
            </select>
          </div>
        )}
        <div className="grid grid-cols-3 gap-3">
          <div>
            <label className="block text-xs font-medium text-text-secondary mb-1">Assigned To</label>
            <input type="text" value={form.assigned_to_name} onChange={e => setForm(prev => ({ ...prev, assigned_to_name: e.target.value }))}
              className="input-field w-full" placeholder="Name" />
          </div>
          <div>
            <label className="block text-xs font-medium text-text-secondary mb-1">Due Date *</label>
            <input type="date" value={form.due_date} onChange={e => setForm(prev => ({ ...prev, due_date: e.target.value }))}
              className="input-field w-full" />
          </div>
          <div>
            <label className="block text-xs font-medium text-text-secondary mb-1">Priority</label>
            <select value={form.priority} onChange={e => setForm(prev => ({ ...prev, priority: e.target.value }))}
              className="input-field w-full">
              <option value="Low">Low</option>
              <option value="Medium">Medium</option>
              <option value="High">High</option>
              <option value="Critical">Critical</option>
            </select>
          </div>
        </div>
      </div>
    </Modal>
  );
}

// ═══════════════════════════════════════════════════
// SHARED COMPONENTS
// ═══════════════════════════════════════════════════

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-canvas rounded-xl border border-border p-4">
      <h3 className="text-xs font-semibold text-text-secondary uppercase tracking-wide mb-3">{title}</h3>
      {children}
    </div>
  );
}

function Grid({ children }: { children: React.ReactNode }) {
  return <div className="grid grid-cols-2 sm:grid-cols-3 gap-x-4 gap-y-2">{children}</div>;
}

function Field({ label, value, bold, full }: { label: string; value: string | null | undefined; bold?: boolean; full?: boolean }) {
  return (
    <div className={full ? 'col-span-full' : ''}>
      <p className="text-[10px] text-text-tertiary uppercase tracking-wide">{label}</p>
      <p className={`text-sm ${bold ? 'font-semibold' : ''} text-text-primary ${!value || value === '--' ? 'text-text-tertiary italic' : ''}`}>
        {value || '--'}
      </p>
    </div>
  );
}

function EmptyState({ message }: { message: string }) {
  return (
    <div className="text-center py-10 text-text-tertiary">
      <p className="text-sm">{message}</p>
    </div>
  );
}
