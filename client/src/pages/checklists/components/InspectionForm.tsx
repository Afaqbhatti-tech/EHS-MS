import { useState } from 'react';
import { X as XIcon } from 'lucide-react';
import { INSPECTION_TYPES, INSPECTION_RESULTS, HEALTH_CONDITIONS } from '../config/checklistCategories';
import type { ChecklistItem } from '../hooks/useChecklists';

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
  item: ChecklistItem;
  onSubmit: (itemId: string, data: Record<string, unknown>) => Promise<unknown>;
  onClose: () => void;
}

export function InspectionForm({ item, onSubmit, onClose }: Props) {
  const [form, setForm] = useState({
    inspection_date: new Date().toISOString().split('T')[0],
    inspection_type: 'Internal',
    inspection_type_custom: '',
    inspector_name: '',
    inspector_company: '',
    overall_result: 'Pass',
    health_condition_found: item.health_condition || 'Good',
    health_condition_custom: '',
    findings: '',
    corrective_actions: '',
    next_inspection_date: '',
    certificate_issued: false,
    certificate_number: '',
    certificate_expiry: '',
    notes: '',
  });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      const data: Record<string, unknown> = { ...form };
      // Resolve "Other" custom values
      if (form.inspection_type === '__other__') data.inspection_type = form.inspection_type_custom?.trim() || 'Internal';
      if (form.health_condition_found === '__other__') data.health_condition_found = form.health_condition_custom?.trim() || 'Good';
      delete data.inspection_type_custom; delete data.health_condition_custom;
      // Remove empty strings
      Object.keys(data).forEach(k => { if (data[k] === '') data[k] = null; });
      data.inspection_date = form.inspection_date;
      data.inspection_type = data.inspection_type || form.inspection_type;
      data.inspector_name = form.inspector_name;
      data.overall_result = form.overall_result;
      data.health_condition_found = data.health_condition_found || form.health_condition_found;
      data.certificate_issued = form.certificate_issued;
      await onSubmit(item.id, data);
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to record inspection');
    } finally {
      setSubmitting(false);
    }
  };

  const inputCls = "w-full px-3 py-2 text-[13px] bg-surface-sunken border border-border rounded-[var(--radius-md)] text-text-primary placeholder:text-text-tertiary focus:outline-none focus:ring-[3px] focus:ring-primary-500/10 focus:border-primary-500 focus:bg-surface transition-all";

  return (
    <>
      <div className="drawer-overlay" onClick={onClose} />
      <div className="drawer-panel right-0 w-[480px] max-w-full animate-slideInRight">
        <div className="shrink-0 flex items-center justify-between px-6 py-4 border-b border-border" style={{ borderTop: '4px solid var(--color-primary-500)' }}>
          <div>
            <h2 className="text-[16px] font-bold text-text-primary">Record Inspection</h2>
            <p className="text-[12px] text-text-tertiary mt-0.5">{item.item_code} — {item.name}</p>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-[var(--radius-sm)] text-text-tertiary hover:text-text-primary hover:bg-surface-sunken transition-colors">
            <XIcon size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto min-h-0 overscroll-contain p-6 space-y-5">
          {error && (
            <div className="p-3 bg-danger-50 border border-danger-100 rounded-[var(--radius-md)] text-[13px] text-danger-700">{error}</div>
          )}

          {/* Inspection Info */}
          <div className="space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Field label="Inspection Date" required>
                <input type="date" value={form.inspection_date} onChange={e => setForm(p => ({ ...p, inspection_date: e.target.value }))} className={inputCls} required />
              </Field>
              <Field label="Inspection Type" required>
                <select value={form.inspection_type} onChange={e => { setForm(p => ({ ...p, inspection_type: e.target.value })); if (e.target.value !== '__other__') setForm(p => ({ ...p, inspection_type_custom: '' })); }} className={inputCls}>
                  {INSPECTION_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                  <option value="__other__">Other</option>
                </select>
                {form.inspection_type === '__other__' && (
                  <input type="text" value={form.inspection_type_custom} onChange={e => setForm(p => ({ ...p, inspection_type_custom: e.target.value }))} placeholder="Enter inspection type..." className={`${inputCls} mt-1.5`} autoFocus />
                )}
              </Field>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Field label="Inspector Name" required>
                <input value={form.inspector_name} onChange={e => setForm(p => ({ ...p, inspector_name: e.target.value }))} className={inputCls} required placeholder="Full name" />
              </Field>
              <Field label="Inspector Company">
                <input value={form.inspector_company} onChange={e => setForm(p => ({ ...p, inspector_company: e.target.value }))} className={inputCls} placeholder="Company name" />
              </Field>
            </div>
          </div>

          {/* Results */}
          <div className="space-y-3">
            <p className="text-[11px] font-semibold text-text-tertiary uppercase tracking-wider">Results</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Field label="Overall Result" required>
                <select value={form.overall_result} onChange={e => setForm(p => ({ ...p, overall_result: e.target.value }))} className={inputCls}>
                  {INSPECTION_RESULTS.map(r => <option key={r} value={r}>{r}</option>)}
                </select>
              </Field>
              <Field label="Health Condition Found" required>
                <select value={form.health_condition_found} onChange={e => { setForm(p => ({ ...p, health_condition_found: e.target.value })); if (e.target.value !== '__other__') setForm(p => ({ ...p, health_condition_custom: '' })); }} className={inputCls}>
                  {HEALTH_CONDITIONS.map(h => <option key={h} value={h}>{h}</option>)}
                  <option value="__other__">Other</option>
                </select>
                {form.health_condition_found === '__other__' && (
                  <input type="text" value={form.health_condition_custom} onChange={e => setForm(p => ({ ...p, health_condition_custom: e.target.value }))} placeholder="Enter health condition..." className={`${inputCls} mt-1.5`} autoFocus />
                )}
              </Field>
            </div>
            <Field label="Findings">
              <textarea value={form.findings} onChange={e => setForm(p => ({ ...p, findings: e.target.value }))} className={inputCls} rows={3} placeholder="What was found during inspection..." />
            </Field>
            {(form.overall_result === 'Fail' || form.overall_result === 'Requires Action' || form.overall_result === 'Pass with Issues') && (
              <Field label="Corrective Actions">
                <textarea value={form.corrective_actions} onChange={e => setForm(p => ({ ...p, corrective_actions: e.target.value }))} className={inputCls} rows={3} placeholder="Actions required or taken..." />
              </Field>
            )}
          </div>

          {/* Next Inspection */}
          <Field label="Next Inspection Date">
            <input type="date" value={form.next_inspection_date} onChange={e => setForm(p => ({ ...p, next_inspection_date: e.target.value }))} className={inputCls} />
            <p className="text-[10px] text-text-tertiary mt-1">Auto-calculated from category frequency if left empty</p>
          </Field>

          {/* Certificate */}
          <div className="space-y-3">
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" checked={form.certificate_issued} onChange={e => setForm(p => ({ ...p, certificate_issued: e.target.checked }))}
                className="w-4 h-4 rounded border-border text-primary-600 focus:ring-primary-500" />
              <span className="text-[13px] font-medium text-text-primary">Certificate Issued</span>
            </label>
            {form.certificate_issued && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <Field label="Certificate Number">
                  <input value={form.certificate_number} onChange={e => setForm(p => ({ ...p, certificate_number: e.target.value }))} className={inputCls} />
                </Field>
                <Field label="Certificate Expiry">
                  <input type="date" value={form.certificate_expiry} onChange={e => setForm(p => ({ ...p, certificate_expiry: e.target.value }))} className={inputCls} />
                </Field>
              </div>
            )}
          </div>

          {/* Notes */}
          <Field label="Notes">
            <textarea value={form.notes} onChange={e => setForm(p => ({ ...p, notes: e.target.value }))} className={inputCls} rows={2} placeholder="Additional notes..." />
          </Field>

          {/* Actions */}
          <div className="flex justify-end gap-2 pt-3 border-t border-border">
            <button type="button" onClick={onClose} className="px-4 py-2 text-[13px] font-medium text-text-primary bg-surface border border-border rounded-[var(--radius-md)] hover:bg-surface-sunken transition-colors">
              Cancel
            </button>
            <button type="submit" disabled={submitting || !form.inspector_name}
              className="px-5 py-2 text-[13px] font-semibold text-white bg-primary-600 rounded-[var(--radius-md)] hover:bg-primary-700 disabled:opacity-50 transition-colors shadow-xs">
              {submitting ? 'Saving...' : 'Record Inspection'}
            </button>
          </div>
        </form>
      </div>
    </>
  );
}
