import { useState, useEffect } from 'react';
import { Eye, Pencil, Trash2, X as XIcon } from 'lucide-react';
import { RESOURCE_TYPES, RESOURCE_UNITS } from '../../../config/environmentalConfig';
import SelectWithOther from './SelectWithOther';
import ExportDropdown from '../../../components/ui/ExportDropdown';
import { createEnvExportHandler } from './envExportHelper';
import { useToast } from '../../../components/ui/Toast';

interface Props { env: any }

export default function ResourceList({ env }: Props) {
  const [filters, setFilters] = useState<any>({ search: '', resource_type: '', date_from: '', date_to: '' });
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [form, setForm] = useState<any>({});
  const [saving, setSaving] = useState(false);
  const toast = useToast();

  useEffect(() => { env.fetchResources(filters); }, []);

  const applyFilters = () => env.fetchResources(filters);
  const resetFilters = () => { const f = { search: '', resource_type: '', date_from: '', date_to: '' }; setFilters(f); env.fetchResources(f); };

  const openCreate = () => {
    setEditing(null);
    setForm({ resource_type: '', consumption_value: '', unit: '', meter_reading: '', previous_reading: '', reading_date: '', billing_period: '', location: '', area: '', department: '', recorded_by: '', cost: '', currency: 'SAR', remarks: '' });
    setShowForm(true);
  };

  const openEdit = (item: any) => {
    setEditing(item);
    setForm({
      resource_type: item.resource_type || '', consumption_value: item.consumption_value || '', unit: item.unit || '',
      meter_reading: item.meter_reading || '', previous_reading: item.previous_reading || '',
      reading_date: item.reading_date?.split('T')[0] || '', billing_period: item.billing_period || '',
      location: item.location || '', area: item.area || '', department: item.department || '',
      recorded_by: item.recorded_by || '', cost: item.cost || '', currency: item.currency || 'SAR', remarks: item.remarks || '',
    });
    setShowForm(true);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      if (editing) await env.updateResource(editing.id, form);
      else await env.createResource(form);
      setShowForm(false);
      env.fetchResources(filters);
    } catch (e: any) { toast.error(e.message); }
    setSaving(false);
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Delete this resource record?')) return;
    await env.deleteResource(id);
    env.fetchResources(filters);
  };

  const handleTypeChange = (type: string) => {
    setForm({ ...form, resource_type: type, unit: RESOURCE_UNITS[type] || form.unit });
  };

  const handleExport = createEnvExportHandler({
    title: 'Resource Consumption',
    filename: 'resource_consumption',
    headers: ['Code', 'Type', 'Value', 'Unit', 'Meter', 'Previous', 'Date', 'Period', 'Location', 'Cost'],
    getRows: () => (env.resources || []).map((r: any) => [
      r.resource_code || '', r.resource_type || '', r.consumption_value ?? '',
      r.unit || '', r.meter_reading || '', r.previous_reading || '',
      r.reading_date?.split('T')[0] || '', r.billing_period || '',
      r.location || '', r.cost ? `${Number(r.cost).toLocaleString()} ${r.currency || ''}` : '',
    ]),
  });

  return (
    <div>
      <div className="env-section-header">
        <div>
          <h2>Resource Consumption</h2>
          <p className="text-sm" style={{ color: 'var(--color-text-secondary)' }}>{env.resourcesPagination?.total ?? 0} records</p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <ExportDropdown onExport={handleExport} />
          <button className="env-btn env-btn--primary" onClick={openCreate}>+ Report Incident</button>
        </div>
      </div>

      <div className="env-filters-row">
        <input placeholder="Search..." value={filters.search} onChange={e => setFilters({ ...filters, search: e.target.value })} onKeyDown={e => e.key === 'Enter' && applyFilters()} />
        <select value={filters.resource_type} onChange={e => setFilters({ ...filters, resource_type: e.target.value })}>
          <option value="">All Types</option>
          {RESOURCE_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
        </select>
        <input type="date" value={filters.date_from} onChange={e => setFilters({ ...filters, date_from: e.target.value })} />
        <input type="date" value={filters.date_to} onChange={e => setFilters({ ...filters, date_to: e.target.value })} />
        <button className="env-btn env-btn--primary" onClick={applyFilters}>Search</button>
        <button className="env-btn env-btn--ghost" onClick={resetFilters}>Reset</button>
      </div>

      {env.resourcesLoading ? (
        <div className="env-empty-state"><div className="env-spinner" /></div>
      ) : env.resources.length === 0 ? (
        <div className="env-empty-state">No resource records found</div>
      ) : (
        <>
          <div className="env-card" style={{ padding: 0, overflow: 'auto' }}>
            <table className="env-table">
              <thead>
                <tr>
                  <th>Code</th><th>Type</th><th>Value</th><th>Unit</th><th>Meter</th><th>Previous</th><th>Date</th><th>Period</th><th>Location</th><th>Cost</th><th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {env.resources.map((r: any) => (
                  <tr key={r.id}>
                    <td style={{ fontWeight: 600, fontSize: 13 }}>{r.consumption_code}</td>
                    <td>{r.resource_type}</td>
                    <td style={{ fontWeight: 600 }}>{Number(r.consumption_value).toLocaleString()}</td>
                    <td>{r.unit}</td>
                    <td>{r.meter_reading || '-'}</td>
                    <td>{r.previous_reading || '-'}</td>
                    <td>{r.reading_date?.split('T')[0]}</td>
                    <td>{r.billing_period || '-'}</td>
                    <td>{r.location || '-'}</td>
                    <td>{r.cost ? `${Number(r.cost).toLocaleString()} ${r.currency}` : '-'}</td>
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
          </div>
          {(env.resourcesPagination?.lastPage ?? 1) > 1 && (
            <div className="env-pagination">
              {Array.from({ length: env.resourcesPagination.lastPage }, (_, i) => (
                <button key={i} className={env.resourcesPagination.page === i + 1 ? 'active' : ''} onClick={() => env.fetchResources({ ...filters, page: i + 1 })}>{i + 1}</button>
              ))}
            </div>
          )}
        </>
      )}

      {showForm && (
        <div className="env-modal-overlay" onClick={() => setShowForm(false)}>
          <div className="env-modal" onClick={e => e.stopPropagation()} style={{ maxWidth: 700 }}>
            <div className="env-modal-header">
              <h3>{editing ? 'Edit Resource Record' : 'New Resource Record'}</h3>
              <button type="button" className="env-modal-close" onClick={() => setShowForm(false)} title="Close">
                <XIcon size={18} />
              </button>
            </div>
            <div className="env-form-row">
              <SelectWithOther
                label="Resource Type"
                required
                options={RESOURCE_TYPES}
                value={form.resource_type}
                onChange={(v) => handleTypeChange(v)}
                placeholder="Select type"
              />
              <div className="env-form-group">
                <label>Consumption Value *</label>
                <input type="number" step="0.01" value={form.consumption_value} onChange={e => setForm({ ...form, consumption_value: e.target.value })} required />
              </div>
              <div className="env-form-group">
                <label>Unit *</label>
                <input value={form.unit} onChange={e => setForm({ ...form, unit: e.target.value })} required />
              </div>
            </div>
            <div className="env-form-row">
              <div className="env-form-group">
                <label>Meter Reading</label>
                <input type="number" step="0.01" value={form.meter_reading} onChange={e => setForm({ ...form, meter_reading: e.target.value })} />
              </div>
              <div className="env-form-group">
                <label>Previous Reading</label>
                <input type="number" step="0.01" value={form.previous_reading} onChange={e => setForm({ ...form, previous_reading: e.target.value })} />
              </div>
              <div className="env-form-group">
                <label>Reading Date *</label>
                <input type="date" value={form.reading_date} onChange={e => setForm({ ...form, reading_date: e.target.value })} required />
              </div>
            </div>
            <div className="env-form-row">
              <div className="env-form-group">
                <label>Billing Period</label>
                <input value={form.billing_period} onChange={e => setForm({ ...form, billing_period: e.target.value })} placeholder="e.g. March 2026" />
              </div>
              <div className="env-form-group">
                <label>Location</label>
                <input value={form.location} onChange={e => setForm({ ...form, location: e.target.value })} />
              </div>
              <div className="env-form-group">
                <label>Area</label>
                <input value={form.area} onChange={e => setForm({ ...form, area: e.target.value })} />
              </div>
            </div>
            <div className="env-form-row">
              <div className="env-form-group">
                <label>Department</label>
                <input value={form.department} onChange={e => setForm({ ...form, department: e.target.value })} />
              </div>
              <div className="env-form-group">
                <label>Recorded By</label>
                <input value={form.recorded_by} onChange={e => setForm({ ...form, recorded_by: e.target.value })} />
              </div>
            </div>
            <div className="env-form-row">
              <div className="env-form-group">
                <label>Cost</label>
                <input type="number" step="0.01" value={form.cost} onChange={e => setForm({ ...form, cost: e.target.value })} />
              </div>
              <div className="env-form-group">
                <label>Currency</label>
                <input value={form.currency} onChange={e => setForm({ ...form, currency: e.target.value })} />
              </div>
            </div>
            <div className="env-form-group">
              <label>Remarks</label>
              <textarea value={form.remarks} onChange={e => setForm({ ...form, remarks: e.target.value })} rows={2} />
            </div>
            <div className="env-modal-footer">
              <button className="env-btn env-btn--secondary" onClick={() => setShowForm(false)}>Cancel</button>
              <button className="env-btn env-btn--primary" onClick={handleSave} disabled={saving}>{saving ? 'Saving...' : 'Save'}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
