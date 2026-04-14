import { useState, useEffect } from 'react';
import { X as XIcon, Loader2, CheckCircle, XCircle, Clock } from 'lucide-react';
import type { Worker, FilterOptions } from '../hooks/useManpower';

interface Props {
  worker: Worker | null;
  onSubmit: (data: Record<string, unknown>) => Promise<void>;
  onClose: () => void;
  filterOptions: FilterOptions | null;
}

interface FormErrors {
  [key: string]: string;
}

const INDUCTION_STATUSES = ['Done', 'Not Done', 'Pending'];
const WORKER_STATUSES = ['Active', 'Inactive', 'Demobilised', 'Suspended'];

export function WorkerForm({ worker, onSubmit, onClose, filterOptions }: Props) {
  const isEdit = !!worker;
  const [submitting, setSubmitting] = useState(false);
  const [errors, setErrors] = useState<FormErrors>({});

  const [form, setForm] = useState({
    name: '',
    employee_number: '',
    id_number: '',
    iqama_number: '',
    nationality: '',
    contact_number: '',
    emergency_contact: '',
    profession: '',
    profession_other: '',
    department: '',
    company: '',
    joining_date: '',
    demobilization_date: '',
    induction_status: 'Not Done',
    induction_date: '',
    induction_by: '',
    status: 'Active',
    remarks: '',
  });

  useEffect(() => {
    if (worker) {
      const professions = filterOptions?.professions || [];
      const hasMatchingProfession = professions.includes(worker.profession || '');
      setForm({
        name: worker.name || '',
        employee_number: worker.employee_number || '',
        id_number: worker.id_number || '',
        iqama_number: worker.iqama_number || '',
        nationality: worker.nationality || '',
        contact_number: worker.contact_number || '',
        emergency_contact: worker.emergency_contact || '',
        profession: hasMatchingProfession ? (worker.profession || '') : (worker.profession ? '__other__' : ''),
        profession_other: (!hasMatchingProfession && worker.profession) ? worker.profession : '',
        department: worker.department || '',
        company: worker.company || '',
        joining_date: worker.joining_date || '',
        demobilization_date: worker.demobilization_date || '',
        induction_status: worker.induction_status || 'Not Done',
        induction_date: worker.induction_date || '',
        induction_by: worker.induction_by || '',
        status: worker.status || 'Active',
        remarks: worker.remarks || '',
      });
    } else {
      setForm(f => ({ ...f, joining_date: new Date().toISOString().slice(0, 10) }));
    }
  }, [worker, filterOptions]);

  const validate = (): boolean => {
    const errs: FormErrors = {};
    if (!form.name.trim() || form.name.trim().length < 2) errs.name = 'Name is required (min 2 chars)';
    if (form.induction_status === 'Done' && !form.induction_date) errs.induction_date = 'Induction date is required when status is Done';
    if (form.joining_date && form.demobilization_date && form.demobilization_date < form.joining_date) {
      errs.demobilization_date = 'Demobilization date must be after joining date';
    }
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;
    setSubmitting(true);
    try {
      const submitData: Record<string, unknown> = { ...form };
      // Resolve profession
      if (form.profession === '__other__') {
        submitData.profession = form.profession_other || null;
      }
      delete submitData.profession_other;
      // Clean empty strings to null
      for (const key of Object.keys(submitData)) {
        if (submitData[key] === '') submitData[key] = null;
      }
      await onSubmit(submitData);
    } catch (err: any) {
      setErrors({ _general: err.message || 'Failed to save worker' });
    } finally {
      setSubmitting(false);
    }
  };

  const set = (key: string, value: unknown) => {
    setForm(f => ({ ...f, [key]: value }));
    if (errors[key]) setErrors(e => ({ ...e, [key]: '' }));
  };

  const inputClasses = 'w-full h-9 px-3 text-[13px] bg-surface-sunken border border-border rounded-[var(--radius-md)] text-text-primary focus:outline-none focus:ring-[3px] focus:ring-primary-500/10 focus:border-primary-500 focus:bg-surface transition-all';
  const selectClasses = `${inputClasses} appearance-none cursor-pointer`;
  const textareaClasses = 'w-full px-3 py-2 text-[13px] bg-surface-sunken border border-border rounded-[var(--radius-md)] text-text-primary focus:outline-none focus:ring-[3px] focus:ring-primary-500/10 focus:border-primary-500 focus:bg-surface resize-y transition-all';
  const labelClasses = 'block text-[12px] font-medium text-text-secondary mb-1';
  const errorClasses = 'text-[11px] text-danger-600 mt-0.5';

  return (
    <>
      <div className="drawer-overlay" onClick={onClose} />
      <div className="drawer-panel">
        {/* Header */}
        <div className="shrink-0 flex items-center justify-between px-6 py-4 border-b border-border bg-surface z-10" style={{ borderTop: '4px solid var(--color-primary-500)' }}>
          <h2 className="text-[17px] font-bold text-text-primary">
            {isEdit ? 'Edit Worker' : 'Add New Worker'}
          </h2>
          <button onClick={onClose} className="p-1.5 rounded-[var(--radius-sm)] text-text-tertiary hover:text-text-primary hover:bg-surface-sunken transition-colors">
            <XIcon size={20} />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="flex-1 min-h-0 overflow-y-auto overscroll-contain p-6 space-y-6">
          {errors._general && (
            <div className="p-3 bg-danger-50 border border-danger-100 rounded-[var(--radius-md)] text-[13px] text-danger-700">{errors._general}</div>
          )}

          {/* Section: Identity */}
          {isEdit && worker && (
            <div className="space-y-3">
              <p className="text-[11px] font-semibold text-text-tertiary uppercase tracking-wider">Identity</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className={labelClasses}>Worker ID</label>
                  <input type="text" value={worker.worker_id} readOnly className={`${inputClasses} bg-surface-sunken text-text-tertiary cursor-not-allowed`} />
                </div>
                <div>
                  <label className={labelClasses}>Status</label>
                  <select value={form.status} onChange={e => set('status', e.target.value)} className={selectClasses}>
                    {WORKER_STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
              </div>
            </div>
          )}

          {!isEdit && (
            <div className="space-y-3">
              <p className="text-[11px] font-semibold text-text-tertiary uppercase tracking-wider">Identity</p>
              <div>
                <label className={labelClasses}>Status</label>
                <select value={form.status} onChange={e => set('status', e.target.value)} className={selectClasses}>
                  {WORKER_STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
            </div>
          )}

          {/* Section: Personal Details */}
          <div className="space-y-3">
            <p className="text-[11px] font-semibold text-text-tertiary uppercase tracking-wider">Personal Details</p>
            <div>
              <label className={labelClasses}>Full Name *</label>
              <input type="text" value={form.name} onChange={e => set('name', e.target.value)} placeholder="e.g. Ahmed Al-Rahman" className={inputClasses} />
              {errors.name && <p className={errorClasses}>{errors.name}</p>}
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className={labelClasses}>Employee Number</label>
                <input type="text" value={form.employee_number} onChange={e => set('employee_number', e.target.value)} placeholder="HR/Payroll ref" className={inputClasses} />
              </div>
              <div>
                <label className={labelClasses}>ID / Passport Number</label>
                <input type="text" value={form.id_number} onChange={e => set('id_number', e.target.value)} placeholder="Passport or national ID" className={inputClasses} />
              </div>
            </div>
            <div>
              <label className={labelClasses}>Iqama Number</label>
              <input type="text" value={form.iqama_number} onChange={e => set('iqama_number', e.target.value)} placeholder="e.g. 2012345678" maxLength={20} className={inputClasses} />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className={labelClasses}>Nationality</label>
                <input type="text" value={form.nationality} onChange={e => set('nationality', e.target.value)} placeholder="e.g. Pakistani" className={inputClasses} list="worker-nationalities" />
                <datalist id="worker-nationalities">
                  {(filterOptions?.nationalities || []).map(n => <option key={n} value={n} />)}
                </datalist>
              </div>
              <div>
                <label className={labelClasses}>Contact Number</label>
                <input type="text" value={form.contact_number} onChange={e => set('contact_number', e.target.value)} placeholder="+966..." className={inputClasses} />
              </div>
            </div>
            <div>
              <label className={labelClasses}>Emergency Contact</label>
              <input type="text" value={form.emergency_contact} onChange={e => set('emergency_contact', e.target.value)} placeholder="Name & number" className={inputClasses} />
            </div>
          </div>

          {/* Section: Work Profile */}
          <div className="space-y-3">
            <p className="text-[11px] font-semibold text-text-tertiary uppercase tracking-wider">Work Profile</p>
            <div>
              <label className={labelClasses}>Profession</label>
              {form.profession === '__other__' ? (
                <div className="flex gap-2">
                  <input type="text" value={form.profession_other} onChange={e => set('profession_other', e.target.value)}
                    className={inputClasses} placeholder="Type profession..." autoFocus />
                  <button type="button" onClick={() => { set('profession', ''); set('profession_other', ''); }}
                    className="px-2.5 py-1 text-[12px] font-medium border border-border rounded-[var(--radius-md)] bg-surface hover:bg-surface-sunken shrink-0">Back</button>
                </div>
              ) : (
                <select value={form.profession} onChange={e => set('profession', e.target.value)} className={selectClasses}>
                  <option value="">Select profession</option>
                  {(filterOptions?.professions || []).map(p => <option key={p} value={p}>{p}</option>)}
                  <option value="__other__">Other (type manually)</option>
                </select>
              )}
            </div>
            <div>
              <label className={labelClasses}>Department</label>
              <input type="text" value={form.department} onChange={e => set('department', e.target.value)} placeholder="Team / Crew" className={inputClasses} list="worker-departments" />
              <datalist id="worker-departments">
                {(filterOptions?.departments || []).map(d => <option key={d} value={d} />)}
              </datalist>
            </div>
            <div>
              <label className={labelClasses}>Company / Subcontractor</label>
              <input type="text" value={form.company} onChange={e => set('company', e.target.value)} placeholder='e.g. "CCCC" or "Direct"' className={inputClasses} list="worker-companies" />
              <datalist id="worker-companies">
                {(filterOptions?.companies || []).map(c => <option key={c} value={c} />)}
              </datalist>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className={labelClasses}>Joining Date</label>
                <input type="date" value={form.joining_date} onChange={e => set('joining_date', e.target.value)} className={inputClasses} />
              </div>
              <div>
                <label className={labelClasses}>Demobilization Date</label>
                <input type="date" value={form.demobilization_date} onChange={e => set('demobilization_date', e.target.value)} className={inputClasses} />
                {errors.demobilization_date && <p className={errorClasses}>{errors.demobilization_date}</p>}
              </div>
            </div>
          </div>

          {/* Section: EHS Induction */}
          <div className="space-y-3">
            <p className="text-[11px] font-semibold text-text-tertiary uppercase tracking-wider">EHS Induction</p>
            <div>
              <label className={labelClasses}>Induction Status</label>
              <select value={form.induction_status} onChange={e => set('induction_status', e.target.value)} className={selectClasses}>
                {INDUCTION_STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>

            {form.induction_status === 'Done' && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className={labelClasses}>Induction Date *</label>
                  <input type="date" value={form.induction_date} onChange={e => set('induction_date', e.target.value)} className={inputClasses} />
                  {errors.induction_date && <p className={errorClasses}>{errors.induction_date}</p>}
                </div>
                <div>
                  <label className={labelClasses}>Inducted By</label>
                  <input type="text" value={form.induction_by} onChange={e => set('induction_by', e.target.value)} placeholder="Person name" className={inputClasses} />
                </div>
              </div>
            )}

            {/* Visual indicator */}
            <div className={`flex items-center gap-2 px-3 py-2 rounded-[var(--radius-md)] text-[12px] font-medium ${
              form.induction_status === 'Done'
                ? 'bg-green-100 text-green-800 border border-green-200'
                : form.induction_status === 'Pending'
                  ? 'bg-amber-100 text-amber-800 border border-amber-200'
                  : 'bg-red-100 text-red-800 border border-red-200'
            }`}>
              {form.induction_status === 'Done' && <CheckCircle size={14} />}
              {form.induction_status === 'Not Done' && <XCircle size={14} />}
              {form.induction_status === 'Pending' && <Clock size={14} />}
              {form.induction_status === 'Done'
                ? 'Worker has completed EHS site induction'
                : form.induction_status === 'Pending'
                  ? 'Induction is scheduled / pending'
                  : 'Worker has not been inducted yet'
              }
            </div>
          </div>

          {/* Section: Remarks */}
          <div className="space-y-3">
            <p className="text-[11px] font-semibold text-text-tertiary uppercase tracking-wider">Remarks</p>
            <textarea value={form.remarks} onChange={e => set('remarks', e.target.value)} rows={3} placeholder="Additional notes..." className={textareaClasses} />
          </div>

          {/* Training Matrix Info */}
          <div className="flex items-start gap-2 px-3 py-2.5 bg-blue-50 border border-blue-100 rounded-[var(--radius-md)]">
            <span className="text-[12px] text-blue-600 leading-relaxed">
              This worker record will be linked to the Training Matrix once that module is available.
            </span>
          </div>

          {/* Footer */}
          <div className="shrink-0 flex justify-end gap-2 pt-4 border-t border-border">
            <button type="button" onClick={onClose} className="px-4 py-2 text-[13px] font-medium text-text-primary bg-surface border border-border rounded-[var(--radius-md)] hover:bg-surface-sunken transition-colors">
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-5 py-2 text-[13px] font-semibold text-white bg-primary-600 rounded-[var(--radius-md)] hover:bg-primary-700 transition-colors shadow-xs disabled:opacity-50 flex items-center gap-2"
            >
              {submitting && <Loader2 size={14} className="animate-spin" />}
              {submitting ? 'Saving...' : isEdit ? 'Update Worker' : 'Add Worker'}
            </button>
          </div>
        </form>
      </div>
    </>
  );
}
