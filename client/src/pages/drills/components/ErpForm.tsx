import { useState, useEffect, useRef, type FormEvent } from 'react';
import { Loader2, Upload, X as XIcon } from 'lucide-react';
import Modal from '../../../components/ui/Modal';
import SelectWithOther from '../../../components/ui/SelectWithOther';

// ─── Constants ───────────────────────────────────────

const ERP_TYPES = [
  'Fire Emergency Plan',
  'Medical Emergency Plan',
  'Evacuation Plan',
  'Chemical Spill Response Plan',
  'Confined Space Rescue Plan',
  'Work at Height Rescue Plan',
  'Electrical Emergency Plan',
  'Environmental Emergency Plan',
  'Security Emergency Plan',
  'Natural Disaster Plan',
  'Vehicle / Traffic Emergency Plan',
  'Other',
] as const;

const RISK_LEVELS = ['Low', 'Medium', 'High', 'Critical'] as const;

const REVIEW_FREQUENCIES = [
  'Monthly',
  'Quarterly',
  'Bi-Annual',
  'Annual',
  'As Required',
] as const;

const ERP_STATUSES = ['Draft', 'Active', 'Under Review', 'Obsolete'] as const;

const INPUT_CLS =
  'w-full h-[38px] px-3 text-[13px] border border-border rounded-[var(--radius-sm)] bg-surface text-text-primary placeholder:text-text-tertiary focus:border-primary-500 focus:ring-2 focus:ring-primary-100 outline-none transition-all';

const TEXTAREA_CLS =
  'w-full px-3 py-2 text-[13px] border border-border rounded-[var(--radius-sm)] bg-surface text-text-primary placeholder:text-text-tertiary focus:border-primary-500 focus:ring-2 focus:ring-primary-100 outline-none transition-all resize-none';

const LABEL_CLS = 'block text-[12px] font-medium text-text-secondary mb-1';

// ─── Types ───────────────────────────────────────────

interface Props {
  open: boolean;
  onClose: () => void;
  onSubmit: (data: FormData) => Promise<void>;
  isSubmitting: boolean;
  initialData?: Record<string, unknown> | null;
}

interface FormState {
  title: string;
  erp_type: string;
  version: string;
  revision_number: string;
  risk_level: string;
  status: string;
  site: string;
  project: string;
  area: string;
  zone: string;
  department: string;
  scenario_description: string;
  scope: string;
  purpose: string;
  trigger_conditions: string;
  incident_controller: string;
  emergency_coordinator: string;
  alarm_method: string;
  assembly_point: string;
  muster_point: string;
  communication_method: string;
  radio_channel: string;
  review_frequency: string;
  next_review_date: string;
  notes: string;
}

const EMPTY_FORM: FormState = {
  title: '',
  erp_type: '',
  version: '',
  revision_number: '',
  risk_level: '',
  status: 'Draft',
  site: '',
  project: '',
  area: '',
  zone: '',
  department: '',
  scenario_description: '',
  scope: '',
  purpose: '',
  trigger_conditions: '',
  incident_controller: '',
  emergency_coordinator: '',
  alarm_method: '',
  assembly_point: '',
  muster_point: '',
  communication_method: '',
  radio_channel: '',
  review_frequency: '',
  next_review_date: '',
  notes: '',
};

// ─── Component ───────────────────────────────────────

