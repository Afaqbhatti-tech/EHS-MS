import { useState, useEffect } from 'react';
import { Eye, Pencil, Trash2, X as XIcon } from 'lucide-react';
import { COMPLIANCE_STATUSES } from '../../../config/environmentalConfig';
import ComplianceBadge from './ComplianceBadge';
import ExportDropdown from '../../../components/ui/ExportDropdown';
import { createEnvExportHandler } from './envExportHelper';
import { useToast } from '../../../components/ui/Toast';

interface Props { env: any }

const REQ_TYPES = ['License', 'Permit', 'Law', 'Standard'];

export default function ComplianceList({ env }: Props) {
  const [filters, setFilters] = useState<any>({ search: '', compliance_status: '', regulatory_authority: '' });
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [form, setForm] = useState<any>({});
  const [saving, setSaving] = useState(false);
  const toast = useToast();

  useEffect(() => { env.fetchCompliance(filters); }, []);

  const applyFilters = () => env.fetchCompliance(filters);
  const resetFilters = () => { const f = { search: '', compliance_status: '', regulatory_authority: '' }; setFilters(f); env.fetchCompliance(f); };

  const openCreate = () => {
    setEditing(null);
    setForm({ regulation_name: '', regulatory_authority: '', requirement_type: '', requirement_description: '', applicable_area: '', applicable_process: '', responsible_person: '', compliance_status: 'Pending Review', last_checked_date: '', next_due_date: '', remarks: '' });
    setShowForm(true);
  };

  const openEdit = (item: any) => {
    setEditing(item);
    setForm({
      regulation_name: item.regulation_name || '', regulatory_authority: item.regulatory_authority || '',
      requirement_type: item.requirement_type || '', requirement_description: item.requirement_description || '',
      applicable_area: item.applicable_area || '', applicable_process: item.applicable_process || '',
      responsible_person: item.responsible_person || '', compliance_status: item.compliance_status || 'Pending Review',
      last_checked_date: item.last_checked_date?.split('T')[0] || '', next_due_date: item.next_due_date?.split('T')[0] || '',
      remarks: item.remarks || '',
    });
    setShowForm(true);
  };

  const handleSave = async () => {
    if (!form.regulation_name || !form.requirement_description) { toast.warning('Please fill required fields'); return; }
    setSaving(true);
    try {
      if (editing) await env.updateCompliance(editing.id, form);
      else await env.createCompliance(form);
      setShowForm(false);
      env.fetchCompliance(filters);
    } catch (e: any) { toast.error(e.message); }
    setSaving(false);
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Delete this compliance item?')) return;
    await env.deleteCompliance(id);
    env.fetchCompliance(filters);
  };

  const isOverdue = (item: any) => item.next_due_date && new Date(item.next_due_date) < new Date();

  const handleExport = createEnvExportHandler({
    title: 'Compliance Register',
    filename: 'compliance_register',
    headers: ['Code', 'Regulation', 'Authority', 'Type', 'Status', 'Last Checked', 'Next Due', 'Responsible'],
    getRows: () => (env.compliance || []).map((c: any) => [
      c.compliance_code || '', c.regulation_name || c.title || '', c.regulatory_authority || '',
      c.requirement_type || '', c.compliance_status || '', c.last_checked_date?.split('T')[0] || '',
      c.next_due_date?.split('T')[0] || '', c.responsible_person || '',
    ]),
  });

  return (
    <div>
      <div className="env-section-header">
        <div>
          <h2>Compliance Register</h2>
          <p className="text-sm" style={{ color: 'var(--color-text-secondary)' }}>{env.compliancePagination?.total ?? 0} items</p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <ExportDropdown onExport={handleExport} />
          <button className="env-btn env-btn--primary" onClick={openCreate}>+ Add Item</button>
        </div>
      </div>

      <div className="env-filters-row">
        <input placeholder="Search..." value={filters.search} onChange={e => setFilters({ ...filters, search: e.target.value })} onKeyDown={e => e.key === 'Enter' && applyFilters()} />
        <select value={filters.compliance_status} onChange={e => setFilters({ ...filters, compliance_status: e.target.value })}>
          <option value="">All Statuses</option>
          {COMPLIANCE_STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
        </select>
        <input placeholder="Authority" value={filters.regulatory_authority} onChange={e => setFilters({ ...filters, regulatory_authority: e.target.value })} />
        <button className="env-btn env-btn--primary" onClick={applyFilters}>Search</button>
        <button className="env-btn env-btn--ghost" onClick={resetFilters}>Reset</button>
      </div>

      {env.complianceLoading ? (
        <div className="env-empty-state"><div className="env-spinner" /></div>
      ) : env.compliance.length === 0 ? (
        <div className="env-empty-state">No compliance items found</div>
      ) : (
        <>
          <div className="env-card" style={{ padding: 0, overflow: 'auto' }}>
            <table className="env-table">
              <thead>
                <tr>
                  <th>Code</th><th>Regulation</th><th>Authority</th><th>Type</th><th>Status</th><th>Last Checked</th><th>Next Due</th><th>Responsible</th><th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {env.compliance.map((c: any) => (
                  <tr key={c.id} style={isOverdue(c) || c.compliance_status === 'Non-Compliant' || c.compliance_status === 'Expired' ? { background: '#FEF2F2' } : {}}>
                    <td style={{ fontWeight: 600, fontSize: 13 }}>{c.compliance_code}</td>
                    <td style={{ maxWidth: 220, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{c.regulation_name}</td>
                    <td>{c.regulatory_authority || '-'}</td>
                    <td>{c.requirement_type || '-'}</td>
                    <td><ComplianceBadge status={c.compliance_status} /></td>
                    <td>{c.last_checked_date?.split('T')[0] || '-'}</td>
                    <td style={isOverdue(c) ? { color: 'var(--color-danger)', fontWeight: 700 } : {}}>{c.next_due_date?.split('T')[0] || '-'}</td>
                    <td>{c.responsible_person || '-'}</td>
                    <td>
                      <div className="flex items-center justify-center gap-1 table-actions">
                        <button className="action-btn action-btn--view" title="View" onClick={() => openEdit(c)}>
                          <Eye size={15} />
                        </button>
                        <button className="action-btn action-btn--edit" title="Edit" onClick={() => openEdit(c)}>
                          <Pencil size={15} />
                        </button>
                        <button className="action-btn action-btn--delete" title="Delete" onClick={() => handleDelete(c.id)}>
                          <Trash2 size={15} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {(env.compliancePagination?.lastPage ?? 1) > 1 && (
            <div className="env-pagination">
              {Array.from({ length: env.compliancePagination.lastPage }, (_, i) => (
                <button key={i} className={env.compliancePagination.page === i + 1 ? 'active' : ''} onClick={() => env.fetchCompliance({ ...filters, page: i + 1 })}>{i + 1}</button>
              ))}
            </div>
          )}
        </>
      )}

      {showForm && (
        <div className="env-modal-overlay" onClick={() => setShowForm(false)}>
          <div className="env-modal" onClick={e => e.stopPropagation()} style={{ maxWidth: 750 }}>
            <div className="env-modal-header">
              <h3>{editing ? 'Edit Compliance Item' : 'New Compliance Item'}</h3>
              <button type="button" className="env-modal-close" onClick={() => setShowForm(false)} title="Close">
                <XIcon size={18} />
              </button>
            </div>
            <div className="env-form-group">
              <label>Regulation Name *</label>
              <input value={form.regulation_name} onChange={e => setForm({ ...form, regulation_name: e.target.value })} required />
            </div>
            <div className="env-form-row">
              <div className="env-form-group">
                <label>Regulatory Authority</label>
                <input value={form.regulatory_authority} onChange={e => setForm({ ...form, regulatory_authority: e.target.value })} />
              </div>
              <div className="env-form-group">
                <label>Requirement Type</label>
                <select value={form.requirement_type} onChange={e => setForm({ ...form, requirement_type: e.target.value })}>
                  <option value="">Select type</option>
                  {REQ_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>
            </div>
            <div className="env-form-group">
              <label>Requirement Description *</label>
              <textarea value={form.requirement_description} onChange={e => setForm({ ...form, requirement_description: e.target.value })} rows={3} required />
            </div>
            <div className="env-form-row">
              <div className="env-form-group"><label>Applicable Area</label><input value={form.applicable_area} onChange={e => setForm({ ...form, applicable_area: e.target.value })} /></div>
              <div className="env-form-group"><label>Applicable Process</label><input value={form.applicable_process} onChange={e => setForm({ ...form, applicable_process: e.target.value })} /></div>
              <div className="env-form-group"><label>Responsible Person</label><input value={form.responsible_person} onChange={e => setForm({ ...form, responsible_person: e.target.value })} /></div>
            </div>
            <div className="env-form-row">
              <div className="env-form-group">
                <label>Compliance Status</label>
                <select value={form.compliance_status} onChange={e => setForm({ ...form, compliance_status: e.target.value })}>
                  {COMPLIANCE_STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
              <div className="env-form-group"><label>Last Checked Date</label><input type="date" value={form.last_checked_date} onChange={e => setForm({ ...form, last_checked_date: e.target.value })} /></div>
              <div className="env-form-group"><label>Next Due Date</label><input type="date" value={form.next_due_date} onChange={e => setForm({ ...form, next_due_date: e.target.value })} /></div>
            </div>
            <div className="env-form-group"><label>Remarks</label><textarea value={form.remarks} onChange={e => setForm({ ...form, remarks: e.target.value })} rows={2} /></div>
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
