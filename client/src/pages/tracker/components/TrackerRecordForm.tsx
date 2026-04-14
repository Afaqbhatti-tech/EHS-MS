import { useState, useEffect, useCallback } from 'react';
import { X as XIcon, ClipboardCheck, CheckCircle2, XCircle, MinusCircle, Link2, Loader2, ChevronDown, ChevronRight } from 'lucide-react';
import { TRACKER_STATUSES, TRACKER_CONDITIONS } from '../../../config/trackerCategories';
import { api } from '../../../services/api';
import EQUIPMENT_CHECKLISTS, { type ChecklistTemplateItem } from '../../checklists/config/equipmentChecklists';
import type { TrackerRecord, TrackerCategory, ChecklistData, ChecklistResponse, ChecklistMatchItem } from '../hooks/useTracker';

// Category key mapping: tracker → checklist template
const TRACKER_TO_CHECKLIST: Record<string, string> = {
  forklift: 'mewp', scissor_lift: 'mewp', man_lift: 'mewp', boom_lift: 'mewp',
  fire_extinguisher: 'fire_extinguisher', full_body_harness: 'full_body_harness',
  ladder: 'ladder', grinder: 'grinder', cutter: 'cutter',
};

function Field({ label, children, required }: { label: string; children: React.ReactNode; required?: boolean }) {
  return (
    <div>
      <label className="block text-[12px] font-semibold text-text-secondary mb-1">
        {label} {required && <span className="text-danger-500">*</span>}
      </label>
      {children}
    </div>
  );
}

interface Props {
  record: TrackerRecord | null;
  categories: TrackerCategory[];
  preselectedCategory?: string;
  onSubmit: (data: Record<string, unknown>) => Promise<unknown>;
  onClose: () => void;
}

