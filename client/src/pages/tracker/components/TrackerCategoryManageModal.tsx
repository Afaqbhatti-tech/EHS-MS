import { useState, useEffect } from 'react';
import { X as XIcon, Check } from 'lucide-react';
import { getIcon, AVAILABLE_ICONS, COLOR_PRESETS, TEMPLATE_TYPES, INSPECTION_FREQ_OPTIONS } from '../../../config/iconRegistry';
import type { TrackerCategory } from '../hooks/useTracker';

interface Props {
  category: TrackerCategory | null; // null = create mode
  groups: string[];
  defaultGroup?: string;
  onSave: (data: Record<string, unknown>) => Promise<void>;
  onClose: () => void;
}

const inputCls = 'w-full px-3 py-2 text-[13px] bg-surface border border-border rounded-[var(--radius-md)] focus:outline-none focus:ring-2 focus:ring-primary-500/30 focus:border-primary-500 transition-colors';
const labelCls = 'block text-[12px] font-semibold text-text-secondary mb-1';

export function TrackerCategoryManageModal({ category, groups, defaultGroup, onSave, onClose }: Props) {
  const isEdit = !!category;

  const [form, setForm] = useState({
    label: '',
    group_name: defaultGroup || '',
    new_group: '',
    icon: 'Package',
    color: '#6B7280',
    light_color: '#F3F4F6',
    text_color: '#374151',
    template_type: 'light_equipment',
    insp_freq_days: 7,
    tuv_freq_days: '' as string | number,
    has_plate: false,
    has_swl: false,
    has_tuv: false,
    has_cert: false,
    description: '',
    sort_order: 0,
  });

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [showIconPicker, setShowIconPicker] = useState(false);

  useEffect(() => {
    if (category) {
      setForm({
        label: category.label,
        group_name: category.group_name,
        new_group: '',
        icon: category.icon || 'Package',
        color: category.color,
        light_color: category.light_color,
        text_color: category.text_color,
        template_type: category.template_type,
        insp_freq_days: category.insp_freq_days,
        tuv_freq_days: category.tuv_freq_days ?? '',
        has_plate: category.has_plate,
        has_swl: category.has_swl,
        has_tuv: category.has_tuv,
        has_cert: category.has_cert,
        description: category.description || '',
        sort_order: 0,
      });
    }
  }, [category]);

  const handleColorPreset = (preset: typeof COLOR_PRESETS[0]) => {
    setForm(p => ({ ...p, color: preset.color, light_color: preset.light, text_color: preset.text }));
  };

  const handleSubmit = async () => {
    if (!form.label.trim()) { setError('Name is required'); return; }
    const groupName = form.new_group.trim() || form.group_name;
    if (!groupName) { setError('Group is required'); return; }

    setSaving(true);
    setError('');
    try {
      await onSave({
        ...form,
        group_name: groupName,
        tuv_freq_days: form.tuv_freq_days === '' ? null : Number(form.tuv_freq_days),
      });
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
      <div className="bg-surface rounded-[var(--radius-lg)] border border-border shadow-xl w-full max-w-[560px] max-h-[calc(100vh-2rem)] flex flex-col overflow-hidden animate-fadeInUp">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border shrink-0">
          <h2 className="text-[16px] font-bold text-text-primary">
            {isEdit ? 'Edit Equipment Type' : 'Add Equipment Type'}
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
            <input className={inputCls} value={form.label} onChange={e => setForm(p => ({ ...p, label: e.target.value }))} placeholder="e.g. Chain Hoists" />
          </div>

          {/* Group */}
          <div>
            <label className={labelCls}>Group *</label>
            <select className={inputCls} value={form.new_group ? '__new__' : form.group_name} onChange={e => {
              if (e.target.value === '__new__') {
                setForm(p => ({ ...p, group_name: '', new_group: '' }));
              } else {
                setForm(p => ({ ...p, group_name: e.target.value, new_group: '' }));
              }
            }}>
              <option value="">Select group...</option>
              {groups.map(g => <option key={g} value={g}>{g}</option>)}
              <option value="__new__">+ New group...</option>
            </select>
            {(form.new_group !== '' || (!form.group_name && form.new_group === '')) && (
              <input className={`${inputCls} mt-2`} value={form.new_group} onChange={e => setForm(p => ({ ...p, new_group: e.target.value }))} placeholder="Enter new group name..." autoFocus />
            )}
          </div>

          {/* Description */}
          <div>
            <label className={labelCls}>Description</label>
            <input className={inputCls} value={form.description} onChange={e => setForm(p => ({ ...p, description: e.target.value }))} placeholder="Short description..." />
          </div>

          {/* Icon + Color row */}
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

          {/* Template Type */}
          <div>
            <label className={labelCls}>Equipment Template *</label>
            <select className={inputCls} value={form.template_type} onChange={e => setForm(p => ({ ...p, template_type: e.target.value }))}>
              {TEMPLATE_TYPES.map(t => (
                <option key={t.value} value={t.value}>{t.label} — {t.description}</option>
              ))}
            </select>
          </div>

          {/* Inspection Frequency */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={labelCls}>Inspection Frequency</label>
              <select className={inputCls} value={form.insp_freq_days} onChange={e => setForm(p => ({ ...p, insp_freq_days: Number(e.target.value) }))}>
                {INSPECTION_FREQ_OPTIONS.map(o => (
                  <option key={o.value} value={o.value}>{o.label} ({o.value} days)</option>
                ))}
              </select>
            </div>
            <div>
              <label className={labelCls}>TUV Frequency (days)</label>
              <input type="number" className={inputCls} value={form.tuv_freq_days} onChange={e => setForm(p => ({ ...p, tuv_freq_days: e.target.value }))} placeholder="e.g. 365 (leave empty if N/A)" />
            </div>
          </div>

          {/* Feature Toggles */}
          <div>
            <label className={labelCls}>Features</label>
            <div className="flex flex-wrap gap-3 mt-1">
              {[
                { key: 'has_plate', label: 'Plate Number' },
                { key: 'has_swl', label: 'SWL (Safe Working Load)' },
                { key: 'has_tuv', label: 'TUV Tracking' },
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