export default function ErpForm({
  open,
  onClose,
  onSubmit,
  isSubmitting,
  initialData,
}: Props) {
  const isEdit = !!initialData;
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [errors, setErrors] = useState<Record<string, string>>({});

  // File refs
  const [fileMain, setFileMain] = useState<File | null>(null);
  const [fileDrawings, setFileDrawings] = useState<File | null>(null);
  const [fileSop, setFileSop] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const drawingsInputRef = useRef<HTMLInputElement>(null);
  const sopInputRef = useRef<HTMLInputElement>(null);

  // Populate form when editing
  useEffect(() => {
    if (initialData) {
      setForm({
        title: String(initialData.title ?? ''),
        erp_type: String(initialData.erp_type ?? ''),
        version: String(initialData.version ?? ''),
        revision_number: String(initialData.revision_number ?? ''),
        risk_level: String(initialData.risk_level ?? ''),
        status: String(initialData.status ?? 'Draft'),
        site: String(initialData.site ?? ''),
        project: String(initialData.project ?? ''),
        area: String(initialData.area ?? ''),
        zone: String(initialData.zone ?? ''),
        department: String(initialData.department ?? ''),
        scenario_description: String(initialData.scenario_description ?? initialData.description ?? ''),
        scope: String(initialData.scope ?? ''),
        purpose: String(initialData.purpose ?? ''),
        trigger_conditions: String(initialData.trigger_conditions ?? ''),
        incident_controller: String(initialData.incident_controller ?? ''),
        emergency_coordinator: String(initialData.emergency_coordinator ?? ''),
        alarm_method: String(initialData.alarm_method ?? ''),
        assembly_point: String(initialData.assembly_point ?? ''),
        muster_point: String(initialData.muster_point ?? ''),
        communication_method: String(initialData.communication_method ?? ''),
        radio_channel: String(initialData.radio_channel ?? ''),
        review_frequency: String(initialData.review_frequency ?? ''),
        next_review_date: String(initialData.next_review_date ?? ''),
        notes: String(initialData.notes ?? initialData.remarks ?? ''),
      });
    } else {
      setForm(EMPTY_FORM);
    }
    setErrors({});
    setFileMain(null);
    setFileDrawings(null);
    setFileSop(null);
  }, [initialData, open]);

  const set = (key: keyof FormState, value: string) => {
    setForm(prev => ({ ...prev, [key]: value }));
    if (errors[key]) setErrors(prev => { const n = { ...prev }; delete n[key]; return n; });
  };

  const validate = (): boolean => {
    const errs: Record<string, string> = {};
    if (!form.title.trim()) errs.title = 'Title is required';
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    const fd = new FormData();

    // Append all text fields
    const fields: [keyof FormState, string][] = [
      ['title', 'title'],
      ['erp_type', 'erp_type'],
      ['version', 'version'],
      ['revision_number', 'revision_number'],
      ['risk_level', 'risk_level'],
      ['status', 'status'],
      ['site', 'site'],
      ['project', 'project'],
      ['area', 'area'],
      ['zone', 'zone'],
      ['department', 'department'],
      ['scenario_description', 'description'],
      ['scope', 'scope'],
      ['purpose', 'purpose'],
      ['trigger_conditions', 'trigger_conditions'],
      ['incident_controller', 'incident_controller'],
      ['emergency_coordinator', 'emergency_coordinator'],
      ['alarm_method', 'alarm_method'],
      ['assembly_point', 'assembly_point'],
      ['muster_point', 'muster_point'],
      ['communication_method', 'communication_method'],
      ['radio_channel', 'radio_channel'],
      ['review_frequency', 'review_frequency'],
      ['next_review_date', 'next_review_date'],
      ['notes', 'remarks'],
    ];

    for (const [formKey, apiKey] of fields) {
      const val = form[formKey].trim();
      if (val) fd.append(apiKey, val);
    }

    // Append files
    if (fileMain) fd.append('file', fileMain);
    if (fileDrawings) fd.append('drawings', fileDrawings);
    if (fileSop) fd.append('sop', fileSop);

    await onSubmit(fd);
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={isEdit ? 'Edit ERP' : 'New Emergency Response Plan'}
      subtitle={isEdit ? 'Update plan details and documents' : 'Create a new emergency response plan'}
      size="lg"
      footer={
        <>
          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            className="px-4 py-2 text-[13px] font-medium text-text-secondary bg-surface border border-border rounded-[var(--radius-sm)] hover:bg-surface-sunken transition-colors"
          >
            Cancel
          </button>
          <button
            type="submit"
            form="erp-form"
            disabled={isSubmitting}
            className="px-5 py-2 text-[13px] font-medium text-white bg-primary-600 rounded-[var(--radius-sm)] hover:bg-primary-700 disabled:opacity-50 transition-colors inline-flex items-center gap-2"
          >
            {isSubmitting && <Loader2 size={14} className="animate-spin" />}
            {isEdit ? 'Update ERP' : 'Create ERP'}
          </button>
        </>
      }
    >
      <form id="erp-form" onSubmit={handleSubmit} className="space-y-6">
        {/* ── Section 1: Basic ───────────────────────── */}
        <fieldset className="space-y-3">
          <legend className="text-[11px] font-semibold text-text-tertiary uppercase tracking-wider mb-2">
            Basic Information
          </legend>

          <div>
            <label htmlFor="ef-title" className={LABEL_CLS}>
              Title <span className="text-danger-500">*</span>
            </label>
            <input
              id="ef-title"
              type="text"
              value={form.title}
              onChange={e => set('title', e.target.value)}
              placeholder="e.g. Fire Emergency Response Plan - Zone A"
              className={`${INPUT_CLS} ${errors.title ? 'border-danger-400 focus:border-danger-500 focus:ring-danger-100' : ''}`}
            />
            {errors.title && (
              <p className="text-[11px] text-danger-600 mt-0.5">{errors.title}</p>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label htmlFor="ef-type" className={LABEL_CLS}>ERP Type</label>
              <SelectWithOther
                id="ef-type"
                options={[...ERP_TYPES]}
                value={form.erp_type}
                onChange={(v) => set('erp_type', v)}
                placeholder="Select type..."
                selectClassName={INPUT_CLS}
                inputClassName={INPUT_CLS}
              />
            </div>
            <div>
              <label htmlFor="ef-risk" className={LABEL_CLS}>Risk Level</label>
              <select
                id="ef-risk"
                value={form.risk_level}
                onChange={e => set('risk_level', e.target.value)}
                className={INPUT_CLS}
              >
                <option value="">Select risk level...</option>
                {RISK_LEVELS.map(r => (
                  <option key={r} value={r}>{r}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label htmlFor="ef-version" className={LABEL_CLS}>Version</label>
              <input
                id="ef-version"
                type="text"
                value={form.version}
                onChange={e => set('version', e.target.value)}
                placeholder="e.g. 1"
                className={INPUT_CLS}
              />
            </div>
            <div>
              <label htmlFor="ef-revision" className={LABEL_CLS}>Revision Number</label>
              <input
                id="ef-revision"
                type="text"
                value={form.revision_number}
                onChange={e => set('revision_number', e.target.value)}
                placeholder="e.g. 0"
                className={INPUT_CLS}
              />
            </div>
            {isEdit && (
              <div>
                <label htmlFor="ef-status" className={LABEL_CLS}>Status</label>
                <select
                  id="ef-status"
                  value={form.status}
                  onChange={e => set('status', e.target.value)}
                  className={INPUT_CLS}
                >
                  {ERP_STATUSES.map(s => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </select>
              </div>
            )}
          </div>
        </fieldset>

        {/* ── Section 2: Location ────────────────────── */}
        <fieldset className="space-y-3">
          <legend className="text-[11px] font-semibold text-text-tertiary uppercase tracking-wider mb-2">
            Location
          </legend>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label htmlFor="ef-site" className={LABEL_CLS}>Site</label>
              <input
                id="ef-site"
                type="text"
                value={form.site}
                onChange={e => set('site', e.target.value)}
                placeholder="Site name"
                className={INPUT_CLS}
              />
            </div>
            <div>
              <label htmlFor="ef-project" className={LABEL_CLS}>Project</label>
              <input
                id="ef-project"
                type="text"
                value={form.project}
                onChange={e => set('project', e.target.value)}
                placeholder="Project name"
                className={INPUT_CLS}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label htmlFor="ef-area" className={LABEL_CLS}>Area</label>
              <input
                id="ef-area"
                type="text"
                value={form.area}
                onChange={e => set('area', e.target.value)}
                placeholder="Area"
                className={INPUT_CLS}
              />
            </div>
            <div>
              <label htmlFor="ef-zone" className={LABEL_CLS}>Zone</label>
              <input
                id="ef-zone"
                type="text"
                value={form.zone}
                onChange={e => set('zone', e.target.value)}
                placeholder="Zone"
                className={INPUT_CLS}
              />
            </div>
            <div>
              <label htmlFor="ef-dept" className={LABEL_CLS}>Department</label>
              <input
                id="ef-dept"
                type="text"
                value={form.department}
                onChange={e => set('department', e.target.value)}
                placeholder="Department"
                className={INPUT_CLS}
              />
            </div>
          </div>
        </fieldset>

        {/* ── Section 3: Scenario & Planning ─────────── */}
        <fieldset className="space-y-3">
          <legend className="text-[11px] font-semibold text-text-tertiary uppercase tracking-wider mb-2">
            Scenario & Planning
          </legend>

          <div>
            <label htmlFor="ef-scenario" className={LABEL_CLS}>Scenario Description</label>
            <textarea
              id="ef-scenario"
              value={form.scenario_description}
              onChange={e => set('scenario_description', e.target.value)}
              placeholder="Describe the emergency scenario this plan covers..."
              rows={3}
              className={TEXTAREA_CLS}
            />
          </div>

          <div>
            <label htmlFor="ef-scope" className={LABEL_CLS}>Scope</label>
            <textarea
              id="ef-scope"
              value={form.scope}
              onChange={e => set('scope', e.target.value)}
              placeholder="Define the scope of this plan..."
              rows={2}
              className={TEXTAREA_CLS}
            />
          </div>

          <div>
            <label htmlFor="ef-purpose" className={LABEL_CLS}>Purpose</label>
            <textarea
              id="ef-purpose"
              value={form.purpose}
              onChange={e => set('purpose', e.target.value)}
              placeholder="State the purpose of this ERP..."
              rows={2}
              className={TEXTAREA_CLS}
            />
          </div>

          <div>
            <label htmlFor="ef-triggers" className={LABEL_CLS}>Trigger Conditions</label>
            <textarea
              id="ef-triggers"
              value={form.trigger_conditions}
              onChange={e => set('trigger_conditions', e.target.value)}
              placeholder="When should this plan be activated?"
              rows={2}
              className={TEXTAREA_CLS}
            />
          </div>
        </fieldset>

        {/* ── Section 4: Response Structure ──────────── */}
        <fieldset className="space-y-3">
          <legend className="text-[11px] font-semibold text-text-tertiary uppercase tracking-wider mb-2">
            Response Structure
          </legend>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label htmlFor="ef-ic" className={LABEL_CLS}>Incident Controller</label>
              <input
                id="ef-ic"
                type="text"
                value={form.incident_controller}
                onChange={e => set('incident_controller', e.target.value)}
                placeholder="Name / Role"
                className={INPUT_CLS}
              />
            </div>
            <div>
              <label htmlFor="ef-ec" className={LABEL_CLS}>Emergency Coordinator</label>
              <input
                id="ef-ec"
                type="text"
                value={form.emergency_coordinator}
                onChange={e => set('emergency_coordinator', e.target.value)}
                placeholder="Name / Role"
                className={INPUT_CLS}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label htmlFor="ef-alarm" className={LABEL_CLS}>Alarm Method</label>
              <input
                id="ef-alarm"
                type="text"
                value={form.alarm_method}
                onChange={e => set('alarm_method', e.target.value)}
                placeholder="e.g. Fire alarm, Siren, PA system"
                className={INPUT_CLS}
              />
            </div>
            <div>
              <label htmlFor="ef-comms" className={LABEL_CLS}>Communication Method</label>
              <input
                id="ef-comms"
                type="text"
                value={form.communication_method}
                onChange={e => set('communication_method', e.target.value)}
                placeholder="e.g. Two-way radio, PA, WhatsApp group"
                className={INPUT_CLS}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label htmlFor="ef-assembly" className={LABEL_CLS}>Assembly Point</label>
              <input
                id="ef-assembly"
                type="text"
                value={form.assembly_point}
                onChange={e => set('assembly_point', e.target.value)}
                placeholder="Primary assembly point"
                className={INPUT_CLS}
              />
            </div>
            <div>
              <label htmlFor="ef-muster" className={LABEL_CLS}>Muster Point</label>
              <input
                id="ef-muster"
                type="text"
                value={form.muster_point}
                onChange={e => set('muster_point', e.target.value)}
                placeholder="Muster point location"
                className={INPUT_CLS}
              />
            </div>
            <div>
              <label htmlFor="ef-radio" className={LABEL_CLS}>Radio Channel</label>
              <input
                id="ef-radio"
                type="text"
                value={form.radio_channel}
                onChange={e => set('radio_channel', e.target.value)}
                placeholder="e.g. Channel 5"
                className={INPUT_CLS}
              />
            </div>
          </div>
        </fieldset>

        {/* ── Section 5: Documents ───────────────────── */}
        <fieldset className="space-y-3">
          <legend className="text-[11px] font-semibold text-text-tertiary uppercase tracking-wider mb-2">
            Documents
          </legend>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {/* Main file */}
            <div>
              <label className={LABEL_CLS}>ERP Document</label>
              <div className="relative">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx"
                  onChange={e => setFileMain(e.target.files?.[0] ?? null)}
                  className="hidden"
                />
                {fileMain ? (
                  <div className="flex items-center gap-2 h-[38px] px-3 border border-border rounded-[var(--radius-sm)] bg-surface">
                    <span className="text-[12px] text-text-primary truncate flex-1">{fileMain.name}</span>
                    <button
                      type="button"
                      onClick={() => { setFileMain(null); if (fileInputRef.current) fileInputRef.current.value = ''; }}
                      className="p-0.5 text-text-tertiary hover:text-danger-500 transition-colors shrink-0"
                    >
                      <XIcon size={14} />
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className={`${INPUT_CLS} flex items-center gap-2 text-text-tertiary cursor-pointer hover:border-primary-300`}
                  >
                    <Upload size={14} />
                    <span>Choose file...</span>
                  </button>
                )}
              </div>
            </div>

            {/* Drawings */}
            <div>
              <label className={LABEL_CLS}>Drawings / Maps</label>
              <div className="relative">
                <input
                  ref={drawingsInputRef}
                  type="file"
                  accept=".pdf,.dwg,.dxf,.png,.jpg,.jpeg"
                  onChange={e => setFileDrawings(e.target.files?.[0] ?? null)}
                  className="hidden"
                />
                {fileDrawings ? (
                  <div className="flex items-center gap-2 h-[38px] px-3 border border-border rounded-[var(--radius-sm)] bg-surface">
                    <span className="text-[12px] text-text-primary truncate flex-1">{fileDrawings.name}</span>
                    <button
                      type="button"
                      onClick={() => { setFileDrawings(null); if (drawingsInputRef.current) drawingsInputRef.current.value = ''; }}
                      className="p-0.5 text-text-tertiary hover:text-danger-500 transition-colors shrink-0"
                    >
                      <XIcon size={14} />
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => drawingsInputRef.current?.click()}
                    className={`${INPUT_CLS} flex items-center gap-2 text-text-tertiary cursor-pointer hover:border-primary-300`}
                  >
                    <Upload size={14} />
                    <span>Choose file...</span>
                  </button>
                )}
              </div>
            </div>

            {/* SOP */}
            <div>
              <label className={LABEL_CLS}>SOP Document</label>
              <div className="relative">
                <input
                  ref={sopInputRef}
                  type="file"
                  accept=".pdf,.doc,.docx"
                  onChange={e => setFileSop(e.target.files?.[0] ?? null)}
                  className="hidden"
                />
                {fileSop ? (
                  <div className="flex items-center gap-2 h-[38px] px-3 border border-border rounded-[var(--radius-sm)] bg-surface">
                    <span className="text-[12px] text-text-primary truncate flex-1">{fileSop.name}</span>
                    <button
                      type="button"
                      onClick={() => { setFileSop(null); if (sopInputRef.current) sopInputRef.current.value = ''; }}
                      className="p-0.5 text-text-tertiary hover:text-danger-500 transition-colors shrink-0"
                    >
                      <XIcon size={14} />
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => sopInputRef.current?.click()}
                    className={`${INPUT_CLS} flex items-center gap-2 text-text-tertiary cursor-pointer hover:border-primary-300`}
                  >
                    <Upload size={14} />
                    <span>Choose file...</span>
                  </button>
                )}
              </div>
            </div>
          </div>
        </fieldset>

        {/* ── Section 6: Review ──────────────────────── */}
        <fieldset className="space-y-3">
          <legend className="text-[11px] font-semibold text-text-tertiary uppercase tracking-wider mb-2">
            Review
          </legend>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label htmlFor="ef-review-freq" className={LABEL_CLS}>Review Frequency</label>
              <select
                id="ef-review-freq"
                value={form.review_frequency}
                onChange={e => set('review_frequency', e.target.value)}
                className={INPUT_CLS}
              >
                <option value="">Select frequency...</option>
                {REVIEW_FREQUENCIES.map(f => (
                  <option key={f} value={f}>{f}</option>
                ))}
              </select>
            </div>
            <div>
              <label htmlFor="ef-next-review" className={LABEL_CLS}>Next Review Date</label>
              <input
                id="ef-next-review"
                type="date"
                value={form.next_review_date}
                onChange={e => set('next_review_date', e.target.value)}
                className={INPUT_CLS}
              />
            </div>
          </div>

          <div>
            <label htmlFor="ef-notes" className={LABEL_CLS}>Notes</label>
            <textarea
              id="ef-notes"
              value={form.notes}
              onChange={e => set('notes', e.target.value)}
              placeholder="Any additional notes or remarks..."
              rows={3}
              className={TEXTAREA_CLS}
            />
          </div>
        </fieldset>
      </form>
    </Modal>
  );
}
