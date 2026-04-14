import { useState, useEffect } from 'react';
import { X as XIcon, Check } from 'lucide-react';
import { getIcon, AVAILABLE_ICONS, COLOR_PRESETS, INSPECTION_FREQ_OPTIONS } from '../../../config/iconRegistry';
import type { ChecklistCategory } from '../hooks/useChecklists';

interface Props {
  category: ChecklistCategory | null; // null = create mode
  onSave: (data: Record<string, unknown>) => Promise<void>;
  onClose: () => void;
}

const inputCls = 'w-full px-3 py-2 text-[13px] bg-surface border border-border rounded-[var(--radius-md)] focus:outline-none focus:ring-2 focus:ring-primary-500/30 focus:border-primary-500 transition-colors';
const labelCls = 'block text-[12px] font-semibold text-text-secondary mb-1';

export function CategoryManageModal({ category, onSave, onClose }: Props) {
  const isEdit = !!category;

  const [form, setForm] = useState({
    label: '',
    full_label: '',
    icon: 'Package',
    color: '#6B7280',
    light_color: '#F3F4F6',
    text_color: '#374151',
    insp_freq_days: 7,
    has_plate: false,
    has_swl: false,
    has_cert: false,
    description: '',
  });

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [showIconPicker, setShowIconPicker] = useState(false);

  useEffect(() => {
    if (category) {
      setForm({
        label: category.label,
        full_label: category.full_label || '',
        icon: category.icon || 'Package',
        color: category.color,
        light_color: category.light_color,
        text_color: category.text_color,
        insp_freq_days: category.insp_freq_days,
        has_plate: category.has_plate,
        has_swl: category.has_swl,
        has_cert: category.has_cert,
        description: category.description || '',
      });
    }
  }, [category]);

  const handleColorPreset = (preset: typeof COLOR_PRESETS[0]) => {
    setForm(p => ({ ...p, color: preset.color, light_color: preset.light, text_color: preset.text }));
  };

  const handleSubmit = async () => {
    if (!form.label.trim()) { setError('Name is required'); return; }
    setSaving(true);
    setError('');
    try {
      await onSave({ ...form, full_label: form.full_label || form.label });
      onClose();
    } catch (err: any) {
      setError(err?.message || 'Failed to save');
    } finally {
      setSaving(false);
    }
  };

  const SelectedIcon = getIcon(form.icon);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-[2px] p-4">
      <div className="bg-surface rounded-[var(--radius-lg)] border border-border shadow-xl w-full max-w-[520px] max-h-[calc(100vh-2rem)] flex flex-col overflow-hidden animate-fadeInUp">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border shrink-0">
          <h2 className="text-[16px] font-bold text-text-primary">
            {isEdit ? 'Edit Category' : 'Add Category'}
          </h2>
          <button onClick={onClose} className="p-1.5 text-text-tertiary hover:text-text-primary hover:bg-surface-sunken rounded-[var(--radius-md)] transition-colors">
            <XIcon size={18} />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain">
        <div className="px-6 py-5 space-y-5">
          {error && (
            <div className="p-3 text-[12px] text-red-700 bg-red-50 border border-red-200 rounded-[var(--radius-md)]">
              {error}
            </div>
          )}

          {/* Name */}
          <div>
            <label className={labelCls}>Name *</label>
            <input className={inputCls} value={form.label} onChange={e => setForm(p => ({ ...p, label: e.target.value }))} placeholder="e.g. Spill Kits" />
          </div>

          {/* Full Label */}
          <div>
            <label className={labelCls}>Full Label</label>
            <input className={inputCls} value={form.full_label} onChange={e => setForm(p => ({ ...p, full_label: e.target.value }))} placeholder="e.g. Spill Response Kits & Containment" />
          </div>

          {/* Description */}
          <div>
            <label className={labelCls}>Description</label>
            <input className={inputCls} value={form.description} onChange={e => setForm(p => ({ ...p, description: e.target.value }))} placeholder="Short description..." />
          </div>

          {/* Icon + Color */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={labelCls}>Icon</label>
              <button
                type="button"
                onClick={() => setShowIconPicker(!showIconPicker)}
                className={`${inputCls} flex items-center gap-2 cursor-pointer`}
              >
                <span className="w-6 h-6 rounded flex items-center justify-center" style={{ backgroundColor: form.light_color }}>
                  <SelectedIcon size={14} style={{ color: form.color }} />
                </span>
                <span className="truncate">{form.icon}</span>
              </button>
              {showIconPicker && (
                <div className="mt-1 p-2 bg-surface border border-border rounded-[var(--radius-md)] shadow-lg max-h-[180px] overflow-y-auto grid grid-cols-8 gap-1">
                  {AVAILABLE_ICONS.map(name => {
                    const Ic = getIcon(name);
                    return (
                      <button
                        key={name}
                        type="button"
                        onClick={() => { setForm(p => ({ ...p, icon: name })); setShowIconPicker(false); }}
                        className={`p-1.5 rounded hover:bg-surface-sunken transition-colors ${form.icon === name ? 'bg-primary-50 ring-1 ring-primary-500' : ''}`}
                        title={name}
                      >
                        <Ic size={16} className="text-text-secondary" />
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            <div>
              <label className={labelCls}>Color</label>
              <div className="flex flex-wrap gap-1.5">
                {COLOR_PRESETS.map(p => (
                  <button
                    key={p.color}
                    type="button"
                    onClick={() => handleColorPreset(p)}
                    className={`w-6 h-6 rounded-full border-2 transition-transform hover:scale-110 ${form.color === p.color ? 'border-text-primary scale-110' : 'border-transparent'}`}
                    style={{ backgroundColor: p.color }}
                    title={p.label}
                  />
                ))}
              </div>
            </div>
          </div>

          {/* Inspection Frequency */}
          <div>
            <label className={labelCls}>Inspection Frequency</label>
            <select className={inputCls} value={form.insp_freq_days} onChange={e => setForm(p => ({ ...p, insp_freq_days: Number(e.target.value) }))}>
              {INSPECTION_FREQ_OPTIONS.map(o => (
                <option key={o.value} value={o.value}>{o.label} ({o.value} days)</option>
              ))}
            </select>
          </div>

          {/* Feature Toggles */}
          <div>
            <label className={labelCls}>Features</label>
            <div className="flex flex-wrap gap-3 mt-1">
              {[
                { key: 'has_plate', label: 'Plate Number' },
                { key: 'has_swl', label: 'SWL (Safe Working Load)' },
                { key: 'has_cert', label: 'Certificate Tracking' },
              ].map(f => (
                <label key={f.key} className="flex items-center gap-1.5 text-[12px] text-text-secondary cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={(form as any)[f.key]}
                    onChange={e => setForm(p => ({ ...p, [f.key]: e.target.checked }))}
                    className="rounded border-border text-primary-600 focus:ring-primary-500"
                  />
                  {f.label}
                </label>
              ))}
            </div>
          </div>
        </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-2 px-6 py-4 border-t border-border shrink-0">
          <button onClick={onClose} className="px-4 py-2 text-[13px] font-medium text-text-secondary bg-surface border border-border rounded-[var(--radius-md)] hover:bg-surface-sunken transition-colors">
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={saving}
            className="inline-flex items-center gap-1.5 px-4 py-2 text-[13px] font-semibold text-white bg-primary-600 rounded-[var(--radius-md)] hover:bg-primary-700 transition-colors disabled:opacity-50"
          >
            <Check size={15} />
            {saving ? 'Saving...' : isEdit ? 'Save Changes' : 'Create'}
          </button>
        </div>
      </div>
    </div>
  );
}
