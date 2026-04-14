import { useState, useMemo } from 'react';
import { X as XIcon, Check, ChevronDown, ChevronRight, Search } from 'lucide-react';
import { getIcon, AVAILABLE_ICONS, COLOR_PRESETS } from '../../../config/iconRegistry';
import type { MasterFieldDef } from '../hooks/useEquipmentGroups';

interface Props {
  masterFields: MasterFieldDef[];
  onSave: (data: {
    name: string;
    description?: string;
    icon?: string;
    color?: string;
    light_color?: string;
    text_color?: string;
    category_type?: string;
    fields: Array<{
      field_key: string;
      field_label: string;
      field_type: string;
      field_options?: string[] | null;
      is_required?: boolean;
    }>;
  }) => Promise<unknown>;
  onClose: () => void;
  defaultCategoryType?: string;
}

const inputCls = 'w-full px-3 py-2 text-[13px] bg-surface border border-border rounded-[var(--radius-md)] focus:outline-none focus:ring-2 focus:ring-primary-500/30 focus:border-primary-500 transition-colors';
const labelCls = 'block text-[12px] font-semibold text-text-secondary mb-1';

export function CreateGroupModal({ masterFields, onSave, onClose, defaultCategoryType }: Props) {
  const [form, setForm] = useState({
    name: '',
    description: '',
    icon: 'Package',
    color: '#6B7280',
    light_color: '#F3F4F6',
    text_color: '#374151',
  });

  const [selectedFieldKeys, setSelectedFieldKeys] = useState<Set<string>>(new Set());
  const [fieldSearch, setFieldSearch] = useState('');
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set(['Core Fields']));
  const [showIconPicker, setShowIconPicker] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [step, setStep] = useState<'info' | 'fields'>('info');

  // Group master fields by category
  const fieldsByCategory = useMemo(() => {
    const map: Record<string, MasterFieldDef[]> = {};
    masterFields.forEach(f => {
      if (!map[f.category]) map[f.category] = [];
      map[f.category].push(f);
    });
    return map;
  }, [masterFields]);

  // Filter fields by search
  const filteredFields = useMemo(() => {
    if (!fieldSearch.trim()) return fieldsByCategory;
    const q = fieldSearch.toLowerCase();
    const result: Record<string, MasterFieldDef[]> = {};
    for (const [cat, fields] of Object.entries(fieldsByCategory)) {
      const filtered = fields.filter(f =>
        f.label.toLowerCase().includes(q) || f.key.toLowerCase().includes(q)
      );
      if (filtered.length) result[cat] = filtered;
    }
    return result;
  }, [fieldsByCategory, fieldSearch]);

  const toggleField = (key: string) => {
    setSelectedFieldKeys(prev => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const toggleCategory = (cat: string) => {
    setExpandedCategories(prev => {
      const next = new Set(prev);
      if (next.has(cat)) next.delete(cat);
      else next.add(cat);
      return next;
    });
  };

  const selectAllInCategory = (cat: string) => {
    const fields = fieldsByCategory[cat] || [];
    setSelectedFieldKeys(prev => {
      const next = new Set(prev);
      const allSelected = fields.every(f => next.has(f.key));
      fields.forEach(f => {
        if (allSelected) next.delete(f.key);
        else next.add(f.key);
      });
      return next;
    });
  };

  const handleColorPreset = (preset: typeof COLOR_PRESETS[0]) => {
    setForm(p => ({ ...p, color: preset.color, light_color: preset.light, text_color: preset.text }));
  };

  const handleSubmit = async () => {
    if (!form.name.trim()) { setError('Group name is required'); return; }
    if (selectedFieldKeys.size === 0) { setError('Select at least one field'); return; }

    setSaving(true);
    setError('');
    try {
      const fields = Array.from(selectedFieldKeys).map(key => {
        const master = masterFields.find(f => f.key === key);
        return {
          field_key: key,
          field_label: master?.label || key,
          field_type: master?.type || 'text',
          field_options: master?.options || null,
          is_required: key === 'equipment_name' || key === 'serial_number',
        };
      });

      await onSave({
        ...form,
        category_type: defaultCategoryType || form.name.trim(),
        fields,
      });
      onClose();
    } catch (err: any) {
      setError(err?.response?.data?.message || err?.message || 'Failed to create group');
    } finally {
      setSaving(false);
    }
  };

  const SelectedIcon = getIcon(form.icon);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-[2px] p-4">
      <div className="bg-surface rounded-[var(--radius-lg)] border border-border shadow-xl w-full max-w-[640px] max-h-[calc(100vh-2rem)] flex flex-col overflow-hidden animate-fadeInUp">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border shrink-0">
          <div>
            <h2 className="text-[16px] font-bold text-text-primary">Create Equipment Group</h2>
            <p className="text-[12px] text-text-tertiary mt-0.5">
              {step === 'info' ? 'Step 1: Group details' : 'Step 2: Select fields'}
            </p>
          </div>
          <button onClick={onClose} className="p-1.5 text-text-tertiary hover:text-text-primary hover:bg-surface-sunken rounded-[var(--radius-md)] transition-colors">
            <XIcon size={18} />
          </button>
        </div>

        {/* Step indicators */}
        <div className="flex items-center gap-0 px-6 pt-4 shrink-0">
          <button
            onClick={() => setStep('info')}
            className={`flex items-center gap-1.5 px-3 py-1.5 text-[12px] font-semibold rounded-full transition-colors ${
              step === 'info' ? 'bg-primary-100 text-primary-700' : 'text-text-tertiary hover:text-text-primary'
            }`}
          >
            <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[11px] font-bold ${
              step === 'info' ? 'bg-primary-600 text-white' : 'bg-surface-sunken text-text-tertiary'
            }`}>1</span>
            Details
          </button>
          <ChevronRight size={14} className="text-text-tertiary mx-1" />
          <button
            onClick={() => { if (form.name.trim()) setStep('fields'); }}
            className={`flex items-center gap-1.5 px-3 py-1.5 text-[12px] font-semibold rounded-full transition-colors ${
              step === 'fields' ? 'bg-primary-100 text-primary-700' : 'text-text-tertiary hover:text-text-primary'
            }`}
          >
            <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[11px] font-bold ${
              step === 'fields' ? 'bg-primary-600 text-white' : 'bg-surface-sunken text-text-tertiary'
            }`}>2</span>
            Fields ({selectedFieldKeys.size})
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

          {step === 'info' && (
            <>
              {/* Group Name */}
              <div>
                <label className={labelCls}>Group Name *</label>
                <input className={inputCls} value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} placeholder="e.g. Forklifts, Cranes, Fire Extinguishers..." />
              </div>

              {/* Description */}
              <div>
                <label className={labelCls}>Description</label>
                <input className={inputCls} value={form.description} onChange={e => setForm(p => ({ ...p, description: e.target.value }))} placeholder="Brief description of this equipment group..." />
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
                    <span className="truncate text-[12px]">{form.icon}</span>
                  </button>
                  {showIconPicker && (
                    <div className="mt-1 p-2 bg-surface border border-border rounded-[var(--radius-md)] shadow-lg max-h-[180px] overflow-y-auto grid grid-cols-8 gap-1 z-10 relative">
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
            </>
          )}

          {step === 'fields' && (
            <>
              {/* Search */}
              <div className="relative">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-tertiary" />
                <input
                  className={`${inputCls} pl-8`}
                  value={fieldSearch}
                  onChange={e => setFieldSearch(e.target.value)}
                  placeholder="Search fields..."
                />
              </div>

              {/* Selected count */}
              <div className="text-[12px] text-text-tertiary">
                {selectedFieldKeys.size} field{selectedFieldKeys.size !== 1 ? 's' : ''} selected
              </div>

              {/* Field categories */}
              <div className="space-y-2">
                {Object.entries(filteredFields).map(([cat, fields]) => (
                  <div key={cat} className="border border-border rounded-[var(--radius-md)] overflow-hidden">
                    {/* Category header */}
                    <button
                      onClick={() => toggleCategory(cat)}
                      className="w-full flex items-center justify-between px-3 py-2 bg-surface-sunken hover:bg-surface transition-colors"
                    >
                      <div className="flex items-center gap-2">
                        <ChevronDown
                          size={14}
                          className={`text-text-tertiary transition-transform ${expandedCategories.has(cat) ? '' : '-rotate-90'}`}
                        />
                        <span className="text-[12px] font-semibold text-text-secondary">{cat}</span>
                        <span className="text-[11px] text-text-tertiary">
                          ({fields.filter(f => selectedFieldKeys.has(f.key)).length}/{fields.length})
                        </span>
                      </div>
                      <button
                        onClick={e => { e.stopPropagation(); selectAllInCategory(cat); }}
                        className="text-[11px] font-medium text-primary-600 hover:text-primary-700 px-2"
                      >
                        {fields.every(f => selectedFieldKeys.has(f.key)) ? 'Deselect All' : 'Select All'}
                      </button>
                    </button>

                    {/* Field checkboxes */}
                    {expandedCategories.has(cat) && (
                      <div className="px-3 py-2 space-y-1.5">
                        {fields.map(field => (
                          <label
                            key={field.key}
                            className="flex items-center gap-2.5 py-1 px-1 rounded hover:bg-surface-sunken cursor-pointer transition-colors"
                          >
                            <input
                              type="checkbox"
                              checked={selectedFieldKeys.has(field.key)}
                              onChange={() => toggleField(field.key)}
                              className="rounded border-border text-primary-600 focus:ring-primary-500 w-3.5 h-3.5"
                            />
                            <div className="flex-1 min-w-0">
                              <span className="text-[13px] text-text-primary">{field.label}</span>
                              <span className="ml-2 text-[11px] text-text-tertiary capitalize">({field.type})</span>
                            </div>
                          </label>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-border shrink-0">
          <div>
            {step === 'fields' && (
              <button
                onClick={() => setStep('info')}
                className="px-4 py-2 text-[13px] font-medium text-text-secondary bg-surface border border-border rounded-[var(--radius-md)] hover:bg-surface-sunken transition-colors"
              >
                Back
              </button>
            )}
          </div>
          <div className="flex items-center gap-2">
            <button onClick={onClose} className="px-4 py-2 text-[13px] font-medium text-text-secondary bg-surface border border-border rounded-[var(--radius-md)] hover:bg-surface-sunken transition-colors">
              Cancel
            </button>
            {step === 'info' ? (
              <button
                onClick={() => {
                  if (!form.name.trim()) { setError('Group name is required'); return; }
                  setError('');
                  setStep('fields');
                }}
                className="inline-flex items-center gap-1.5 px-4 py-2 text-[13px] font-semibold text-white bg-primary-600 rounded-[var(--radius-md)] hover:bg-primary-700 transition-colors"
              >
                Next: Select Fields
                <ChevronRight size={15} />
              </button>
            ) : (
              <button
                onClick={handleSubmit}
                disabled={saving || selectedFieldKeys.size === 0}
                className="inline-flex items-center gap-1.5 px-4 py-2 text-[13px] font-semibold text-white bg-primary-600 rounded-[var(--radius-md)] hover:bg-primary-700 transition-colors disabled:opacity-50"
              >
                <Check size={15} />
                {saving ? 'Creating...' : 'Create Group'}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
