import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { X as XIcon, Save, Plus, Pencil } from 'lucide-react';
import type { AmendmentChange } from '../hooks/useAmendments';
import { CHANGE_CATEGORIES, CHANGE_FIELD_SUGGESTIONS } from '../hooks/useAmendments';

/* ── Types ─────────────────────────────────────────── */

interface ChangeRowFormData {
  change_category: string;
  field_name: string;
  old_value: string;
  new_value: string;
  change_reason: string;
}

interface ChangeRowFormProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: ChangeRowFormData) => void;
  change?: AmendmentChange | null;
}

/* ── Component ─────────────────────────────────────── */

const ChangeRowForm: React.FC<ChangeRowFormProps> = ({
  isOpen,
  onClose,
  onSave,
  change = null,
}) => {
  const isEdit = !!change;

  /* ── Form state ────────────────────────────────── */

  const [form, setForm] = useState<ChangeRowFormData>({
    change_category: '',
    field_name: '',
    old_value: '',
    new_value: '',
    change_reason: '',
  });

  const [errors, setErrors] = useState<Partial<Record<keyof ChangeRowFormData, string>>>({});
  const [submitting, setSubmitting] = useState(false);

  /* ── Populate form for edit ────────────────────── */

  useEffect(() => {
    if (isOpen) {
      if (change) {
        setForm({
          change_category: change.change_category || '',
          field_name: change.field_name || '',
          old_value: change.old_value ?? '',
          new_value: change.new_value ?? '',
          change_reason: change.change_reason ?? '',
        });
      } else {
        setForm({
          change_category: '',
          field_name: '',
          old_value: '',
          new_value: '',
          change_reason: '',
        });
      }
      setErrors({});
      setSubmitting(false);
    }
  }, [isOpen, change]);

  /* ── Field suggestions based on category ───────── */

  const fieldSuggestions = useMemo(() => {
    if (!form.change_category) return [];
    return CHANGE_FIELD_SUGGESTIONS[form.change_category] ?? [];
  }, [form.change_category]);

  const datalistId = useMemo(() => `field-suggestions-${Date.now()}`, []);

  /* ── Handlers ──────────────────────────────────── */

  const handleChange = useCallback(
    (field: keyof ChangeRowFormData, value: string) => {
      setForm(prev => ({ ...prev, [field]: value }));
      if (errors[field]) {
        setErrors(prev => {
          const next = { ...prev };
          delete next[field];
          return next;
        });
      }
    },
    [errors],
  );

  const validate = useCallback((): boolean => {
    const next: Partial<Record<keyof ChangeRowFormData, string>> = {};

    if (!form.change_category) {
      next.change_category = 'Category is required';
    }
    if (!form.field_name.trim()) {
      next.field_name = 'Field name is required';
    }
    if (!form.new_value.trim() && !form.old_value.trim()) {
      next.old_value = 'Provide at least old or new value';
      next.new_value = 'Provide at least old or new value';
    }

    setErrors(next);
    return Object.keys(next).length === 0;
  }, [form]);

  const handleSubmit = useCallback(() => {
    if (!validate()) return;
    setSubmitting(true);
    try {
      onSave({
        change_category: form.change_category,
        field_name: form.field_name.trim(),
        old_value: form.old_value.trim(),
        new_value: form.new_value.trim(),
        change_reason: form.change_reason.trim(),
      });
    } finally {
      setSubmitting(false);
    }
  }, [form, validate, onSave]);

  /* ── Keyboard handling ─────────────────────────── */

  useEffect(() => {
    if (!isOpen) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [isOpen, onClose]);

  /* ── Early return ──────────────────────────────── */

  if (!isOpen) return null;

  /* ── Preview state ─────────────────────────────── */

  const hasPreview = form.old_value.trim() || form.new_value.trim();

  /* ── Render ────────────────────────────────────── */

  return (
    <div className="change-row-modal-overlay" onClick={onClose}>
      <div
        className="change-row-modal"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label={isEdit ? 'Edit Change' : 'Add Change'}
      >
        {/* Header */}
        <div className="change-row-modal__header">
          <div className="change-row-modal__header-title" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            {isEdit ? <Pencil size={16} /> : <Plus size={16} />}
            {isEdit ? 'Edit Change' : 'Add Change'}
          </div>
          <button
            onClick={onClose}
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              padding: 4,
              color: 'var(--color-text-tertiary)',
              display: 'flex',
              alignItems: 'center',
            }}
            title="Close"
          >
            <XIcon size={18} />
          </button>
        </div>

        {/* Body */}
        <div className="change-row-modal__body">
          {/* Change Category */}
          <div className="change-row-modal__field">
            <label className="change-row-modal__label">
              Change Category <span style={{ color: 'var(--color-danger-500)' }}>*</span>
            </label>
            <select
              className="change-row-modal__select"
              value={form.change_category}
              onChange={(e) => {
                handleChange('change_category', e.target.value);
                // Reset field_name when category changes so suggestions refresh
                if (e.target.value !== form.change_category) {
                  handleChange('field_name', '');
                }
              }}
            >
              <option value="">Select category...</option>
              {CHANGE_CATEGORIES.map((cat) => (
                <option key={cat} value={cat}>
                  {cat}
                </option>
              ))}
            </select>
            {errors.change_category && (
              <div style={{ fontSize: 11, color: 'var(--color-danger-600)', marginTop: 3 }}>
                {errors.change_category}
              </div>
            )}
          </div>

          {/* Field Name */}
          <div className="change-row-modal__field">
            <label className="change-row-modal__label">
              Field Name <span style={{ color: 'var(--color-danger-500)' }}>*</span>
            </label>
            <input
              type="text"
              className="change-row-modal__input"
              value={form.field_name}
              onChange={(e) => handleChange('field_name', e.target.value)}
              placeholder="e.g. Start Date, Permit Holder..."
              list={datalistId}
              autoComplete="off"
            />
            {fieldSuggestions.length > 0 && (
              <datalist id={datalistId}>
                {fieldSuggestions.map((s) => (
                  <option key={s} value={s} />
                ))}
              </datalist>
            )}
            {errors.field_name && (
              <div style={{ fontSize: 11, color: 'var(--color-danger-600)', marginTop: 3 }}>
                {errors.field_name}
              </div>
            )}
          </div>

          {/* Old Value */}
          <div className="change-row-modal__field">
            <label className="change-row-modal__label">Old Value</label>
            <textarea
              className="change-row-modal__textarea"
              value={form.old_value}
              onChange={(e) => handleChange('old_value', e.target.value)}
              placeholder="Current / previous value..."
              rows={2}
            />
            {errors.old_value && (
              <div style={{ fontSize: 11, color: 'var(--color-danger-600)', marginTop: 3 }}>
                {errors.old_value}
              </div>
            )}
          </div>

          {/* New Value */}
          <div className="change-row-modal__field">
            <label className="change-row-modal__label">New Value</label>
            <textarea
              className="change-row-modal__textarea"
              value={form.new_value}
              onChange={(e) => handleChange('new_value', e.target.value)}
              placeholder="Proposed new value..."
              rows={2}
            />
            {errors.new_value && (
              <div style={{ fontSize: 11, color: 'var(--color-danger-600)', marginTop: 3 }}>
                {errors.new_value}
              </div>
            )}
          </div>

          {/* Change Reason */}
          <div className="change-row-modal__field">
            <label className="change-row-modal__label">Change Reason</label>
            <textarea
              className="change-row-modal__textarea"
              value={form.change_reason}
              onChange={(e) => handleChange('change_reason', e.target.value)}
              placeholder="Why is this change needed?"
              rows={2}
            />
          </div>

          {/* Preview */}
          {hasPreview && (
            <div className="change-row-modal__preview">
              <div className="change-row-modal__preview-old">
                {form.old_value.trim() || <span style={{ fontStyle: 'italic', opacity: 0.5 }}>(empty)</span>}
              </div>
              <div className="change-row-modal__preview-arrow">{'\u2192'}</div>
              <div className="change-row-modal__preview-new">
                {form.new_value.trim() || <span style={{ fontStyle: 'italic', opacity: 0.5 }}>(empty)</span>}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="change-row-modal__footer">
          <button
            className="btn-secondary px-4 py-2 text-sm rounded-lg"
            onClick={onClose}
            type="button"
          >
            Cancel
          </button>
          <button
            className="btn-primary px-4 py-2 text-sm rounded-lg flex items-center gap-2"
            onClick={handleSubmit}
            disabled={submitting}
            type="button"
          >
            <Save size={14} />
            Save Change
          </button>
        </div>
      </div>
    </div>
  );
};

export default ChangeRowForm;
