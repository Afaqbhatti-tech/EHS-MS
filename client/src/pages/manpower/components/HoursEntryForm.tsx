import { useState } from 'react';
import { X as XIcon, Loader2 } from 'lucide-react';

interface Props {
  onSubmit: (data: Record<string, unknown>) => Promise<void>;
  onClose: () => void;
}

const SHIFTS = ['Day', 'Night', 'Split'];
const ATTENDANCE_STATUSES = ['Present', 'Absent', 'Half Day', 'Leave', 'Holiday', 'Off'];

export function HoursEntryForm({ onSubmit, onClose }: Props) {
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const [form, setForm] = useState({
    work_date: new Date().toISOString().slice(0, 10),
    shift: 'Day',
    shift_custom: '',
    attendance_status: 'Present',
    hours_worked: '8',
    overtime_hours: '0',
    site_area: '',
    notes: '',
  });

  const showHoursFields = ['Present', 'Half Day'].includes(form.attendance_status);
  const showOvertimeField = form.attendance_status === 'Present';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.work_date) { setError('Work date is required'); return; }

    setSubmitting(true);
    setError('');
    try {
      const resolvedShift = form.shift === '__other__' ? form.shift_custom.trim() || 'Day' : form.shift;
      await onSubmit({
        work_date: form.work_date,
        shift: resolvedShift,
        attendance_status: form.attendance_status,
        hours_worked: showHoursFields ? parseFloat(form.hours_worked) || 0 : 0,
        overtime_hours: showOvertimeField ? parseFloat(form.overtime_hours) || 0 : 0,
        site_area: form.site_area || null,
        notes: form.notes || null,
      });
    } catch (err: any) {
      setError(err.message || 'Failed to record hours');
    } finally {
      setSubmitting(false);
    }
  };

  const set = (key: string, value: string) => {
    setForm(f => ({ ...f, [key]: value }));
    if (error) setError('');
  };

  const inputClasses = 'w-full h-9 px-3 text-[13px] bg-surface-sunken border border-border rounded-[var(--radius-md)] text-text-primary focus:outline-none focus:ring-[3px] focus:ring-primary-500/10 focus:border-primary-500 focus:bg-surface transition-all';
  const selectClasses = `${inputClasses} appearance-none cursor-pointer`;
  const labelClasses = 'block text-[12px] font-medium text-text-secondary mb-1';

  return (
    <>
      <div className="drawer-overlay" onClick={onClose} />
      <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-[102] bg-surface border border-border rounded-[var(--radius-lg)] shadow-xl w-[440px] max-w-[90vw] max-h-[90vh] flex flex-col overflow-hidden animate-fadeIn">
        {/* Header */}
        <div className="shrink-0 flex items-center justify-between px-5 py-3.5 border-b border-border">
          <h3 className="text-[15px] font-bold text-text-primary">Record Hours</h3>
          <button onClick={onClose} className="p-1 rounded-[var(--radius-sm)] text-text-tertiary hover:text-text-primary hover:bg-surface-sunken transition-colors">
            <XIcon size={18} />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="flex-1 min-h-0 overflow-y-auto overscroll-contain p-5 space-y-4">
          {error && (
            <div className="p-2.5 bg-danger-50 border border-danger-100 rounded-[var(--radius-md)] text-[12px] text-danger-700">{error}</div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelClasses}>Work Date *</label>
              <input type="date" value={form.work_date} onChange={e => set('work_date', e.target.value)} className={inputClasses} />
            </div>
            <div>
              <label className={labelClasses}>Shift</label>
              <select value={form.shift} onChange={e => { set('shift', e.target.value); if (e.target.value !== '__other__') set('shift_custom', ''); }} className={selectClasses}>
                {SHIFTS.map(s => <option key={s} value={s}>{s}</option>)}
                <option value="__other__">Other</option>
              </select>
              {form.shift === '__other__' && (
                <input type="text" value={form.shift_custom} onChange={e => set('shift_custom', e.target.value)} placeholder="Enter shift type..." className={`${inputClasses} mt-1.5`} autoFocus />
              )}
            </div>
          </div>

          <div>
            <label className={labelClasses}>Attendance Status *</label>
            <select value={form.attendance_status} onChange={e => set('attendance_status', e.target.value)} className={selectClasses}>
              {ATTENDANCE_STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>

          {showHoursFields && (
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={labelClasses}>Regular Hours</label>
                <input
                  type="number"
                  value={form.hours_worked}
                  onChange={e => set('hours_worked', e.target.value)}
                  min="0" max="24" step="0.5"
                  className={inputClasses}
                />
              </div>
              {showOvertimeField && (
                <div>
                  <label className={labelClasses}>Overtime Hours</label>
                  <input
                    type="number"
                    value={form.overtime_hours}
                    onChange={e => set('overtime_hours', e.target.value)}
                    min="0" max="12" step="0.5"
                    className={inputClasses}
                  />
                </div>
              )}
            </div>
          )}

          <div>
            <label className={labelClasses}>Site Area</label>
            <input type="text" value={form.site_area} onChange={e => set('site_area', e.target.value)} placeholder="e.g. Zone A, Station 3" className={inputClasses} />
          </div>

          <div>
            <label className={labelClasses}>Notes</label>
            <textarea
              value={form.notes}
              onChange={e => set('notes', e.target.value)}
              rows={2}
              placeholder="Optional notes..."
              className="w-full px-3 py-2 text-[13px] bg-surface-sunken border border-border rounded-[var(--radius-md)] text-text-primary focus:outline-none focus:ring-[3px] focus:ring-primary-500/10 focus:border-primary-500 focus:bg-surface resize-y transition-all"
            />
          </div>

          {/* Footer */}
          <div className="shrink-0 flex justify-end gap-2 pt-2">
            <button type="button" onClick={onClose} className="px-4 py-2 text-[13px] font-medium text-text-primary bg-surface border border-border rounded-[var(--radius-md)] hover:bg-surface-sunken transition-colors">
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-4 py-2 text-[13px] font-semibold text-white bg-primary-600 rounded-[var(--radius-md)] hover:bg-primary-700 transition-colors shadow-xs disabled:opacity-50 flex items-center gap-2"
            >
              {submitting && <Loader2 size={14} className="animate-spin" />}
              {submitting ? 'Saving...' : 'Record Hours'}
            </button>
          </div>
        </form>
      </div>
    </>
  );
}
