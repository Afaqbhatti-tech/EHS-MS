import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Eye, Pencil, Trash2, X as XIcon } from 'lucide-react';
import { RISK_STATUSES, getRiskLevel } from '../../../config/environmentalConfig';
import RiskLevelBadge from './RiskLevelBadge';
import EnvStatusBadge from './EnvStatusBadge';
import RiskMatrix from './RiskMatrix';
import ExportDropdown from '../../../components/ui/ExportDropdown';
import { createEnvExportHandler } from './envExportHelper';

interface RisksListProps {
  env: any;
}

const DEFAULT_FILTERS = {
  search: '',
  risk_rating: '',
  status: '',
  aspect_id: '',
  page: 1,
  per_page: 15,
};

const EMPTY_RISK_FORM = {
  aspect_id: '',
  hazard_description: '',
  potential_impact: '',
  likelihood: '',
  severity: '',
  existing_controls: '',
  additional_controls: '',
  residual_likelihood: '',
  residual_severity: '',
  responsible_person: '',
  review_date: '',
  status: 'Open',
  notes: '',
};

export default function RisksList({ env }: RisksListProps) {
  const [filters, setFilters] = useState({ ...DEFAULT_FILTERS });
  const [showForm, setShowForm] = useState(false);
  const [selectedRisk, setSelectedRisk] = useState<any>(null);
  const [formData, setFormData] = useState<Record<string, any>>({ ...EMPTY_RISK_FORM });
  const [saving, setSaving] = useState(false);

  const load = useCallback(
    (overrides?: Record<string, unknown>) => {
      env.fetchRisks({ ...filters, ...overrides });
    },
    [env, filters],
  );

  useEffect(() => {
    load();
    // fetch aspects for the aspect_id dropdown
    env.fetchAspects({ per_page: 200 });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* ── Filter helpers ─────────────────────────────── */

  function onFilterChange(key: string, value: string) {
    const next = { ...filters, [key]: value, page: 1 };
    setFilters(next);
    env.fetchRisks(next);
  }

  function goToPage(page: number) {
    const next = { ...filters, page };
    setFilters(next);
    env.fetchRisks(next);
  }

  /* ── Form helpers ───────────────────────────────── */

  function set(key: string, value: any) {
    setFormData((prev) => ({ ...prev, [key]: value }));
  }

  function openAdd() {
    setSelectedRisk(null);
    setFormData({ ...EMPTY_RISK_FORM });
    setShowForm(true);
  }

  function openEdit(risk: any) {
    setSelectedRisk(risk);
    setFormData({
      aspect_id: risk.aspect_id ?? '',
      hazard_description: risk.description || risk.hazard_description || '',
      potential_impact: risk.potential_impact || '',
      likelihood: risk.likelihood ?? '',
      severity: risk.consequence ?? risk.severity ?? '',
      existing_controls: risk.existing_controls || '',
      additional_controls: risk.additional_controls || '',
      residual_likelihood: risk.residual_likelihood ?? '',
      residual_severity: risk.residual_consequence ?? risk.residual_severity ?? '',
      responsible_person: risk.responsible_person || '',
      review_date: risk.review_date ? risk.review_date.slice(0, 10) : '',
      status: risk.status || 'Open',
      notes: risk.notes || '',
    });
    setShowForm(true);
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      if (selectedRisk?.id) {
        await env.updateRisk(selectedRisk.id, formData);
      } else {
        await env.createRisk(formData);
      }
      setShowForm(false);
      setSelectedRisk(null);
      load();
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: number) {
    if (!window.confirm('Are you sure you want to delete this risk?')) return;
    await env.deleteRisk(id);
    load();
  }

  /* ── Computed risks for form ────────────────────── */

  const primaryRisk = useMemo(() => {
    const s = Number(formData.severity);
    const l = Number(formData.likelihood);
    if (s > 0 && l > 0) return getRiskLevel(s, l);
    return null;
  }, [formData.severity, formData.likelihood]);

  const residualRisk = useMemo(() => {
    const s = Number(formData.residual_severity);
    const l = Number(formData.residual_likelihood);
    if (s > 0 && l > 0) return getRiskLevel(s, l);
    return null;
  }, [formData.residual_severity, formData.residual_likelihood]);

  const handleExport = createEnvExportHandler({
    title: 'Environmental Risks',
    filename: 'risks_export',
    headers: ['Code', 'Hazard', 'Linked Aspect', 'Risk Rating', 'Residual Rating', 'Status'],
    getRows: () => (env.risks || []).map((r: any) => [
      r.risk_code, r.description || r.title || '', r.aspect?.aspect_code || '',
      r.risk_level || '', r.residual_risk_level || '', r.status || '',
    ]),
  });

  /* ── Pagination ─────────────────────────────────── */

  const { total, page, lastPage } = env.risksPagination;

  /* ── Aspects list for dropdown ──────────────────── */

  const aspectOptions: any[] = env.aspects || [];

  /* ── Render ─────────────────────────────────────── */

  return (
    <div>
      {/* ── Header ──────────────────────────────────── */}
      <div className="env-section-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <h2 style={{ margin: 0 }}>Risk Assessment</h2>
          <span
            style={{
              background: '#E0E7FF',
              color: '#3730A3',
              fontSize: 12,
              fontWeight: 600,
              padding: '2px 10px',
              borderRadius: 9999,
            }}
          >
            {total}
          </span>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <ExportDropdown onExport={handleExport} />
          <button className="env-btn env-btn--primary" onClick={openAdd}>+ Add Risk</button>
        </div>
      </div>

      {/* ── Filters ─────────────────────────────────── */}
      <div className="env-filters-row">
        <input
          type="text"
          placeholder="Search risks..."
          value={filters.search}
          onChange={(e) => onFilterChange('search', e.target.value)}
        />
        <select
          value={filters.risk_rating}
          onChange={(e) => onFilterChange('risk_rating', e.target.value)}
        >
          <option value="">All Risk Ratings</option>
          <option value="Low">Low</option>
          <option value="Medium">Medium</option>
          <option value="High">High</option>
          <option value="Critical">Critical</option>
        </select>
        <select
          value={filters.status}
          onChange={(e) => onFilterChange('status', e.target.value)}
        >
          <option value="">All Statuses</option>
          {RISK_STATUSES.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
        <select
          value={filters.aspect_id}
          onChange={(e) => onFilterChange('aspect_id', e.target.value)}
        >
          <option value="">All Aspects</option>
          {aspectOptions.map((a: any) => (
            <option key={a.id} value={a.id}>
              {a.aspect_code} - {a.activity}
            </option>
          ))}
        </select>
      </div>

      {/* ── Table ───────────────────────────────────── */}
      {env.risksLoading ? (
        <div className="env-empty-state">Loading...</div>
      ) : !env.risks?.length ? (
        <div className="env-empty-state">No risks found. Click "+ Add Risk" to create one.</div>
      ) : (
        <table className="env-table">
          <thead>
            <tr>
              <th>Code</th>
              <th>Hazard Description</th>
              <th>Linked Aspect</th>
              <th>Risk Rating</th>
              <th>Residual Rating</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {env.risks.map((r: any) => {
              const desc = r.description || r.title || '';
              const truncated = desc.length > 60 ? desc.slice(0, 60) + '...' : desc;
              return (
                <tr key={r.id}>
                  <td>{r.risk_code}</td>
                  <td title={desc}>{truncated}</td>
                  <td>{r.aspect?.aspect_code || '-'}</td>
                  <td>
                    <RiskLevelBadge level={r.risk_level} />
                  </td>
                  <td>
                    {r.residual_risk_level ? (
                      <RiskLevelBadge level={r.residual_risk_level} />
                    ) : (
                      '-'
                    )}
                  </td>
                  <td>
                    <EnvStatusBadge status={r.status} />
                  </td>
                  <td>
                    <div className="flex items-center justify-center gap-1 table-actions">
                      <button className="action-btn action-btn--view" title="View" onClick={() => openEdit(r)}>
                        <Eye size={15} />
                      </button>
                      <button className="action-btn action-btn--edit" title="Edit" onClick={() => openEdit(r)}>
                        <Pencil size={15} />
                      </button>
                      <button className="action-btn action-btn--delete" title="Delete" onClick={() => handleDelete(r.id)}>
                        <Trash2 size={15} />
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      )}

      {/* ── Pagination ──────────────────────────────── */}
      {lastPage > 1 && (
        <div className="env-pagination">
          <button disabled={page <= 1} onClick={() => goToPage(page - 1)}>
            Previous
          </button>
          <span>
            Page {page} of {lastPage} ({total} records)
          </span>
          <button disabled={page >= lastPage} onClick={() => goToPage(page + 1)}>
            Next
          </button>
        </div>
      )}

      {/* ── Risk Form Modal ─────────────────────────── */}
      {showForm && (
        <div className="env-modal-overlay" onClick={() => setShowForm(false)}>
          <div
            className="env-modal"
            onClick={(e) => e.stopPropagation()}
            style={{ maxWidth: 740 }}
          >
            <div className="env-modal-header">
              <div>
                <h3 style={{ margin: 0 }}>
                  {selectedRisk ? 'Edit Risk' : 'Add New Risk'}
                </h3>
                <p className="text-[12px] text-text-tertiary mt-0.5" style={{ margin: 0 }}>
                  {selectedRisk ? 'Update the risk assessment details' : 'Create a new environmental risk assessment'}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowForm(false)}
                className="env-modal-close"
              >
                <XIcon size={18} />
              </button>
            </div>

            <form onSubmit={handleSave}>
              {/* Linked Aspect */}
              <div className="env-form-group">
                <label>Linked Aspect</label>
                <select
                  value={formData.aspect_id}
                  onChange={(e) => set('aspect_id', e.target.value)}
                >
                  <option value="">None</option>
                  {aspectOptions.map((a: any) => (
                    <option key={a.id} value={a.id}>
                      {a.aspect_code} - {a.activity}
                    </option>
                  ))}
                </select>
              </div>

              {/* Hazard Description */}
              <div className="env-form-group">
                <label>
                  Hazard Description <span style={{ color: '#EF4444' }}>*</span>
                </label>
                <textarea
                  rows={3}
                  value={formData.hazard_description}
                  onChange={(e) => set('hazard_description', e.target.value)}
                  required
                  placeholder="Describe the hazard..."
                />
              </div>

              {/* Potential Impact */}
              <div className="env-form-group">
                <label>Potential Impact</label>
                <textarea
                  rows={2}
                  value={formData.potential_impact}
                  onChange={(e) => set('potential_impact', e.target.value)}
                  placeholder="Describe the potential environmental impact..."
                />
              </div>

              {/* Primary Risk: Severity + Likelihood + Matrix */}
              <h3 style={{ margin: '16px 0 8px', fontSize: 14, color: '#374151' }}>
                Primary Risk Assessment
              </h3>
              <div className="env-form-row" style={{ alignItems: 'flex-start' }}>
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 12 }}>
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
                  {primaryRisk && (
                    <div
                      style={{
                        padding: '8px 12px',
                        background: '#F9FAFB',
                        borderRadius: 8,
                        fontSize: 13,
                      }}
                    >
                      <strong>Risk Score:</strong> {primaryRisk.score} &mdash;{' '}
                      <RiskLevelBadge level={primaryRisk.level} />
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

              {/* Existing Controls */}
              <div className="env-form-group">
                <label>Existing Controls</label>
                <textarea
                  rows={2}
                  value={formData.existing_controls}
                  onChange={(e) => set('existing_controls', e.target.value)}
                  placeholder="Current control measures..."
                />
              </div>

              {/* Additional Controls */}
              <div className="env-form-group">
                <label>Additional Controls</label>
                <textarea
                  rows={2}
                  value={formData.additional_controls}
                  onChange={(e) => set('additional_controls', e.target.value)}
                  placeholder="Additional control measures needed..."
                />
              </div>

              {/* Residual Risk: Severity + Likelihood + Matrix */}
              <h3 style={{ margin: '16px 0 8px', fontSize: 14, color: '#374151' }}>
                Residual Risk Assessment
              </h3>
              <div className="env-form-row" style={{ alignItems: 'flex-start' }}>
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 12 }}>
                  <div className="env-form-group">
                    <label>Residual Likelihood</label>
                    <select
                      value={formData.residual_likelihood}
                      onChange={(e) => set('residual_likelihood', e.target.value)}
                    >
                      <option value="">Select</option>
                      <option value="1">1 - Rare</option>
                      <option value="2">2 - Unlikely</option>
                      <option value="3">3 - Possible</option>
                      <option value="4">4 - Likely</option>
                    </select>
                  </div>
                  <div className="env-form-group">
                    <label>Residual Severity</label>
                    <select
                      value={formData.residual_severity}
                      onChange={(e) => set('residual_severity', e.target.value)}
                    >
                      <option value="">Select</option>
                      <option value="1">1 - Minor</option>
                      <option value="2">2 - Moderate</option>
                      <option value="3">3 - Significant</option>
                      <option value="4">4 - Major</option>
                    </select>
                  </div>
                  {residualRisk && (
                    <div
                      style={{
                        padding: '8px 12px',
                        background: '#F9FAFB',
                        borderRadius: 8,
                        fontSize: 13,
                      }}
                    >
                      <strong>Residual Score:</strong> {residualRisk.score} &mdash;{' '}
                      <RiskLevelBadge level={residualRisk.level} />
                    </div>
                  )}
                </div>
                <div style={{ flexShrink: 0, paddingTop: 4 }}>
                  <RiskMatrix
                    severity={Number(formData.residual_severity) || undefined}
                    likelihood={Number(formData.residual_likelihood) || undefined}
                  />
                </div>
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
                    {RISK_STATUSES.map((s) => (
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
                <button
                  type="button"
                  className="env-btn env-btn--secondary"
                  onClick={() => {
                    setShowForm(false);
                    setSelectedRisk(null);
                  }}
                >
                  Cancel
                </button>
                <button type="submit" className="env-btn env-btn--primary" disabled={saving}>
                  {saving ? 'Saving...' : 'Save'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
