import { useState, useMemo } from 'react';
import { X as XIcon, CheckCircle, XCircle, MinusCircle, AlertTriangle } from 'lucide-react';
import { getChecklistTemplate, getSectionNames } from '../config/equipmentChecklists';
import { getCategoryConfig, CATEGORY_INSPECTION_TYPES } from '../config/checklistCategories';
import type { ChecklistItem } from '../hooks/useChecklists';

interface ChecklistResponse {
  id: string;
  result: 'pass' | 'fail' | 'na';
  note: string;
}

interface Props {
  item: ChecklistItem;
  categoryKey: string;
  onSubmit: (itemId: string, data: Record<string, unknown>) => Promise<unknown>;
  onClose: () => void;
}

export function EquipmentInspectionForm({ item, categoryKey, onSubmit, onClose }: Props) {
  const template = useMemo(() => getChecklistTemplate(categoryKey) || [], [categoryKey]);
  const sections = useMemo(() => getSectionNames(categoryKey), [categoryKey]);
  const catConfig = getCategoryConfig(categoryKey);
  const inspTypes = CATEGORY_INSPECTION_TYPES[categoryKey] || ['Pre-Use', 'Weekly', 'Periodic'];

  const [responses, setResponses] = useState<Record<string, ChecklistResponse>>(() => {
    const init: Record<string, ChecklistResponse> = {};
    template.forEach(t => { init[t.id] = { id: t.id, result: 'pass', note: '' }; });
    return init;
  });

  const [form, setForm] = useState({
    inspection_date: new Date().toISOString().split('T')[0],
    inspection_type: inspTypes[0] || 'Weekly',
    inspector_name: '',
    defect_found: false,
    defect_detail: '',
    notes: '',
    next_inspection_date: '',
    // Harness-specific
    drop_arrest_occurred: false,
    drop_arrest_date: '',
    // Fire extinguisher-specific
    pressure_status: 'Normal',
    // Generator-specific
    engine_hours: '',
  });

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const actualFailCount = useMemo(
    () => Object.values(responses).filter(r => r.result === 'fail').length,
    [responses]
  );

  const setResponse = (id: string, field: keyof ChecklistResponse, value: string) => {
    setResponses(prev => ({
      ...prev,
      [id]: { ...prev[id], [field]: value },
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      const data: Record<string, unknown> = {
        inspection_date: form.inspection_date,
        inspection_type: form.inspection_type,
        inspector_name: form.inspector_name,
        checklist_responses: Object.values(responses),
        defect_found: form.defect_found,
        defect_detail: form.defect_detail || null,
        notes: form.notes || null,
        next_inspection_date: form.next_inspection_date || null,
      };
      if (categoryKey === 'full_body_harness') {
        data.drop_arrest_occurred = form.drop_arrest_occurred;
        if (form.drop_arrest_occurred) data.drop_arrest_date = form.drop_arrest_date || null;
      }
      if (categoryKey === 'fire_extinguisher') {
        data.pressure_status = form.pressure_status;
      }
      if (categoryKey === 'generator' && form.engine_hours) {
        data.engine_hours = parseFloat(form.engine_hours);
      }
      await onSubmit(item.id, data);
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to record inspection');
    } finally {
      setSubmitting(false);
    }
  };

  const inputCls = "w-full px-3 py-2 text-[13px] bg-surface-sunken border border-border rounded-[var(--radius-md)] text-text-primary placeholder:text-text-tertiary focus:outline-none focus:ring-[3px] focus:ring-primary-500/10 focus:border-primary-500 focus:bg-surface transition-all";

  const ResultButton = ({ id, value, icon: Icon, label, color }: {
    id: string; value: 'pass' | 'fail' | 'na';
    icon: React.ComponentType<{ size: number; className?: string }>;
    label: string; color: string;
  }) => {
    const isActive = responses[id]?.result === value;
    return (
      <button
        type="button"
        onClick={() => setResponse(id, 'result', value)}
        className={`flex items-center gap-1 px-2.5 py-1.5 text-[11px] font-semibold rounded-md border transition-all ${
          isActive
            ? `${color} border-current shadow-sm`
            : 'text-text-tertiary border-border hover:border-border-strong'
        }`}
      >
        <Icon size={13} />
        {label}
      </button>
    );
  };

  return (
    <>
      <div className="drawer-overlay" onClick={onClose} />
      <div className="drawer-panel right-0 w-[600px] max-w-full animate-slideInRight">
        {/* Header */}
        <div className="shrink-0 flex items-center justify-between px-6 py-4 border-b border-border" style={{ borderTop: `4px solid ${item.category_color || 'var(--color-primary-500)'}` }}>
          <div>
            <h2 className="text-[16px] font-bold text-text-primary">
              Structured Inspection
            </h2>
            <p className="text-[12px] text-text-tertiary mt-0.5">
              {item.item_code} — {item.name}
            </p>
            {catConfig && (
              <span
                className="inline-block mt-1 px-2 py-0.5 text-[10px] font-semibold rounded-full"
                style={{ backgroundColor: catConfig.lightColor, color: catConfig.textColor }}
              >
                {catConfig.label}
              </span>
            )}
          </div>
          <button onClick={onClose} className="p-1.5 rounded-[var(--radius-sm)] text-text-tertiary hover:text-text-primary hover:bg-surface-sunken transition-colors">
            <XIcon size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto min-h-0 overscroll-contain">
          {/* Inspector details */}
          <div className="px-6 py-4 space-y-3 border-b border-border">
            {error && (
              <div className="p-3 bg-danger-50 border border-danger-100 rounded-[var(--radius-md)] text-[13px] text-danger-700">{error}</div>
            )}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-[12px] font-semibold text-text-secondary mb-1">Date <span className="text-danger-500">*</span></label>
                <input type="date" value={form.inspection_date} onChange={e => setForm(p => ({ ...p, inspection_date: e.target.value }))} className={inputCls} required />
              </div>
              <div>
                <label className="block text-[12px] font-semibold text-text-secondary mb-1">Type <span className="text-danger-500">*</span></label>
                <select value={form.inspection_type} onChange={e => setForm(p => ({ ...p, inspection_type: e.target.value }))} className={inputCls}>
                  {inspTypes.map(t => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-[12px] font-semibold text-text-secondary mb-1">Inspector <span className="text-danger-500">*</span></label>
                <input value={form.inspector_name} onChange={e => setForm(p => ({ ...p, inspector_name: e.target.value }))} className={inputCls} required placeholder="Full name" />
              </div>
            </div>

            {/* Category-specific fields */}
            {categoryKey === 'full_body_harness' && (
              <div className="p-3 bg-danger-50 border border-danger-100 rounded-[var(--radius-md)] space-y-2">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" checked={form.drop_arrest_occurred} onChange={e => setForm(p => ({ ...p, drop_arrest_occurred: e.target.checked }))}
                    className="w-4 h-4 rounded border-border text-danger-600 focus:ring-danger-500" />
                  <span className="text-[13px] font-semibold text-danger-700">Drop/Fall Arrest Occurred?</span>
                </label>
                {form.drop_arrest_occurred && (
                  <>
                    <input type="date" value={form.drop_arrest_date} onChange={e => setForm(p => ({ ...p, drop_arrest_date: e.target.value }))} className={inputCls} placeholder="Date of arrest" />
                    <div className="flex items-start gap-2 p-2 bg-danger-100 rounded-md">
                      <AlertTriangle size={16} className="text-danger-600 shrink-0 mt-0.5" />
                      <p className="text-[12px] text-danger-700 font-medium">A harness involved in a fall arrest MUST be immediately removed from service.</p>
                    </div>
                  </>
                )}
              </div>
            )}

            {categoryKey === 'fire_extinguisher' && (
              <div className="space-y-2">
                <label className="block text-[12px] font-semibold text-text-secondary">Pressure Gauge Status</label>
                <div className="flex gap-2">
                  {(['Normal', 'Low', 'High', 'Unknown'] as const).map(s => (
                    <button key={s} type="button" onClick={() => setForm(p => ({ ...p, pressure_status: s }))}
                      className={`px-3 py-1.5 text-[12px] font-semibold rounded-md border transition-all ${
                        form.pressure_status === s
                          ? s === 'Normal' ? 'bg-green-100 text-green-800 border-green-200' : 'bg-red-100 text-red-800 border-red-200'
                          : 'text-text-tertiary border-border hover:border-border-strong'
                      }`}
                    >
                      {s} {s === 'Normal' ? '\u2713' : '\u26A0'}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {categoryKey === 'generator' && (
              <div>
                <label className="block text-[12px] font-semibold text-text-secondary mb-1">Hour Meter Reading</label>
                <input type="number" step="0.1" value={form.engine_hours} onChange={e => setForm(p => ({ ...p, engine_hours: e.target.value }))} className={inputCls} placeholder="e.g. 1250.5" />
                {item.engine_hours && (
                  <p className="text-[10px] text-text-tertiary mt-1">Previous reading: {item.engine_hours} hrs</p>
                )}
              </div>
            )}
          </div>

          {/* Checklist items by section */}
          <div className="px-6 py-4 space-y-5">
            {/* Progress summary */}
            <div className="flex items-center gap-4 p-3 bg-surface-sunken rounded-[var(--radius-md)]">
              <div className="flex items-center gap-1.5">
                <CheckCircle size={14} className="text-success-600" />
                <span className="text-[12px] font-semibold text-success-700">
                  {Object.values(responses).filter(r => r.result === 'pass').length} Pass
                </span>
              </div>
              <div className="flex items-center gap-1.5">
                <XCircle size={14} className="text-danger-600" />
                <span className="text-[12px] font-semibold text-danger-700">
                  {actualFailCount} Fail
                </span>
              </div>
              <div className="flex items-center gap-1.5">
                <MinusCircle size={14} className="text-text-tertiary" />
                <span className="text-[12px] font-semibold text-text-tertiary">
                  {Object.values(responses).filter(r => r.result === 'na').length} N/A
                </span>
              </div>
              <span className="text-[11px] text-text-tertiary ml-auto">{template.length} items</span>
            </div>

            {sections.map(section => {
              const sectionItems = template.filter(t => t.section === section);
              return (
                <div key={section}>
                  <h4 className="text-[11px] font-semibold text-text-tertiary uppercase tracking-wider mb-2">{section}</h4>
                  <div className="space-y-1.5">
                    {sectionItems.map(t => (
                      <div key={t.id} className={`flex items-start gap-3 p-2.5 rounded-[var(--radius-md)] border transition-colors ${
                        responses[t.id]?.result === 'fail' ? 'bg-danger-50 border-danger-200' : 'bg-surface border-border/50 hover:border-border'
                      }`}>
                        <p className="flex-1 text-[12px] text-text-primary leading-relaxed pt-0.5">{t.item}</p>
                        <div className="flex gap-1 shrink-0">
                          <ResultButton id={t.id} value="pass" icon={CheckCircle} label="Pass" color="text-success-600 bg-success-50" />
                          <ResultButton id={t.id} value="fail" icon={XCircle} label="Fail" color="text-danger-600 bg-danger-50" />
                          {t.type === 'pass_fail_na' && (
                            <ResultButton id={t.id} value="na" icon={MinusCircle} label="N/A" color="text-text-secondary bg-surface-sunken" />
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Defect & Notes */}
          <div className="px-6 py-4 border-t border-border space-y-3">
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" checked={form.defect_found} onChange={e => setForm(p => ({ ...p, defect_found: e.target.checked }))}
                className="w-4 h-4 rounded border-border text-danger-600 focus:ring-danger-500" />
              <span className="text-[13px] font-semibold text-text-primary">Defect Found</span>
            </label>
            {form.defect_found && (
              <textarea value={form.defect_detail} onChange={e => setForm(p => ({ ...p, defect_detail: e.target.value }))}
                className={inputCls} rows={2} placeholder="Describe the defect..." />
            )}
            <div>
              <label className="block text-[12px] font-semibold text-text-secondary mb-1">Notes</label>
              <textarea value={form.notes} onChange={e => setForm(p => ({ ...p, notes: e.target.value }))} className={inputCls} rows={2} placeholder="Additional notes..." />
            </div>
            <div>
              <label className="block text-[12px] font-semibold text-text-secondary mb-1">Next Inspection Date</label>
              <input type="date" value={form.next_inspection_date} onChange={e => setForm(p => ({ ...p, next_inspection_date: e.target.value }))} className={inputCls} />
              <p className="text-[10px] text-text-tertiary mt-1">Auto-calculated if left empty</p>
            </div>
          </div>

          {/* Actions */}
          <div className="px-6 py-4 border-t border-border flex justify-between items-center">
            {actualFailCount > 0 && (
              <span className="text-[12px] font-semibold text-danger-600">
                {actualFailCount} failed item(s) — result will be {actualFailCount > 2 ? 'Fail' : 'Pass with Issues'}
              </span>
            )}
            <div className="flex gap-2 ml-auto">
              <button type="button" onClick={onClose} className="px-4 py-2 text-[13px] font-medium text-text-primary bg-surface border border-border rounded-[var(--radius-md)] hover:bg-surface-sunken transition-colors">
                Cancel
              </button>
              <button type="submit" disabled={submitting || !form.inspector_name}
                className="px-5 py-2 text-[13px] font-semibold text-white bg-primary-600 rounded-[var(--radius-md)] hover:bg-primary-700 disabled:opacity-50 transition-colors shadow-xs">
                {submitting ? 'Saving...' : 'Submit Inspection'}
              </button>
            </div>
          </div>
        </form>
      </div>
    </>
  );
}
