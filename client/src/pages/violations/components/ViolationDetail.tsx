import { useState } from 'react';
import { X as XIcon, FileText, Camera, Clock, User, AlertTriangle, CheckCircle, Plus, Upload, Trash2, ChevronDown, ChevronUp } from 'lucide-react';
import { StatusBadge } from '../../../components/ui/Badge';
import type { Violation, ViolationAction, ViolationLog, ViolationEvidence } from '../useViolations';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:8000/api';
const STORAGE_BASE = API_BASE.replace('/api', '') + '/storage/';

interface Props {
  violation: Violation | null;
  isLoading: boolean;
  onClose: () => void;
  onStatusChange: (id: string, status: string, close_notes?: string) => Promise<unknown>;
  onAddInvestigation: (id: string, data: Record<string, unknown>) => Promise<unknown>;
  onAddAction: (id: string, data: Record<string, unknown>) => Promise<unknown>;
  onUpdateAction: (violationId: string, actionId: string, data: Record<string, unknown>) => Promise<unknown>;
  onDeleteAction: (violationId: string, actionId: string) => Promise<unknown>;
  onAssign: (id: string, assigned_to_name: string) => Promise<unknown>;
  onUploadEvidence: (id: string, files: File[], related_type?: string) => Promise<unknown>;
}

const severityColors: Record<string, string> = {
  Low: 'bg-info-100 text-info-700', Medium: 'bg-warning-100 text-warning-700',
  High: 'bg-danger-100 text-danger-700', Critical: 'bg-danger-200 text-danger-800 font-bold',
};

const ROOT_CAUSE_CATS = [
  'Human Error', 'Lack of Training', 'Poor Supervision', 'Poor Safety Culture',
  'Equipment Issue', 'Time Pressure', 'Procedure Not Clear', 'Other',
];

