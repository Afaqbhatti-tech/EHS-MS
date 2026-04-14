import React, { useState, useMemo } from 'react';
import { X as XIcon } from 'lucide-react';
import {
  ASPECT_CATEGORIES,
  ASPECT_STATUSES,
  IMPACT_TYPES,
  getRiskLevel,
} from '../../../config/environmentalConfig';
import RiskMatrix from './RiskMatrix';
import SelectWithOther from './SelectWithOther';

interface AspectFormProps {
  aspect?: any;
  onSave: (data: Record<string, unknown>) => Promise<void>;
  onClose: () => void;
}

const EMPTY_FORM = {
  activity: '',
  aspect_description: '',
  aspect_category: '',
  impact_type: '',
  impact_description: '',
  location: '',
  area: '',
  department: '',
  severity: '',
  likelihood: '',
  controls: '',
  additional_controls: '',
  responsible_person: '',
  review_date: '',
  status: 'Active',
  notes: '',
};

export default function AspectForm({ aspect, onSave, onClose }: AspectFormProps) {
  const [formData, setFormData] = useState<Record<string, any>>(() => {
    if (aspect) {
      return {
        activity: aspect.activity || '',
        aspect_description: aspect.aspect || aspect.aspect_description || '',
        aspect_category: aspect.category || aspect.aspect_category || '',
        impact_type: aspect.impact_type || '',
        impact_description: aspect.impact || aspect.impact_description || '',
        location: aspect.location || '',
        area: aspect.area || '',
        department: aspect.department || '',
        severity: aspect.severity ?? '',
        likelihood: aspect.likelihood ?? '',
        controls: aspect.control_measures || aspect.controls || '',
        additional_controls: aspect.additional_controls || '',
        responsible_person: aspect.responsible_person || '',
        review_date: aspect.review_date ? aspect.review_date.slice(0, 10) : '',
        status: aspect.status || 'Active',
        notes: aspect.notes || '',
      };
    }
    return { ...EMPTY_FORM };
  });

  const [saving, setSaving] = useState(false);

  function set(key: string, value: any) {
    setFormData((prev) => ({ ...prev, [key]: value }));
  }

  /* ── Computed risk ──────────────────────────────── */

  const calculatedRisk = useMemo(() => {
    const s = Number(formData.severity);
    const l = Number(formData.likelihood);
    if (s > 0 && l > 0) return getRiskLevel(s, l);
    return null;
  }, [formData.severity, formData.likelihood]);

  /* ── Submit ─────────────────────────────────────── */

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      await onSave(formData);
    } finally {
      setSaving(false);
    }
  }

  /* ── Render ─────────────────────────────────────── */

  return (
    <div className="env-modal-overlay" onClick={onClose}>
      <div className="env-modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 720 }}>
        <div className="env-modal-header">
          <h3>{aspect ? 'Edit Aspect' : 'Add New Aspect'}</h3>
          <button type="button" className="env-modal-close" onClick={onClose} title="Close">
            <XIcon size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          {/* Activity */}
          <div className="env-form-group">
            <label>
              Activity <span style={{ color: '#EF4444' }}>*</span>
            </label>
            <input
              type="text"
              value={formData.activity}
              onChange={(e) => set('activity', e.target.value)}
              required
              placeholder="e.g. Concrete mixing"
            />
          </div>

          {/* Aspect Description */}
          <div className="env-form-group">
            <label>
              Aspect Description <span style={{ color: '#EF4444' }}>*</span>
            </label>
            <textarea
              rows={3}
              value={formData.aspect_description}
              onChange={(e) => set('aspect_description', e.target.value)}
              required
              placeholder="Describe the environmental aspect..."
            />
          </div>

          {/* Category + Impact Type */}
          <div className="env-form-row">
            <SelectWithOther
              label="Category"
              required
              options={ASPECT_CATEGORIES}
              value={formData.aspect_category}
              onChange={(v) => set('aspect_category', v)}
              placeholder="Select category"
            />
            <SelectWithOther
              label="Impact Type"
              options={IMPACT_TYPES}
              value={formData.impact_type}
              onChange={(v) => set('impact_type', v)}
              placeholder="Select impact type"
            />
          </div>

          {/* Impact Description */}
          <div className="env-form-group">
            <label>Impact Description</label>
            <textarea
              rows={2}
              value={formData.impact_description}
              onChange={(e) => set('impact_description', e.target.value)}
              placeholder="Describe the potential environmental impact..."
            />
          </div>

          {/* Location, Area, Department */}
          <div className="env-form-row">
            <div className="env-form-group">
              <label>Location</label>
              <input
                type="text"
                value={formData.location}
                onChange={(e) => set('location', e.target.value)}
                placeholder="Location"
              />
            </div>
            <div className="env-form-group">
              <label>Area</label>
              <input
                type="text"
                value={formData.area}
                onChange={(e) => set('area', e.target.value)}
                placeholder="Area"
              />
            </div>
            <div className="env-form-group">
              <label>Department</label>
              <input
                type="text"
                value={formData.department}
                onChange={(e) => set('department', e.target.value)}
                placeholder="Department"
              />
            </div>
          </div>

          {/* Severity / Likelihood / Risk Matrix */}
          <div className="env-form-row" style={{ alignItems: 'flex-start' }}>
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div className="env-form-group">
                <label>Severity</label>
                <select
                  value={formData.severity}
                  onChange={(e) => set('severity', e.target.value)}
                >
                  <option value="">Select</option>
                  <option value="1">1 - Minor</option>
                  <option value="2">2 - Moderate</option>
                  <option value="3">3 - Significant</option>
                  <option value="4">4 - Major</option>
                </select>
              </div>
              <div className="env-form-group">
                <label>Likelihood</label>
                <select
                  value={formData.likelihood}
                  onChange={(e) => set('likelihood', e.target.value)}
                >
                  <option value="">Select</option>
                  <option value="1">1 - Rare</option>
                  <option value="2">2 - Unlikely</option>
                  <option value="3">3 - Possible</option>
                  <option value="4">4 - Likely</option>
                </select>
              </div>
              {calculatedRisk && (
                <div
                  style={{
                    padding: '8px 12px',
                    background: '#F9FAFB',
                    borderRadius: 8,
                    fontSize: 13,
                  }}
                >
                  <strong>Risk Score:</strong> {calculatedRisk.score} &mdash;{' '}
                  <strong>{calculatedRisk.level}</strong>
                </div>
              )}
            </div>
            <div style={{ flexShrink: 0, paddingTop: 4 }}>
              <RiskMatrix
                severity={Number(formData.severity) || undefined}
                likelihood={Number(formData.likelihood) || undefined}
              />
            </div>
          </div>

          {/* Controls */}
          <div className="env-form-group" style={{ marginTop: 16 }}>
            <label>Existing Controls</label>
            <textarea
              rows={2}
              value={formData.controls}
              onChange={(e) => set('controls', e.target.value)}
              placeholder="Current control measures..."
            />
          </div>

          <div className="env-form-group">
            <label>Additional Controls</label>
            <textarea
              rows={2}
              value={formData.additional_controls}
              onChange={(e) => set('additional_controls', e.target.value)}
              placeholder="Additional control measures needed..."
            />
          </div>

          {/* Responsible + Review Date + Status */}
          <div className="env-form-row">
            <div className="env-form-group">
              <label>Responsible Person</label>
              <input
                type="text"
                value={formData.responsible_person}
                onChange={(e) => set('responsible_person', e.target.value)}
                placeholder="Person responsible"
              />
            </div>
            <div className="env-form-group">
              <label>Review Date</label>
              <input
                type="date"
                value={formData.review_date}
                onChange={(e) => set('review_date', e.target.value)}
              />
            </div>
            <div className="env-form-group">
              <label>Status</label>
              <select
                value={formData.status}
                onChange={(e) => set('status', e.target.value)}
              >
                {ASPECT_STATUSES.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Notes */}
          <div className="env-form-group">
            <label>Notes</label>
            <textarea
              rows={2}
              value={formData.notes}
              onChange={(e) => set('notes', e.target.value)}
              placeholder="Additional notes..."
            />
          </div>

          {/* Buttons */}
          <div className="env-modal-footer">
            <button type="button" className="env-btn env-btn--secondary" onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className="env-btn env-btn--primary" disabled={saving}>
              {saving ? 'Saving...' : 'Save'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
