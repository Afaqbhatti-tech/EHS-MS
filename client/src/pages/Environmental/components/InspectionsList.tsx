import { useState, useEffect } from 'react';
import { Eye, Pencil, Trash2, X as XIcon } from 'lucide-react';
import { INSPECTION_TYPES, INSPECTION_COMPLIANCE, INSPECTION_STATUSES } from '../../../config/environmentalConfig';
import SelectWithOther from './SelectWithOther';
import ComplianceBadge from './ComplianceBadge';
import EnvStatusBadge from './EnvStatusBadge';
import ExportDropdown from '../../../components/ui/ExportDropdown';
import { createEnvExportHandler } from './envExportHelper';
import { useToast } from '../../../components/ui/Toast';

interface Props { env: any }

export default function InspectionsList({ env }: Props) {
  const [filters, setFilters] = useState<any>({ search: '', inspection_type: '', compliance_status: '', status: '', date_from: '', date_to: '' });
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [form, setForm] = useState<any>({});
  const [saving, setSaving] = useState(false);
  const toast = useToast();

  useEffect(() => { env.fetchInspections(filters); }, []);

  const applyFilters = () => env.fetchInspections(filters);
  const resetFilters = () => { const f = { search: '', inspection_type: '', compliance_status: '', status: '', date_from: '', date_to: '' }; setFilters(f); env.fetchInspections(f); };

  const openCreate = () => {
    setEditing(null);
    setForm({ inspection_type: '', site: '', area: '', zone: '', department: '', inspection_date: '', inspector_name: '', findings_summary: '', compliance_status: 'Compliant', non_compliance_count: 0, positive_findings: '', recommendations: '', follow_up_date: '', status: 'Open', notes: '' });
    setShowForm(true);
  };

  const openEdit = (item: any) => {
    setEditing(item);
    setForm({
      inspection_type: item.inspection_type || '', site: item.site || '', area: item.area || '',
      zone: item.zone || '', department: item.department || '',
      inspection_date: item.inspection_date?.split('T')[0] || '', inspector_name: item.inspector_name || '',
      findings_summary: item.findings_summary || '', compliance_status: item.compliance_status || 'Compliant',
      non_compliance_count: item.non_compliance_count || 0, positive_findings: item.positive_findings || '',
      recommendations: item.recommendations || '', follow_up_date: item.follow_up_date?.split('T')[0] || '',
      status: item.status || 'Open', notes: item.notes || '',
    });
    setShowForm(true);
  };

  const handleSave = async () => {
    if (!form.inspection_type || !form.inspection_date || !form.inspector_name) { toast.warning('Please fill required fields'); return; }
    setSaving(true);
    try {
      if (editing) await env.updateInspection(editing.id, form);
      else await env.createInspection(form);
      setShowForm(false);
      env.fetchInspections(filters);
    } catch (e: any) { toast.error(e.message); }
    setSaving(false);
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Delete this inspection?')) return;
    await env.deleteInspection(id);
    env.fetchInspections(filters);
  };

  const handleExport = createEnvExportHandler({
    title: 'Environmental Inspections',
    filename: 'inspections_export',
    headers: ['Code', 'Type', 'Date', 'Area', 'Inspector', 'Compliance', 'NC Count', 'Status', 'Follow-Up'],
    getRows: () => (env.inspections || []).map((ins: any) => [
      ins.inspection_code || '', ins.inspection_type || '', ins.inspection_date?.split('T')[0] || '',
      ins.area || '', ins.inspector_name || '', ins.compliance_status || '',
      ins.non_conformances_count ?? '', ins.status || '', ins.follow_up_date?.split('T')[0] || '',
    ]),
  });

  return (
    <div>
      <div className="env-section-header">
        <div>
          <h2>Environmental Inspections</h2>
          <p className="text-sm" style={{ color: 'var(--color-text-secondary)' }}>{env.inspectionsPagination?.total ?? 0} records</p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <ExportDropdown onExport={handleExport} />
          <button className="env-btn env-btn--primary" onClick={openCreate}>+ New Inspection</button>
        </div>
      </div>

      <div className="env-filters-row">
        <input placeholder="Search..." value={filters.search} onChange={e => setFilters({ ...filters, search: e.target.value })} onKeyDown={e => e.key === 'Enter' && applyFilters()} />
        <select value={filters.inspection_type} onChange={e => setFilters({ ...filters, inspection_type: e.target.value })}>
          <option value="">All Types</option>
          {INSPECTION_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
        </select>
        <select value={filters.compliance_status} onChange={e => setFilters({ ...filters, compliance_status: e.target.value })}>
          <option value="">All Compliance</option>
          {INSPECTION_COMPLIANCE.map(s => <option key={s} value={s}>{s}</option>)}
        </select>
        <select value={filters.status} onChange={e => setFilters({ ...filters, status: e.target.value })}>
          <option value="">All Statuses</option>
          {INSPECTION_STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
        </select>
        <input type="date" value={filters.date_from} onChange={e => setFilters({ ...filters, date_from: e.target.value })} />
        <input type="date" value={filters.date_to} onChange={e => setFilters({ ...filters, date_to: e.target.value })} />
        <button className="env-btn env-btn--primary" onClick={applyFilters}>Search</button>
        <button className="env-btn env-btn--ghost" onClick={resetFilters}>Reset</button>
      </div>

      {env.inspectionsLoading ? (
        <div className="env-empty-state"><div className="env-spinner" /></div>
      ) : env.inspections.length === 0 ? (
        <div className="env-empty-state">No inspections found</div>
      ) : (
        <>
          <div className="env-card" style={{ padding: 0, overflow: 'auto' }}>
            <table className="env-table">
              <thead>
                <tr>
                  <th>Code</th><th>Type</th><th>Date</th><th>Area</th><th>Inspector</th><th>Compliance</th><th>NC Count</th><th>Status</th><th>Follow-Up</th><th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {env.inspections.map((ins: any) => (
                  <tr key={ins.id}>
                    <td style={{ fontWeight: 600, fontSize: 13 }}>{ins.inspection_code}</td>
                    <td style={{ maxWidth: 180, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{ins.inspection_type}</td>
                    <td>{ins.inspection_date?.split('T')[0]}</td>
                    <td>{ins.area || '-'}</td>
                    <td>{ins.inspector_name}</td>
                    <td><ComplianceBadge status={ins.compliance_status} /></td>
                    <td style={{ fontWeight: ins.non_compliance_count > 0 ? 700 : 400, color: ins.non_compliance_count > 0 ? 'var(--color-danger)' : 'inherit' }}>{ins.non_compliance_count}</td>
                    <td><EnvStatusBadge status={ins.status} /></td>
                    <td>{ins.follow_up_date?.split('T')[0] || '-'}</td>
                    <td>
                      <div className="flex items-center justify-center gap-1 table-actions">
                        <button className="action-btn action-btn--view" title="View" onClick={() => openEdit(ins)}>
                          <Eye size={15} />
                        </button>
                        <button className="action-btn action-btn--edit" title="Edit" onClick={() => openEdit(ins)}>
                          <Pencil size={15} />
                        </button>
                        <button className="action-btn action-btn--delete" title="Delete" onClick={() => handleDelete(ins.id)}>
                          <Trash2 size={15} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {(env.inspectionsPagination?.lastPage ?? 1) > 1 && (
            <div className="env-pagination">
              {Array.from({ length: env.inspectionsPagination.lastPage }, (_, i) => (
                <button key={i} className={env.inspectionsPagination.page === i + 1 ? 'active' : ''} onClick={() => env.fetchInspections({ ...filters, page: i + 1 })}>{i + 1}</button>
              ))}
            </div>
          )}
        </>
      )}

      {showForm && (
        <div className="env-modal-overlay" onClick={() => setShowForm(false)}>
          <div className="env-modal" onClick={e => e.stopPropagation()} style={{ maxWidth: 750 }}>
            <div className="env-modal-header">
              <h3>{editing ? 'Edit Inspection' : 'New Inspection'}</h3>
              <button type="button" className="env-modal-close" onClick={() => setShowForm(false)} title="Close">
                <XIcon size={18} />
              </button>
            </div>
            <div className="env-form-row">
              <SelectWithOther
                label="Inspection Type"
                required
                options={INSPECTION_TYPES}
                value={form.inspection_type}
                onChange={(v) => setForm({ ...form, inspection_type: v })}
                placeholder="Select type"
              />
              <div className="env-form-group">
                <label>Inspection Date *</label>
                <input type="date" value={form.inspection_date} onChange={e => setForm({ ...form, inspection_date: e.target.value })} required />
              </div>
              <div className="env-form-group">
                <label>Inspector Name *</label>
                <input value={form.inspector_name} onChange={e => setForm({ ...form, inspector_name: e.target.value })} required />
              </div>
            </div>
            <div className="env-form-row">
              <div className="env-form-group"><label>Site</label><input value={form.site} onChange={e => setForm({ ...form, site: e.target.value })} /></div>
              <div className="env-form-group"><label>Area</label><input value={form.area} onChange={e => setForm({ ...form, area: e.target.value })} /></div>
              <div className="env-form-group"><label>Zone</label><input value={form.zone} onChange={e => setForm({ ...form, zone: e.target.value })} /></div>
              <div className="env-form-group"><label>Department</label><input value={form.department} onChange={e => setForm({ ...form, department: e.target.value })} /></div>
            </div>
            <div className="env-form-group">
              <label>Findings Summary</label>
              <textarea value={form.findings_summary} onChange={e => setForm({ ...form, findings_summary: e.target.value })} rows={3} />
            </div>
            <div className="env-form-row">
              <div className="env-form-group">
                <label>Compliance Status</label>
                <select value={form.compliance_status} onChange={e => setForm({ ...form, compliance_status: e.target.value })}>
                  {INSPECTION_COMPLIANCE.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
              <div className="env-form-group">
                <label>Non-Compliance Count</label>
                <input type="number" min="0" value={form.non_compliance_count} onChange={e => setForm({ ...form, non_compliance_count: parseInt(e.target.value) || 0 })} />
              </div>
              <div className="env-form-group">
                <label>Follow-Up Date</label>
                <input type="date" value={form.follow_up_date} onChange={e => setForm({ ...form, follow_up_date: e.target.value })} />
              </div>
              <div className="env-form-group">
                <label>Status</label>
                <select value={form.status} onChange={e => setForm({ ...form, status: e.target.value })}>
                  {INSPECTION_STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
            </div>
            <div className="env-form-group"><label>Positive Findings</label><textarea value={form.positive_findings} onChange={e => setForm({ ...form, positive_findings: e.target.value })} rows={2} /></div>
            <div className="env-form-group"><label>Recommendations</label><textarea value={form.recommendations} onChange={e => setForm({ ...form, recommendations: e.target.value })} rows={2} /></div>
            <div className="env-form-group"><label>Notes</label><textarea value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} rows={2} /></div>
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
