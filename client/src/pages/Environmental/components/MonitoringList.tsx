import { useState, useEffect, useCallback } from 'react';
import { Search, Plus, Eye, Pencil, Trash2, X as XIcon, ChevronLeft, ChevronRight, Activity } from 'lucide-react';
import EmptyState from '../../../components/ui/EmptyState';
import { PageSpinner } from '../../../components/ui/Spinner';
import ComplianceBadge from './ComplianceBadge';
import {
  MONITORING_TYPES,
  MONITORING_COMPLIANCE,
} from '../../../config/environmentalConfig';
import SelectWithOther from './SelectWithOther';
import ExportDropdown from '../../../components/ui/ExportDropdown';
import { createEnvExportHandler } from './envExportHelper';

interface Props {
  env: any;
}

const emptyForm: Record<string, any> = {
  monitoring_type: '',
  source_area: '',
  parameter: '',
  measured_value: '',
  permissible_limit: '',
  unit: '',
  monitoring_date: '',
  monitoring_time: '',
  conducted_by: '',
  equipment_used: '',
  remarks: '',
};

export default function MonitoringList({ env }: Props) {
  const [filters, setFilters] = useState<Record<string, string>>({
    search: '',
    monitoring_type: '',
    compliance_status: '',
    date_from: '',
    date_to: '',
  });
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState<Record<string, any>>({ ...emptyForm });
  const [saving, setSaving] = useState(false);

  // ── Fetch on mount & filter/page change ────────────
  const loadData = useCallback(
    (page = 1) => {
      env.fetchMonitoring({ ...filters, page, per_page: 20 });
    },
    [env, filters],
  );

  useEffect(() => {
    loadData(1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters]);

  // ── Filter helpers ─────────────────────────────────
  function handleFilterChange(key: string, value: string) {
    setFilters((prev) => ({ ...prev, [key]: value }));
  }

  // ── Modal helpers ──────────────────────────────────
  function openCreate() {
    setEditingId(null);
    setForm({ ...emptyForm });
    setShowModal(true);
  }

  function openEdit(record: any) {
    setEditingId(record.id);
    setForm({
      monitoring_type: record.category ?? record.monitoring_type ?? '',
      source_area: record.location ?? record.source_area ?? '',
      parameter: record.parameter ?? '',
      measured_value: record.measurement_value ?? record.measured_value ?? '',
      permissible_limit: record.threshold_max ?? record.permissible_limit ?? '',
      unit: record.unit ?? '',
      monitoring_date: record.monitoring_date ?? '',
      monitoring_time: record.monitoring_time ?? '',
      conducted_by: record.sampled_by ?? record.conducted_by ?? '',
      equipment_used: record.equipment_used ?? '',
      remarks: record.notes ?? record.remarks ?? '',
    });
    setShowModal(true);
  }

  function closeModal() {
    setShowModal(false);
    setEditingId(null);
  }

  async function handleSave() {
    setSaving(true);
    try {
      if (editingId) {
        await env.updateMonitoring(editingId, form);
      } else {
        await env.createMonitoring(form);
      }
      closeModal();
      loadData(env.monitoringPagination.page);
    } catch (err) {
      console.error('Failed to save monitoring record:', err);
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: number) {
    if (!window.confirm('Delete this monitoring reading?')) return;
    try {
      await env.deleteMonitoring(id);
      loadData(env.monitoringPagination.page);
    } catch (err) {
      console.error('Failed to delete monitoring record:', err);
    }
  }

  const handleExport = createEnvExportHandler({
    title: 'Emissions & Monitoring',
    filename: 'emissions_monitoring',
    headers: ['Code', 'Type', 'Parameter', 'Measured Value', 'Permissible Limit', 'Unit', 'Compliance', 'Date', 'Conducted By'],
    getRows: () => (env.monitoring || []).map((r: any) => [
      r.monitoring_code, r.category || '', r.parameter || '', r.measurement_value ?? '',
      r.threshold_max ?? '', r.unit || '', r.is_exceedance ? 'Non-Compliant' : 'Compliant',
      r.monitoring_date || '', r.sampled_by || '',
    ]),
  });

  // ── Compliance helper ──────────────────────────────
  function getComplianceLabel(record: any): string {
    if (record.status) {
      const s = record.status.toLowerCase();
      if (MONITORING_COMPLIANCE.map((c) => c.toLowerCase()).includes(s)) return record.status;
    }
    if (record.is_exceedance) return 'Non-Compliant';
    return 'Compliant';
  }

  // ── Pagination ─────────────────────────────────────
  const { total, page, lastPage } = env.monitoringPagination;

  // ── Non-compliant row style ────────────────────────
  const nonCompliantRowStyle: React.CSSProperties = {
    backgroundColor: 'rgba(254, 226, 226, 0.35)',
  };

  // ── Render ─────────────────────────────────────────
  return (
    <div className="env-section">
      {/* ── Section Header ─────────────────────────── */}
      <div className="env-section-header">
        <div className="env-section-header-left">
          <h2 className="env-section-title">Emissions Monitoring</h2>
          <span className="env-section-count">{total} readings</span>
        </div>
        <div className="env-section-header-actions">
          <ExportDropdown onExport={handleExport} />
          <button className="env-btn env-btn--primary" onClick={openCreate}>
            <Plus size={15} /> Add Reading
          </button>
        </div>
      </div>

      {/* ── Info Banner ────────────────────────────── */}
      <div className="env-info-banner">
        <span className="env-info-banner__icon">ℹ️</span>
        <p>Monitor air quality, noise levels, water discharge, and other environmental parameters. Track readings against permissible limits to ensure regulatory compliance.</p>
      </div>

      {/* ── Filters Row ────────────────────────────── */}
      <div className="env-filters-row">
        <div className="env-filter-input-wrapper">
          <Search size={15} className="env-filter-icon" />
          <input
            className="env-filter-input"
            placeholder="Search monitoring records..."
            value={filters.search}
            onChange={(e) => handleFilterChange('search', e.target.value)}
          />
        </div>
        <select
          className="env-filter-select"
          value={filters.monitoring_type}
          onChange={(e) => handleFilterChange('monitoring_type', e.target.value)}
        >
          <option value="">All Types</option>
          {MONITORING_TYPES.map((t) => (
            <option key={t} value={t}>{t}</option>
          ))}
        </select>
        <select
          className="env-filter-select"
          value={filters.compliance_status}
          onChange={(e) => handleFilterChange('compliance_status', e.target.value)}
        >
          <option value="">All Compliance</option>
          {MONITORING_COMPLIANCE.map((c) => (
            <option key={c} value={c}>{c}</option>
          ))}
        </select>
        <input
          className="env-filter-input env-filter-date"
          type="date"
          placeholder="From"
          value={filters.date_from}
          onChange={(e) => handleFilterChange('date_from', e.target.value)}
        />
        <input
          className="env-filter-input env-filter-date"
          type="date"
          placeholder="To"
          value={filters.date_to}
          onChange={(e) => handleFilterChange('date_to', e.target.value)}
        />
      </div>

      {/* ── Data Table ─────────────────────────────── */}
      <div className="env-table-wrapper">
        {env.monitoringLoading ? (
          <PageSpinner label="Loading monitoring records..." />
        ) : !env.monitoring.length ? (
          <EmptyState
            icon={Activity}
            title="No monitoring readings found"
            description="Try adjusting your filters or add a new reading"
            action={{ label: '+ Add Reading', onClick: openCreate }}
          />
        ) : (
          <table className="env-table">
            <thead>
              <tr>
                <th>Code</th>
                <th>Type</th>
                <th>Parameter</th>
                <th>Measured Value</th>
                <th>Permissible Limit</th>
                <th>Unit</th>
                <th>Compliance</th>
                <th>Date</th>
                <th>Conducted By</th>
                <th className="flex items-center justify-center gap-1 table-actions-col">Actions</th>
              </tr>
            </thead>
            <tbody>
              {env.monitoring.map((r: any) => {
                const complianceLabel = getComplianceLabel(r);
                const isNonCompliant = complianceLabel.toLowerCase() === 'non-compliant';
                return (
                  <tr key={r.id} style={isNonCompliant ? nonCompliantRowStyle : undefined}>
                    <td className="env-table-code">{r.monitoring_code}</td>
                    <td>{r.category || '\u2014'}</td>
                    <td>{r.parameter}</td>
                    <td className="env-table-number">{r.measurement_value}</td>
                    <td className="env-table-number">{r.threshold_max ?? '\u2014'}</td>
                    <td>{r.unit}</td>
                    <td><ComplianceBadge status={complianceLabel} /></td>
                    <td>{r.monitoring_date}</td>
                    <td>{r.sampled_by || '\u2014'}</td>
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
      </div>

      {/* ── Pagination ─────────────────────────────── */}
      {lastPage > 1 && (
        <div className="env-pagination">
          <span className="env-pagination-info">
            Showing {(page - 1) * 20 + 1}&ndash;{Math.min(page * 20, total)} of {total}
          </span>
          <div className="env-pagination-controls">
            <button
              className="env-pagination-btn"
              disabled={page <= 1}
              onClick={() => loadData(page - 1)}
            >
              <ChevronLeft size={16} />
            </button>
            <span className="env-pagination-page">{page} / {lastPage}</span>
            <button
              className="env-pagination-btn"
              disabled={page >= lastPage}
              onClick={() => loadData(page + 1)}
            >
              <ChevronRight size={16} />
            </button>
          </div>
        </div>
      )}

      {/* ── Modal Form ─────────────────────────────── */}
      {showModal && (
        <div className="env-modal-overlay" onClick={closeModal}>
          <div className="env-modal" onClick={(e) => e.stopPropagation()}>
            <div className="env-modal-header">
              <h3 className="env-modal-title">{editingId ? 'Edit Reading' : 'Add Reading'}</h3>
              <button className="env-modal-close" onClick={closeModal}><XIcon size={18} /></button>
            </div>

            <div className="env-modal-body">
              <div className="env-form-grid">
                {/* Monitoring Type */}
                <SelectWithOther
                  label="Monitoring Type"
                  required
                  options={MONITORING_TYPES}
                  value={form.monitoring_type}
                  onChange={(v) => setForm({ ...form, monitoring_type: v })}
                  placeholder="Select type"
                />

                {/* Source Area */}
                <div className="env-form-group">
                  <label className="env-form-label">Source / Location</label>
                  <input className="env-form-input" value={form.source_area} onChange={(e) => setForm({ ...form, source_area: e.target.value })} />
                </div>

                {/* Parameter */}
                <div className="env-form-group">
                  <label className="env-form-label">Parameter *</label>
                  <input className="env-form-input" placeholder="e.g. PM10, NOx, BOD" value={form.parameter} onChange={(e) => setForm({ ...form, parameter: e.target.value })} />
                </div>

                {/* Measured Value */}
                <div className="env-form-group">
                  <label className="env-form-label">Measured Value *</label>
                  <input className="env-form-input" type="number" step="any" value={form.measured_value} onChange={(e) => setForm({ ...form, measured_value: e.target.value })} />
                </div>

                {/* Permissible Limit */}
                <div className="env-form-group">
                  <label className="env-form-label">Permissible Limit</label>
                  <input className="env-form-input" type="number" step="any" value={form.permissible_limit} onChange={(e) => setForm({ ...form, permissible_limit: e.target.value })} />
                </div>

                {/* Unit */}
                <div className="env-form-group">
                  <label className="env-form-label">Unit *</label>
                  <input className="env-form-input" placeholder="e.g. mg/m3, dBA, mg/L" value={form.unit} onChange={(e) => setForm({ ...form, unit: e.target.value })} />
                </div>

                {/* Monitoring Date */}
                <div className="env-form-group">
                  <label className="env-form-label">Monitoring Date *</label>
                  <input className="env-form-input" type="date" value={form.monitoring_date} onChange={(e) => setForm({ ...form, monitoring_date: e.target.value })} />
                </div>

                {/* Monitoring Time */}
                <div className="env-form-group">
                  <label className="env-form-label">Monitoring Time</label>
                  <input className="env-form-input" type="time" value={form.monitoring_time} onChange={(e) => setForm({ ...form, monitoring_time: e.target.value })} />
                </div>

                {/* Conducted By */}
                <div className="env-form-group">
                  <label className="env-form-label">Conducted By</label>
                  <input className="env-form-input" value={form.conducted_by} onChange={(e) => setForm({ ...form, conducted_by: e.target.value })} />
                </div>

                {/* Equipment Used */}
                <div className="env-form-group">
                  <label className="env-form-label">Equipment Used</label>
                  <input className="env-form-input" value={form.equipment_used} onChange={(e) => setForm({ ...form, equipment_used: e.target.value })} />
                </div>

                {/* Remarks */}
                <div className="env-form-group env-form-group--full">
                  <label className="env-form-label">Remarks</label>
                  <textarea className="env-form-input env-form-textarea" rows={3} value={form.remarks} onChange={(e) => setForm({ ...form, remarks: e.target.value })} />
                </div>
              </div>
            </div>

            <div className="env-modal-footer">
              <button className="env-btn env-btn--secondary" onClick={closeModal}>Cancel</button>
              <button
                className="env-btn env-btn--primary"
                onClick={handleSave}
                disabled={saving || !form.monitoring_type || !form.parameter || !form.measured_value || !form.unit || !form.monitoring_date}
              >
                {saving ? 'Saving...' : editingId ? 'Update Reading' : 'Create Reading'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
