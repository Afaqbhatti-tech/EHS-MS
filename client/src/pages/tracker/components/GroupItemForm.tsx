import { useState, useEffect, useRef, useMemo } from 'react';
import { X as XIcon, Check, Upload, Image as ImageIcon } from 'lucide-react';
import type { EquipmentGroupField, EquipmentItem } from '../hooks/useEquipmentGroups';
import { api } from '../../../services/api';

const STORAGE_BASE = (import.meta.env.VITE_API_URL || 'http://localhost:8000/api').replace('/api', '') + '/storage/';

interface Props {
  groupId: number;
  groupName: string;
  groupColor: string;
  fields: EquipmentGroupField[];
  editingItem?: EquipmentItem | null;
  onSubmit: (data: { values: Record<string, string>; status?: string; item_name?: string }) => Promise<any>;
  onClose: () => void;
}

const inputCls = 'w-full px-3 py-2 text-[13px] bg-surface border border-border rounded-[var(--radius-md)] focus:outline-none focus:ring-2 focus:ring-primary-500/30 focus:border-primary-500 transition-colors';
const labelCls = 'block text-[12px] font-semibold text-text-secondary mb-1';

export function GroupItemForm({ groupId, groupName, groupColor, fields, editingItem, onSubmit, onClose }: Props) {
  const isEdit = !!editingItem;

  const [itemName, setItemName] = useState('');
  const [values, setValues] = useState<Record<string, string>>({});
  const [pendingFiles, setPendingFiles] = useState<Record<string, File>>({});
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const fileInputRefs = useRef<Record<string, HTMLInputElement | null>>({});

  useEffect(() => {
    if (editingItem) {
      setItemName(editingItem.item_name || '');
      setValues(editingItem.values || {});
    }
  }, [editingItem]);

  const handleChange = (key: string, value: string) => {
    setValues(prev => ({ ...prev, [key]: value }));
  };

  const handleSubmit = async () => {
    // Validate item name
    if (!itemName.trim()) {
      setError('Item Name is required');
      return;
    }

    // Validate required fields
    for (const field of fields) {
      if (field.is_required && !values[field.field_key]?.trim()) {
        setError(`${field.field_label} is required`);
        return;
      }
    }

    setSaving(true);
    setError('');
    try {
      const result = await onSubmit({ values, item_name: itemName.trim() });

      // Upload any pending files after item is saved
      const fileKeys = Object.keys(pendingFiles);
      if (fileKeys.length > 0) {
        const itemId = editingItem?.id || result?.item?.id || result?.id || result?.data?.id;
        if (itemId) {
          for (const fieldKey of fileKeys) {
            const formData = new FormData();
            formData.append('file', pendingFiles[fieldKey]);
            formData.append('field_key', fieldKey);
            await api.uploadForm(`/tracker/equipment-groups/${groupId}/items/${itemId}/upload`, formData);
          }
        }
      }

      onClose();
    } catch (err: any) {
      setError(err?.response?.data?.message || err?.message || 'Failed to save item');
    } finally {
      setSaving(false);
    }
  };

  const renderField = (field: EquipmentGroupField) => {
    const value = values[field.field_key] || '';
    const key = field.field_key;

    switch (field.field_type) {
      case 'select': {
        const options: string[] = field.field_options || [];
        return (
          <select className={inputCls} value={value} onChange={e => handleChange(key, e.target.value)}>
            <option value="">Select...</option>
            {options.map(opt => (
              <option key={opt} value={opt}>{opt}</option>
            ))}
          </select>
        );
      }

      case 'textarea':
        return (
          <textarea
            className={`${inputCls} min-h-[80px] resize-y`}
            value={value}
            onChange={e => handleChange(key, e.target.value)}
            placeholder={field.field_label}
            rows={3}
          />
        );

      case 'date':
        return (
          <input
            type="date"
            className={inputCls}
            value={value}
            onChange={e => handleChange(key, e.target.value)}
          />
        );

      case 'number':
        return (
          <input
            type="number"
            className={inputCls}
            value={value}
            onChange={e => handleChange(key, e.target.value)}
            placeholder={field.field_label}
          />
        );

      case 'file': {
        const pendingFile = pendingFiles[key];
        const hasExisting = !pendingFile && value && /\.(png|jpe?g|gif|webp|svg|bmp)$/i.test(value);
        const hasPreview = !!pendingFile || hasExisting;
        return (
          <div className="space-y-2">
            {/* Image preview */}
            {hasPreview && (
              <div className="relative group">
                <img
                  src={pendingFile ? URL.createObjectURL(pendingFile) : `${STORAGE_BASE}${value}`}
                  alt={field.field_label}
                  className="w-full max-h-[180px] object-contain rounded-[var(--radius-md)] border border-border bg-surface-sunken"
                />
                <button
                  type="button"
                  onClick={() => {
                    setPendingFiles(prev => { const next = { ...prev }; delete next[key]; return next; });
                    handleChange(key, '');
                  }}
                  className="absolute top-2 right-2 p-1 bg-red-500 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                  title="Remove image"
                >
                  <XIcon size={12} />
                </button>
              </div>
            )}
            {/* Upload button */}
            <input
              type="file"
              accept="image/*"
              className="hidden"
              ref={el => { fileInputRefs.current[key] = el; }}
              onChange={e => {
                const file = e.target.files?.[0];
                if (file) {
                  setPendingFiles(prev => ({ ...prev, [key]: file }));
                  handleChange(key, file.name);
                }
                e.target.value = '';
              }}
            />
            <button
              type="button"
              onClick={() => fileInputRefs.current[key]?.click()}
              className="inline-flex items-center gap-2 px-3 py-2 text-[12px] font-medium text-text-secondary bg-surface border border-border rounded-[var(--radius-md)] hover:bg-surface-sunken transition-colors"
            >
              {hasPreview ? <><Upload size={14} /> Change Image</> : <><ImageIcon size={14} /> Upload Image</>}
            </button>
          </div>
        );
      }

      default:
        return (
          <input
            type="text"
            className={inputCls}
            value={value}
            onChange={e => handleChange(key, e.target.value)}
            placeholder={field.field_label}
          />
        );
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-[2px] p-4">
      <div className="bg-surface rounded-[var(--radius-lg)] border border-border shadow-xl w-full max-w-[560px] max-h-[calc(100vh-2rem)] flex flex-col overflow-hidden animate-fadeInUp">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-1 h-8 rounded-full" style={{ backgroundColor: groupColor }} />
            <div>
              <h2 className="text-[16px] font-bold text-text-primary">
                {isEdit ? 'Edit Item' : 'Add Item'}
              </h2>
              <p className="text-[12px] text-text-tertiary mt-0.5">
                {groupName}
                {editingItem && <span className="ml-1 text-text-tertiary">({editingItem.item_code})</span>}
              </p>
            </div>
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

          {/* Item Name (always shown, required) */}
          <div>
            <label className={labelCls}>
              Item Name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              className={inputCls}
              value={itemName}
              onChange={e => setItemName(e.target.value)}
              placeholder="Enter item name..."
              autoFocus
            />
          </div>

          {/* Dynamic fields */}
          {fields.length > 0 && (
            <div className="pt-2 border-t border-border space-y-4">
              <p className="text-[11px] font-semibold text-text-tertiary uppercase tracking-wider">Group Fields</p>
              {fields.map(field => (
                <div key={field.field_key}>
                  <label className={labelCls}>
                    {field.field_label}
                    {field.is_required && <span className="text-red-500 ml-0.5">*</span>}
                  </label>
                  {renderField(field)}
                </div>
              ))}
            </div>
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
            disabled={saving}
            className="inline-flex items-center gap-1.5 px-4 py-2 text-[13px] font-semibold text-white bg-primary-600 rounded-[var(--radius-md)] hover:bg-primary-700 transition-colors disabled:opacity-50"
          >
            <Check size={15} />
            {saving ? 'Saving...' : isEdit ? 'Save Changes' : 'Add Item'}
          </button>
        </div>
      </div>
    </div>
  );
}
