import React, { useState, useEffect, useCallback } from 'react';
import { Eye, Pencil, Trash2, X as XIcon } from 'lucide-react';
import {
  INCIDENT_TYPES,
  ENV_INCIDENT_SEVERITIES,
  ENV_INCIDENT_STATUSES,
} from '../../../config/environmentalConfig';
import SeverityBadge from './SeverityBadge';
import EnvStatusBadge from './EnvStatusBadge';
import SelectWithOther from './SelectWithOther';
import ExportDropdown from '../../../components/ui/ExportDropdown';
import { createEnvExportHandler } from './envExportHelper';

interface IncidentsListProps {
  env: any;
}

const DEFAULT_FILTERS = {
  search: '',
  incident_type: '',
  severity: '',
  status: '',
  date_from: '',
  date_to: '',
  page: 1,
  per_page: 15,
};

const EMPTY_FORM: Record<string, any> = {
  incident_type: '',
  incident_date: '',
  incident_time: '',
  location: '',
  area: '',
  zone: '',
  description: '',
  environmental_impact: '',
  severity: '',
  immediate_action: '',
  root_cause: '',
  contributing_factors: '',
  reported_by: '',
  assigned_to: '',
  status: 'Reported',
  notes: '',
};

export default function IncidentsList({ env }: IncidentsListProps) {
  const [filters, setFilters] = useState({ ...DEFAULT_FILTERS });
  const [showForm, setShowForm] = useState(false);
  const [showDetail, setShowDetail] = useState(false);
  const [selectedIncident, setSelectedIncident] = useState<any>(null);
  const [formData, setFormData] = useState<Record<string, any>>({ ...EMPTY_FORM });
  const [saving, setSaving] = useState(false);
  const [closureNotes, setClosureNotes] = useState('');
  const [showClosePrompt, setShowClosePrompt] = useState(false);

  const load = useCallback(
    (overrides?: Record<string, unknown>) => {
      env.fetchIncidents({ ...filters, ...overrides });
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
    env.fetchIncidents(next);
  }

  function goToPage(page: number) {
    const next = { ...filters, page };
    setFilters(next);
    env.fetchIncidents(next);
  }

  /* ── Form helpers ───────────────────────────────── */

  function set(key: string, value: any) {
    setFormData((prev: Record<string, any>) => ({ ...prev, [key]: value }));
  }

  function openAdd() {
    setSelectedIncident(null);
    setFormData({ ...EMPTY_FORM });
    setShowForm(true);
  }

  function openEdit(incident: any) {
    setSelectedIncident(incident);
    setFormData({
      incident_type: incident.incident_type || '',
      incident_date: incident.incident_date ? incident.incident_date.slice(0, 10) : '',
      incident_time: incident.incident_time || '',
      location: incident.location || '',
      area: incident.area || '',
      zone: incident.zone || '',
      description: incident.description || '',
      environmental_impact: incident.environmental_impact || '',
      severity: incident.severity || '',
      immediate_action: incident.immediate_action || '',
      root_cause: incident.root_cause || '',
      contributing_factors: incident.contributing_factors || '',
      reported_by: incident.reported_by || '',
      assigned_to: incident.responsible_person || incident.assigned_to || '',
      status: incident.status || 'Reported',
      notes: incident.notes || '',
    });
    setShowForm(true);
    setShowDetail(false);
  }

  function openDetail(incident: any) {
    setSelectedIncident(incident);
    setShowDetail(true);
  }

  /* ── CRUD callbacks ─────────────────────────────── */

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      if (selectedIncident?.id) {
        await env.updateIncident(selectedIncident.id, formData);
      } else {
        await env.createIncident(formData);
      }
      setShowForm(false);
      setSelectedIncident(null);
      load();
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: number) {
    if (!window.confirm('Are you sure you want to delete this incident?')) return;
    await env.deleteIncident(id);
    load();
  }

  async function handleClose() {
    if (!selectedIncident?.id || !closureNotes.trim()) return;
    await env.closeIncident(selectedIncident.id, closureNotes);
    setShowClosePrompt(false);
    setClosureNotes('');
    setShowDetail(false);
    setSelectedIncident(null);
    load();
  }

  /* ── Export ───────────────────────────────────────── */

  const handleExport = createEnvExportHandler({
    title: 'Environmental Incidents',
    filename: 'incidents_export',
    headers: ['Code', 'Type', 'Date', 'Location', 'Area', 'Severity', 'Status', 'Reported By', 'Assigned To'],
    getRows: () => (env.incidents || []).map((i: any) => [
      i.incident_code, i.incident_type || '', i.incident_date ? i.incident_date.slice(0, 10) : '',
      i.location || '', i.area || '', i.severity || '', i.status || '',
      i.reported_by || '', i.responsible_person || '',
    ]),
  });

  /* ── Pagination data ────────────────────────────── */

  const { total, page, lastPage } = env.incidentsPagination;

  /* ── Render ─────────────────────────────────────── */

  return (
    <div>
      {/* ── Header ──────────────────────────────────── */}
      <div className="env-section-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <h2 style={{ margin: 0 }}>Environmental Incidents</h2>
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
          <button className="env-btn env-btn--primary" onClick={openAdd}>+ Report Incident</button>
        </div>
      </div>

      {/* ── Filters ─────────────────────────────────── */}
      <div className="env-filters-row">
        <input
          type="text"
          placeholder="Search incidents..."
          value={filters.search}
          onChange={(e) => onFilterChange('search', e.target.value)}
        />
        <select
          value={filters.incident_type}
          onChange={(e) => onFilterChange('incident_type', e.target.value)}
        >
          <option value="">All Types</option>
          {INCIDENT_TYPES.map((t) => (
            <option key={t} value={t}>{t}</option>
          ))}
        </select>
        <select
          value={filters.severity}
          onChange={(e) => onFilterChange('severity', e.target.value)}
        >
          <option value="">All Severities</option>
          {ENV_INCIDENT_SEVERITIES.map((s) => (
            <option key={s} value={s}>{s}</option>
          ))}
        </select>
        <select
          value={filters.status}
          onChange={(e) => onFilterChange('status', e.target.value)}
        >
          <option value="">All Statuses</option>
          {ENV_INCIDENT_STATUSES.map((s) => (
            <option key={s} value={s}>{s}</option>
          ))}
        </select>
        <input
          type="date"
          value={filters.date_from}
          onChange={(e) => onFilterChange('date_from', e.target.value)}
          title="Date from"
        />
        <input
          type="date"
          value={filters.date_to}
          onChange={(e) => onFilterChange('date_to', e.target.value)}
          title="Date to"
        />
      </div>

      {/* ── Table ───────────────────────────────────── */}
      {env.incidentsLoading ? (
        <div className="env-empty-state">Loading...</div>
      ) : !env.incidents?.length ? (
        <div className="env-empty-state">No incidents found. Click "+ Report Incident" to create one.</div>
      ) : (
        <table className="env-table">
          <thead>
            <tr>
              <th>Code</th>
              <th>Type</th>
              <th>Date</th>
              <th>Location / Area</th>
              <th>Severity</th>
              <th>Status</th>
              <th>Reported By</th>
              <th>Assigned To</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {env.incidents.map((i: any) => (
              <tr key={i.id} onClick={() => openDetail(i)} style={{ cursor: 'pointer' }}>
                <td>{i.incident_code}</td>
                <td>{i.incident_type}</td>
                <td>{i.incident_date ? i.incident_date.slice(0, 10) : '-'}</td>
                <td>{[i.location, i.area].filter(Boolean).join(' / ') || '-'}</td>
                <td>
                  <SeverityBadge severity={i.severity} />
                </td>
                <td>
                  <EnvStatusBadge status={i.status} />
                </td>
                <td>{i.reported_by || '-'}</td>
                <td>{i.responsible_person || '-'}</td>
                <td>
                  <div className="flex items-center justify-center gap-1 table-actions" onClick={(e) => e.stopPropagation()}>
                    <button className="action-btn action-btn--view" title="View" onClick={() => openDetail(i)}>
                      <Eye size={15} />
                    </button>
                    <button className="action-btn action-btn--edit" title="Edit" onClick={() => openEdit(i)}>
                      <Pencil size={15} />
                    </button>
                    <button className="action-btn action-btn--delete" title="Delete" onClick={() => handleDelete(i.id)}>
                      <Trash2 size={15} />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
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

      {/* ── Create / Edit Modal ─────────────────────── */}
      {showForm && (
        <div className="env-modal-overlay" onClick={() => { setShowForm(false); setSelectedIncident(null); }}>
          <div className="env-modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 720 }}>
            <div className="env-modal-header">
              <h3>{selectedIncident ? 'Edit Incident' : 'Report New Incident'}</h3>
              <button type="button" className="env-modal-close" onClick={() => { setShowForm(false); setSelectedIncident(null); }} title="Close">
                <XIcon size={18} />
              </button>
            </div>

            <form onSubmit={handleSave}>
              {/* Incident Type + Severity */}
              <div className="env-form-row">
                <SelectWithOther
                  label="Incident Type"
                  options={INCIDENT_TYPES}
                  value={formData.incident_type}
                  onChange={(v) => set('incident_type', v)}
                  placeholder="Select type"
                />
                <div className="env-form-group">
                  <label>Severity</label>
                  <select value={formData.severity} onChange={(e) => set('severity', e.target.value)}>
                    <option value="">Select severity</option>
                    {ENV_INCIDENT_SEVERITIES.map((s) => (
                      <option key={s} value={s}>{s}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Date + Time */}
              <div className="env-form-row">
                <div className="env-form-group">
                  <label>Incident Date</label>
                  <input
                    type="date"
                    value={formData.incident_date}
                    onChange={(e) => set('incident_date', e.target.value)}
                  />
                </div>
                <div className="env-form-group">
                  <label>Incident Time</label>
                  <input
                    type="time"
                    value={formData.incident_time}
                    onChange={(e) => set('incident_time', e.target.value)}
                  />
                </div>
              </div>

              {/* Location, Area, Zone */}
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
                  <label>Zone</label>
                  <input
                    type="text"
                    value={formData.zone}
                    onChange={(e) => set('zone', e.target.value)}
                    placeholder="Zone"
                  />
                </div>
              </div>

              {/* Description */}
              <div className="env-form-group">
                <label>
                  Description <span style={{ color: '#EF4444' }}>*</span>
                </label>
                <textarea
                  rows={3}
                  value={formData.description}
                  onChange={(e) => set('description', e.target.value)}
                  required
                  placeholder="Describe the incident..."
                />
              </div>

              {/* Environmental Impact */}
              <div className="env-form-group">
                <label>Environmental Impact</label>
                <textarea
                  rows={2}
                  value={formData.environmental_impact}
                  onChange={(e) => set('environmental_impact', e.target.value)}
                  placeholder="Describe the environmental impact..."
                />
              </div>

              {/* Immediate Action */}
              <div className="env-form-group">
                <label>Immediate Action</label>
                <textarea
                  rows={2}
                  value={formData.immediate_action}
                  onChange={(e) => set('immediate_action', e.target.value)}
                  placeholder="Actions taken immediately..."
                />
              </div>

              {/* Root Cause */}
              <div className="env-form-group">
                <label>Root Cause</label>
                <textarea
                  rows={2}
                  value={formData.root_cause}
                  onChange={(e) => set('root_cause', e.target.value)}
                  placeholder="Root cause analysis..."
                />
              </div>

              {/* Contributing Factors */}
              <div className="env-form-group">
                <label>Contributing Factors</label>
                <textarea
                  rows={2}
                  value={formData.contributing_factors}
                  onChange={(e) => set('contributing_factors', e.target.value)}
                  placeholder="Contributing factors..."
                />
              </div>

              {/* Reported By + Assigned To + Status */}
              <div className="env-form-row">
                <div className="env-form-group">
                  <label>Reported By</label>
                  <input
                    type="text"
                    value={formData.reported_by}
                    onChange={(e) => set('reported_by', e.target.value)}
                    placeholder="Reporter name"
                  />
                </div>
                <div className="env-form-group">
                  <label>Assigned To</label>
                  <input
                    type="text"
                    value={formData.assigned_to}
                    onChange={(e) => set('assigned_to', e.target.value)}
                    placeholder="Assigned person"
                  />
                </div>
                <div className="env-form-group">
                  <label>Status</label>
                  <select value={formData.status} onChange={(e) => set('status', e.target.value)}>
                    {ENV_INCIDENT_STATUSES.map((s) => (
                      <option key={s} value={s}>{s}</option>
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
                  onClick={() => { setShowForm(false); setSelectedIncident(null); }}
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

      {/* ── Detail Modal ────────────────────────────── */}
      {showDetail && selectedIncident && (
        <div
          className="env-modal-overlay"
          onClick={() => { setShowDetail(false); setSelectedIncident(null); setShowClosePrompt(false); setClosureNotes(''); }}
        >
          <div className="env-modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 720 }}>
            <div className="env-modal-header">
              <h3>{selectedIncident.incident_code} &mdash; {selectedIncident.incident_type}</h3>
              <button
                type="button"
                className="env-modal-close"
                onClick={() => { setShowDetail(false); setSelectedIncident(null); setShowClosePrompt(false); setClosureNotes(''); }}
                title="Close"
              >
                <XIcon size={18} />
              </button>
            </div>

            <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
              <SeverityBadge severity={selectedIncident.severity} />
              <EnvStatusBadge status={selectedIncident.status} />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px 24px', fontSize: 13, marginBottom: 16 }}>
              <div><strong>Date:</strong> {selectedIncident.incident_date ? selectedIncident.incident_date.slice(0, 10) : '-'}</div>
              <div><strong>Time:</strong> {selectedIncident.incident_time || '-'}</div>
              <div><strong>Location:</strong> {selectedIncident.location || '-'}</div>
              <div><strong>Area:</strong> {selectedIncident.area || '-'}</div>
              <div><strong>Zone:</strong> {selectedIncident.zone || '-'}</div>
              <div><strong>Reported By:</strong> {selectedIncident.reported_by || '-'}</div>
              <div><strong>Assigned To:</strong> {selectedIncident.responsible_person || '-'}</div>
            </div>

            {selectedIncident.description && (
              <div style={{ marginBottom: 12 }}>
                <strong style={{ fontSize: 12, textTransform: 'uppercase', color: '#6B7280' }}>Description</strong>
                <p style={{ margin: '4px 0 0', fontSize: 13, whiteSpace: 'pre-wrap' }}>{selectedIncident.description}</p>
              </div>
            )}

            {selectedIncident.environmental_impact && (
              <div style={{ marginBottom: 12 }}>
                <strong style={{ fontSize: 12, textTransform: 'uppercase', color: '#6B7280' }}>Environmental Impact</strong>
                <p style={{ margin: '4px 0 0', fontSize: 13, whiteSpace: 'pre-wrap' }}>{selectedIncident.environmental_impact}</p>
              </div>
            )}

            {selectedIncident.immediate_action && (
              <div style={{ marginBottom: 12 }}>
                <strong style={{ fontSize: 12, textTransform: 'uppercase', color: '#6B7280' }}>Immediate Action</strong>
                <p style={{ margin: '4px 0 0', fontSize: 13, whiteSpace: 'pre-wrap' }}>{selectedIncident.immediate_action}</p>
              </div>
            )}

            {selectedIncident.root_cause && (
              <div style={{ marginBottom: 12 }}>
                <strong style={{ fontSize: 12, textTransform: 'uppercase', color: '#6B7280' }}>Root Cause</strong>
                <p style={{ margin: '4px 0 0', fontSize: 13, whiteSpace: 'pre-wrap' }}>{selectedIncident.root_cause}</p>
              </div>
            )}

            {/* Evidence URLs */}
            {selectedIncident.evidence && selectedIncident.evidence.length > 0 && (
              <div style={{ marginBottom: 12 }}>
                <strong style={{ fontSize: 12, textTransform: 'uppercase', color: '#6B7280' }}>Evidence</strong>
                <ul style={{ margin: '4px 0 0', paddingLeft: 20, fontSize: 13 }}>
                  {selectedIncident.evidence.map((ev: any) => (
                    <li key={ev.id}>
                      <a href={ev.url} target="_blank" rel="noopener noreferrer">
                        {ev.original_name || ev.file_path}
                      </a>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Close Incident */}
            {selectedIncident.status !== 'Closed' && !showClosePrompt && (
              <div style={{ display: 'flex', gap: 8, marginTop: 16, paddingTop: 16, borderTop: '1px solid var(--color-border)' }}>
                <button className="btn btn-secondary" onClick={() => openEdit(selectedIncident)}>
                  Edit
                </button>
                <button className="btn btn-primary" onClick={() => setShowClosePrompt(true)}>
                  Close Incident
                </button>
              </div>
            )}

            {showClosePrompt && (
              <div style={{ marginTop: 16, paddingTop: 16, borderTop: '1px solid var(--color-border)' }}>
                <div className="env-form-group">
                  <label>
                    Closure Notes <span style={{ color: '#EF4444' }}>*</span>
                  </label>
                  <textarea
                    rows={3}
                    value={closureNotes}
                    onChange={(e) => setClosureNotes(e.target.value)}
                    placeholder="Provide closure notes..."
                  />
                </div>
                <div className="env-modal-footer">
                  <button className="env-btn env-btn--secondary" onClick={() => { setShowClosePrompt(false); setClosureNotes(''); }}>
                    Cancel
                  </button>
                  <button
                    className="env-btn env-btn--primary"
                    disabled={!closureNotes.trim()}
                    onClick={handleClose}
                  >
                    Confirm Close
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