export function TrackerRecordForm({ record, categories, preselectedCategory, onSubmit, onClose }: Props) {
  const [form, setForm] = useState({
    category_id: '', category_key: '', equipment_name: '', item_subtype: '',
    serial_number: '', make_model: '', plate_number: '', swl: '', load_capacity_tons: '',
    certificate_number: '', certificate_expiry: '', certificate_issuer: '',
    tuv_inspection_date: '', tuv_expiry_date: '', tuv_inspector: '', tuv_company: '', tuv_certificate_number: '',
    onboarding_date: '', last_internal_inspection_date: '', next_internal_inspection_date: '',
    inspected_by: '', checker_number: '',
    status: 'Active', condition: 'Good',
    location_area: '', assigned_to: '', notes: '',
    // Fire extinguisher
    extinguisher_type: '', extinguisher_type_custom: '', weight_kg: '', civil_defense_tag: false,
    // Harness
    manufacture_date: '', retirement_date: '', last_drop_arrest: false,
    // Power tool
    voltage_rating: '', electrical_test_date: '', electrical_test_expiry: '',
    toolbox_tag_colour: '',
  });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Checklist state
  const [checklistData, setChecklistData] = useState<ChecklistData | null>(null);
  const [checklistLoading, setChecklistLoading] = useState(false);
  const [checklistResponses, setChecklistResponses] = useState<Record<string, { result: string; note: string }>>({});
  const [checklistDirty, setChecklistDirty] = useState(false);
  const [collapsedSections, setCollapsedSections] = useState<Record<string, boolean>>({});
  const [showLinkSearch, setShowLinkSearch] = useState(false);
  const [linkSearchQuery, setLinkSearchQuery] = useState('');
  const [linkResults, setLinkResults] = useState<ChecklistMatchItem[]>([]);
  const [linkSearching, setLinkSearching] = useState(false);

  useEffect(() => {
    if (record) {
      setForm({
        category_id: String(record.category_id), category_key: record.category_key,
        equipment_name: record.equipment_name, item_subtype: record.item_subtype || '',
        serial_number: record.serial_number || '', make_model: record.make_model || '',
        plate_number: record.plate_number || '', swl: record.swl || '',
        load_capacity_tons: record.load_capacity_tons ? String(record.load_capacity_tons) : '',
        certificate_number: record.certificate_number || '', certificate_expiry: record.certificate_expiry || '',
        certificate_issuer: record.certificate_issuer || '',
        tuv_inspection_date: record.tuv_inspection_date || '', tuv_expiry_date: record.tuv_expiry_date || '',
        tuv_inspector: record.tuv_inspector || '', tuv_company: record.tuv_company || '',
        tuv_certificate_number: record.tuv_certificate_number || '',
        onboarding_date: record.onboarding_date || '',
        last_internal_inspection_date: record.last_internal_inspection_date || '',
        next_internal_inspection_date: record.next_internal_inspection_date || '',
        inspected_by: record.inspected_by || '', checker_number: record.checker_number || '',
        status: record.status, condition: record.condition,
        location_area: record.location_area || '', assigned_to: record.assigned_to || '',
        notes: record.notes || '',
        extinguisher_type: record.extinguisher_type || '',
        weight_kg: record.weight_kg ? String(record.weight_kg) : '',
        civil_defense_tag: record.civil_defense_tag || false,
        manufacture_date: record.manufacture_date || '', retirement_date: record.retirement_date || '',
        last_drop_arrest: record.last_drop_arrest || false,
        voltage_rating: record.voltage_rating || '',
        electrical_test_date: record.electrical_test_date || '', electrical_test_expiry: record.electrical_test_expiry || '',
        toolbox_tag_colour: record.toolbox_tag_colour || '',
      });
    } else if (preselectedCategory) {
      const cat = categories.find(c => c.key === preselectedCategory);
      if (cat) setForm(prev => ({ ...prev, category_id: String(cat.id), category_key: cat.key }));
    }
  }, [record, preselectedCategory, categories]);

  // Fetch checklist data when editing a record
  useEffect(() => {
    if (!record) return;
    const templateKey = TRACKER_TO_CHECKLIST[record.category_key];
    if (!templateKey) return;

    setChecklistLoading(true);
    api.get<TrackerRecord>(`/tracker/records/${record.id}`)
      .then(detail => {
        const cd = detail.checklist_data;
        setChecklistData(cd || null);
        // Populate checklist responses from latest inspection
        if (cd?.checklist_responses) {
          const map: Record<string, { result: string; note: string }> = {};
          cd.checklist_responses.forEach(r => {
            map[r.id] = { result: r.result, note: r.note || '' };
          });
          setChecklistResponses(map);
        }
      })
      .catch(() => {})
      .finally(() => setChecklistLoading(false));
  }, [record]);

  const selectedCat = categories.find(c => String(c.id) === form.category_id);

  // Get checklist template for current category
  const templateKey = TRACKER_TO_CHECKLIST[form.category_key];
  const template: ChecklistTemplateItem[] | null = templateKey ? (EQUIPMENT_CHECKLISTS[templateKey] ?? null) : null;

  // Group template items by section
  const sections = template ? template.reduce<{ section: string; items: ChecklistTemplateItem[] }[]>((acc, item) => {
    const last = acc[acc.length - 1];
    if (last && last.section === item.section) {
      last.items.push(item);
    } else {
      acc.push({ section: item.section, items: [item] });
    }
    return acc;
  }, []) : [];

  // Checklist response helpers
  const setResponseResult = (id: string, result: string) => {
    setChecklistResponses(prev => ({
      ...prev,
      [id]: { result, note: prev[id]?.note || '' },
    }));
    setChecklistDirty(true);
  };

  const setResponseNote = (id: string, note: string) => {
    setChecklistResponses(prev => ({
      ...prev,
      [id]: { result: prev[id]?.result || '', note },
    }));
    setChecklistDirty(true);
  };

  const toggleSection = (section: string) => {
    setCollapsedSections(prev => ({ ...prev, [section]: !prev[section] }));
  };

  // Checklist stats
  const getChecklistStats = () => {
    if (!template) return { total: 0, pass: 0, fail: 0, na: 0, unanswered: 0 };
    const total = template.length;
    let pass = 0, fail = 0, na = 0;
    template.forEach(item => {
      const r = checklistResponses[item.id]?.result;
      if (r === 'pass') pass++;
      else if (r === 'fail') fail++;
      else if (r === 'na') na++;
    });
    return { total, pass, fail, na, unanswered: total - pass - fail - na };
  };

  // Link search
  const searchChecklistItems = useCallback(async (q: string) => {
    if (!record) return;
    setLinkSearching(true);
    try {
      const qs = q ? `?q=${encodeURIComponent(q)}` : '';
      const items = await api.get<ChecklistMatchItem[]>(`/tracker/records/${record.id}/checklist-matches${qs}`);
      setLinkResults(items);
    } catch { setLinkResults([]); }
    finally { setLinkSearching(false); }
  }, [record]);

  const handleLinkItem = async (itemId: string) => {
    if (!record) return;
    try {
      const result = await api.post<{ message: string; checklist_data: ChecklistData }>(
        `/tracker/records/${record.id}/link-checklist`,
        { checklist_item_id: itemId }
      );
      setChecklistData(result.checklist_data);
      if (result.checklist_data?.checklist_responses) {
        const map: Record<string, { result: string; note: string }> = {};
        result.checklist_data.checklist_responses.forEach(r => {
          map[r.id] = { result: r.result, note: r.note || '' };
        });
        setChecklistResponses(map);
      }
      setShowLinkSearch(false);
      setLinkSearchQuery('');
    } catch {}
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      const data: Record<string, unknown> = { ...form };
      // Resolve "Other" custom values
      if (form.extinguisher_type === '__other__') data.extinguisher_type = form.extinguisher_type_custom?.trim() || null;
      delete data.extinguisher_type_custom;
      if (data.load_capacity_tons) data.load_capacity_tons = parseFloat(form.load_capacity_tons);
      if (data.weight_kg) data.weight_kg = parseFloat(form.weight_kg);
      data.category_id = Number(form.category_id);
      Object.keys(data).forEach(k => { if (data[k] === '') data[k] = null; });
      data.category_id = Number(form.category_id);
      data.category_key = form.category_key;
      data.equipment_name = form.equipment_name;
      data.status = form.status;
      data.condition = form.condition;

      // Include checklist data if dirty and linked
      if (checklistDirty && checklistData?.checklist_item && template) {
        const responses: ChecklistResponse[] = template.map(item => ({
          id: item.id,
          result: (checklistResponses[item.id]?.result || 'na') as 'pass' | 'fail' | 'na',
          note: checklistResponses[item.id]?.note || undefined,
        }));
        data.checklist_responses = responses;
        data.checklist_inspector_name = form.inspected_by || 'System';
        data.checklist_notes = null;
      }

      await onSubmit(data);
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to save');
    } finally {
      setSubmitting(false);
    }
  };

  const inputCls = "w-full px-3 py-2 text-[13px] bg-surface-sunken border border-border rounded-[var(--radius-md)] text-text-primary placeholder:text-text-tertiary focus:outline-none focus:ring-[3px] focus:ring-primary-500/10 focus:border-primary-500 focus:bg-surface transition-all";

  const clStats = getChecklistStats();

  return (
    <>
      <div className="drawer-overlay" onClick={onClose} />
      <div className="drawer-panel right-0 w-[560px] max-w-full animate-slideInRight">
        <div className="shrink-0 flex items-center justify-between px-6 py-4 border-b border-border" style={{ borderTop: '4px solid var(--color-primary-500)' }}>
          <h2 className="text-[16px] font-bold text-text-primary">{record ? 'Edit Equipment' : 'Add Equipment'}</h2>
          <button onClick={onClose} className="p-1.5 rounded-[var(--radius-sm)] text-text-tertiary hover:text-text-primary hover:bg-surface-sunken transition-colors"><XIcon size={18} /></button>
        </div>

        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto min-h-0 overscroll-contain p-6 space-y-5">
          {error && <div className="p-3 bg-danger-50 border border-danger-100 rounded-[var(--radius-md)] text-[13px] text-danger-700">{error}</div>}

          {/* Category & Identity */}
          <div className="space-y-3">
            <p className="text-[11px] font-semibold text-text-tertiary uppercase tracking-wider">Category & Identity</p>
            {!record && (
              <Field label="Category" required>
                <select value={form.category_id} onChange={e => {
                  const cat = categories.find(c => String(c.id) === e.target.value);
                  setForm(p => ({ ...p, category_id: e.target.value, category_key: cat?.key || '' }));
                }} className={inputCls} required>
                  <option value="">Select category...</option>
                  {categories.map(c => <option key={c.id} value={c.id}>{c.label}</option>)}
                </select>
              </Field>
            )}
            <Field label="Equipment Name" required>
              <input value={form.equipment_name} onChange={e => setForm(p => ({ ...p, equipment_name: e.target.value }))} className={inputCls} required placeholder="e.g. Forklift #3" />
            </Field>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Field label="Serial Number">
                <input value={form.serial_number} onChange={e => setForm(p => ({ ...p, serial_number: e.target.value }))} className={inputCls} />
              </Field>
              <Field label="Make / Model">
                <input value={form.make_model} onChange={e => setForm(p => ({ ...p, make_model: e.target.value }))} className={inputCls} />
              </Field>
            </div>
          </div>

          {/* Heavy equipment fields */}
          {selectedCat?.has_plate && (
            <div className="space-y-3">
              <p className="text-[11px] font-semibold text-text-tertiary uppercase tracking-wider">Equipment Details</p>
              <Field label="Plate Number"><input value={form.plate_number} onChange={e => setForm(p => ({ ...p, plate_number: e.target.value }))} className={inputCls} /></Field>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {selectedCat.has_swl && <Field label="SWL"><input value={form.swl} onChange={e => setForm(p => ({ ...p, swl: e.target.value }))} className={inputCls} placeholder="e.g. 5 Tons" /></Field>}
                <Field label="Capacity (Tons)"><input type="number" step="0.1" value={form.load_capacity_tons} onChange={e => setForm(p => ({ ...p, load_capacity_tons: e.target.value }))} className={inputCls} /></Field>
              </div>
              <Field label="Checker Number"><input value={form.checker_number} onChange={e => setForm(p => ({ ...p, checker_number: e.target.value }))} className={inputCls} /></Field>
            </div>
          )}

          {/* Certification */}
          {selectedCat?.has_cert && (
            <div className="space-y-3">
              <p className="text-[11px] font-semibold text-text-tertiary uppercase tracking-wider">Certification</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <Field label="Certificate Number"><input value={form.certificate_number} onChange={e => setForm(p => ({ ...p, certificate_number: e.target.value }))} className={inputCls} /></Field>
                <Field label="Certificate Expiry"><input type="date" value={form.certificate_expiry} onChange={e => setForm(p => ({ ...p, certificate_expiry: e.target.value }))} className={inputCls} /></Field>
              </div>
            </div>
          )}

          {/* TUV */}
          {selectedCat?.has_tuv && (
            <div className="space-y-3">
              <p className="text-[11px] font-semibold text-text-tertiary uppercase tracking-wider">TUV / Third-Party</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <Field label="TUV Inspection Date"><input type="date" value={form.tuv_inspection_date} onChange={e => setForm(p => ({ ...p, tuv_inspection_date: e.target.value }))} className={inputCls} /></Field>
                <Field label="TUV Expiry Date"><input type="date" value={form.tuv_expiry_date} onChange={e => setForm(p => ({ ...p, tuv_expiry_date: e.target.value }))} className={inputCls} /></Field>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <Field label="TUV Inspector"><input value={form.tuv_inspector} onChange={e => setForm(p => ({ ...p, tuv_inspector: e.target.value }))} className={inputCls} /></Field>
                <Field label="TUV Company"><input value={form.tuv_company} onChange={e => setForm(p => ({ ...p, tuv_company: e.target.value }))} className={inputCls} /></Field>
              </div>
              <Field label="TUV Certificate Number"><input value={form.tuv_certificate_number} onChange={e => setForm(p => ({ ...p, tuv_certificate_number: e.target.value }))} className={inputCls} /></Field>
            </div>
          )}

          {/* Fire Extinguisher */}
          {form.category_key === 'fire_extinguisher' && (
            <div className="space-y-3">
              <p className="text-[11px] font-semibold text-text-tertiary uppercase tracking-wider">Extinguisher Details</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <Field label="Extinguisher Type">
                  <select value={form.extinguisher_type} onChange={e => { setForm(p => ({ ...p, extinguisher_type: e.target.value })); if (e.target.value !== '__other__') setForm(p => ({ ...p, extinguisher_type_custom: '' })); }} className={inputCls}>
                    <option value="">Select type...</option>
                    {['CO2', 'Dry Chemical', 'Foam', 'Water', 'Wet Chemical'].map(t => <option key={t} value={t}>{t}</option>)}
                    <option value="__other__">Other</option>
                  </select>
                  {form.extinguisher_type === '__other__' && (
                    <input type="text" value={form.extinguisher_type_custom} onChange={e => setForm(p => ({ ...p, extinguisher_type_custom: e.target.value }))} placeholder="Enter extinguisher type..." className={`${inputCls} mt-1.5`} autoFocus />
                  )}
                </Field>
                <Field label="Weight (KG)"><input type="number" step="0.1" value={form.weight_kg} onChange={e => setForm(p => ({ ...p, weight_kg: e.target.value }))} className={inputCls} /></Field>
              </div>
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" checked={form.civil_defense_tag} onChange={e => setForm(p => ({ ...p, civil_defense_tag: e.target.checked }))} className="w-4 h-4 rounded border-border text-primary-600 focus:ring-primary-500" />
                <span className="text-[13px] font-medium text-text-primary">Civil Defense Tag</span>
              </label>
            </div>
          )}

          {/* Harness */}
          {form.category_key === 'full_body_harness' && (
            <div className="space-y-3">
              <p className="text-[11px] font-semibold text-text-tertiary uppercase tracking-wider">Harness Details</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <Field label="Manufacture Date"><input type="date" value={form.manufacture_date} onChange={e => {
                  const mfg = e.target.value;
                  let ret = form.retirement_date;
                  if (mfg) { const d = new Date(mfg); d.setFullYear(d.getFullYear() + 10); ret = d.toISOString().split('T')[0]; }
                  setForm(p => ({ ...p, manufacture_date: mfg, retirement_date: ret }));
                }} className={inputCls} /></Field>
                <Field label="Retirement Date"><input type="date" value={form.retirement_date} onChange={e => setForm(p => ({ ...p, retirement_date: e.target.value }))} className={inputCls} /></Field>
              </div>
            </div>
          )}

          {/* Power Tool */}
          {(form.category_key === 'welding_machine' || form.category_key === 'power_tool' || form.category_key === 'grinder' || form.category_key === 'cutter') && (
            <div className="space-y-3">
              <p className="text-[11px] font-semibold text-text-tertiary uppercase tracking-wider">Power Tool Details</p>
              <Field label="Voltage Rating"><input value={form.voltage_rating} onChange={e => setForm(p => ({ ...p, voltage_rating: e.target.value }))} className={inputCls} placeholder="e.g. 230V" /></Field>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <Field label="Electrical Test Date"><input type="date" value={form.electrical_test_date} onChange={e => setForm(p => ({ ...p, electrical_test_date: e.target.value }))} className={inputCls} /></Field>
                <Field label="Electrical Test Expiry"><input type="date" value={form.electrical_test_expiry} onChange={e => setForm(p => ({ ...p, electrical_test_expiry: e.target.value }))} className={inputCls} /></Field>
              </div>
              <Field label="Code Colour"><input value={form.toolbox_tag_colour} onChange={e => setForm(p => ({ ...p, toolbox_tag_colour: e.target.value }))} className={inputCls} placeholder="e.g. Green" /></Field>
            </div>
          )}

          {/* Dates */}
          <div className="space-y-3">
            <p className="text-[11px] font-semibold text-text-tertiary uppercase tracking-wider">Dates & Inspection</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Field label="Onboarding Date"><input type="date" value={form.onboarding_date} onChange={e => setForm(p => ({ ...p, onboarding_date: e.target.value }))} className={inputCls} /></Field>
              <Field label="Last Inspection"><input type="date" value={form.last_internal_inspection_date} onChange={e => setForm(p => ({ ...p, last_internal_inspection_date: e.target.value }))} className={inputCls} /></Field>
            </div>
            <Field label="Next Inspection Date">
              <input type="date" value={form.next_internal_inspection_date} onChange={e => setForm(p => ({ ...p, next_internal_inspection_date: e.target.value }))} className={inputCls} />
              <p className="text-[10px] text-text-tertiary mt-1">Auto-calculated if left empty</p>
            </Field>
          </div>

          {/* Status */}
          <div className="space-y-3">
            <p className="text-[11px] font-semibold text-text-tertiary uppercase tracking-wider">Condition & Status</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Field label="Condition">
                <select value={form.condition} onChange={e => setForm(p => ({ ...p, condition: e.target.value }))} className={inputCls}>
                  {TRACKER_CONDITIONS.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </Field>
              <Field label="Status">
                <select value={form.status} onChange={e => setForm(p => ({ ...p, status: e.target.value }))} className={inputCls}>
                  {TRACKER_STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </Field>
            </div>
          </div>

          {/* Location */}
          <div className="space-y-3">
            <p className="text-[11px] font-semibold text-text-tertiary uppercase tracking-wider">Location & Assignment</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Field label="Location / Area"><input value={form.location_area} onChange={e => setForm(p => ({ ...p, location_area: e.target.value }))} className={inputCls} placeholder="e.g. Zone A" /></Field>
              <Field label="Assigned To"><input value={form.assigned_to} onChange={e => setForm(p => ({ ...p, assigned_to: e.target.value }))} className={inputCls} /></Field>
            </div>
          </div>

          <Field label="Notes">
            <textarea value={form.notes} onChange={e => setForm(p => ({ ...p, notes: e.target.value }))} className={inputCls} rows={3} placeholder="Additional notes..." />
          </Field>

          {/* ─── Checklist Inspection Section ─── */}
          {record && template && template.length > 0 && (
            <div className="space-y-3 pt-2 border-t border-border">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <ClipboardCheck size={16} className="text-primary-500" />
                  <p className="text-[11px] font-semibold text-text-tertiary uppercase tracking-wider">Checklist Inspection</p>
                </div>
                {checklistDirty && (
                  <span className="text-[10px] font-medium text-warning-600 bg-warning-50 px-2 py-0.5 rounded">Modified</span>
                )}
              </div>

              {checklistLoading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 size={20} className="animate-spin text-text-tertiary" />
                  <span className="ml-2 text-[13px] text-text-tertiary">Loading checklist data...</span>
                </div>
              ) : (
                <>
                  {/* Linked item info */}
                  {checklistData?.checklist_item ? (
                    <div className="p-3 bg-health-50 border border-health-200 rounded-[var(--radius-md)]">
                      <div className="flex items-center gap-2 mb-1">
                        <Link2 size={12} className="text-health-600" />
                        <span className="text-[11px] font-semibold text-health-700">Linked to Checklist Item</span>
                      </div>
                      <div className="text-[12px] text-health-700">
                        <span className="font-mono font-semibold">{checklistData.checklist_item.item_code}</span>
                        <span className="mx-1.5">—</span>
                        <span>{checklistData.checklist_item.name}</span>
                      </div>
                      {checklistData.latest_inspection && (
                        <div className="mt-1.5 text-[11px] text-health-600">
                          Last inspection: {checklistData.latest_inspection.inspection_date} by {checklistData.latest_inspection.inspector_name}
                          <span className="ml-1.5">
                            — Result: <span className="font-semibold">{checklistData.latest_inspection.overall_result}</span>
                          </span>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="p-3 bg-surface-sunken border border-border rounded-[var(--radius-md)]">
                      <p className="text-[12px] text-text-secondary mb-2">No linked checklist item found.</p>
                      <button
                        type="button"
                        onClick={() => {
                          setShowLinkSearch(true);
                          searchChecklistItems('');
                        }}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 text-[12px] font-medium text-primary-600 bg-primary-50 rounded-[var(--radius-md)] hover:bg-primary-100 transition-colors"
                      >
                        <Link2 size={12} /> Link Checklist Item
                      </button>

                      {/* Link search UI */}
                      {showLinkSearch && (
                        <div className="mt-2 space-y-2">
                          <input
                            value={linkSearchQuery}
                            onChange={e => {
                              setLinkSearchQuery(e.target.value);
                              searchChecklistItems(e.target.value);
                            }}
                            className={inputCls}
                            placeholder="Search by name, code, serial..."
                          />
                          {linkSearching ? (
                            <div className="text-[12px] text-text-tertiary py-2">Searching...</div>
                          ) : linkResults.length === 0 ? (
                            <div className="text-[12px] text-text-tertiary py-2">No matching checklist items found</div>
                          ) : (
                            <div className="max-h-[160px] overflow-y-auto border border-border rounded-[var(--radius-md)] divide-y divide-border">
                              {linkResults.map(item => (
                                <button
                                  key={item.id}
                                  type="button"
                                  onClick={() => handleLinkItem(item.id)}
                                  className="w-full text-left px-3 py-2 hover:bg-surface-sunken transition-colors"
                                >
                                  <div className="text-[12px] font-medium text-text-primary">{item.name}</div>
                                  <div className="text-[11px] text-text-tertiary">
                                    {item.item_code}
                                    {item.serial_number && ` — S/N: ${item.serial_number}`}
                                    {item.plate_number && ` — Plate: ${item.plate_number}`}
                                    <span className="ml-1.5">{item.status}</span>
                                  </div>
                                </button>
                              ))}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  )}

                  {/* Checklist summary stats */}
                  {(checklistData?.checklist_item || clStats.pass + clStats.fail + clStats.na > 0) && (
                    <div className="flex items-center gap-3 text-[11px] font-semibold">
                      <span className="text-text-tertiary">{clStats.total} items</span>
                      {clStats.pass > 0 && <span className="text-health-600">{clStats.pass} Pass</span>}
                      {clStats.fail > 0 && <span className="text-danger-600">{clStats.fail} Fail</span>}
                      {clStats.na > 0 && <span className="text-text-tertiary">{clStats.na} N/A</span>}
                      {clStats.unanswered > 0 && <span className="text-warning-600">{clStats.unanswered} Unanswered</span>}
                    </div>
                  )}

                  {/* Checklist items by section */}
                  {sections.map(({ section, items }) => {
                    const isCollapsed = collapsedSections[section];
                    const sectionPass = items.filter(i => checklistResponses[i.id]?.result === 'pass').length;
                    const sectionFail = items.filter(i => checklistResponses[i.id]?.result === 'fail').length;

                    return (
                      <div key={section} className="border border-border rounded-[var(--radius-md)] overflow-hidden">
                        <button
                          type="button"
                          onClick={() => toggleSection(section)}
                          className="w-full flex items-center justify-between px-3 py-2 bg-surface-sunken hover:bg-canvas transition-colors"
                        >
                          <div className="flex items-center gap-2">
                            {isCollapsed ? <ChevronRight size={14} className="text-text-tertiary" /> : <ChevronDown size={14} className="text-text-tertiary" />}
                            <span className="text-[12px] font-semibold text-text-primary">{section}</span>
                            <span className="text-[10px] text-text-tertiary">({items.length})</span>
                          </div>
                          <div className="flex items-center gap-1.5">
                            {sectionPass > 0 && <span className="text-[10px] font-semibold text-health-600">{sectionPass}P</span>}
                            {sectionFail > 0 && <span className="text-[10px] font-semibold text-danger-600">{sectionFail}F</span>}
                          </div>
                        </button>

                        {!isCollapsed && (
                          <div className="divide-y divide-border">
                            {items.map(item => {
                              const resp = checklistResponses[item.id];
                              const currentResult = resp?.result || '';
                              const hasNa = item.type === 'pass_fail_na';

                              return (
                                <div key={item.id} className="px-3 py-2.5">
                                  <div className="flex items-start justify-between gap-2">
                                    <p className="text-[12px] text-text-primary flex-1 leading-snug">{item.item}</p>
                                    <div className="flex items-center gap-1 shrink-0">
                                      <button
                                        type="button"
                                        onClick={() => setResponseResult(item.id, 'pass')}
                                        className={`p-1 rounded transition-colors ${
                                          currentResult === 'pass'
                                            ? 'bg-health-100 text-health-700'
                                            : 'text-text-tertiary hover:text-health-600 hover:bg-health-50'
                                        }`}
                                        title="Pass"
                                      >
                                        <CheckCircle2 size={16} />
                                      </button>
                                      <button
                                        type="button"
                                        onClick={() => setResponseResult(item.id, 'fail')}
                                        className={`p-1 rounded transition-colors ${
                                          currentResult === 'fail'
                                            ? 'bg-danger-100 text-danger-700'
                                            : 'text-text-tertiary hover:text-danger-600 hover:bg-danger-50'
                                        }`}
                                        title="Fail"
                                      >
                                        <XCircle size={16} />
                                      </button>
                                      {hasNa && (
                                        <button
                                          type="button"
                                          onClick={() => setResponseResult(item.id, 'na')}
                                          className={`p-1 rounded transition-colors ${
                                            currentResult === 'na'
                                              ? 'bg-surface-sunken text-text-secondary'
                                              : 'text-text-tertiary hover:text-text-secondary hover:bg-surface-sunken'
                                          }`}
                                          title="N/A"
                                        >
                                          <MinusCircle size={16} />
                                        </button>
                                      )}
                                    </div>
                                  </div>
                                  {currentResult === 'fail' && (
                                    <input
                                      value={resp?.note || ''}
                                      onChange={e => setResponseNote(item.id, e.target.value)}
                                      className="mt-1.5 w-full px-2 py-1 text-[11px] bg-danger-50 border border-danger-200 rounded text-danger-800 placeholder:text-danger-300 focus:outline-none focus:ring-1 focus:ring-danger-300"
                                      placeholder="Note about failure..."
                                    />
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </>
              )}
            </div>
          )}

          <div className="shrink-0 flex justify-end gap-2 pt-3 border-t border-border">
            <button type="button" onClick={onClose} className="px-4 py-2 text-[13px] font-medium text-text-primary bg-surface border border-border rounded-[var(--radius-md)] hover:bg-surface-sunken transition-colors">Cancel</button>
            <button type="submit" disabled={submitting || !form.category_id || !form.equipment_name}
              className="px-5 py-2 text-[13px] font-semibold text-white bg-primary-600 rounded-[var(--radius-md)] hover:bg-primary-700 disabled:opacity-50 transition-colors shadow-xs">
              {submitting ? 'Saving...' : record ? 'Update' : 'Add Equipment'}
            </button>
          </div>
        </form>
      </div>
    </>
  );
}