export default function ViolationDetail({ violation: v, isLoading, onClose, onStatusChange, onAddInvestigation, onAddAction, onUpdateAction, onDeleteAction, onAssign, onUploadEvidence }: Props) {
  const [activeSection, setActiveSection] = useState<string>('info');
  const [showInvestForm, setShowInvestForm] = useState(false);
  const [showActionForm, setShowActionForm] = useState(false);
  const [showAssignForm, setShowAssignForm] = useState(false);
  const [showCloseForm, setShowCloseForm] = useState(false);

  // Investigation form
  const [investForm, setInvestForm] = useState({ root_cause: '', root_cause_category: '', intentional: false, system_failure: false, investigation_notes: '' });
  // Action form
  const [actionForm, setActionForm] = useState({ title: '', description: '', assigned_to_name: '', due_date: '', priority: 'Medium' });
  // Assign form
  const [assignName, setAssignName] = useState('');
  // Close form
  const [closeNotes, setCloseNotes] = useState('');

  if (!v) return null;

  const handleInvestSubmit = async () => {
    if (!investForm.root_cause.trim()) return;
    await onAddInvestigation(v.id, investForm);
    setShowInvestForm(false);
    setInvestForm({ root_cause: '', root_cause_category: '', intentional: false, system_failure: false, investigation_notes: '' });
  };

  const handleActionSubmit = async () => {
    if (!actionForm.title.trim() || !actionForm.due_date) return;
    await onAddAction(v.id, actionForm);
    setShowActionForm(false);
    setActionForm({ title: '', description: '', assigned_to_name: '', due_date: '', priority: 'Medium' });
  };

  const handleAssign = async () => {
    if (!assignName.trim()) return;
    await onAssign(v.id, assignName);
    setShowAssignForm(false);
    setAssignName('');
  };

  const handleClose = async () => {
    await onStatusChange(v.id, 'Closed', closeNotes);
    setShowCloseForm(false);
    setCloseNotes('');
  };

  const handleEvidenceUpload = async (files: FileList | null) => {
    if (!files?.length) return;
    await onUploadEvidence(v.id, Array.from(files));
  };

  const tabs = [
    { id: 'info', label: 'Details' },
    { id: 'evidence', label: `Evidence (${v.evidence?.length ?? 0})` },
    { id: 'investigation', label: 'Investigation' },
    { id: 'actions', label: `Actions (${v.actions?.length ?? 0})` },
    { id: 'history', label: 'History' },
  ];

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <div className="absolute inset-0 bg-black/30" onClick={onClose} />
      <div className="relative w-full max-w-[720px] bg-surface h-full flex flex-col shadow-2xl overflow-hidden animate-slideInRight">
        {/* Header */}
        <div className="shrink-0 flex items-center justify-between px-6 py-4 border-b border-border bg-canvas/50">
          <div>
            <div className="flex items-center gap-3">
              <h2 className="text-lg font-bold text-text-primary">{v.violation_code}</h2>
              <StatusBadge status={v.status} />
              <span className={`inline-block px-2 py-0.5 rounded-full text-xs ${severityColors[v.severity]}`}>{v.severity}</span>
            </div>
            <p className="text-xs text-text-secondary mt-0.5">{v.violation_category} — {v.violation_type} Violation</p>
          </div>
          <button onClick={onClose} className="p-2 rounded-lg text-text-tertiary hover:bg-canvas transition-colors"><XIcon size={20} /></button>
        </div>

        {/* Quick Actions */}
        <div className="shrink-0 flex items-center gap-2 px-6 py-3 border-b border-border bg-canvas/30 flex-wrap">
          {v.status !== 'Closed' && (
            <>
              <button onClick={() => setShowAssignForm(true)} className="btn-secondary px-3 py-1.5 text-xs rounded-lg">Assign</button>
              {v.status === 'Open' && (
                <button onClick={() => onStatusChange(v.id, 'Under Investigation')} className="btn-secondary px-3 py-1.5 text-xs rounded-lg">Start Investigation</button>
              )}
              {!['Closed'].includes(v.status) && (
                <button onClick={() => setShowCloseForm(true)} className="btn-primary px-3 py-1.5 text-xs rounded-lg flex items-center gap-1">
                  <CheckCircle size={12} /> Close
                </button>
              )}
            </>
          )}
          {v.status === 'Closed' && (
            <button onClick={() => onStatusChange(v.id, 'Reopened')} className="btn-secondary px-3 py-1.5 text-xs rounded-lg text-warning-600">Reopen</button>
          )}
        </div>

        {/* Tabs */}
        <div className="shrink-0 flex border-b border-border px-6 bg-surface">
          {tabs.map(tab => (
            <button key={tab.id} onClick={() => setActiveSection(tab.id)}
              className={`px-4 py-2.5 text-xs font-medium border-b-2 transition-colors ${activeSection === tab.id ? 'border-primary-500 text-primary-700' : 'border-transparent text-text-secondary hover:text-text-primary'}`}>
              {tab.label}
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain px-6 py-5 space-y-5">
          {activeSection === 'info' && <InfoSection v={v} />}
          {activeSection === 'evidence' && <EvidenceSection evidence={v.evidence ?? []} onUpload={handleEvidenceUpload} />}
          {activeSection === 'investigation' && (
            <InvestigationSection v={v} showForm={showInvestForm} setShowForm={setShowInvestForm}
              form={investForm} setForm={setInvestForm} onSubmit={handleInvestSubmit} />
          )}
          {activeSection === 'actions' && (
            <ActionsSection actions={v.actions ?? []} showForm={showActionForm} setShowForm={setShowActionForm}
              form={actionForm} setForm={setActionForm} onSubmit={handleActionSubmit}
              onUpdate={onUpdateAction} onDelete={onDeleteAction} violationId={v.id} />
          )}
          {activeSection === 'history' && <HistorySection logs={v.logs ?? []} />}
        </div>

        {/* Assign Modal */}
        {showAssignForm && (
          <div className="absolute inset-0 z-10 flex items-center justify-center bg-black/20">
            <div className="bg-surface rounded-xl border border-border p-6 w-80 shadow-xl">
              <h3 className="font-semibold text-sm mb-3">Assign Violation</h3>
              <input type="text" value={assignName} onChange={e => setAssignName(e.target.value)}
                className="input-field w-full mb-3" placeholder="Assigned person name" />
              <div className="flex justify-end gap-2">
                <button onClick={() => setShowAssignForm(false)} className="btn-secondary px-3 py-1.5 text-xs rounded-lg">Cancel</button>
                <button onClick={handleAssign} className="btn-primary px-3 py-1.5 text-xs rounded-lg">Assign</button>
              </div>
            </div>
          </div>
        )}

        {/* Close Modal */}
        {showCloseForm && (
          <div className="absolute inset-0 z-10 flex items-center justify-center bg-black/20">
            <div className="bg-surface rounded-xl border border-border p-6 w-96 shadow-xl">
              <h3 className="font-semibold text-sm mb-3">Close Violation</h3>
              <textarea value={closeNotes} onChange={e => setCloseNotes(e.target.value)}
                className="input-field w-full mb-3" rows={3} placeholder="Closure notes (optional)..." />
              <div className="flex justify-end gap-2">
                <button onClick={() => setShowCloseForm(false)} className="btn-secondary px-3 py-1.5 text-xs rounded-lg">Cancel</button>
                <button onClick={handleClose} className="btn-primary px-3 py-1.5 text-xs rounded-lg">Close Violation</button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Sub-sections ───────────────────────────────

function InfoSection({ v }: { v: Violation }) {
  return (
    <div className="space-y-5">
      <Section title="Basic Information">
        <Grid>
          <Field label="Date" value={v.violation_date} />
          <Field label="Time" value={v.violation_time} />
          <Field label="Location" value={v.location} />
          <Field label="Area" value={v.area} />
          <Field label="Department" value={v.department} />
          <Field label="Reported By" value={v.reported_by_name} />
        </Grid>
      </Section>
      <Section title="Person Involved">
        <Grid>
          <Field label="Violator Name" value={v.violator_name} bold />
          <Field label="Employee ID" value={v.employee_id} />
          <Field label="Designation" value={v.designation} />
          <Field label="Contractor" value={v.contractor_name} />
        </Grid>
      </Section>
      <Section title="Violation Details">
        <Grid>
          <Field label="Type" value={v.violation_type} />
          <Field label="Category" value={v.violation_category} />
          <Field label="Severity" value={v.severity} />
          <Field label="Immediate Action" value={v.immediate_action} />
        </Grid>
        <div className="mt-3">
          <Field label="Description" value={v.description} full />
        </div>
        {v.violated_rule && <div className="mt-2"><Field label="Violated Rule/Procedure" value={v.violated_rule} full /></div>}
        {v.hazard_description && <div className="mt-2"><Field label="Hazard Description" value={v.hazard_description} full /></div>}
        {v.immediate_action_notes && <div className="mt-2"><Field label="Action Notes" value={v.immediate_action_notes} full /></div>}
      </Section>
      {v.assigned_to_name && (
        <Section title="Assignment">
          <Grid>
            <Field label="Assigned To" value={v.assigned_to_name} bold />
          </Grid>
        </Section>
      )}
      {v.remarks && (
        <Section title="Remarks">
          <p className="text-sm text-text-primary whitespace-pre-wrap">{v.remarks}</p>
        </Section>
      )}
    </div>
  );
}

function EvidenceSection({ evidence, onUpload }: { evidence: ViolationEvidence[]; onUpload: (files: FileList | null) => void }) {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-text-primary">Evidence Files</h3>
        <label className="btn-secondary px-3 py-1.5 text-xs rounded-lg cursor-pointer inline-flex items-center gap-1">
          <Upload size={12} /> Upload
          <input type="file" multiple accept="image/*,.pdf,.doc,.docx,.xls,.xlsx,.csv,.ppt,.pptx,.txt" className="hidden" onChange={e => onUpload(e.target.files)} />
        </label>
      </div>
      {evidence.length === 0 ? (
        <div className="text-center py-8 text-text-tertiary text-sm">No evidence uploaded yet</div>
      ) : (
        <div className="grid grid-cols-2 gap-3">
          {evidence.map(e => {
            const isImage = e.file_type?.startsWith('image/');
            return (
              <div key={e.id} className="border border-border rounded-xl overflow-hidden bg-canvas">
                {isImage ? (
                  <img src={`${STORAGE_BASE}${e.file_path}`} alt={e.original_name ?? ''} className="w-full h-32 object-cover" />
                ) : (
                  <div className="h-32 flex items-center justify-center"><FileText size={32} className="text-text-tertiary" /></div>
                )}
                <div className="p-2.5">
                  <p className="text-xs font-medium text-text-primary truncate">{e.original_name}</p>
                  <p className="text-[10px] text-text-tertiary mt-0.5">
                    {e.related_type} — {e.uploaded_by} — {new Date(e.created_at).toLocaleDateString()}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function InvestigationSection({ v, showForm, setShowForm, form, setForm, onSubmit }: {
  v: Violation; showForm: boolean; setShowForm: (v: boolean) => void;
  form: { root_cause: string; root_cause_category: string; intentional: boolean; system_failure: boolean; investigation_notes: string };
  setForm: (f: typeof form) => void; onSubmit: () => void;
}) {
  const hasInvestigation = !!v.root_cause;

  return (
    <div className="space-y-4">
      {hasInvestigation ? (
        <Section title="Investigation Results">
          <Grid>
            <Field label="Investigated By" value={v.investigated_by_name} />
            <Field label="Investigation Date" value={v.investigation_date} />
            <Field label="Root Cause Category" value={v.root_cause_category} />
            <Field label="Intentional?" value={v.intentional ? 'Yes' : 'No'} />
            <Field label="System Failure?" value={v.system_failure ? 'Yes' : 'No'} />
          </Grid>
          <div className="mt-3"><Field label="Root Cause" value={v.root_cause} full /></div>
          {v.investigation_notes && <div className="mt-2"><Field label="Investigation Notes" value={v.investigation_notes} full /></div>}
        </Section>
      ) : (
        <div className="text-center py-6 text-text-tertiary text-sm">No investigation recorded yet</div>
      )}

      {!hasInvestigation && !showForm && (
        <button onClick={() => setShowForm(true)} className="btn-primary px-4 py-2 text-sm rounded-lg w-full flex items-center justify-center gap-2">
          <Plus size={14} /> Add Investigation
        </button>
      )}

      {showForm && (
        <div className="border border-border rounded-xl p-4 bg-canvas space-y-3">
          <h4 className="text-sm font-semibold">Investigation Details</h4>
          <div>
            <label className="block text-xs font-medium text-text-secondary mb-1">Root Cause *</label>
            <textarea value={form.root_cause} onChange={e => setForm({ ...form, root_cause: e.target.value })}
              className="input-field w-full" rows={2} placeholder="Describe the root cause..." />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-text-secondary mb-1">Root Cause Category</label>
              <select value={form.root_cause_category} onChange={e => setForm({ ...form, root_cause_category: e.target.value })}
                className="input-field w-full">
                <option value="">Select...</option>
                {ROOT_CAUSE_CATS.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div className="flex items-end gap-4">
              <label className="flex items-center gap-2 text-xs">
                <input type="checkbox" checked={form.intentional} onChange={e => setForm({ ...form, intentional: e.target.checked })}
                  className="rounded" /> Intentional?
              </label>
              <label className="flex items-center gap-2 text-xs">
                <input type="checkbox" checked={form.system_failure} onChange={e => setForm({ ...form, system_failure: e.target.checked })}
                  className="rounded" /> System Failure?
              </label>
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-text-secondary mb-1">Investigation Notes</label>
            <textarea value={form.investigation_notes} onChange={e => setForm({ ...form, investigation_notes: e.target.value })}
              className="input-field w-full" rows={2} placeholder="Additional notes..." />
          </div>
          <div className="flex justify-end gap-2">
            <button onClick={() => setShowForm(false)} className="btn-secondary px-3 py-1.5 text-xs rounded-lg">Cancel</button>
            <button onClick={onSubmit} className="btn-primary px-4 py-1.5 text-xs rounded-lg">Save Investigation</button>
          </div>
        </div>
      )}
    </div>
  );
}

function ActionsSection({ actions, showForm, setShowForm, form, setForm, onSubmit, onUpdate, onDelete, violationId }: {
  actions: ViolationAction[]; showForm: boolean; setShowForm: (v: boolean) => void;
  form: { title: string; description: string; assigned_to_name: string; due_date: string; priority: string };
  setForm: (f: typeof form) => void; onSubmit: () => void;
  onUpdate: (vId: string, aId: string, data: Record<string, unknown>) => Promise<unknown>;
  onDelete: (vId: string, aId: string) => Promise<unknown>;
  violationId: string;
}) {
  const actionStatusColors: Record<string, string> = {
    Pending: 'bg-warning-100 text-warning-700',
    'In Progress': 'bg-info-100 text-info-700',
    Completed: 'bg-success-100 text-success-700',
    Overdue: 'bg-danger-100 text-danger-700',
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-text-primary">Corrective Actions</h3>
        <button onClick={() => setShowForm(true)} className="btn-secondary px-3 py-1.5 text-xs rounded-lg flex items-center gap-1">
          <Plus size={12} /> Add Action
        </button>
      </div>

      {actions.length === 0 && !showForm && (
        <div className="text-center py-6 text-text-tertiary text-sm">No corrective actions yet</div>
      )}

      {actions.map(a => (
        <div key={a.id} className="border border-border rounded-xl p-4 bg-canvas">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <h4 className="text-sm font-semibold text-text-primary">{a.title}</h4>
                <span className={`px-2 py-0.5 rounded-full text-[10px] font-medium ${actionStatusColors[a.status] ?? 'bg-neutral-100 text-neutral-600'}`}>{a.status}</span>
              </div>
              {a.description && <p className="text-xs text-text-secondary mt-1">{a.description}</p>}
              <div className="flex items-center gap-4 mt-2 text-[10px] text-text-tertiary">
                {a.assigned_to_name && <span className="flex items-center gap-1"><User size={10} /> {a.assigned_to_name}</span>}
                {a.due_date && <span className="flex items-center gap-1"><Clock size={10} /> Due: {a.due_date}</span>}
                <span>Priority: {a.priority}</span>
              </div>
              {a.completion_notes && <p className="text-xs text-success-700 mt-2 bg-success-50 px-2 py-1 rounded">{a.completion_notes}</p>}
            </div>
            <div className="flex items-center gap-1 ml-3">
              {a.status !== 'Completed' && (
                <>
                  {a.status === 'Pending' && (
                    <button onClick={() => onUpdate(violationId, a.id, { status: 'In Progress' })}
                      className="text-xs text-info-600 hover:underline">Start</button>
                  )}
                  <button onClick={() => {
                    const notes = prompt('Completion notes:');
                    if (notes !== null) onUpdate(violationId, a.id, { status: 'Completed', completion_notes: notes });
                  }} className="text-xs text-success-600 hover:underline ml-2">Complete</button>
                </>
              )}
              <button onClick={() => { if (confirm('Delete this action?')) onDelete(violationId, a.id); }}
                className="p-1 text-danger-400 hover:text-danger-600 ml-2"><Trash2 size={12} /></button>
            </div>
          </div>
        </div>
      ))}

      {showForm && (
        <div className="border border-primary-200 rounded-xl p-4 bg-primary-50/30 space-y-3">
          <h4 className="text-sm font-semibold">New Corrective Action</h4>
          <div>
            <label className="block text-xs font-medium text-text-secondary mb-1">Title *</label>
            <input type="text" value={form.title} onChange={e => setForm({ ...form, title: e.target.value })}
              className="input-field w-full" placeholder="Action title..." />
          </div>
          <div>
            <label className="block text-xs font-medium text-text-secondary mb-1">Description</label>
            <textarea value={form.description} onChange={e => setForm({ ...form, description: e.target.value })}
              className="input-field w-full" rows={2} placeholder="Action description..." />
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-medium text-text-secondary mb-1">Assigned To</label>
              <input type="text" value={form.assigned_to_name} onChange={e => setForm({ ...form, assigned_to_name: e.target.value })}
                className="input-field w-full" placeholder="Person name" />
            </div>
            <div>
              <label className="block text-xs font-medium text-text-secondary mb-1">Due Date *</label>
              <input type="date" value={form.due_date} onChange={e => setForm({ ...form, due_date: e.target.value })}
                className="input-field w-full" />
            </div>
            <div>
              <label className="block text-xs font-medium text-text-secondary mb-1">Priority</label>
              <select value={form.priority} onChange={e => setForm({ ...form, priority: e.target.value })}
                className="input-field w-full">
                <option value="Low">Low</option>
                <option value="Medium">Medium</option>
                <option value="High">High</option>
              </select>
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <button onClick={() => setShowForm(false)} className="btn-secondary px-3 py-1.5 text-xs rounded-lg">Cancel</button>
            <button onClick={onSubmit} className="btn-primary px-4 py-1.5 text-xs rounded-lg">Add Action</button>
          </div>
        </div>
      )}
    </div>
  );
}

function HistorySection({ logs }: { logs: ViolationLog[] }) {
  if (!logs.length) {
    return <div className="text-center py-6 text-text-tertiary text-sm">No history yet</div>;
  }

  const typeIcons: Record<string, string> = {
    created: '🆕', status_changed: '🔄', investigation_added: '🔍',
    action_added: '📋', action_updated: '✏️', action_removed: '🗑️',
    evidence_uploaded: '📎', evidence_removed: '🗑️', assigned: '👤',
    edited: '✏️', closed: '✅', reopened: '🔓',
  };

  return (
    <div className="space-y-0">
      {logs.map((log, idx) => (
        <div key={log.id} className="flex gap-3 pb-4 relative">
          {idx < logs.length - 1 && <div className="absolute left-[15px] top-8 bottom-0 w-px bg-border" />}
          <div className="w-8 h-8 rounded-full bg-canvas border border-border flex items-center justify-center text-sm shrink-0 z-10">
            {typeIcons[log.action_type] || '📝'}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm text-text-primary">{log.description || log.action_type.replace(/_/g, ' ')}</p>
            <div className="flex items-center gap-2 mt-0.5">
              <span className="text-[10px] text-text-tertiary">{log.user_name}</span>
              <span className="text-[10px] text-text-tertiary">
                {new Date(log.created_at).toLocaleString()}
              </span>
            </div>
            {log.old_value && log.new_value && (
              <p className="text-[10px] mt-1 text-text-secondary">
                <span className="line-through text-danger-400">{log.old_value}</span>
                {' → '}
                <span className="text-success-600 font-medium">{log.new_value}</span>
              </p>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}

// ─── Shared components ──────────────────────────

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
      <p className={`text-sm ${bold ? 'font-semibold' : ''} text-text-primary ${!value ? 'text-text-tertiary italic' : ''}`}>
        {value || '—'}
      </p>
    </div>
  );
}
