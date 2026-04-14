import { useState, useMemo } from 'react';
import { X as XIcon, Check, Search, ChevronDown, Info } from 'lucide-react';
import { getIcon, AVAILABLE_ICONS, COLOR_PRESETS } from '../../../config/iconRegistry';
import type { EquipmentGroupField, MasterFieldDef } from '../hooks/useEquipmentGroups';

interface Props {
  groupName: string;
  groupColor?: string;
  groupFields: EquipmentGroupField[];
  masterFields: MasterFieldDef[];
  onSave: (data: {
    name: string;
    description?: string;
    icon?: string;
    color?: string;
    light_color?: string;
    text_color?: string;
    code_prefix?: string;
    addedFields?: Array<{
      field_key: string;
      field_label: string;
      field_type: string;
      field_options?: string[] | null;
      is_required?: boolean;
    }>;
  }) => Promise<unknown>;
  onClose: () => void;
}

const inputCls = 'w-full px-3 py-2 text-[13px] bg-surface border border-border rounded-[var(--radius-md)] focus:outline-none focus:ring-2 focus:ring-primary-500/30 focus:border-primary-500 transition-colors';
const labelCls = 'block text-[12px] font-semibold text-text-secondary mb-1';

export function AddCategoryModal({ groupName, groupColor, groupFields, masterFields, onSave, onClose }: Props) {
  const [form, setForm] = useState({
    name: '',
    description: '',
    icon: 'Package',
    color: groupColor || '#6B7280',
    light_color: '#F3F4F6',
    text_color: '#374151',
    code_prefix: '',
  });
  const [showIconPicker, setShowIconPicker] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  // Field selection state — start with group's existing fields pre-selected
  const existingFieldKeys = useMemo(() => new Set(groupFields.map(f => f.field_key)), [groupFields]);
  const [selectedFieldKeys, setSelectedFieldKeys] = useState<Set<string>>(() => new Set(existingFieldKeys));
  const [fieldSearch, setFieldSearch] = useState('');
  const [showFieldSection, setShowFieldSection] = useState(false);
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set());

  // Group master fields by category
  const fieldsByCategory = useMemo(() => {
    const map: Record<string, MasterFieldDef[]> = {};
    masterFields.forEach(f => {
      if (!map[f.category]) map[f.category] = [];
      map[f.category].push(f);
    });
    return map;
  }, [masterFields]);

  // Filter by search
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
    // Don't allow unchecking existing group fields from here
    if (existingFieldKeys.has(key)) return;
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

  // Compute newly added fields (not in current group)
  const newFieldKeys = [...selectedFieldKeys].filter(k => !existingFieldKeys.has(k));
  const addedCount = newFieldKeys.length;

  const handleColorPreset = (preset: typeof COLOR_PRESETS[0]) => {
    setForm(p => ({ ...p, color: preset.color, light_color: preset.light, text_color: preset.text }));
  };

  const handleSubmit = async () => {
    if (!form.name.trim()) {
      setError('Category name is required');
      return;
    }

    setSaving(true);
    setError('');
    try {
      // Build the list of newly added fields to pass to parent
      const addedFields = addedCount > 0
        ? newFieldKeys.map(key => {
            const master = masterFields.find(f => f.key === key);
            return {
              field_key: key,
              field_label: master?.label || key,
              field_type: master?.type || 'text',
              field_options: master?.options || null,
              is_required: key === 'equipment_name' || key === 'serial_number',
            };
          })
        : undefined;

      await onSave({
        name: form.name.trim(),
        description: form.description.trim() || undefined,
        icon: form.icon,
        color: form.color,
        light_color: form.light_color,
        text_color: form.text_color,
        code_prefix: form.code_prefix.trim() || undefined,
        addedFields,
      });
      onClose();
    } catch (err: any) {
      setError(err?.response?.data?.message || err?.message || 'Failed to add category');
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
          <div>
            <h2 className="text-[16px] font-bold text-text-primary">Add Category</h2>
            <p className="text-[12px] text-text-tertiary mt-0.5">
              Adding category to: <span className="font-semibold text-text-secondary">{groupName}</span>
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-text-tertiary hover:text-text-primary hover:bg-surface-sunken rounded-[var(--radius-md)] transition-colors"
          >
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

          {/* Category Name */}
          <div>
            <label className={labelCls}>Category Name *</label>
            <input
              className={inputCls}
              value={form.name}
              onChange={e => { setForm(p => ({ ...p, name: e.target.value })); setError(''); }}
              placeholder="e.g. Forklifts, Cranes, Fire Extinguishers..."
              autoFocus
            />
          </div>

          {/* Description */}
          <div>
            <label className={labelCls}>Description</label>
            <input
              className={inputCls}
              value={form.description}
              onChange={e => setForm(p => ({ ...p, description: e.target.value }))}
              placeholder="Brief description of this equipment category..."
            />
          </div>

          {/* Code Prefix */}
          <div>
            <label className={labelCls}>Code Prefix</label>
            <input
              className={inputCls}
              value={form.code_prefix}
              onChange={e => setForm(p => ({ ...p, code_prefix: e.target.value.toUpperCase().replace(/[^A-Z0-9-]/g, '') }))}
              placeholder="e.g. FL, CR, FE (auto-generates equipment codes like FL-000001)"
              maxLength={10}
            />
            <p className="text-[11px] text-text-tertiary mt-1">Optional. Equipment items will get codes like {form.code_prefix || 'EQ'}-000001</p>
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
                <span
                  className="w-6 h-6 rounded flex items-center justify-center"
                  style={{ backgroundColor: form.light_color }}
                >
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

          {/* ── Group Fields Section ─────────────────────── */}
          <div className="border border-border rounded-[var(--radius-md)] overflow-hidden">
            <button
              type="button"
              onClick={() => setShowFieldSection(!showFieldSection)}
              className="w-full flex items-center justify-between px-4 py-3 bg-surface-sunken hover:bg-surface transition-colors"
            >
              <div className="flex items-center gap-2">
                <ChevronDown size={14} className={`text-text-tertiary transition-transform ${showFieldSection ? '' : '-rotate-90'}`} />
                <span className="text-[13px] font-semibold text-text-primary">Group Fields</span>
                <span className="text-[11px] font-medium text-text-tertiary bg-surface border border-border px-2 py-[1px] rounded-full">
                  {selectedFieldKeys.size} selected
                </span>
                {addedCount > 0 && (
                  <span className="text-[11px] font-semibold text-green-700 bg-green-50 border border-green-200 px-2 py-[1px] rounded-full">
                    +{addedCount} new
                  </span>
                )}
              </div>
            </button>

            {showFieldSection && (
              <div className="px-4 py-3 space-y-3 border-t border-border">
                {/* Info banner */}
                <div className="flex items-start gap-2 p-2.5 bg-blue-50 border border-blue-200 rounded-[var(--radius-md)]">
                  <Info size={14} className="text-blue-500 shrink-0 mt-0.5" />
                  <p className="text-[11px] text-blue-700 leading-relaxed">
                    These fields apply to the entire <span className="font-semibold">{groupName}</span> group.
                    Any new fields selected here will be added for all categories in this group.
                  </p>
                </div>

                {/* Currently assigned fields summary */}
                {existingFieldKeys.size > 0 && (
                  <div>
                    <p className="text-[11px] font-semibold text-text-tertiary mb-1.5">
                      Currently assigned ({existingFieldKeys.size})
                    </p>
                    <div className="flex flex-wrap gap-1.5">
                      {groupFields.map(f => (
                        <span
                          key={f.field_key}
                          className="inline-flex items-center px-2 py-[2px] text-[11px] font-medium bg-green-50 text-green-700 border border-green-200 rounded-full"
                        >
                          {f.field_label}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {existingFieldKeys.size === 0 && (
                  <p className="text-[12px] text-text-tertiary italic">No fields assigned to this group yet. Select fields below to add them.</p>
                )}

                {/* Search */}
                <div className="relative">
                  <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-tertiary" />
                  <input
                    className={`${inputCls} pl-8`}
                    value={fieldSearch}
                    onChange={e => setFieldSearch(e.target.value)}
                    placeholder="Search available fields..."
                  />
                </div>

                {/* Field categories */}
                <div className="space-y-1.5 max-h-[260px] overflow-y-auto">
                  {Object.entries(filteredFields).map(([cat, fields]) => {
                    const isExpanded = expandedCategories.has(cat);
                    const selectedInCat = fields.filter(f => selectedFieldKeys.has(f.key)).length;

                    return (
                      <div key={cat} className="border border-border rounded-[var(--radius-sm)] overflow-hidden">
                        <button
                          type="button"
                          onClick={() => toggleCategory(cat)}
                          className="w-full flex items-center justify-between px-3 py-1.5 bg-surface-sunken/60 hover:bg-surface-sunken transition-colors"
                        >
                          <div className="flex items-center gap-2">
                            <ChevronDown size={12} className={`text-text-tertiary transition-transform ${isExpanded ? '' : '-rotate-90'}`} />
                            <span className="text-[11px] font-semibold text-text-secondary">{cat}</span>
                            <span className="text-[10px] text-text-tertiary">
                              ({selectedInCat}/{fields.length})
                            </span>
                          </div>
                        </button>
                        {isExpanded && (
                          <div className="px-3 py-1.5 space-y-1">
                            {fields.map(field => {
                              const isExisting = existingFieldKeys.has(field.key);
                              const isSelected = selectedFieldKeys.has(field.key);
                              return (
                                <label
                                  key={field.key}
                                  className={`flex items-center gap-2 py-1 px-1 rounded cursor-pointer transition-colors ${
                                    isExisting ? 'opacity-70 cursor-default' : isSelected ? 'hover:bg-primary-50/50' : 'hover:bg-surface-sunken'
                                  }`}
                                >
                                  <input
                                    type="checkbox"
                                    checked={isSelected}
                                    onChange={() => toggleField(field.key)}
                                    disabled={isExisting}
                                    className="rounded border-border text-primary-600 focus:ring-primary-500 w-3.5 h-3.5 disabled:opacity-50"
                                  />
                                  <div className="flex-1 min-w-0 flex items-center gap-2">
                                    <span className="text-[12px] text-text-primary">{field.label}</span>
                                    <span className="text-[10px] text-text-tertiary capitalize">({field.type})</span>
                                    {isExisting && (
                                      <span className="text-[9px] font-medium text-green-600 bg-green-50 px-1.5 py-[1px] rounded-full">
                                        current
                                      </span>
                                    )}
                                  </div>
                                </label>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-2 px-6 py-4 border-t border-border shrink-0">
          <button
            onClick={onClose}
            className="px-4 py-2 text-[13px] font-medium text-text-secondary bg-surface border border-border rounded-[var(--radius-md)] hover:bg-surface-sunken transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={saving || !form.name.trim()}
            className="inline-flex items-center gap-1.5 px-4 py-2 text-[13px] font-semibold text-white bg-primary-600 rounded-[var(--radius-md)] hover:bg-primary-700 transition-colors disabled:opacity-50"
          >
            <Check size={15} />
            {saving ? 'Adding...' : addedCount > 0 ? `Add Category & ${addedCount} Field${addedCount > 1 ? 's' : ''}` : 'Add Category'}
          </button>
        </div>
      </div>
    </div>
  );
}
