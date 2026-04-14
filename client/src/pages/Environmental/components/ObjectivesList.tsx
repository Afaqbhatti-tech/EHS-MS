import React, { useState, useEffect, useCallback } from 'react';
import { Eye, Pencil, Trash2, TrendingUp } from 'lucide-react';
import { OBJECTIVE_CATEGORIES, OBJECTIVE_STATUSES } from '../../../config/environmentalConfig';
import EnvStatusBadge from './EnvStatusBadge';
import SelectWithOther from './SelectWithOther';
import ExportDropdown from '../../../components/ui/ExportDropdown';
import { createEnvExportHandler } from './envExportHelper';

interface ObjectivesListProps {
  env: any;
}

const DEFAULT_FILTERS = {
  search: '',
  category: '',
  status: '',
  page: 1,
  per_page: 15,
};

const EMPTY_FORM = {
  title: '',
  description: '',
  category: '',
  target_value: '',
  current_value: '',
  unit: '',
  baseline_value: '',
  baseline_date: '',
  deadline: '',
  responsible_person: '',
  status: 'Planned',
  progress_notes: '',
};

export default function ObjectivesList({ env }: ObjectivesListProps) {
  const [filters, setFilters] = useState({ ...DEFAULT_FILTERS });
  const [showForm, setShowForm] = useState(false);
  const [showDetail, setShowDetail] = useState(false);
  const [showProgressModal, setShowProgressModal] = useState(false);
  const [selectedObjective, setSelectedObjective] = useState<any>(null);
  const [formData, setFormData] = useState({ ...EMPTY_FORM });
  const [progressData, setProgressData] = useState({ current_value: '', progress_notes: '' });
  const [saving, setSaving] = useState(false);

  const load = useCallback(
    (overrides?: Record<string, unknown>) => {
      env.fetchObjectives({ ...filters, ...overrides });
    },
    [env, filters],
  );

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* ── Filter helpers ─────────────────────────────── */

  function onFilterChange(key: string, value: string) {
    const next = { ...filters, [key]: value, page: 1 };
    setFilters(next);
    env.fetchObjectives(next);
  }

  function goToPage(page: number) {
    const next = { ...filters, page };
    setFilters(next);
    env.fetchObjectives(next);
  }

  /* ── CRUD callbacks ─────────────────────────────── */

  async function handleSave() {
    if (!formData.title.trim()) return;
    setSaving(true);
    try {
      const payload: Record<string, unknown> = { ...formData };
      if (payload.target_value !== '') payload.target_value = Number(payload.target_value);
      else delete payload.target_value;
      if (payload.current_value !== '') payload.current_value = Number(payload.current_value);
      else delete payload.current_value;
      if (payload.baseline_value !== '') payload.baseline_value = Number(payload.baseline_value);
      else delete payload.baseline_value;

      if (selectedObjective?.id) {
        await env.updateObjective(selectedObjective.id, payload);
      } else {
        await env.createObjective(payload);
      }
      setShowForm(false);
      setSelectedObjective(null);
      setFormData({ ...EMPTY_FORM });
      load();
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: number) {
    if (!window.confirm('Are you sure you want to delete this objective?')) return;
    await env.deleteObjective(id);
    load();
  }

  async function handleUpdateProgress() {
    if (!selectedObjective?.id) return;
    setSaving(true);
    try {
      const payload: Record<string, unknown> = {
        progress_notes: progressData.progress_notes,
      };
      if (progressData.current_value !== '') {
        payload.current_value = Number(progressData.current_value);
      }
      await env.updateProgress(selectedObjective.id, payload);
      setShowProgressModal(false);
      setSelectedObjective(null);
      setProgressData({ current_value: '', progress_notes: '' });
      load();
    } finally {
      setSaving(false);
    }
  }

  function openAdd() {
    setSelectedObjective(null);
    setFormData({ ...EMPTY_FORM });
    setShowForm(true);
  }

  function openEdit(obj: any) {
    setSelectedObjective(obj);
    setFormData({
      title: obj.title || '',
      description: obj.description || '',
      category: obj.category || '',
      target_value: obj.target_value != null ? String(obj.target_value) : '',
      current_value: obj.current_value != null ? String(obj.current_value) : '',
      unit: obj.unit || '',
      baseline_value: obj.baseline_value != null ? String(obj.baseline_value) : '',
      baseline_date: obj.baseline_year || obj.start_date || '',
      deadline: obj.end_date || '',
      responsible_person: obj.responsible_person || '',
      status: obj.status || 'Planned',
      progress_notes: obj.notes || '',
    });
    setShowForm(true);
    setShowDetail(false);
  }

  function openDetail(obj: any) {
    setSelectedObjective(obj);
    setShowDetail(true);
  }

  function openProgress(obj: any) {
    setSelectedObjective(obj);
    setProgressData({
      current_value: obj.current_value != null ? String(obj.current_value) : '',
      progress_notes: '',
    });
    setShowProgressModal(true);
  }

  /* ── Export handler ─────────────────────────────── */

  const handleExport = createEnvExportHandler({
    title: 'Environmental Objectives',
    filename: 'objectives_export',
    headers: ['Code', 'Title', 'Category', 'Target', 'Current', 'Unit', 'Progress %', 'Status', 'Deadline'],
    getRows: () => (env.objectives || []).map((o: any) => [
      o.objective_code, o.title || '', o.category || '', o.target_value ?? '',
      o.current_value ?? '', o.unit || '', o.progress_percentage ?? 0,
      o.status || '', o.end_date || '',
    ]),
  });

  /* ── Progress bar color ─────────────────────────── */

  function getProgressColor(pct: number): string {
    if (pct >= 80) return 'var(--color-success-500, #16a34a)';
    if (pct >= 50) return 'var(--color-warning-500, #f59e0b)';
    return 'var(--color-danger-500, #dc2626)';
  }

  /* ── Pagination data ────────────────────────────── */

  const { total, page, lastPage } = env.objectivesPagination;

  /* ── Render ─────────────────────────────────────── */

  return (
    <div className="env-list-layout">
      {/* ── Header ──────────────────────────────────── */}
      <div className="env-section-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <h2 style={{ margin: 0 }}>Objectives & Targets</h2>
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
          <button className="env-btn env-btn--primary" onClick={openAdd}>
            + Add Objective
          </button>
        </div>
      </div>

      {/* ── Filters ─────────────────────────────────── */}
      <div className="env-filters-row">
        <input
          type="text"
          placeholder="Search objectives..."
          value={filters.search}
          onChange={(e) => onFilterChange('search', e.target.value)}
        />
        <select
          value={filters.category}
          onChange={(e) => onFilterChange('category', e.target.value)}
        >
          <option value="">All Categories</option>
          {OBJECTIVE_CATEGORIES.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
        <select
          value={filters.status}
          onChange={(e) => onFilterChange('status', e.target.value)}
        >
          <option value="">All Statuses</option>
          {OBJECTIVE_STATUSES.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
      </div>

      {/* ── Table ───────────────────────────────────── */}
      {env.objectivesLoading ? (
        <div className="env-empty-state">Loading...</div>
      ) : !env.objectives?.length ? (
        <div className="env-empty-state">No objectives found. Click "+ Add Objective" to create one.</div>
      ) : (
        <div className="env-list-scroll">
          <table className="env-table">
            <thead>
              <tr>
                <th>Code</th>
                <th>Title</th>
                <th>Category</th>
                <th>Target</th>
                <th>Current</th>
                <th>Unit</th>
                <th>Progress %</th>
                <th>Status</th>
                <th>Deadline</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {env.objectives.map((o: any) => {
                const pct = o.progress_percentage ?? 0;
                return (
                  <tr key={o.id} onClick={() => openDetail(o)} style={{ cursor: 'pointer' }}>
                    <td>{o.objective_code}</td>
                    <td>{o.title}</td>
                    <td>{o.category}</td>
                    <td>{o.target_value ?? '-'}</td>
                    <td>{o.current_value ?? '-'}</td>
                    <td>{o.unit || '-'}</td>
                    <td style={{ minWidth: 120 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <div className="env-progress-bar" style={{ flex: 1 }}>
                          <div
                            className="env-progress-bar__fill"
                            style={{
                              width: `${Math.min(pct, 100)}%`,
                              background: getProgressColor(pct),
                            }}
                          />
                        </div>
                        <span style={{ fontSize: 12, fontWeight: 600, whiteSpace: 'nowrap' }}>
                          {pct}%
                        </span>
                      </div>
                    </td>
                    <td>
                      <EnvStatusBadge status={o.status} />
                    </td>
                    <td>{o.end_date || '-'}</td>
                    <td>
                      <div className="flex items-center justify-center gap-1 table-actions" onClick={(e) => e.stopPropagation()}>
                        <button className="action-btn action-btn--view" title="View" onClick={() => openDetail(o)}>
                          <Eye size={15} />
                        </button>
                        <button className="action-btn action-btn--edit" title="Update Progress" onClick={() => openProgress(o)}>
                          <TrendingUp size={15} />
                        </button>
                        <button className="action-btn action-btn--edit" title="Edit" onClick={() => openEdit(o)}>
                          <Pencil size={15} />
                        </button>
                        <button className="action-btn action-btn--delete" title="Delete" onClick={() => handleDelete(o.id)}>
                          <Trash2 size={15} />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
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

      {/* ── Create/Edit Modal ────────────────────────── */}
      {showForm && (
        <div className="env-modal-overlay" onClick={() => { setShowForm(false); setSelectedObjective(null); }}>
          <div className="env-modal" style={{ maxWidth: 680 }} onClick={(e) => e.stopPropagation()}>
            <div className="env-modal-header">
              <h3>{selectedObjective ? 'Edit Objective' : 'New Objective'}</h3>
              <button
                className="env-modal-close"
                onClick={() => { setShowForm(false); setSelectedObjective(null); }}
              >
                &times;
              </button>
            </div>

            {/* Form fields */}
            <div className="env-form-group">
              <label>Title *</label>
              <input
                type="text"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                placeholder="Objective title"
              />
            </div>

            <div className="env-form-group">
              <label>Description</label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Describe the objective..."
              />
            </div>

            <div className="env-form-row">
              <SelectWithOther
                label="Category"
                options={OBJECTIVE_CATEGORIES}
                value={formData.category}
                onChange={(v) => setFormData({ ...formData, category: v })}
                placeholder="Select category"
              />
              <div className="env-form-group">
                <label>Status</label>
                <select
                  value={formData.status}
                  onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                >
                  {OBJECTIVE_STATUSES.map((s) => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="env-form-row">
              <div className="env-form-group">
                <label>Target Value</label>
                <input
                  type="number"
                  value={formData.target_value}
                  onChange={(e) => setFormData({ ...formData, target_value: e.target.value })}
                  placeholder="e.g. 100"
                />
              </div>
              <div className="env-form-group">
                <label>Current Value</label>
                <input
                  type="number"
                  value={formData.current_value}
                  onChange={(e) => setFormData({ ...formData, current_value: e.target.value })}
                  placeholder="e.g. 25"
                />
              </div>
              <div className="env-form-group">
                <label>Unit</label>
                <input
                  type="text"
                  value={formData.unit}
                  onChange={(e) => setFormData({ ...formData, unit: e.target.value })}
                  placeholder="e.g. tonnes, kWh"
                />
              </div>
            </div>

            <div className="env-form-row">
              <div className="env-form-group">
                <label>Baseline Value</label>
                <input
                  type="number"
                  value={formData.baseline_value}
                  onChange={(e) => setFormData({ ...formData, baseline_value: e.target.value })}
                  placeholder="Baseline"
                />
              </div>
              <div className="env-form-group">
                <label>Baseline Date</label>
                <input
                  type="date"
                  value={formData.baseline_date}
                  onChange={(e) => setFormData({ ...formData, baseline_date: e.target.value })}
                />
              </div>
            </div>

            <div className="env-form-row">
              <div className="env-form-group">
                <label>Deadline</label>
                <input
                  type="date"
                  value={formData.deadline}
                  onChange={(e) => setFormData({ ...formData, deadline: e.target.value })}
                />
              </div>
              <div className="env-form-group">
                <label>Responsible Person</label>
                <input
                  type="text"
                  value={formData.responsible_person}
                  onChange={(e) => setFormData({ ...formData, responsible_person: e.target.value })}
                  placeholder="Person name"
                />
              </div>
            </div>

            <div className="env-form-group">
              <label>Progress Notes</label>
              <textarea
                value={formData.progress_notes}
                onChange={(e) => setFormData({ ...formData, progress_notes: e.target.value })}
                placeholder="Any notes on progress..."
              />
            </div>

            <div className="env-modal-footer">
              <button
                className="env-btn env-btn--secondary"
                onClick={() => { setShowForm(false); setSelectedObjective(null); }}
              >
                Cancel
              </button>
              <button
                className="env-btn env-btn--primary"
                onClick={handleSave}
                disabled={saving || !formData.title.trim()}
              >
                {saving ? 'Saving...' : selectedObjective ? 'Update Objective' : 'Create Objective'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Detail Modal ────────────────────────────── */}
      {showDetail && selectedObjective && (
        <div className="env-modal-overlay" onClick={() => { setShowDetail(false); setSelectedObjective(null); }}>
          <div className="env-modal" style={{ maxWidth: 680 }} onClick={(e) => e.stopPropagation()}>
            <div className="env-modal-header">
              <h3>{selectedObjective.objective_code} - {selectedObjective.title}</h3>
              <button
                className="env-modal-close"
                onClick={() => { setShowDetail(false); setSelectedObjective(null); }}
              >
                &times;
              </button>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px 20px', fontSize: 13 }}>
              <div>
                <strong style={{ color: 'var(--color-text-secondary)', fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.3px' }}>Category</strong>
                <div style={{ marginTop: 2 }}>{selectedObjective.category || '-'}</div>
              </div>
              <div>
                <strong style={{ color: 'var(--color-text-secondary)', fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.3px' }}>Status</strong>
                <div style={{ marginTop: 2 }}><EnvStatusBadge status={selectedObjective.status} /></div>
              </div>
              <div>
                <strong style={{ color: 'var(--color-text-secondary)', fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.3px' }}>Target Value</strong>
                <div style={{ marginTop: 2 }}>{selectedObjective.target_value ?? '-'} {selectedObjective.unit || ''}</div>
              </div>
              <div>
                <strong style={{ color: 'var(--color-text-secondary)', fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.3px' }}>Current Value</strong>
                <div style={{ marginTop: 2 }}>{selectedObjective.current_value ?? '-'} {selectedObjective.unit || ''}</div>
              </div>
              <div>
                <strong style={{ color: 'var(--color-text-secondary)', fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.3px' }}>Baseline Value</strong>
                <div style={{ marginTop: 2 }}>{selectedObjective.baseline_value ?? '-'}</div>
              </div>
              <div>
                <strong style={{ color: 'var(--color-text-secondary)', fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.3px' }}>Baseline Year</strong>
                <div style={{ marginTop: 2 }}>{selectedObjective.baseline_year || selectedObjective.start_date || '-'}</div>
              </div>
              <div>
                <strong style={{ color: 'var(--color-text-secondary)', fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.3px' }}>Deadline</strong>
                <div style={{ marginTop: 2 }}>{selectedObjective.end_date || '-'}</div>
              </div>
              <div>
                <strong style={{ color: 'var(--color-text-secondary)', fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.3px' }}>Responsible</strong>
                <div style={{ marginTop: 2 }}>{selectedObjective.responsible_person || '-'}</div>
              </div>
              <div style={{ gridColumn: '1 / -1' }}>
                <strong style={{ color: 'var(--color-text-secondary)', fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.3px' }}>Progress</strong>
                <div style={{ marginTop: 6, display: 'flex', alignItems: 'center', gap: 10 }}>
                  <div className="env-progress-bar" style={{ flex: 1 }}>
                    <div
                      className="env-progress-bar__fill"
                      style={{
                        width: `${Math.min(selectedObjective.progress_percentage ?? 0, 100)}%`,
                        background: getProgressColor(selectedObjective.progress_percentage ?? 0),
                      }}
                    />
                  </div>
                  <span style={{ fontWeight: 600, fontSize: 14 }}>
                    {selectedObjective.progress_percentage ?? 0}%
                  </span>
                </div>
              </div>
              {selectedObjective.description && (
                <div style={{ gridColumn: '1 / -1' }}>
                  <strong style={{ color: 'var(--color-text-secondary)', fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.3px' }}>Description</strong>
                  <div style={{ marginTop: 2, whiteSpace: 'pre-wrap' }}>{selectedObjective.description}</div>
                </div>
              )}
              {selectedObjective.notes && (
                <div style={{ gridColumn: '1 / -1' }}>
                  <strong style={{ color: 'var(--color-text-secondary)', fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.3px' }}>Notes</strong>
                  <div style={{ marginTop: 2, whiteSpace: 'pre-wrap' }}>{selectedObjective.notes}</div>
                </div>
              )}
            </div>

            <div className="env-modal-footer">
              <button className="env-btn env-btn--secondary" onClick={() => openProgress(selectedObjective)}>
                Update Progress
              </button>
              <button className="env-btn env-btn--secondary" onClick={() => openEdit(selectedObjective)}>
                Edit
              </button>
              <button
                className="env-btn env-btn--secondary"
                onClick={() => { setShowDetail(false); setSelectedObjective(null); }}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Update Progress Modal ────────────────────── */}
      {showProgressModal && selectedObjective && (
        <div className="env-modal-overlay" onClick={() => { setShowProgressModal(false); setSelectedObjective(null); }}>
          <div className="env-modal" style={{ maxWidth: 440 }} onClick={(e) => e.stopPropagation()}>
            <div className="env-modal-header">
              <h3>Update Progress</h3>
              <button
                className="env-modal-close"
                onClick={() => { setShowProgressModal(false); setSelectedObjective(null); }}
              >
                &times;
              </button>
            </div>

            <p style={{ fontSize: 13, color: 'var(--color-text-secondary)', margin: '0 0 16px' }}>
              {selectedObjective.objective_code} - {selectedObjective.title}
            </p>

            <div className="env-form-group">
              <label>Current Value</label>
              <input
                type="number"
                value={progressData.current_value}
                onChange={(e) => setProgressData({ ...progressData, current_value: e.target.value })}
                placeholder={`Current: ${selectedObjective.current_value ?? 0}`}
              />
            </div>

            <div className="env-form-group">
              <label>Progress Notes</label>
              <textarea
                value={progressData.progress_notes}
                onChange={(e) => setProgressData({ ...progressData, progress_notes: e.target.value })}
                placeholder="Describe progress update..."
              />
            </div>

            <div className="env-modal-footer">
              <button
                className="env-btn env-btn--secondary"
                onClick={() => { setShowProgressModal(false); setSelectedObjective(null); }}
              >
                Cancel
              </button>
              <button
                className="env-btn env-btn--primary"
                onClick={handleUpdateProgress}
                disabled={saving}
              >
                {saving ? 'Saving...' : 'Update Progress'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
