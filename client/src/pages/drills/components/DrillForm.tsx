import { useState, useEffect, type FormEvent } from 'react';
import { Loader2 } from 'lucide-react';
import Modal from '../../../components/ui/Modal';
import SelectWithOther from '../../../components/ui/SelectWithOther';

// ─── Constants ───────────────────────────────────────

const DRILL_TYPES = [
  'Fire Drill',
  'Evacuation Drill',
  'First Aid Drill',
  'Spill Response Drill',
  'Rescue Drill',
  'Chemical Leak Drill',
  'Medical Emergency Drill',
  'Confined Space Rescue Drill',
  'Work at Height Rescue Drill',
  'Security Drill',
  'Multi-Agency Drill',
  'Other',
] as const;

const FREQUENCY_OPTIONS = [
  'One-Time',
  'Monthly',
  'Quarterly',
  'Bi-Annual',
  'Annual',
  'Custom',
] as const;

const INPUT_CLS =
  'w-full h-[38px] px-3 text-[13px] border border-border rounded-[var(--radius-sm)] bg-surface text-text-primary placeholder:text-text-tertiary focus:border-primary-500 focus:ring-2 focus:ring-primary-100 outline-none transition-all';

const TEXTAREA_CLS =
  'w-full px-3 py-2 text-[13px] border border-border rounded-[var(--radius-sm)] bg-surface text-text-primary placeholder:text-text-tertiary focus:border-primary-500 focus:ring-2 focus:ring-primary-100 outline-none transition-all resize-none';

const LABEL_CLS = 'block text-[12px] font-medium text-text-secondary mb-1';

// ─── Types ───────────────────────────────────────────

interface Props {
  open: boolean;
  onClose: () => void;
  onSubmit: (data: Record<string, unknown>) => Promise<void>;
  isSubmitting: boolean;
  initialData?: Record<string, unknown> | null;
  erpOptions?: Array<{ id: number; erp_code: string; title: string }>;
  /** Alias accepted by the page — same as erpOptions */
  erps?: Array<{ id: string; erp_code: string; title: string }>;
}

interface FormState {
  title: string;
  drill_type: string;
  erp_id: string;
  planned_date: string;
  planned_time: string;
  location: string;
  area: string;
  department: string;
  responsible_person: string;
  scenario_description: string;
  trigger_method: string;
  expected_response: string;
  frequency: string;
  notes: string;
}

const EMPTY_FORM: FormState = {
  title: '',
  drill_type: '',
  erp_id: '',
  planned_date: '',
  planned_time: '',
  location: '',
  area: '',
  department: '',
  responsible_person: '',
  scenario_description: '',
  trigger_method: '',
  expected_response: '',
  frequency: '',
  notes: '',
};

// ─── Component ───────────────────────────────────────

