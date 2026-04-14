import { useState } from 'react';
import { X as XIcon, ChevronDown, ChevronRight } from 'lucide-react';
import { WASTE_TYPES, WASTE_CATEGORIES, HAZARD_CLASSIFICATIONS, PHYSICAL_FORMS, UNITS, PACKAGING_TYPES, TREATMENT_METHODS, VEHICLE_TYPES, PRIORITIES } from '../../../config/wasteManifestConfig';
import SelectWithOther from '../../../components/ui/SelectWithOther';
import type { Manifest } from '../hooks/useManifests';

interface Props {
  open: boolean;
  onClose: () => void;
  onSubmit: (data: Record<string, unknown>) => Promise<void>;
  manifest?: Manifest | null;
}

interface Section { key: string; label: string; defaultOpen: boolean }

/* ── Stable sub-components (defined outside ManifestForm to prevent remount on every keystroke) ── */

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
  { key: 'basics', label: 'A — Manifest Basics', defaultOpen: true },
  { key: 'source', label: 'B — Source / Generator', defaultOpen: true },
  { key: 'waste', label: 'C — Waste Identification', defaultOpen: true },
  { key: 'quantity', label: 'D — Quantity & Packaging', defaultOpen: true },
  { key: 'transporter', label: 'E — Transporter', defaultOpen: false },
  { key: 'facility', label: 'F — Disposal / Facility', defaultOpen: false },
  { key: 'compliance', label: 'G — Compliance', defaultOpen: false },
];

const emptyForm = {
  manifest_date: new Date().toISOString().split('T')[0],
  manifest_number: '', dispatch_date: '', dispatch_time: '',
  priority: 'Normal', notes: '',
  source_site: 'KAEC Rail Project', source_project: 'FFT/Lucid', source_area: '', source_zone: '',
  source_department: '', generating_activity: '', generator_company: '',
  responsible_person: '', contact_number: '',
  waste_type: '', waste_category: '', waste_description: '',
  hazard_classification: '', waste_code: '', un_code: '', physical_form: '',
  chemical_composition: '', special_handling: '',
  quantity: '', unit: 'KG', container_count: '', packaging_type: '',
  gross_weight_kg: '', net_weight_kg: '', temporary_storage_location: '', storage_condition: '',
  transporter_name: '', transporter_license_no: '', driver_name: '', driver_contact: '',
  vehicle_number: '', vehicle_type: '', transport_permit_number: '',
  handover_by: '', handover_date: '', transport_start_date: '', expected_delivery_date: '',
  handover_note: '',
  facility_name: '', facility_license_no: '', facility_address: '', treatment_method: '',
  receiving_person: '', disposal_certificate_no: '', final_notes: '',
  regulatory_reference: '', permit_license_reference: '',
  manifest_compliance_status: 'Pending', hazardous_waste_compliance: true,
  special_approval_required: false, special_approval_note: '',
};

