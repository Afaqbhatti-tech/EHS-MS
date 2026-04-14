import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { X as XIcon, Save, Plus, AlertTriangle, Loader2, Pencil, Trash2 } from 'lucide-react';
import { format } from 'date-fns';
import type { Amendment, AmendmentChange } from '../hooks/useAmendments';
import {
  AMENDMENT_TYPES,
  CHANGE_CATEGORIES,
  PRIORITIES,
  CHANGE_FIELD_SUGGESTIONS,
} from '../hooks/useAmendments';

/* ── Types ─────────────────────────────────────────── */

interface AmendmentFormProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: Record<string, unknown>) => Promise<void>;
  amendment?: Amendment | null;
  permitId?: string;
  permitLabel?: string;
}

interface FormState {
  permit_id: string;
  amendment_title: string;
  amendment_type: string;
  amendment_category: string;
  reason: string;
  priority: string;
  requested_by: string;
  request_date: string;
  effective_from: string;
  effective_to: string;
  notes: string;
}

interface LocalChange {
  _localId: string;
  id?: string;
  change_category: string;
  field_name: string;
  old_value: string;
  new_value: string;
  change_reason: string;
}

/* ── Helpers ───────────────────────────────────────── */

let localIdCounter = 0;
function nextLocalId(): string {
  localIdCounter += 1;
  return `_local_${localIdCounter}_${Date.now()}`;
}

const emptyForm = (permitId?: string): FormState => ({
  permit_id: permitId || '',
  amendment_title: '',
  amendment_type: '',
  amendment_category: 'Minor',
  reason: '',
  priority: 'Medium',
  requested_by: '',
  request_date: format(new Date(), 'yyyy-MM-dd'),
  effective_from: '',
  effective_to: '',
  notes: '',
});

/* ── Component ─────────────────────────────────────── */

