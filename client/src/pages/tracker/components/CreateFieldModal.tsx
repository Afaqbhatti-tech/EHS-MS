import { useState, useMemo, useEffect } from 'react';
import { X as XIcon, Check, Search, ChevronDown } from 'lucide-react';
import type { EquipmentGroupField, MasterFieldDef } from '../hooks/useEquipmentGroups';

interface GroupLike {
  id: number;
  name: string;
  fields: EquipmentGroupField[];
  fields_count?: number;
}

interface Props {
  groups: GroupLike[];
  masterFields: MasterFieldDef[];
  preselectedGroupId?: number;
  onSave: (groupId: number, fields: Array<{
    field_key: string;
    field_label: string;
    field_type: string;
    field_options?: string[] | null;
    is_required?: boolean;
  }>) => Promise<unknown>;
  onClose: () => void;
}

const inputCls = 'w-full px-3 py-2 text-[13px] bg-surface border border-border rounded-[var(--radius-md)] focus:outline-none focus:ring-2 focus:ring-primary-500/30 focus:border-primary-500 transition-colors';
const labelCls = 'block text-[12px] font-semibold text-text-secondary mb-1';

export function CreateFieldModal({ groups, masterFields, preselectedGroupId, onSave, onClose }: Props) {
  const [selectedGroupId, setSelectedGroupId] = useState<number>(preselectedGroupId || 0);
  const [selectedFieldKeys, setSelectedFieldKeys] = useState<Set<string>>(new Set());
  const [fieldSearch, setFieldSearch] = useState('');
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set(['Core Fields']));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  // Get currently selected group
  const selectedGroup = groups.find(g => g.id === selectedGroupId);

  // When group changes, initialize selectedFieldKeys with the group's existing fields
  useEffect(() => {
    if (selectedGroup) {
      const existingKeys = new Set(selectedGroup.fields.map(f => f.field_key));
      setSelectedFieldKeys(existingKeys);
    } else {
      setSelectedFieldKeys(new Set());
    }
  }, [selectedGroupId]); // eslint-disable-line react-hooks/exhaustive-deps

  // Group ALL master fields by category (show everything, not just unselected)
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

  // Compute what changed compared to current group fields
  const existingFieldKeys = new Set(selectedGroup?.fields.map(f => f.field_key) || []);
  const addedCount = [...selectedFieldKeys].filter(k => !existingFieldKeys.has(k)).length;
  const removedCount = [...existingFieldKeys].filter(k => !selectedFieldKeys.has(k)).length;
  const hasChanges = addedCount > 0 || removedCount > 0;

  const handleSubmit = async () => {
    if (!selectedGroupId) { setError('Please select a group'); return; }
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

      await onSave(selectedGroupId, fields);
      onClose();
    } catch (err: any) {
      setError(err?.response?.data?.message || err?.message || 'Failed to update fields');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-[2px] p-4">
      <div className="bg-surface rounded-[var(--radius-lg)] border border-border shadow-xl w-full max-w-[560px] max-h-[calc(100vh-2rem)] flex flex-col overflow-hidden animate-fadeInUp">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border shrink-0">
          <div>
            <h2 className="text-[16px] font-bold text-text-primary">Manage Group Fields</h2>
            <p className="text-[12px] text-text-tertiary mt-0.5">Select a group and update its field configuration</p>
          </div>
          <button onClick={onClose} className="p-1.5 text-text-tertiary hover:text-text-primary hover:bg-surface-sunken rounded-[var(--radius-md)] transition-colors">
            <XIcon size={18} />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain">
        <div className="px-6 py-5 space-y-4">
          {error && (
            <div className="p-3 text-[12px] text-red-700 bg-red-50 border border-red-200 rounded-[var(--radius-md)]">
              {error}
            </div>
          )}

          {/* Group selector */}
          <div>
            <label className={labelCls}>Select Group *</label>
            {groups.length === 0 ? (
              <div className="p-3 text-[13px] text-amber-700 bg-amber-50 border border-amber-200 rounded-[var(--radius-md)]">
                No groups available. Please create a group first.
              </div>
            ) : (
              <select
                className={inputCls}
                value={selectedGroupId || ''}
                onChange={e => { setSelectedGroupId(Number(e.target.value)); setFieldSearch(''); }}
              >
                <option value="">Choose a group...</option>
                {groups.map(g => (
                  <option key={g.id} value={g.id}>{g.name} ({g.fields_count ?? g.fields.length} fields)</option>
                ))}
              </select>
            )}
          </div>

          {selectedGroupId > 0 && selectedGroup && (
            <>
              {/* Change summary */}
              {hasChanges && (
                <div className="p-3 bg-blue-50 border border-blue-200 rounded-[var(--radius-md)] text-[12px] text-blue-700">
                  {addedCount > 0 && <span className="font-medium text-green-700">+{addedCount} new</span>}
                  {addedCount > 0 && removedCount > 0 && <span className="mx-1">·</span>}
                  {removedCount > 0 && <span className="font-medium text-red-600">-{removedCount} removed</span>}
                  <span className="ml-1">from current configuration</span>
                </div>
              )}

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

              <div className="text-[12px] text-text-tertiary">
                {selectedFieldKeys.size} field{selectedFieldKeys.size !== 1 ? 's' : ''} selected
              </div>

              {/* Field categories - show ALL fields, pre-check existing */}
              <div className="space-y-2">
                {Object.entries(filteredFields).map(([cat, fields]) => (
                  <div key={cat} className="border border-border rounded-[var(--radius-md)] overflow-hidden">
                    <button
                      onClick={() => toggleCategory(cat)}
                      className="w-full flex items-center justify-between px-3 py-2 bg-surface-sunken hover:bg-surface transition-colors"
                    >
                      <div className="flex items-center gap-2">
                        <ChevronDown size={14} className={`text-text-tertiary transition-transform ${expandedCategories.has(cat) ? '' : '-rotate-90'}`} />
                        <span className="text-[12px] font-semibold text-text-secondary">{cat}</span>
                        <span className="text-[11px] text-text-tertiary">
                          ({fields.filter(f => selectedFieldKeys.has(f.key)).length}/{fields.length})
                        </span>
                      </div>
                      <span
                        role="button"
                        tabIndex={0}
                        onClick={e => { e.stopPropagation(); selectAllInCategory(cat); }}
                        onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.stopPropagation(); e.preventDefault(); selectAllInCategory(cat); } }}
                        className="text-[11px] font-medium text-primary-600 hover:text-primary-700 px-2 cursor-pointer"
                      >
                        {fields.every(f => selectedFieldKeys.has(f.key)) ? 'Deselect All' : 'Select All'}
                      </span>
                    </button>
                    {expandedCategories.has(cat) && (
                      <div className="px-3 py-2 space-y-1.5">
                        {fields.map(field => {
                          const isExisting = existingFieldKeys.has(field.key);
                          const isSelected = selectedFieldKeys.has(field.key);
                          return (
                            <label
                              key={field.key}
                              className={`flex items-center gap-2.5 py-1 px-1 rounded cursor-pointer transition-colors ${
                                isSelected ? 'hover:bg-primary-50/50' : 'hover:bg-surface-sunken'
                              }`}
                            >
                              <input
                                type="checkbox"
                                checked={isSelected}
                                onChange={() => toggleField(field.key)}
                                className="rounded border-border text-primary-600 focus:ring-primary-500 w-3.5 h-3.5"
                              />
                              <div className="flex-1 min-w-0 flex items-center gap-2">
                                <span className="text-[13px] text-text-primary">{field.label}</span>
                                <span className="text-[11px] text-text-tertiary capitalize">({field.type})</span>
                                {isExisting && isSelected && (
                                  <span className="text-[10px] font-medium text-green-600 bg-green-50 px-1.5 py-0.5 rounded-full">
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
                ))}
              </div>
            </>
          )}
        </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-2 px-6 py-4 border-t border-border shrink-0">
          <button onClick={onClose} className="px-4 py-2 text-[13px] font-medium text-text-secondary bg-surface border border-border rounded-[var(--radius-md)] hover:bg-surface-sunken transition-colors">
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={saving || selectedFieldKeys.size === 0 || !selectedGroupId || !hasChanges}
            className="inline-flex items-center gap-1.5 px-4 py-2 text-[13px] font-semibold text-white bg-primary-600 rounded-[var(--radius-md)] hover:bg-primary-700 transition-colors disabled:opacity-50"
          >
            <Check size={15} />
            {saving ? 'Saving...' : 'Update Fields'}
          </button>
        </div>
      </div>
    </div>
  );
}
