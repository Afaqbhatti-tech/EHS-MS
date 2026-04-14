import { useState } from 'react';
import { X as XIcon, ChevronDown, ChevronRight } from 'lucide-react';
import {
  COMPANY_TYPES, SCOPES_OF_WORK, CONTRACTOR_STATUSES, COMPLIANCE_STATUSES,
} from '../../../config/contractorConfig';
import type { Contractor } from '../hooks/useContractors';

interface Props {
  open: boolean;
  onClose: () => void;
  onSubmit: (data: Record<string, unknown>) => Promise<void>;
  editData?: Contractor | null;
  loading?: boolean;
}

interface Section {
  key: string;
  label: string;
  defaultOpen: boolean;
}

/* ── Stable sub-components (defined outside ContractorForm to prevent remount on every keystroke) ── */

function SectionHeader({ section, isOpen, onToggle }: { section: Section; isOpen: boolean; onToggle: () => void }) {
  return (
    <button
      type="button"
      onClick={onToggle}
      className="w-full flex items-center gap-2 py-2 text-[13px] font-semibold text-text-primary hover:text-primary-600 transition-colors"
    >
      {isOpen ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
      {section.label}
    </button>
  );
}

function Row({ children }: { children: React.ReactNode }) {
  return <div className="grid grid-cols-2 gap-3">{children}</div>;
}

const sections: Section[] = [
  { key: 'company',    label: 'A \u2014 Company Information',  defaultOpen: true },
  { key: 'contact',    label: 'B \u2014 Primary Contact',      defaultOpen: true },
  { key: 'operational', label: 'C \u2014 Operational Details', defaultOpen: true },
  { key: 'workforce',  label: 'D \u2014 Workforce',           defaultOpen: false },
  { key: 'status',     label: 'E \u2014 Status & Notes',      defaultOpen: false },
];

const emptyForm: Record<string, unknown> = {
  contractor_name: '',
  registered_company_name: '',
  trade_name: '',
  company_type: '',
  scope_of_work: '',
  description: '',
  registration_number: '',
  tax_number: '',
  country: '',
  city: '',
  address: '',
  primary_contact_name: '',
  primary_contact_designation: '',
  primary_contact_phone: '',
  primary_contact_email: '',
  alternate_contact: '',
  emergency_contact_number: '',
  site: 'KAEC Rail Project',
  project: 'FFT/Lucid',
  area: '',
  zone: '',
  department: '',
  assigned_supervisor: '',
  contract_start_date: '',
  contract_end_date: '',
  total_workforce: '',
  skilled_workers_count: '',
  unskilled_workers_count: '',
  supervisors_count: '',
  operators_count: '',
  drivers_count: '',
  safety_staff_count: '',
  current_site_headcount: '',
  mobilized_date: '',
  demobilized_date: '',
  contractor_status: 'Draft',
  compliance_status: 'Under Review',
  notes: '',
};

export default function ContractorForm({ open, onClose, onSubmit, editData, loading: externalLoading }: Props) {
  const isEdit = !!editData;

  const [form, setForm] = useState<Record<string, unknown>>(() => {
    if (editData) {
      const f: Record<string, unknown> = {};
      Object.keys(emptyForm).forEach(k => {
        f[k] = (editData as unknown as Record<string, unknown>)[k] ?? emptyForm[k];
      });
      return f;
    }
    return { ...emptyForm };
  });

  const [openSections, setOpenSections] = useState<Record<string, boolean>>(() => {
    const o: Record<string, boolean> = {};
    sections.forEach(s => { o[s.key] = isEdit ? true : s.defaultOpen; });
    return o;
  });

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  // Track "Other" mode for dropdowns that support custom values
  const [otherMode, setOtherMode] = useState<Record<string, boolean>>(() => ({
    company_type: !!editData && !!(editData.company_type) && !COMPANY_TYPES.includes(editData.company_type),
    scope_of_work: !!editData && !!(editData.scope_of_work) && !SCOPES_OF_WORK.includes(editData.scope_of_work),
  }));

  const set = (key: string, value: unknown) => setForm(prev => ({ ...prev, [key]: value }));
  const toggle = (key: string) => setOpenSections(prev => ({ ...prev, [key]: !prev[key] }));

  const handleSubmit = async (asDraft: boolean) => {
    setError('');
    setSaving(true);
    try {
      const data = { ...form };
      if (!isEdit && !asDraft) data.contractor_status = 'Under Review';
      await onSubmit(data);
      onClose();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Failed to save contractor');
    } finally {
      setSaving(false);
    }
  };

  if (!open) return null;

  const labelClass = 'block text-[11px] font-medium text-text-secondary mb-1';
  const inputClass =
    'w-full h-[34px] px-2.5 text-[12px] border border-border rounded-[var(--radius-sm)] bg-white text-text-primary focus:outline-none focus:ring-1 focus:ring-primary-300';
  const textareaClass =
    'w-full px-2.5 py-2 text-[12px] border border-border rounded-[var(--radius-sm)] bg-white text-text-primary focus:outline-none focus:ring-1 focus:ring-primary-300 resize-none';
  const selectClass = inputClass;

  const isBusy = saving || externalLoading;

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-[2px]" onClick={onClose} />
      <div
        className="ctr-form-drawer relative bg-white h-full flex flex-col shadow-xl animate-in slide-in-from-right duration-200 overflow-hidden"
        style={{ width: '100%', maxWidth: 600 }}
      >
        {/* Header */}
        <div className="px-5 pt-5 pb-3 border-b border-border shrink-0">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h2 className="text-[18px] font-semibold text-text-primary">
                {isEdit ? 'Edit Contractor' : 'New Contractor'}
              </h2>
              <p className="text-[12px] text-text-secondary mt-0.5">
                {isEdit
                  ? `Editing ${editData?.contractor_code}`
                  : 'Register a new contractor / subcontractor record'}
              </p>
            </div>
            <button
              onClick={onClose}
              className="p-1.5 rounded-[var(--radius-sm)] text-text-tertiary hover:bg-surface-sunken transition-colors"
            >
              <XIcon size={18} />
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain px-5 py-4 space-y-1">
          {error && (
            <div className="p-3 rounded-[var(--radius-sm)] bg-red-50 border border-red-200 text-[12px] text-red-700 mb-3">
              {error}
            </div>
          )}

          {/* Section A \u2014 Company Information */}
          <SectionHeader section={sections[0]} isOpen={!!openSections.company} onToggle={() => toggle('company')} />
          {openSections.company && (
            <div className="space-y-3 pb-3 border-b border-border">
              <div>
                <label className={labelClass}>Contractor Name *</label>
                <input
                  type="text"
                  value={form.contractor_name as string}
                  onChange={e => set('contractor_name', e.target.value)}
                  className={inputClass}
                  placeholder="Company display name"
                  required
                />
              </div>
              <Row>
                <div>
                  <label className={labelClass}>Registered Company Name</label>
                  <input
                    type="text"
                    value={form.registered_company_name as string}
                    onChange={e => set('registered_company_name', e.target.value)}
                    className={inputClass}
                    placeholder="Official legal name"
                  />
                </div>
                <div>
                  <label className={labelClass}>Trade Name</label>
                  <input
                    type="text"
                    value={form.trade_name as string}
                    onChange={e => set('trade_name', e.target.value)}
                    className={inputClass}
                    placeholder="DBA / trade name"
                  />
                </div>
              </Row>
              <Row>
                <div>
                  <label className={labelClass}>Company Type *</label>
                  <select
                    value={otherMode.company_type ? '__other__' : (form.company_type as string)}
                    onChange={e => {
                      if (e.target.value === '__other__') {
                        setOtherMode(p => ({ ...p, company_type: true }));
                        set('company_type', '');
                      } else {
                        setOtherMode(p => ({ ...p, company_type: false }));
                        set('company_type', e.target.value);
                      }
                    }}
                    className={selectClass}
                    required={!otherMode.company_type}
                  >
                    <option value="">Select type...</option>
                    {COMPANY_TYPES.filter(t => t !== 'Other').map(t => (
                      <option key={t} value={t}>{t}</option>
                    ))}
                    <option value="__other__">Other (specify)</option>
                  </select>
                  {otherMode.company_type && (
                    <input
                      type="text"
                      value={form.company_type as string}
                      onChange={e => set('company_type', e.target.value)}
                      className={`${inputClass} mt-1.5`}
                      placeholder="Enter custom company type..."
                      autoFocus
                      required
                    />
                  )}
                </div>
                <div>
                  <label className={labelClass}>Scope of Work *</label>
                  <select
                    value={otherMode.scope_of_work ? '__other__' : (form.scope_of_work as string)}
                    onChange={e => {
                      if (e.target.value === '__other__') {
                        setOtherMode(p => ({ ...p, scope_of_work: true }));
                        set('scope_of_work', '');
                      } else {
                        setOtherMode(p => ({ ...p, scope_of_work: false }));
                        set('scope_of_work', e.target.value);
                      }
                    }}
                    className={selectClass}
                    required={!otherMode.scope_of_work}
                  >
                    <option value="">Select scope...</option>
                    {SCOPES_OF_WORK.filter(s => s !== 'Other').map(s => (
                      <option key={s} value={s}>{s}</option>
                    ))}
                    <option value="__other__">Other (specify)</option>
                  </select>
                  {otherMode.scope_of_work && (
                    <input
                      type="text"
                      value={form.scope_of_work as string}
                      onChange={e => set('scope_of_work', e.target.value)}
                      className={`${inputClass} mt-1.5`}
                      placeholder="Enter custom scope of work..."
                      autoFocus
                      required
                    />
                  )}
                </div>
              </Row>
              <Row>
                <div>
                  <label className={labelClass}>Registration Number</label>
                  <input
                    type="text"
                    value={form.registration_number as string}
                    onChange={e => set('registration_number', e.target.value)}
                    className={inputClass}
                    placeholder="CR / License No."
                  />
                </div>
                <div>
                  <label className={labelClass}>Tax / VAT Number</label>
                  <input
                    type="text"
                    value={form.tax_number as string}
                    onChange={e => set('tax_number', e.target.value)}
                    className={inputClass}
                  />
                </div>
              </Row>
              <Row>
                <div>
                  <label className={labelClass}>Country</label>
                  <input
                    type="text"
                    value={form.country as string}
                    onChange={e => set('country', e.target.value)}
                    className={inputClass}
                  />
                </div>
                <div>
                  <label className={labelClass}>City</label>
                  <input
                    type="text"
                    value={form.city as string}
                    onChange={e => set('city', e.target.value)}
                    className={inputClass}
                  />
                </div>
              </Row>
              <div>
                <label className={labelClass}>Address</label>
                <textarea
                  value={form.address as string}
                  onChange={e => set('address', e.target.value)}
                  className={textareaClass}
                  rows={2}
                />
              </div>
              <div>
                <label className={labelClass}>Description</label>
                <textarea
                  value={form.description as string}
                  onChange={e => set('description', e.target.value)}
                  className={textareaClass}
                  rows={2}
                  placeholder="Brief description of the contractor..."
                />
              </div>
            </div>
          )}

          {/* Section B \u2014 Primary Contact */}
          <SectionHeader section={sections[1]} isOpen={!!openSections.contact} onToggle={() => toggle('contact')} />
          {openSections.contact && (
            <div className="space-y-3 pb-3 border-b border-border">
              <Row>
                <div>
                  <label className={labelClass}>Contact Person Name</label>
                  <input
                    type="text"
                    value={form.primary_contact_name as string}
                    onChange={e => set('primary_contact_name', e.target.value)}
                    className={inputClass}
                  />
                </div>
                <div>
                  <label className={labelClass}>Designation</label>
                  <input
                    type="text"
                    value={form.primary_contact_designation as string}
                    onChange={e => set('primary_contact_designation', e.target.value)}
                    className={inputClass}
                    placeholder="e.g. Project Manager"
                  />
                </div>
              </Row>
              <Row>
                <div>
                  <label className={labelClass}>Phone</label>
                  <input
                    type="text"
                    value={form.primary_contact_phone as string}
                    onChange={e => set('primary_contact_phone', e.target.value)}
                    className={inputClass}
                    placeholder="+966..."
                  />
                </div>
                <div>
                  <label className={labelClass}>Email</label>
                  <input
                    type="email"
                    value={form.primary_contact_email as string}
                    onChange={e => set('primary_contact_email', e.target.value)}
                    className={inputClass}
                  />
                </div>
              </Row>
              <Row>
                <div>
                  <label className={labelClass}>Alternate Contact</label>
                  <input
                    type="text"
                    value={form.alternate_contact as string}
                    onChange={e => set('alternate_contact', e.target.value)}
                    className={inputClass}
                  />
                </div>
                <div>
                  <label className={labelClass}>Emergency Contact</label>
                  <input
                    type="text"
                    value={form.emergency_contact_number as string}
                    onChange={e => set('emergency_contact_number', e.target.value)}
                    className={inputClass}
                  />
                </div>
              </Row>
            </div>
          )}

          {/* Section C \u2014 Operational Details */}
          <SectionHeader section={sections[2]} isOpen={!!openSections.operational} onToggle={() => toggle('operational')} />
          {openSections.operational && (
            <div className="space-y-3 pb-3 border-b border-border">
              <Row>
                <div>
                  <label className={labelClass}>Site</label>
                  <input
                    type="text"
                    value={form.site as string}
                    onChange={e => set('site', e.target.value)}
                    className={inputClass}
                  />
                </div>
                <div>
                  <label className={labelClass}>Project</label>
                  <input
                    type="text"
                    value={form.project as string}
                    onChange={e => set('project', e.target.value)}
                    className={inputClass}
                  />
                </div>
              </Row>
              <Row>
                <div>
                  <label className={labelClass}>Area</label>
                  <input
                    type="text"
                    value={form.area as string}
                    onChange={e => set('area', e.target.value)}
                    className={inputClass}
                  />
                </div>
                <div>
                  <label className={labelClass}>Zone</label>
                  <input
                    type="text"
                    value={form.zone as string}
                    onChange={e => set('zone', e.target.value)}
                    className={inputClass}
                  />
                </div>
              </Row>
              <Row>
                <div>
                  <label className={labelClass}>Department</label>
                  <input
                    type="text"
                    value={form.department as string}
                    onChange={e => set('department', e.target.value)}
                    className={inputClass}
                  />
                </div>
                <div>
                  <label className={labelClass}>Assigned Supervisor</label>
                  <input
                    type="text"
                    value={form.assigned_supervisor as string}
                    onChange={e => set('assigned_supervisor', e.target.value)}
                    className={inputClass}
                  />
                </div>
              </Row>
              <Row>
                <div>
                  <label className={labelClass}>Contract Start Date</label>
                  <input
                    type="date"
                    value={form.contract_start_date as string}
                    onChange={e => set('contract_start_date', e.target.value)}
                    className={inputClass}
                  />
                </div>
                <div>
                  <label className={labelClass}>Contract End Date</label>
                  <input
                    type="date"
                    value={form.contract_end_date as string}
                    onChange={e => set('contract_end_date', e.target.value)}
                    className={inputClass}
                  />
                </div>
              </Row>
              <Row>
                <div>
                  <label className={labelClass}>Mobilized Date</label>
                  <input
                    type="date"
                    value={form.mobilized_date as string}
                    onChange={e => set('mobilized_date', e.target.value)}
                    className={inputClass}
                  />
                </div>
                <div>
                  <label className={labelClass}>Demobilized Date</label>
                  <input
                    type="date"
                    value={form.demobilized_date as string}
                    onChange={e => set('demobilized_date', e.target.value)}
                    className={inputClass}
                  />
                </div>
              </Row>
            </div>
          )}

          {/* Section D \u2014 Workforce */}
          <SectionHeader section={sections[3]} isOpen={!!openSections.workforce} onToggle={() => toggle('workforce')} />
          {openSections.workforce && (
            <div className="space-y-3 pb-3 border-b border-border">
              <Row>
                <div>
                  <label className={labelClass}>Total Workforce</label>
                  <input
                    type="number"
                    min="0"
                    value={form.total_workforce as string}
                    onChange={e => set('total_workforce', e.target.value)}
                    className={inputClass}
                  />
                </div>
                <div>
                  <label className={labelClass}>Current Site Headcount</label>
                  <input
                    type="number"
                    min="0"
                    value={form.current_site_headcount as string}
                    onChange={e => set('current_site_headcount', e.target.value)}
                    className={inputClass}
                  />
                </div>
              </Row>
              <Row>
                <div>
                  <label className={labelClass}>Skilled Workers</label>
                  <input
                    type="number"
                    min="0"
                    value={form.skilled_workers_count as string}
                    onChange={e => set('skilled_workers_count', e.target.value)}
                    className={inputClass}
                  />
                </div>
                <div>
                  <label className={labelClass}>Unskilled Workers</label>
                  <input
                    type="number"
                    min="0"
                    value={form.unskilled_workers_count as string}
                    onChange={e => set('unskilled_workers_count', e.target.value)}
                    className={inputClass}
                  />
                </div>
              </Row>
              <Row>
                <div>
                  <label className={labelClass}>Supervisors</label>
                  <input
                    type="number"
                    min="0"
                    value={form.supervisors_count as string}
                    onChange={e => set('supervisors_count', e.target.value)}
                    className={inputClass}
                  />
                </div>
                <div>
                  <label className={labelClass}>Operators</label>
                  <input
                    type="number"
                    min="0"
                    value={form.operators_count as string}
                    onChange={e => set('operators_count', e.target.value)}
                    className={inputClass}
                  />
                </div>
              </Row>
              <Row>
                <div>
                  <label className={labelClass}>Drivers</label>
                  <input
                    type="number"
                    min="0"
                    value={form.drivers_count as string}
                    onChange={e => set('drivers_count', e.target.value)}
                    className={inputClass}
                  />
                </div>
                <div>
                  <label className={labelClass}>Safety Staff</label>
                  <input
                    type="number"
                    min="0"
                    value={form.safety_staff_count as string}
                    onChange={e => set('safety_staff_count', e.target.value)}
                    className={inputClass}
                  />
                </div>
              </Row>
            </div>
          )}

          {/* Section E \u2014 Status & Notes */}
          <SectionHeader section={sections[4]} isOpen={!!openSections.status} onToggle={() => toggle('status')} />
          {openSections.status && (
            <div className="space-y-3 pb-3">
              {isEdit && (
                <Row>
                  <div>
                    <label className={labelClass}>Contractor Status</label>
                    <select
                      value={form.contractor_status as string}
                      onChange={e => set('contractor_status', e.target.value)}
                      className={selectClass}
                    >
                      {CONTRACTOR_STATUSES.map(s => (
                        <option key={s} value={s}>{s}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className={labelClass}>Compliance Status</label>
                    <select
                      value={form.compliance_status as string}
                      onChange={e => set('compliance_status', e.target.value)}
                      className={selectClass}
                    >
                      {COMPLIANCE_STATUSES.map(c => (
                        <option key={c} value={c}>{c}</option>
                      ))}
                    </select>
                  </div>
                </Row>
              )}
              <div>
                <label className={labelClass}>Notes</label>
                <textarea
                  value={form.notes as string}
                  onChange={e => set('notes', e.target.value)}
                  className={textareaClass}
                  rows={3}
                  placeholder="Additional remarks, special conditions, or internal notes..."
                />
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-5 py-3 border-t border-border flex items-center justify-end gap-2 shrink-0">
          <button
            onClick={onClose}
            className="px-4 py-2 text-[12px] font-medium text-text-secondary bg-surface border border-border rounded-[var(--radius-sm)] hover:bg-surface-sunken transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={() => handleSubmit(false)}
            disabled={isBusy}
            className="px-4 py-2 text-[12px] font-medium text-white bg-primary-500 rounded-[var(--radius-sm)] hover:bg-primary-600 transition-colors disabled:opacity-50"
          >
            {isBusy ? 'Saving...' : isEdit ? 'Update Contractor' : 'Save & Submit'}
          </button>
        </div>
      </div>
    </div>
  );
}