export default function DrillForm({
  open,
  onClose,
  onSubmit,
  isSubmitting,
  initialData,
  erpOptions,
  erps,
}: Props) {
  const isEdit = !!initialData;
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Merge both prop names for ERP list
  const erpList = erpOptions ?? erps ?? [];

  // Populate form when editing
  useEffect(() => {
    if (initialData) {
      setForm({
        title: String(initialData.title ?? ''),
        drill_type: String(initialData.drill_type ?? ''),
        erp_id: String(initialData.erp_id ?? ''),
        planned_date: String(initialData.planned_date ?? initialData.scheduled_date ?? ''),
        planned_time: String(initialData.planned_time ?? initialData.scheduled_time ?? ''),
        location: String(initialData.location ?? ''),
        area: String(initialData.area ?? ''),
        department: String(initialData.department ?? ''),
        responsible_person: String(initialData.responsible_person ?? initialData.coordinator_name ?? ''),
        scenario_description: String(initialData.scenario_description ?? initialData.scenario ?? ''),
        trigger_method: String(initialData.trigger_method ?? ''),
        expected_response: String(initialData.expected_response ?? ''),
        frequency: String(initialData.frequency ?? ''),
        notes: String(initialData.notes ?? initialData.remarks ?? ''),
      });
    } else {
      setForm(EMPTY_FORM);
    }
    setErrors({});
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

    const payload: Record<string, unknown> = {
      title: form.title.trim(),
      drill_type: form.drill_type || null,
      erp_id: form.erp_id || null,
      planned_date: form.planned_date || null,
      planned_time: form.planned_time || null,
      location: form.location || null,
      area: form.area || null,
      department: form.department || null,
      responsible_person: form.responsible_person || null,
      scenario: form.scenario_description || null,
      trigger_method: form.trigger_method || null,
      expected_response: form.expected_response || null,
      frequency: form.frequency || null,
      remarks: form.notes || null,
    };

    await onSubmit(payload);
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={isEdit ? 'Edit Drill' : 'New Mock Drill'}
      subtitle={isEdit ? 'Update drill details' : 'Schedule a new emergency mock drill'}
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
            form="drill-form"
            disabled={isSubmitting}
            className="px-5 py-2 text-[13px] font-medium text-white bg-primary-600 rounded-[var(--radius-sm)] hover:bg-primary-700 disabled:opacity-50 transition-colors inline-flex items-center gap-2"
          >
            {isSubmitting && <Loader2 size={14} className="animate-spin" />}
            {isEdit ? 'Update Drill' : 'Create Drill'}
          </button>
        </>
      }
    >
      <form id="drill-form" onSubmit={handleSubmit} className="space-y-6">
        {/* ── Section 1: Basic Info ──────────────────── */}
        <fieldset className="space-y-3">
          <legend className="text-[11px] font-semibold text-text-tertiary uppercase tracking-wider mb-2">
            Basic Information
          </legend>

          <div>
            <label htmlFor="df-title" className={LABEL_CLS}>
              Title <span className="text-danger-500">*</span>
            </label>
            <input
              id="df-title"
              type="text"
              value={form.title}
              onChange={e => set('title', e.target.value)}
              placeholder="e.g. Q1 Fire Evacuation Drill - Building A"
              className={`${INPUT_CLS} ${errors.title ? 'border-danger-400 focus:border-danger-500 focus:ring-danger-100' : ''}`}
            />
            {errors.title && (
              <p className="text-[11px] text-danger-600 mt-0.5">{errors.title}</p>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label htmlFor="df-type" className={LABEL_CLS}>Drill Type</label>
              <SelectWithOther
                id="df-type"
                options={[...DRILL_TYPES]}
                value={form.drill_type}
                onChange={(v) => set('drill_type', v)}
                placeholder="Select type..."
                selectClassName={INPUT_CLS}
                inputClassName={INPUT_CLS}
              />
            </div>

            <div>
              <label htmlFor="df-erp" className={LABEL_CLS}>Linked ERP</label>
              <select
                id="df-erp"
                value={form.erp_id}
                onChange={e => set('erp_id', e.target.value)}
                className={INPUT_CLS}
              >
                <option value="">No ERP linked</option>
                {erpList.map(e => (
                  <option key={e.id} value={e.id}>
                    {e.erp_code} - {e.title}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </fieldset>

        {/* ── Section 2: Planning ────────────────────── */}
        <fieldset className="space-y-3">
          <legend className="text-[11px] font-semibold text-text-tertiary uppercase tracking-wider mb-2">
            Planning
          </legend>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label htmlFor="df-date" className={LABEL_CLS}>Planned Date</label>
              <input
                id="df-date"
                type="date"
                value={form.planned_date}
                onChange={e => set('planned_date', e.target.value)}
                className={INPUT_CLS}
              />
            </div>
            <div>
              <label htmlFor="df-time" className={LABEL_CLS}>Planned Time</label>
              <input
                id="df-time"
                type="time"
                value={form.planned_time}
                onChange={e => set('planned_time', e.target.value)}
                className={INPUT_CLS}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label htmlFor="df-location" className={LABEL_CLS}>Location</label>
              <input
                id="df-location"
                type="text"
                value={form.location}
                onChange={e => set('location', e.target.value)}
                placeholder="Building / Site"
                className={INPUT_CLS}
              />
            </div>
            <div>
              <label htmlFor="df-area" className={LABEL_CLS}>Area</label>
              <input
                id="df-area"
                type="text"
                value={form.area}
                onChange={e => set('area', e.target.value)}
                placeholder="Specific area"
                className={INPUT_CLS}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label htmlFor="df-dept" className={LABEL_CLS}>Department</label>
              <input
                id="df-dept"
                type="text"
                value={form.department}
                onChange={e => set('department', e.target.value)}
                placeholder="Department"
                className={INPUT_CLS}
              />
            </div>
            <div>
              <label htmlFor="df-responsible" className={LABEL_CLS}>Responsible Person</label>
              <input
                id="df-responsible"
                type="text"
                value={form.responsible_person}
                onChange={e => set('responsible_person', e.target.value)}
                placeholder="Name of drill coordinator"
                className={INPUT_CLS}
              />
            </div>
          </div>
        </fieldset>

        {/* ── Section 3: Scenario ────────────────────── */}
        <fieldset className="space-y-3">
          <legend className="text-[11px] font-semibold text-text-tertiary uppercase tracking-wider mb-2">
            Scenario
          </legend>

          <div>
            <label htmlFor="df-scenario" className={LABEL_CLS}>Scenario Description</label>
            <textarea
              id="df-scenario"
              value={form.scenario_description}
              onChange={e => set('scenario_description', e.target.value)}
              placeholder="Describe the emergency scenario to be simulated..."
              rows={3}
              className={TEXTAREA_CLS}
            />
          </div>

          <div>
            <label htmlFor="df-trigger" className={LABEL_CLS}>Trigger Method</label>
            <input
              id="df-trigger"
              type="text"
              value={form.trigger_method}
              onChange={e => set('trigger_method', e.target.value)}
              placeholder="e.g. Fire alarm activation, Radio call, Siren"
              className={INPUT_CLS}
            />
          </div>

          <div>
            <label htmlFor="df-response" className={LABEL_CLS}>Expected Response</label>
            <textarea
              id="df-response"
              value={form.expected_response}
              onChange={e => set('expected_response', e.target.value)}
              placeholder="Describe the expected response procedure..."
              rows={3}
              className={TEXTAREA_CLS}
            />
          </div>
        </fieldset>

        {/* ── Section 4: Scheduling ──────────────────── */}
        <fieldset className="space-y-3">
          <legend className="text-[11px] font-semibold text-text-tertiary uppercase tracking-wider mb-2">
            Scheduling
          </legend>

          <div>
            <label htmlFor="df-freq" className={LABEL_CLS}>Frequency</label>
            <select
              id="df-freq"
              value={form.frequency}
              onChange={e => set('frequency', e.target.value)}
              className={INPUT_CLS}
            >
              <option value="">Select frequency...</option>
              {FREQUENCY_OPTIONS.map(f => (
                <option key={f} value={f}>{f}</option>
              ))}
            </select>
          </div>

          <div>
            <label htmlFor="df-notes" className={LABEL_CLS}>Notes</label>
            <textarea
              id="df-notes"
              value={form.notes}
              onChange={e => set('notes', e.target.value)}
              placeholder="Any additional notes or instructions..."
              rows={3}
              className={TEXTAREA_CLS}
            />
          </div>
        </fieldset>
      </form>
    </Modal>
  );
}
