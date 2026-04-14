import { useState, useEffect, useCallback } from 'react';
import { Search, Plus, Eye, Pencil, Trash2, X as XIcon, ChevronLeft, ChevronRight, Recycle } from 'lucide-react';
import EmptyState from '../../../components/ui/EmptyState';
import { PageSpinner } from '../../../components/ui/Spinner';
import EnvStatusBadge from './EnvStatusBadge';
import WasteCategoryBadge from './WasteCategoryBadge';
import {
  WASTE_TYPES,
  WASTE_CATEGORIES,
  WASTE_STATUSES,
  WASTE_DISPOSAL_METHODS,
} from '../../../config/environmentalConfig';
import SelectWithOther from './SelectWithOther';
import ExportDropdown from '../../../components/ui/ExportDropdown';
import { createEnvExportHandler } from './envExportHelper';

interface Props {
  env: any;
}

const UNITS = ['kg', 'tonnes', 'litres', 'm3', 'drums'];

const emptyForm: Record<string, any> = {
  waste_type: '',
  waste_category: '',
  source_area: '',
  department: '',
  quantity: '',
  unit: 'kg',
  storage_location: '',
  container_type: '',
  responsible_person: '',
  disposal_method: '',
  disposal_vendor: '',
  manifest_number: '',
  disposal_date: '',
  collection_date: '',
  status: 'Pending Collection',
  notes: '',
};