const AmendmentForm: React.FC<AmendmentFormProps> = ({
  isOpen,
  onClose,
  onSubmit,
  amendment = null,
  permitId,
  permitLabel,
}) => {
  const isEdit = !!amendment;

  /* ── State ─────────────────────────────────────── */

  const [form, setForm] = useState<FormState>(() => emptyForm(permitId));
  const [errors, setErrors] = useState<Partial<Record<keyof FormState | 'changes', string>>>({});
  const [submitting, setSubmitting] = useState(false);

  // Local change rows
  const [changes, setChanges] = useState<LocalChange[]>([]);
  const [showChangeForm, setShowChangeForm] = useState(false);
  const [customAmendmentType, setCustomAmendmentType] = useState('');
  const [editingChange, setEditingChange] = useState<LocalChange | null>(null);

  // Inline change form state
  const [changeForm, setChangeForm] = useState({
    change_category: '',
    field_name: '',
    old_value: '',
    new_value: '',
    change_reason: '',
  });
  const [changeErrors, setChangeErrors] = useState<Record<string, string>>({});

  /* ── Populate form on open ─────────────────────── */

  useEffect(() => {
    if (!isOpen) return;

    if (amendment) {
      const rawType = amendment.amendment_type || '';
      const isCustomOther = rawType.startsWith('Other - ');
      setForm({
        permit_id: amendment.permit_id || '',
        amendment_title: amendment.amendment_title || '',
        amendment_type: isCustomOther ? 'Other' : rawType,
        amendment_category: amendment.amendment_category || 'Minor',
        reason: amendment.reason || amendment.amendment_reason || '',
        priority: amendment.priority || 'Medium',
        requested_by: amendment.requested_by || '',
        request_date: amendment.request_date
          ? amendment.request_date.slice(0, 10)
          : format(new Date(), 'yyyy-MM-dd'),
        effective_from: amendment.effective_from ? amendment.effective_from.slice(0, 10) : '',
        effective_to: amendment.effective_to ? amendment.effective_to.slice(0, 10) : '',
        notes: amendment.notes || '',
      });
      setCustomAmendmentType(isCustomOther ? rawType.replace('Other - ', '') : '');

      // Load existing change rows
      const existingChanges: LocalChange[] = (amendment.changes || []).map((c) => ({
        _localId: nextLocalId(),
        id: c.id,
        change_category: c.change_category || '',
        field_name: c.field_name || '',
        old_value: c.old_value ?? '',
        new_value: c.new_value ?? '',
        change_reason: c.change_reason ?? '',
      }));
      setChanges(existingChanges);
    } else {
      setForm(emptyForm(permitId));
      setChanges([]);
      setCustomAmendmentType('');
    }

    setErrors({});
    setSubmitting(false);
    setShowChangeForm(false);
    setEditingChange(null);
    resetChangeForm();
  }, [isOpen, amendment, permitId]);

  /* ── Change form helpers ───────────────────────── */

  const resetChangeForm = useCallback(() => {
    setChangeForm({
      change_category: '',
      field_name: '',
      old_value: '',
      new_value: '',
      change_reason: '',
    });
    setChangeErrors({});
  }, []);

  const fieldSuggestions = useMemo(() => {
    if (!changeForm.change_category) return [];
    return CHANGE_FIELD_SUGGESTIONS[changeForm.change_category] ?? [];
  }, [changeForm.change_category]);

  const datalistId = useMemo(() => `form-field-sugg-${Date.now()}`, []);

  const openAddChangeForm = useCallback(() => {
    setEditingChange(null);
    resetChangeForm();
    setShowChangeForm(true);
  }, [resetChangeForm]);

  const openEditChangeForm = useCallback((change: LocalChange) => {
    setEditingChange(change);
    setChangeForm({
      change_category: change.change_category,
      field_name: change.field_name,
      old_value: change.old_value,
      new_value: change.new_value,
      change_reason: change.change_reason,
    });
    setChangeErrors({});
    setShowChangeForm(true);
  }, []);

  const cancelChangeForm = useCallback(() => {
    setShowChangeForm(false);
    setEditingChange(null);
    resetChangeForm();
  }, [resetChangeForm]);

  const validateChangeForm = useCallback((): boolean => {
    const next: Record<string, string> = {};
    if (!changeForm.change_category) next.change_category = 'Required';
    if (!changeForm.field_name.trim()) next.field_name = 'Required';
    if (!changeForm.new_value.trim() && !changeForm.old_value.trim()) {
      next.new_value = 'Provide at least old or new value';
    }
    setChangeErrors(next);
    return Object.keys(next).length === 0;
  }, [changeForm]);

  const saveChangeRow = useCallback(() => {
    if (!validateChangeForm()) return;

    if (editingChange) {
      // Update existing
      setChanges((prev) =>
        prev.map((c) =>
          c._localId === editingChange._localId
            ? {
                ...c,
                change_category: changeForm.change_category,
                field_name: changeForm.field_name.trim(),
                old_value: changeForm.old_value.trim(),
                new_value: changeForm.new_value.trim(),
                change_reason: changeForm.change_reason.trim(),
              }
            : c,
        ),
      );
    } else {
      // Add new
      setChanges((prev) => [
        ...prev,
        {
          _localId: nextLocalId(),
          change_category: changeForm.change_category,
          field_name: changeForm.field_name.trim(),
          old_value: changeForm.old_value.trim(),
          new_value: changeForm.new_value.trim(),
          change_reason: changeForm.change_reason.trim(),
        },
      ]);
    }

    cancelChangeForm();
  }, [changeForm, editingChange, validateChangeForm, cancelChangeForm]);

  const deleteChangeRow = useCallback((localId: string) => {
    setChanges((prev) => prev.filter((c) => c._localId !== localId));
  }, []);

  /* ── Main form handlers ────────────────────────── */

  const handleFieldChange = useCallback(
    (field: keyof FormState, value: string) => {
      setForm((prev) => ({ ...prev, [field]: value }));
      if (errors[field]) {
        setErrors((prev) => {
          const next = { ...prev };
          delete next[field];
          return next;
        });
      }
    },
    [errors],
  );

  const validate = useCallback((): boolean => {
    const next: Partial<Record<keyof FormState | 'changes', string>> = {};

    if (!form.permit_id.trim() && !permitId) {
      next.permit_id = 'Permit is required';
    }
    if (!form.amendment_title.trim()) {
      next.amendment_title = 'Title is required';
    } else if (form.amendment_title.length > 500) {
      next.amendment_title = 'Title must be 500 characters or less';
    }
    if (!form.amendment_type) {
      next.amendment_type = 'Type is required';
    }
    if (!form.reason.trim()) {
      next.reason = 'Reason is required';
    } else if (form.reason.trim().length < 10) {
      next.reason = 'Reason must be at least 10 characters';
    }

    setErrors(next);
    return Object.keys(next).length === 0;
  }, [form, permitId]);

  const handleSubmit = useCallback(async () => {
    if (!validate()) return;
    setSubmitting(true);
    try {
      const payload: Record<string, unknown> = {
        permit_id: permitId || form.permit_id.trim(),
        amendment_title: form.amendment_title.trim(),
        amendment_type: form.amendment_type === 'Other' && customAmendmentType.trim()
          ? `Other - ${customAmendmentType.trim()}`
          : form.amendment_type,
        amendment_category: form.amendment_category,
        reason: form.reason.trim(),
        priority: form.priority,
        requested_by: form.requested_by.trim() || undefined,
        request_date: form.request_date || undefined,
        effective_from: form.effective_from || undefined,
        effective_to: form.effective_to || undefined,
        notes: form.notes.trim() || undefined,
        changes: changes.map((c, i) => ({
          id: c.id || undefined,
          change_order: i + 1,
          change_category: c.change_category,
          field_name: c.field_name,
          old_value: c.old_value || null,
          new_value: c.new_value || null,
          change_reason: c.change_reason || null,
        })),
      };
      await onSubmit(payload);
    } catch {
      // Error handled by parent
    } finally {
      setSubmitting(false);
    }
  }, [form, changes, validate, onSubmit, permitId]);

  /* ── Keyboard ──────────────────────────────────── */

  useEffect(() => {
    if (!isOpen) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (showChangeForm) {
          cancelChangeForm();
        } else {
          onClose();
        }
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [isOpen, showChangeForm, cancelChangeForm, onClose]);

  /* ── Early return ──────────────────────────────── */

  if (!isOpen) return null;

  /* ── Render ────────────────────────────────────── */

  return (
    <>
      {/* Overlay */}
      <div className="amendment-form-overlay" onClick={onClose} />

      {/* Drawer */}
      <div className="amendment-form-drawer" role="dialog" aria-modal="true">
        {/* Header */}
        <div className="amendment-form-drawer__header">
          <div className="amendment-form-drawer__header-title">
            {isEdit ? `Edit Amendment: ${amendment?.amendment_code || ''}` : 'Create Amendment'}
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
            <XIcon size={20} />
          </button>
        </div>

        {/* Body */}
        <div className="amendment-form-drawer__body">
          {/* ── Section: Permit ── */}
          <div className="amendment-form-drawer__section">
            <div className="amendment-form-drawer__section-title">Permit Details</div>

            <div className="amendment-form-drawer__field">
              <label className="amendment-form-drawer__label amendment-form-drawer__label--required">
                Permit
              </label>
              {permitId ? (
                <div
                  style={{
                    padding: '8px 10px',
                    fontSize: 13,
                    fontWeight: 600,
                    background: 'var(--color-surface-sunken)',
                    border: '1px solid var(--color-border)',
                    borderRadius: 'var(--radius-sm)',
                    color: 'var(--color-text-primary)',
                  }}
                >
                  {permitLabel || permitId}
                </div>
              ) : (
                <>
                  <input
                    type="text"
                    className="amendment-form-drawer__input"
                    value={form.permit_id}
                    onChange={(e) => handleFieldChange('permit_id', e.target.value)}
                    placeholder="Enter permit ID..."
                  />
                  {errors.permit_id && (
                    <div className="amendment-form-drawer__error">{errors.permit_id}</div>
                  )}
                </>
              )}
            </div>
          </div>

          {/* ── Section: Amendment Info ── */}
          <div className="amendment-form-drawer__section">
            <div className="amendment-form-drawer__section-title">Amendment Information</div>

            {/* Amendment Title */}
            <div className="amendment-form-drawer__field">
              <label className="amendment-form-drawer__label amendment-form-drawer__label--required">
                Amendment Title
              </label>
              <textarea
                className="amendment-form-drawer__textarea"
                value={form.amendment_title}
                onChange={(e) => handleFieldChange('amendment_title', e.target.value)}
                placeholder="Brief title describing the amendment..."
                maxLength={500}
                rows={2}
              />
              <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 2 }}>
                {errors.amendment_title ? (
                  <div className="amendment-form-drawer__error">{errors.amendment_title}</div>
                ) : (
                  <span />
                )}
                <span style={{ fontSize: 10, color: 'var(--color-text-tertiary)' }}>
                  {form.amendment_title.length}/500
                </span>
              </div>
            </div>

            {/* Amendment Type */}
            <div className="amendment-form-drawer__field">
              <label className="amendment-form-drawer__label amendment-form-drawer__label--required">
                Amendment Type
              </label>
              <select
                className="amendment-form-drawer__select"
                value={form.amendment_type}
                onChange={(e) => handleFieldChange('amendment_type', e.target.value)}
              >
                <option value="">Select type...</option>
                {AMENDMENT_TYPES.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
              {form.amendment_type === 'Other' && (
                <input
                  type="text"
                  className="amendment-form-drawer__input"
                  style={{ marginTop: 8 }}
                  value={customAmendmentType}
                  onChange={(e) => setCustomAmendmentType(e.target.value)}
                  placeholder="Specify amendment type..."
                  maxLength={200}
                />
              )}
              {errors.amendment_type && (
                <div className="amendment-form-drawer__error">{errors.amendment_type}</div>
              )}
            </div>

            {/* Amendment Category (Radio) */}
            <div className="amendment-form-drawer__field">
              <label className="amendment-form-drawer__label amendment-form-drawer__label--required">
                Amendment Category
              </label>
              <div style={{ display: 'flex', gap: 20, marginTop: 4 }}>
                {(['Minor', 'Major'] as const).map((cat) => (
                  <label
                    key={cat}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 6,
                      cursor: 'pointer',
                      fontSize: 13,
                      fontWeight: form.amendment_category === cat ? 600 : 400,
                      color:
                        form.amendment_category === cat
                          ? cat === 'Major'
                            ? 'var(--color-danger-700)'
                            : 'var(--color-primary-700)'
                          : 'var(--color-text-secondary)',
                    }}
                  >
                    <input
                      type="radio"
                      name="amendment_category"
                      value={cat}
                      checked={form.amendment_category === cat}
                      onChange={() => handleFieldChange('amendment_category', cat)}
                      style={{ accentColor: cat === 'Major' ? '#dc2626' : 'var(--color-primary-600)' }}
                    />
                    {cat}
                  </label>
                ))}
              </div>

              {/* Major warning banner */}
              {form.amendment_category === 'Major' && (
                <div className="major-change-warning--amber" style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 10,
                  padding: '10px 14px',
                  background: 'var(--color-warning-50)',
                  border: '1px solid var(--color-warning-200)',
                  borderLeft: '4px solid var(--color-warning-500)',
                  borderRadius: 'var(--radius-md)',
                  marginTop: 10,
                }}>
                  <AlertTriangle size={16} style={{ color: 'var(--color-warning-600)', flexShrink: 0 }} />
                  <div style={{ fontSize: 12, color: 'var(--color-warning-700)', lineHeight: 1.5 }}>
                    <strong>Major Amendment</strong> requires additional review and approval from the safety team.
                    This will be flagged for elevated oversight.
                  </div>
                </div>
              )}
            </div>

            {/* Reason */}
            <div className="amendment-form-drawer__field">
              <label className="amendment-form-drawer__label amendment-form-drawer__label--required">
                Reason
              </label>
              <textarea
                className="amendment-form-drawer__textarea"
                value={form.reason}
                onChange={(e) => handleFieldChange('reason', e.target.value)}
                placeholder="Explain the reason for this amendment (min 10 characters)..."
                rows={3}
              />
              {errors.reason && (
                <div className="amendment-form-drawer__error">{errors.reason}</div>
              )}
            </div>

            {/* Priority */}
            <div className="amendment-form-drawer__field">
              <label className="amendment-form-drawer__label">Priority</label>
              <select
                className="amendment-form-drawer__select"
                value={form.priority}
                onChange={(e) => handleFieldChange('priority', e.target.value)}
              >
                {PRIORITIES.map((p) => (
                  <option key={p} value={p}>
                    {p}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* ── Section: Request Details ── */}
          <div className="amendment-form-drawer__section">
            <div className="amendment-form-drawer__section-title">Request Details</div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              {/* Requested By */}
              <div className="amendment-form-drawer__field">
                <label className="amendment-form-drawer__label">Requested By</label>
                <input
                  type="text"
                  className="amendment-form-drawer__input"
                  value={form.requested_by}
                  onChange={(e) => handleFieldChange('requested_by', e.target.value)}
                  placeholder="Name..."
                />
              </div>

              {/* Request Date */}
              <div className="amendment-form-drawer__field">
                <label className="amendment-form-drawer__label">Request Date</label>
                <input
                  type="date"
                  className="amendment-form-drawer__input"
                  value={form.request_date}
                  onChange={(e) => handleFieldChange('request_date', e.target.value)}
                />
              </div>

              {/* Effective From */}
              <div className="amendment-form-drawer__field">
                <label className="amendment-form-drawer__label">Effective From</label>
                <input
                  type="date"
                  className="amendment-form-drawer__input"
                  value={form.effective_from}
                  onChange={(e) => handleFieldChange('effective_from', e.target.value)}
                />
              </div>

              {/* Effective To */}
              <div className="amendment-form-drawer__field">
                <label className="amendment-form-drawer__label">Effective To</label>
                <input
                  type="date"
                  className="amendment-form-drawer__input"
                  value={form.effective_to}
                  onChange={(e) => handleFieldChange('effective_to', e.target.value)}
                />
              </div>
            </div>
          </div>

          {/* ── Section: Notes ── */}
          <div className="amendment-form-drawer__section">
            <div className="amendment-form-drawer__section-title">Notes</div>
            <div className="amendment-form-drawer__field">
              <textarea
                className="amendment-form-drawer__textarea"
                value={form.notes}
                onChange={(e) => handleFieldChange('notes', e.target.value)}
                placeholder="Optional notes or additional context..."
                rows={2}
              />
            </div>
          </div>

          {/* ── Section: Change Rows (edit only) ── */}
          {isEdit && <div className="amendment-form-drawer__section">
            <div className="amendment-form-drawer__section-title" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span>Change Rows ({changes.length})</span>
              {!showChangeForm && (
                <button
                  className="btn-secondary px-3 py-1 text-xs rounded-lg flex items-center gap-1"
                  onClick={openAddChangeForm}
                  type="button"
                >
                  <Plus size={12} />
                  Add Change
                </button>
              )}
            </div>

            {/* Existing change rows list */}
            {changes.length > 0 && (
              <div style={{ marginBottom: showChangeForm ? 14 : 0 }}>
                {changes.map((change, idx) => {
                  const oldVal = change.old_value || '\u2014';
                  const newVal = change.new_value || '\u2014';

                  return (
                    <div
                      key={change._localId}
                      style={{
                        display: 'flex',
                        alignItems: 'flex-start',
                        gap: 10,
                        padding: '10px 12px',
                        background: idx % 2 === 0 ? 'var(--color-surface)' : 'var(--color-surface-sunken)',
                        border: '1px solid var(--color-border)',
                        borderRadius: 'var(--radius-sm)',
                        marginBottom: 6,
                        fontSize: 12,
                      }}
                    >
                      {/* Row number */}
                      <span style={{ fontWeight: 700, color: 'var(--color-text-tertiary)', minWidth: 18, flexShrink: 0 }}>
                        {idx + 1}.
                      </span>

                      {/* Content */}
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4, flexWrap: 'wrap' }}>
                          <span
                            style={{
                              padding: '1px 6px',
                              borderRadius: 9999,
                              fontSize: 10,
                              fontWeight: 600,
                              background: 'var(--color-surface-sunken)',
                              color: 'var(--color-text-secondary)',
                              border: '1px solid var(--color-border)',
                            }}
                          >
                            {change.change_category}
                          </span>
                          <span style={{ fontWeight: 600, color: 'var(--color-text-primary)' }}>
                            {change.field_name}
                          </span>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                          <span
                            style={{
                              textDecoration: change.old_value ? 'line-through' : 'none',
                              color: change.old_value ? 'var(--color-text-tertiary)' : 'var(--color-text-disabled)',
                              background: change.old_value ? 'rgba(239,68,68,0.06)' : 'none',
                              padding: '1px 4px',
                              borderRadius: 2,
                              fontStyle: !change.old_value ? 'italic' : 'normal',
                            }}
                          >
                            {oldVal}
                          </span>
                          <span style={{ color: 'var(--color-text-disabled)' }}>{'\u2192'}</span>
                          <span
                            style={{
                              fontWeight: 600,
                              color: change.new_value ? 'var(--color-text-primary)' : 'var(--color-text-disabled)',
                              background: change.new_value ? 'rgba(22,163,74,0.06)' : 'none',
                              padding: '1px 4px',
                              borderRadius: 2,
                              fontStyle: !change.new_value ? 'italic' : 'normal',
                            }}
                          >
                            {newVal}
                          </span>
                        </div>
                        {change.change_reason && (
                          <div style={{ marginTop: 4, color: 'var(--color-text-tertiary)', fontStyle: 'italic' }}>
                            {change.change_reason}
                          </div>
                        )}
                      </div>

                      {/* Actions */}
                      <div style={{ display: 'flex', gap: 4, flexShrink: 0 }}>
                        <button
                          className="change-rows-table__action-btn"
                          onClick={() => openEditChangeForm(change)}
                          title="Edit change"
                          type="button"
                        >
                          <Pencil size={12} />
                        </button>
                        <button
                          className="change-rows-table__action-btn change-rows-table__action-btn--danger"
                          onClick={() => deleteChangeRow(change._localId)}
                          title="Remove change"
                          type="button"
                        >
                          <Trash2 size={12} />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Empty state */}
            {changes.length === 0 && !showChangeForm && (
              <div
                style={{
                  textAlign: 'center',
                  padding: '20px 12px',
                  color: 'var(--color-text-tertiary)',
                  fontSize: 12,
                }}
              >
                No change rows added yet. Click "Add Change" to document specific field changes.
              </div>
            )}

            {/* Inline change form */}
            {showChangeForm && (
              <div
                style={{
                  padding: 14,
                  background: 'var(--color-surface-sunken)',
                  border: '1px solid var(--color-border)',
                  borderRadius: 'var(--radius-md)',
                }}
              >
                <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--color-text-primary)', marginBottom: 12 }}>
                  {editingChange ? 'Edit Change' : 'New Change'}
                </div>

                {/* Change Category */}
                <div className="amendment-form-drawer__field">
                  <label className="amendment-form-drawer__label">
                    Change Category <span style={{ color: 'var(--color-danger-500)' }}>*</span>
                  </label>
                  <select
                    className="amendment-form-drawer__select"
                    value={changeForm.change_category}
                    onChange={(e) => {
                      setChangeForm((prev) => ({
                        ...prev,
                        change_category: e.target.value,
                        field_name: prev.change_category !== e.target.value ? '' : prev.field_name,
                      }));
                      if (changeErrors.change_category) {
                        setChangeErrors((prev) => {
                          const next = { ...prev };
                          delete next.change_category;
                          return next;
                        });
                      }
                    }}
                  >
                    <option value="">Select...</option>
                    {CHANGE_CATEGORIES.map((cat) => (
                      <option key={cat} value={cat}>{cat}</option>
                    ))}
                  </select>
                  {changeErrors.change_category && (
                    <div className="amendment-form-drawer__error">{changeErrors.change_category}</div>
                  )}
                </div>

                {/* Field Name */}
                <div className="amendment-form-drawer__field">
                  <label className="amendment-form-drawer__label">
                    Field Name <span style={{ color: 'var(--color-danger-500)' }}>*</span>
                  </label>
                  <input
                    type="text"
                    className="amendment-form-drawer__input"
                    value={changeForm.field_name}
                    onChange={(e) => {
                      setChangeForm((prev) => ({ ...prev, field_name: e.target.value }));
                      if (changeErrors.field_name) {
                        setChangeErrors((prev) => {
                          const next = { ...prev };
                          delete next.field_name;
                          return next;
                        });
                      }
                    }}
                    placeholder="e.g. Start Date..."
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
                  {changeErrors.field_name && (
                    <div className="amendment-form-drawer__error">{changeErrors.field_name}</div>
                  )}
                </div>

                {/* Old / New values side by side */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                  <div className="amendment-form-drawer__field">
                    <label className="amendment-form-drawer__label">Old Value</label>
                    <textarea
                      className="amendment-form-drawer__textarea"
                      style={{ minHeight: 56 }}
                      value={changeForm.old_value}
                      onChange={(e) => setChangeForm((prev) => ({ ...prev, old_value: e.target.value }))}
                      placeholder="Previous value..."
                      rows={2}
                    />
                  </div>
                  <div className="amendment-form-drawer__field">
                    <label className="amendment-form-drawer__label">New Value</label>
                    <textarea
                      className="amendment-form-drawer__textarea"
                      style={{ minHeight: 56 }}
                      value={changeForm.new_value}
                      onChange={(e) => {
                        setChangeForm((prev) => ({ ...prev, new_value: e.target.value }));
                        if (changeErrors.new_value) {
                          setChangeErrors((prev) => {
                            const next = { ...prev };
                            delete next.new_value;
                            return next;
                          });
                        }
                      }}
                      placeholder="Proposed value..."
                      rows={2}
                    />
                    {changeErrors.new_value && (
                      <div className="amendment-form-drawer__error">{changeErrors.new_value}</div>
                    )}
                  </div>
                </div>

                {/* Change Reason */}
                <div className="amendment-form-drawer__field">
                  <label className="amendment-form-drawer__label">Change Reason</label>
                  <textarea
                    className="amendment-form-drawer__textarea"
                    style={{ minHeight: 48 }}
                    value={changeForm.change_reason}
                    onChange={(e) => setChangeForm((prev) => ({ ...prev, change_reason: e.target.value }))}
                    placeholder="Why is this change needed?"
                    rows={1}
                  />
                </div>

                {/* Actions */}
                <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                  <button
                    className="btn-secondary px-3 py-1.5 text-xs rounded-lg"
                    onClick={cancelChangeForm}
                    type="button"
                  >
                    Cancel
                  </button>
                  <button
                    className="btn-primary px-3 py-1.5 text-xs rounded-lg flex items-center gap-1.5"
                    onClick={saveChangeRow}
                    type="button"
                  >
                    <Save size={12} />
                    {editingChange ? 'Update' : 'Add'}
                  </button>
                </div>
              </div>
            )}
          </div>}
        </div>

        {/* Footer */}
        <div className="amendment-form-drawer__footer">
          <button
            className="btn-secondary px-4 py-2 text-sm rounded-lg"
            onClick={onClose}
            type="button"
            disabled={submitting}
          >
            Cancel
          </button>
          <button
            className="btn-primary px-4 py-2 text-sm rounded-lg flex items-center gap-2"
            onClick={handleSubmit}
            disabled={submitting}
            type="button"
          >
            {submitting ? (
              <Loader2 size={14} className="animate-spin" />
            ) : (
              <Save size={14} />
            )}
            {submitting ? 'Saving...' : 'Save as Draft'}
          </button>
        </div>
      </div>
    </>
  );
};

export default AmendmentForm;
