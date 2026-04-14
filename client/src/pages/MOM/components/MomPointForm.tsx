import { useState } from 'react';
import { X as XIcon } from 'lucide-react';

interface Props {
  point?: Record<string, any> | null;
  onSubmit: (data: Record<string, unknown>) => Promise<void>;
  onClose: () => void;
}

const CATEGORIES = [
  'Safety', 'Quality', 'Progress', 'Environmental', 'Administrative',
  'Technical', 'Client Request', 'Action Required', 'Information',
];

const OTHER = '__other__';

const PRIORITIES = ['Low', 'Medium', 'High', 'Critical'];

const STATUSES = ['Open', 'In Progress', 'Resolved', 'Closed', 'Pending', 'Blocked'];

export function MomPointForm({ point, onSubmit, onClose }: Props) {
  const isEdit = !!point;
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [form, setForm] = useState({
    title: point?.title || '',
    description: point?.description || '',
    category: point?.category || 'Action Required',
    category_custom: '',
    raised_by: point?.raised_by || '',
    assigned_to: point?.assigned_to || '',
    status: point?.status || 'Open',
    priority: point?.priority || 'Medium',
    due_date: point?.due_date || '',
    completion_percentage: point?.completion_percentage || 0,
    remarks: point?.remarks || '',
    is_recurring: point?.is_recurring || false,
    update_note: '',
  });

  const updateField = (key: string, value: unknown) => setForm(f => ({ ...f, [key]: value }));

  const handleSubmit = async () => {
    if (!form.title.trim()) { setError('Title is required'); return; }
    setSaving(true);
    setError(null);
    try {
      const payload = { ...form };
      if (payload.category === OTHER) {
        payload.category = payload.category_custom || '';
      }
      delete (payload as Record<string, unknown>).category_custom;
      await onSubmit(payload);
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to save');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="mom-modal-overlay" onClick={onClose}>
      <div className="mom-modal" onClick={e => e.stopPropagation()} style={{ maxWidth: 520 }}>
        <div className="mom-modal__header">
          <h3 style={{ fontSize: 15, fontWeight: 700 }}>{isEdit ? 'Edit Point' : 'Add Action Point'}</h3>
          <button onClick={onClose} className="p-1 rounded-[var(--radius-sm)] hover:bg-surface-sunken"><XIcon size={16} /></button>
        </div>
        <div className="mom-modal__body">
          {error && (
            <div style={{ marginBottom: 12, padding: '8px 12px', background: 'var(--color-danger-50)', border: '1px solid var(--color-danger-200)', borderRadius: 'var(--radius-md)', fontSize: 13, color: 'var(--color-danger-700)' }}>
              {error}
            </div>
          )}

          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div>
              <label className="block text-[11px] font-semibold text-text-tertiary uppercase mb-1">Title *</label>
              <input type="text" value={form.title} onChange={e => updateField('title', e.target.value)} placeholder="Action point title"
                className="w-full px-3 py-2 text-[13px] border border-border rounded-[var(--radius-md)] bg-surface focus:outline-none focus:border-primary-400" />
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-text-tertiary uppercase mb-1">Description</label>
              <textarea value={form.description} onChange={e => updateField('description', e.target.value)} rows={3} placeholder="Detailed description..."
                className="w-full px-3 py-2 text-[13px] border border-border rounded-[var(--radius-md)] bg-surface focus:outline-none focus:border-primary-400 resize-y" />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-semibold text-text-tertiary uppercase mb-1">Category</label>
                {form.category === OTHER ? (
                  <div className="flex gap-2">
                    <input type="text" value={form.category_custom} onChange={e => updateField('category_custom', e.target.value)}
                      className="w-full px-3 py-2 text-[13px] border border-border rounded-[var(--radius-md)] bg-surface focus:outline-none focus:border-primary-400"
                      placeholder="Type category..." autoFocus />
                    <button type="button" onClick={() => { updateField('category', 'Action Required'); updateField('category_custom', ''); }}
                      className="px-2.5 py-1 text-[12px] font-medium border border-border rounded-[var(--radius-md)] bg-surface hover:bg-surface-sunken shrink-0">Back</button>
                  </div>
                ) : (
                  <select value={form.category} onChange={e => updateField('category', e.target.value)}
                    className="w-full px-3 py-2 text-[13px] border border-border rounded-[var(--radius-md)] bg-surface focus:outline-none">
                    {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                    <option value={OTHER}>Other (type manually)</option>
                  </select>
                )}
              </div>
              <div>
                <label className="block text-[11px] font-semibold text-text-tertiary uppercase mb-1">Priority</label>
                <select value={form.priority} onChange={e => updateField('priority', e.target.value)}
                  className="w-full px-3 py-2 text-[13px] border border-border rounded-[var(--radius-md)] bg-surface focus:outline-none">
                  {PRIORITIES.map(p => <option key={p} value={p}>{p}</option>)}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-semibold text-text-tertiary uppercase mb-1">Raised By</label>
                <input type="text" value={form.raised_by} onChange={e => updateField('raised_by', e.target.value)}
                  className="w-full px-3 py-2 text-[13px] border border-border rounded-[var(--radius-md)] bg-surface focus:outline-none focus:border-primary-400" />
              </div>
              <div>
                <label className="block text-[11px] font-semibold text-text-tertiary uppercase mb-1">Assigned To</label>
                <input type="text" value={form.assigned_to} onChange={e => updateField('assigned_to', e.target.value)}
                  className="w-full px-3 py-2 text-[13px] border border-border rounded-[var(--radius-md)] bg-surface focus:outline-none focus:border-primary-400" />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {isEdit && (
                <div>
                  <label className="block text-[11px] font-semibold text-text-tertiary uppercase mb-1">Status</label>
                  <select value={form.status} onChange={e => updateField('status', e.target.value)}
                    className="w-full px-3 py-2 text-[13px] border border-border rounded-[var(--radius-md)] bg-surface focus:outline-none">
                    {STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
              )}
              <div>
                <label className="block text-[11px] font-semibold text-text-tertiary uppercase mb-1">Due Date</label>
                <input type="date" value={form.due_date} onChange={e => updateField('due_date', e.target.value)}
                  className="w-full px-3 py-2 text-[13px] border border-border rounded-[var(--radius-md)] bg-surface focus:outline-none focus:border-primary-400" />
              </div>
            </div>

            {isEdit && (
              <div>
                <label className="block text-[11px] font-semibold text-text-tertiary uppercase mb-1">Completion %</label>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <input type="range" min={0} max={100} step={5} value={form.completion_percentage}
                    onChange={e => updateField('completion_percentage', parseInt(e.target.value))}
                    style={{ flex: 1, accentColor: 'var(--color-primary-600)' }} />
                  <span className="text-[13px] font-semibold text-text-secondary" style={{ width: 40, textAlign: 'right' }}>{form.completion_percentage}%</span>
                </div>
              </div>
            )}

            <div>
              <label className="block text-[11px] font-semibold text-text-tertiary uppercase mb-1">Remarks</label>
              <textarea value={form.remarks} onChange={e => updateField('remarks', e.target.value)} rows={2}
                className="w-full px-3 py-2 text-[13px] border border-border rounded-[var(--radius-md)] bg-surface focus:outline-none focus:border-primary-400 resize-y" />
            </div>

            {isEdit && form.status !== point?.status && (
              <div>
                <label className="block text-[11px] font-semibold text-text-tertiary uppercase mb-1">Update Note *</label>
                <textarea value={form.update_note} onChange={e => updateField('update_note', e.target.value)} rows={2} placeholder="Describe what changed..."
                  className="w-full px-3 py-2 text-[13px] border border-border rounded-[var(--radius-md)] bg-surface focus:outline-none focus:border-primary-400 resize-y" />
              </div>
            )}

            <label className="flex items-center gap-2 text-[12px] font-semibold text-text-secondary cursor-pointer">
              <input type="checkbox" checked={form.is_recurring} onChange={e => updateField('is_recurring', e.target.checked)} className="accent-primary-600" />
              This is a recurring issue
            </label>
          </div>
        </div>
        <div className="mom-modal__footer">
          <button onClick={onClose} disabled={saving}
            className="px-4 py-2 text-[13px] font-semibold border border-border rounded-[var(--radius-md)] bg-surface hover:bg-surface-sunken">
            Cancel
          </button>
          <button onClick={handleSubmit} disabled={saving}
            className="px-4 py-2 text-[13px] font-semibold text-white bg-primary-600 rounded-[var(--radius-md)] hover:bg-primary-700 shadow-xs">
            {saving ? 'Saving...' : isEdit ? 'Update Point' : 'Add Point'}
          </button>
        </div>
      </div>
    </div>
  );
}