export default function WasteList({ env }: Props) {
  const [filters, setFilters] = useState<Record<string, string>>({
    search: '',
    waste_type: '',
    waste_category: '',
    status: '',
  });
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState<Record<string, any>>({ ...emptyForm });
  const [saving, setSaving] = useState(false);

  // ── Fetch on mount & filter/page change ────────────
  const loadData = useCallback(
    (page = 1) => {
      env.fetchWaste({ ...filters, page, per_page: 20 });
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
      waste_type: record.waste_type ?? '',
      waste_category: record.waste_category ?? '',
      source_area: record.source ?? record.source_area ?? '',
      department: record.department ?? '',
      quantity: record.quantity ?? '',
      unit: record.unit ?? 'kg',
      storage_location: record.storage_location ?? '',
      container_type: record.container_type ?? '',
      responsible_person: record.responsible_person ?? '',
      disposal_method: record.disposal_method ?? '',
      disposal_vendor: record.disposal_vendor ?? '',
      manifest_number: record.manifest_number ?? '',
      disposal_date: record.disposal_date ?? '',
      collection_date: record.collection_date ?? '',
      status: record.status ?? 'Pending Collection',
      notes: record.notes ?? '',
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
        await env.updateWaste(editingId, form);
      } else {
        await env.createWaste(form);
      }
      closeModal();
      loadData(env.wastePagination.page);
    } catch (err) {
      console.error('Failed to save waste record:', err);
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: number) {
    if (!window.confirm('Delete this waste record?')) return;
    try {
      await env.deleteWaste(id);
      loadData(env.wastePagination.page);
    } catch (err) {
      console.error('Failed to delete waste record:', err);
    }
  }

  const handleExport = createEnvExportHandler({
    title: 'Waste Management',
    filename: 'waste_management',
    headers: ['Code', 'Waste Type', 'Category', 'Quantity', 'Unit', 'Disposal Method', 'Vendor', 'Status'],
    getRows: () => (env.waste || []).map((r: any) => [
      r.waste_code, r.waste_type || '', r.waste_category || '', r.quantity ?? '', r.unit || '',
      r.disposal_method || '', r.disposal_vendor || '', r.status || '',
    ]),
  });

  // ── Pagination ─────────────────────────────────────
  const { total, page, lastPage } = env.wastePagination;

  // ── Render ─────────────────────────────────────────
  return (
    <div className="env-section">
      {/* ── Section Header ─────────────────────────── */}
      <div className="env-section-header">
        <div className="env-section-header-left">
          <h2 className="env-section-title">Waste Management</h2>
          <span className="env-section-count">{total} records</span>
        </div>
        <div className="env-section-header-actions">
          <ExportDropdown onExport={handleExport} />
          <button className="env-btn env-btn--primary" onClick={openCreate}>
            <Plus size={15} /> Add Record
          </button>
        </div>
      </div>

      {/* ── Info Banner ────────────────────────────── */}
      <div className="env-info-banner">
        <span className="env-info-banner__icon">ℹ️</span>
        <p>Track and manage waste generation, disposal methods, and recycling records. Ensure compliance with waste management regulations and monitor waste reduction targets.</p>
      </div>

      {/* ── Filters Row ────────────────────────────── */}
      <div className="env-filters-row">
        <div className="env-filter-input-wrapper">
          <Search size={15} className="env-filter-icon" />
          <input
            className="env-filter-input"
            placeholder="Search waste records..."
            value={filters.search}
            onChange={(e) => handleFilterChange('search', e.target.value)}
          />
        </div>
        <select
          className="env-filter-select"
          value={filters.waste_type}
          onChange={(e) => handleFilterChange('waste_type', e.target.value)}
        >
          <option value="">All Types</option>
          {WASTE_TYPES.map((t) => (
            <option key={t} value={t}>{t}</option>
          ))}
        </select>
        <select
          className="env-filter-select"
          value={filters.waste_category}
          onChange={(e) => handleFilterChange('waste_category', e.target.value)}
        >
          <option value="">All Categories</option>
          {WASTE_CATEGORIES.map((c) => (
            <option key={c} value={c}>{c}</option>
          ))}
        </select>
        <select
          className="env-filter-select"
          value={filters.status}
          onChange={(e) => handleFilterChange('status', e.target.value)}
        >
          <option value="">All Statuses</option>
          {WASTE_STATUSES.map((s) => (
            <option key={s} value={s}>{s}</option>
          ))}
        </select>
      </div>

      {/* ── Data Table ─────────────────────────────── */}
      <div className="env-table-wrapper">
        {env.wasteLoading ? (
          <PageSpinner label="Loading waste records..." />
        ) : !env.waste.length ? (
          <EmptyState
            icon={Recycle}
            title="No waste records found"
            description="Try adjusting your filters or add a new record"
            action={{ label: '+ Add Record', onClick: openCreate }}
          />
        ) : (
          <table className="env-table">
            <thead>
              <tr>
                <th>Code</th>
                <th>Waste Type</th>
                <th>Category</th>
                <th>Quantity</th>
                <th>Disposal Method</th>
                <th>Vendor</th>
                <th>Status</th>
                <th className="flex items-center justify-center gap-1 table-actions-col">Actions</th>
              </tr>
            </thead>
            <tbody>
              {env.waste.map((r: any) => (
                <tr key={r.id}>
                  <td className="env-table-code">{r.waste_code}</td>
                  <td>{r.waste_type}</td>
                  <td><WasteCategoryBadge category={r.waste_category} /></td>
                  <td>{r.quantity} {r.unit}</td>
                  <td>{r.disposal_method || '\u2014'}</td>
                  <td>{r.disposal_vendor || '\u2014'}</td>
                  <td><EnvStatusBadge status={r.status} /></td>
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
              ))}
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
              <h3 className="env-modal-title">{editingId ? 'Edit Waste Record' : 'Add Waste Record'}</h3>
              <button className="env-modal-close" onClick={closeModal}><XIcon size={18} /></button>
            </div>

            <div className="env-modal-body">
              <div className="env-form-grid">
                {/* Waste Type */}
                <SelectWithOther
                  label="Waste Type"
                  required
                  options={WASTE_TYPES}
                  value={form.waste_type}
                  onChange={(v) => setForm({ ...form, waste_type: v })}
                  placeholder="Select type"
                />

                {/* Waste Category */}
                <div className="env-form-group">
                  <label className="env-form-label">Waste Category *</label>
                  <select className="env-form-input" value={form.waste_category} onChange={(e) => setForm({ ...form, waste_category: e.target.value })}>
                    <option value="">Select category</option>
                    {WASTE_CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>

                {/* Source Area */}
                <div className="env-form-group">
                  <label className="env-form-label">Source Area</label>
                  <input className="env-form-input" value={form.source_area} onChange={(e) => setForm({ ...form, source_area: e.target.value })} />
                </div>

                {/* Department */}
                <div className="env-form-group">
                  <label className="env-form-label">Department</label>
                  <input className="env-form-input" value={form.department} onChange={(e) => setForm({ ...form, department: e.target.value })} />
                </div>

                {/* Quantity */}
                <div className="env-form-group">
                  <label className="env-form-label">Quantity *</label>
                  <input className="env-form-input" type="number" min="0" step="any" value={form.quantity} onChange={(e) => setForm({ ...form, quantity: e.target.value })} />
                </div>

                {/* Unit */}
                <div className="env-form-group">
                  <label className="env-form-label">Unit *</label>
                  <select className="env-form-input" value={form.unit} onChange={(e) => setForm({ ...form, unit: e.target.value })}>
                    {UNITS.map((u) => <option key={u} value={u}>{u}</option>)}
                  </select>
                </div>

                {/* Storage Location */}
                <div className="env-form-group">
                  <label className="env-form-label">Storage Location</label>
                  <input className="env-form-input" value={form.storage_location} onChange={(e) => setForm({ ...form, storage_location: e.target.value })} />
                </div>

                {/* Container Type */}
                <div className="env-form-group">
                  <label className="env-form-label">Container Type</label>
                  <input className="env-form-input" value={form.container_type} onChange={(e) => setForm({ ...form, container_type: e.target.value })} />
                </div>

                {/* Responsible Person */}
                <div className="env-form-group">
                  <label className="env-form-label">Responsible Person</label>
                  <input className="env-form-input" value={form.responsible_person} onChange={(e) => setForm({ ...form, responsible_person: e.target.value })} />
                </div>

                {/* Disposal Method */}
                <SelectWithOther
                  label="Disposal Method"
                  options={WASTE_DISPOSAL_METHODS}
                  value={form.disposal_method}
                  onChange={(v) => setForm({ ...form, disposal_method: v })}
                  placeholder="Select method"
                />

                {/* Disposal Vendor */}
                <div className="env-form-group">
                  <label className="env-form-label">Disposal Vendor</label>
                  <input className="env-form-input" value={form.disposal_vendor} onChange={(e) => setForm({ ...form, disposal_vendor: e.target.value })} />
                </div>

                {/* Manifest Number */}
                <div className="env-form-group">
                  <label className="env-form-label">Manifest Number</label>
                  <input className="env-form-input" value={form.manifest_number} onChange={(e) => setForm({ ...form, manifest_number: e.target.value })} />
                </div>

                {/* Disposal Date */}
                <div className="env-form-group">
                  <label className="env-form-label">Disposal Date</label>
                  <input className="env-form-input" type="date" value={form.disposal_date} onChange={(e) => setForm({ ...form, disposal_date: e.target.value })} />
                </div>

                {/* Collection Date */}
                <div className="env-form-group">
                  <label className="env-form-label">Collection Date</label>
                  <input className="env-form-input" type="date" value={form.collection_date} onChange={(e) => setForm({ ...form, collection_date: e.target.value })} />
                </div>

                {/* Status */}
                <div className="env-form-group">
                  <label className="env-form-label">Status *</label>
                  <select className="env-form-input" value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}>
                    {WASTE_STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>

                {/* Notes */}
                <div className="env-form-group env-form-group--full">
                  <label className="env-form-label">Notes</label>
                  <textarea className="env-form-input env-form-textarea" rows={3} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
                </div>
              </div>
            </div>

            <div className="env-modal-footer">
              <button className="env-btn env-btn--secondary" onClick={closeModal}>Cancel</button>
              <button className="env-btn env-btn--primary" onClick={handleSave} disabled={saving || !form.waste_type || !form.waste_category || !form.quantity}>
                {saving ? 'Saving...' : editingId ? 'Update Record' : 'Create Record'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