export default function ManifestForm({ open, onClose, onSubmit, manifest }: Props) {
  const isEdit = !!manifest;
  const [form, setForm] = useState<Record<string, unknown>>(() => {
    if (manifest) {
      const f: Record<string, unknown> = {};
      Object.keys(emptyForm).forEach(k => {
        f[k] = (manifest as Record<string, unknown>)[k] ?? (emptyForm as Record<string, unknown>)[k];
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

  const set = (key: string, value: unknown) => setForm(prev => ({ ...prev, [key]: value }));
  const toggle = (key: string) => setOpenSections(prev => ({ ...prev, [key]: !prev[key] }));

  const handleSubmit = async (markPrepared: boolean) => {
    setError('');
    setSaving(true);
    try {
      const data = { ...form };
      if (markPrepared && !isEdit) data.status = 'Prepared';
      await onSubmit(data);
      onClose();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Failed to save');
    } finally {
      setSaving(false);
    }
  };

  if (!open) return null;

  const labelClass = 'block text-[11px] font-medium text-text-secondary mb-1';
  const inputClass = 'w-full h-[34px] px-2.5 text-[12px] border border-border rounded-[var(--radius-sm)] bg-white text-text-primary focus:outline-none focus:ring-1 focus:ring-primary-300';
  const textareaClass = 'w-full px-2.5 py-2 text-[12px] border border-border rounded-[var(--radius-sm)] bg-white text-text-primary focus:outline-none focus:ring-1 focus:ring-primary-300 resize-none';
  const selectClass = inputClass;

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-[2px]" onClick={onClose} />
      <div className="relative w-full max-w-[620px] bg-white h-full flex flex-col shadow-xl animate-in slide-in-from-right duration-200 overflow-hidden">
        {/* Header */}
        <div className="px-5 pt-5 pb-3 border-b border-border shrink-0">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h2 className="text-[18px] font-semibold text-text-primary">
                {isEdit ? 'Edit Manifest' : 'New Waste Manifest'}
              </h2>
              <p className="text-[12px] text-text-secondary mt-0.5">
                {isEdit ? `Editing ${manifest?.manifest_code}` : 'Create a new waste chain-of-custody record'}
              </p>
            </div>
            <button onClick={onClose} className="p-1.5 rounded-[var(--radius-sm)] text-text-tertiary hover:bg-surface-sunken transition-colors">
              <XIcon size={18} />
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain px-5 py-4 space-y-1">
          {error && (
            <div className="p-3 rounded-[var(--radius-sm)] bg-red-50 border border-red-200 text-[12px] text-red-700 mb-3">{error}</div>
          )}

          {/* Section A — Basics */}
          <SectionHeader section={sections[0]} isOpen={!!openSections.basics} onToggle={() => toggle('basics')} />
          {openSections.basics && (
            <div className="space-y-3 pb-3 border-b border-border">
              <Row>
                <div>
                  <label className={labelClass}>Manifest Date *</label>
                  <input type="date" value={form.manifest_date as string} onChange={e => set('manifest_date', e.target.value)} className={inputClass} required />
                </div>
                <div>
                  <label className={labelClass}>External Manifest No.</label>
                  <input type="text" value={form.manifest_number as string} onChange={e => set('manifest_number', e.target.value)} className={inputClass} placeholder="Official manifest number" />
                </div>
              </Row>
              <Row>
                <div>
                  <label className={labelClass}>Priority</label>
                  <select value={form.priority as string} onChange={e => set('priority', e.target.value)} className={selectClass}>
                    {PRIORITIES.map(p => <option key={p} value={p}>{p}</option>)}
                  </select>
                </div>
                <div>
                  <label className={labelClass}>Dispatch Date</label>
                  <input type="date" value={form.dispatch_date as string} onChange={e => set('dispatch_date', e.target.value)} className={inputClass} />
                </div>
              </Row>
              <div>
                <label className={labelClass}>Notes</label>
                <textarea value={form.notes as string} onChange={e => set('notes', e.target.value)} className={textareaClass} rows={2} />
              </div>
            </div>
          )}

          {/* Section B — Source */}
          <SectionHeader section={sections[1]} isOpen={!!openSections.source} onToggle={() => toggle('source')} />
          {openSections.source && (
            <div className="space-y-3 pb-3 border-b border-border">
              <Row>
                <div>
                  <label className={labelClass}>Source Site</label>
                  <input type="text" value={form.source_site as string} onChange={e => set('source_site', e.target.value)} className={inputClass} />
                </div>
                <div>
                  <label className={labelClass}>Source Project</label>
                  <input type="text" value={form.source_project as string} onChange={e => set('source_project', e.target.value)} className={inputClass} />
                </div>
              </Row>
              <Row>
                <div>
                  <label className={labelClass}>Source Area</label>
                  <input type="text" value={form.source_area as string} onChange={e => set('source_area', e.target.value)} className={inputClass} />
                </div>
                <div>
                  <label className={labelClass}>Source Zone</label>
                  <input type="text" value={form.source_zone as string} onChange={e => set('source_zone', e.target.value)} className={inputClass} />
                </div>
              </Row>
              <div>
                <label className={labelClass}>Department</label>
                <input type="text" value={form.source_department as string} onChange={e => set('source_department', e.target.value)} className={inputClass} />
              </div>
              <div>
                <label className={labelClass}>Generating Activity</label>
                <textarea value={form.generating_activity as string} onChange={e => set('generating_activity', e.target.value)} className={textareaClass} rows={2} />
              </div>
              <Row>
                <div>
                  <label className={labelClass}>Generator Company</label>
                  <input type="text" value={form.generator_company as string} onChange={e => set('generator_company', e.target.value)} className={inputClass} />
                </div>
                <div>
                  <label className={labelClass}>Responsible Person</label>
                  <input type="text" value={form.responsible_person as string} onChange={e => set('responsible_person', e.target.value)} className={inputClass} />
                </div>
              </Row>
              <div>
                <label className={labelClass}>Contact Number</label>
                <input type="text" value={form.contact_number as string} onChange={e => set('contact_number', e.target.value)} className={inputClass} />
              </div>
            </div>
          )}

          {/* Section C — Waste */}
          <SectionHeader section={sections[2]} isOpen={!!openSections.waste} onToggle={() => toggle('waste')} />
          {openSections.waste && (
            <div className="space-y-3 pb-3 border-b border-border">
              <div>
                <label className={labelClass}>Waste Type *</label>
                <SelectWithOther
                  options={WASTE_TYPES}
                  value={form.waste_type as string}
                  onChange={v => set('waste_type', v)}
                  placeholder="Select waste type..."
                  selectClassName={selectClass}
                  required
                />
              </div>
              <div>
                <label className={labelClass}>Waste Category *</label>
                <div className="flex flex-wrap gap-2">
                  {WASTE_CATEGORIES.map(c => (
                    <button
                      key={c}
                      type="button"
                      onClick={() => set('waste_category', c)}
                      className={`px-3 py-1.5 text-[11px] font-medium rounded-full border transition-all ${
                        form.waste_category === c
                          ? 'bg-primary-500 text-white border-primary-500 shadow-sm'
                          : 'bg-surface border-border text-text-secondary hover:bg-surface-sunken'
                      }`}
                    >
                      {c === 'Hazardous' && '⚠ '}{c === 'Recyclable' && '♻ '}{c === 'Special Waste' && '⚡ '}{c}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className={labelClass}>Waste Description</label>
                <textarea value={form.waste_description as string} onChange={e => set('waste_description', e.target.value)} className={textareaClass} rows={2} />
              </div>
              <Row>
                <div>
                  <label className={labelClass}>Hazard Classification</label>
                  <select value={form.hazard_classification as string} onChange={e => set('hazard_classification', e.target.value)} className={selectClass}>
                    <option value="">Select...</option>
                    {HAZARD_CLASSIFICATIONS.map(h => <option key={h} value={h}>{h}</option>)}
                  </select>
                </div>
                <div>
                  <label className={labelClass}>Physical Form</label>
                  <select value={form.physical_form as string} onChange={e => set('physical_form', e.target.value)} className={selectClass}>
                    <option value="">Select...</option>
                    {PHYSICAL_FORMS.map(f => <option key={f} value={f}>{f}</option>)}
                  </select>
                </div>
              </Row>
              <Row>
                <div>
                  <label className={labelClass}>Waste Code</label>
                  <input type="text" value={form.waste_code as string} onChange={e => set('waste_code', e.target.value)} className={inputClass} />
                </div>
                <div>
                  <label className={labelClass}>UN Code</label>
                  <input type="text" value={form.un_code as string} onChange={e => set('un_code', e.target.value)} className={inputClass} placeholder="e.g. UN3077" />
                </div>
              </Row>
              <div>
                <label className={labelClass}>Special Handling</label>
                <textarea value={form.special_handling as string} onChange={e => set('special_handling', e.target.value)} className={textareaClass} rows={2} />
              </div>
            </div>
          )}

          {/* Section D — Quantity */}
          <SectionHeader section={sections[3]} isOpen={!!openSections.quantity} onToggle={() => toggle('quantity')} />
          {openSections.quantity && (
            <div className="space-y-3 pb-3 border-b border-border">
              <Row>
                <div>
                  <label className={labelClass}>Quantity *</label>
                  <input type="number" step="0.01" value={form.quantity as string} onChange={e => set('quantity', e.target.value)} className={inputClass} required />
                </div>
                <div>
                  <label className={labelClass}>Unit *</label>
                  <select value={form.unit as string} onChange={e => set('unit', e.target.value)} className={selectClass} required>
                    {UNITS.map(u => <option key={u} value={u}>{u}</option>)}
                  </select>
                </div>
              </Row>
              <Row>
                <div>
                  <label className={labelClass}>Container Count</label>
                  <input type="number" value={form.container_count as string} onChange={e => set('container_count', e.target.value)} className={inputClass} />
                </div>
                <div>
                  <label className={labelClass}>Packaging Type</label>
                  <SelectWithOther
                    options={PACKAGING_TYPES}
                    value={form.packaging_type as string}
                    onChange={v => set('packaging_type', v)}
                    placeholder="Select..."
                    selectClassName={selectClass}
                  />
                </div>
              </Row>
              <Row>
                <div>
                  <label className={labelClass}>Gross Weight (kg)</label>
                  <input type="number" step="0.001" value={form.gross_weight_kg as string} onChange={e => set('gross_weight_kg', e.target.value)} className={inputClass} />
                </div>
                <div>
                  <label className={labelClass}>Net Weight (kg)</label>
                  <input type="number" step="0.001" value={form.net_weight_kg as string} onChange={e => set('net_weight_kg', e.target.value)} className={inputClass} />
                </div>
              </Row>
              <div>
                <label className={labelClass}>Temporary Storage Location</label>
                <input type="text" value={form.temporary_storage_location as string} onChange={e => set('temporary_storage_location', e.target.value)} className={inputClass} />
              </div>
            </div>
          )}

          {/* Section E — Transporter */}
          <SectionHeader section={sections[4]} isOpen={!!openSections.transporter} onToggle={() => toggle('transporter')} />
          {openSections.transporter && (
            <div className="space-y-3 pb-3 border-b border-border">
              <Row>
                <div>
                  <label className={labelClass}>Transporter Name</label>
                  <input type="text" value={form.transporter_name as string} onChange={e => set('transporter_name', e.target.value)} className={inputClass} />
                </div>
                <div>
                  <label className={labelClass}>License No.</label>
                  <input type="text" value={form.transporter_license_no as string} onChange={e => set('transporter_license_no', e.target.value)} className={inputClass} />
                </div>
              </Row>
              <Row>
                <div>
                  <label className={labelClass}>Driver Name</label>
                  <input type="text" value={form.driver_name as string} onChange={e => set('driver_name', e.target.value)} className={inputClass} />
                </div>
                <div>
                  <label className={labelClass}>Driver Contact</label>
                  <input type="text" value={form.driver_contact as string} onChange={e => set('driver_contact', e.target.value)} className={inputClass} />
                </div>
              </Row>
              <Row>
                <div>
                  <label className={labelClass}>Vehicle Number</label>
                  <input type="text" value={form.vehicle_number as string} onChange={e => set('vehicle_number', e.target.value)} className={inputClass} />
                </div>
                <div>
                  <label className={labelClass}>Vehicle Type</label>
                  <SelectWithOther
                    options={VEHICLE_TYPES}
                    value={form.vehicle_type as string}
                    onChange={v => set('vehicle_type', v)}
                    placeholder="Select..."
                    selectClassName={selectClass}
                  />
                </div>
              </Row>
              <Row>
                <div>
                  <label className={labelClass}>Expected Delivery</label>
                  <input type="date" value={form.expected_delivery_date as string} onChange={e => set('expected_delivery_date', e.target.value)} className={inputClass} />
                </div>
                <div>
                  <label className={labelClass}>Handover By</label>
                  <input type="text" value={form.handover_by as string} onChange={e => set('handover_by', e.target.value)} className={inputClass} />
                </div>
              </Row>
            </div>
          )}

          {/* Section F — Facility */}
          <SectionHeader section={sections[5]} isOpen={!!openSections.facility} onToggle={() => toggle('facility')} />
          {openSections.facility && (
            <div className="space-y-3 pb-3 border-b border-border">
              <Row>
                <div>
                  <label className={labelClass}>Facility Name</label>
                  <input type="text" value={form.facility_name as string} onChange={e => set('facility_name', e.target.value)} className={inputClass} />
                </div>
                <div>
                  <label className={labelClass}>License No.</label>
                  <input type="text" value={form.facility_license_no as string} onChange={e => set('facility_license_no', e.target.value)} className={inputClass} />
                </div>
              </Row>
              <div>
                <label className={labelClass}>Treatment Method</label>
                <SelectWithOther
                  options={TREATMENT_METHODS}
                  value={form.treatment_method as string}
                  onChange={v => set('treatment_method', v)}
                  placeholder="Select..."
                  selectClassName={selectClass}
                />
              </div>
            </div>
          )}

          {/* Section G — Compliance */}
          <SectionHeader section={sections[6]} isOpen={!!openSections.compliance} onToggle={() => toggle('compliance')} />
          {openSections.compliance && (
            <div className="space-y-3 pb-3">
              <Row>
                <div>
                  <label className={labelClass}>Regulatory Reference</label>
                  <input type="text" value={form.regulatory_reference as string} onChange={e => set('regulatory_reference', e.target.value)} className={inputClass} />
                </div>
                <div>
                  <label className={labelClass}>Permit Reference</label>
                  <input type="text" value={form.permit_license_reference as string} onChange={e => set('permit_license_reference', e.target.value)} className={inputClass} />
                </div>
              </Row>
              <div>
                <label className={labelClass}>Compliance Status</label>
                <div className="flex gap-2">
                  {(['Compliant', 'Non-Compliant', 'Pending', 'N/A'] as const).map(s => (
                    <button
                      key={s}
                      type="button"
                      onClick={() => set('manifest_compliance_status', s)}
                      className={`px-3 py-1.5 text-[11px] font-medium rounded-full border transition-all ${
                        form.manifest_compliance_status === s
                          ? 'bg-primary-500 text-white border-primary-500'
                          : 'bg-surface border-border text-text-secondary hover:bg-surface-sunken'
                      }`}
                    >
                      {s === 'Compliant' && '✓ '}{s === 'Non-Compliant' && '✗ '}{s}
                    </button>
                  ))}
                </div>
              </div>
              <label className="flex items-center gap-2 text-[12px] text-text-secondary cursor-pointer">
                <input
                  type="checkbox"
                  checked={form.special_approval_required as boolean}
                  onChange={e => set('special_approval_required', e.target.checked)}
                  className="rounded border-border"
                />
                Special Approval Required
              </label>
              {form.special_approval_required && (
                <div>
                  <label className={labelClass}>Special Approval Note</label>
                  <textarea value={form.special_approval_note as string} onChange={e => set('special_approval_note', e.target.value)} className={textareaClass} rows={2} />
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-5 py-3 border-t border-border flex items-center justify-end gap-2 shrink-0">
          <button onClick={onClose} className="px-4 py-2 text-[12px] font-medium text-text-secondary bg-surface border border-border rounded-[var(--radius-sm)] hover:bg-surface-sunken transition-colors">
            Cancel
          </button>
          <button
            onClick={() => handleSubmit(false)}
            disabled={saving}
            className="px-4 py-2 text-[12px] font-medium text-text-primary bg-surface border border-border rounded-[var(--radius-sm)] hover:bg-surface-sunken transition-colors disabled:opacity-50"
          >
            {saving ? 'Saving...' : 'Save as Draft'}
          </button>
          {!isEdit && (
            <button
              onClick={() => handleSubmit(true)}
              disabled={saving}
              className="px-4 py-2 text-[12px] font-medium text-white bg-primary-500 rounded-[var(--radius-sm)] hover:bg-primary-600 transition-colors disabled:opacity-50"
            >
              {saving ? 'Saving...' : 'Save & Mark Prepared'}
            </button>
          )}
          {isEdit && (
            <button
              onClick={() => handleSubmit(false)}
              disabled={saving}
              className="px-4 py-2 text-[12px] font-medium text-white bg-primary-500 rounded-[var(--radius-sm)] hover:bg-primary-600 transition-colors disabled:opacity-50"
            >
              {saving ? 'Saving...' : 'Update Manifest'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
