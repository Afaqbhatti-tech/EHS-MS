import { useState, useEffect } from 'react';
import { Plus, Search, RotateCcw, AlertTriangle, Eye, Pencil, Trash2, X as XIcon } from 'lucide-react';
import { ACTION_STATUSES, ACTION_PRIORITIES, LINKED_TYPES } from '../../../config/environmentalConfig';
import EnvStatusBadge from './EnvStatusBadge';
import ExportDropdown from '../../../components/ui/ExportDropdown';
import { createEnvExportHandler } from './envExportHelper';
import { useToast } from '../../../components/ui/Toast';

interface Props { env: any }

const ACTION_TYPES = ['Corrective', 'Preventive', 'Improvement'];
const ACTION_CATEGORIES = ['Environmental', 'Compliance', 'Waste', 'Emissions', 'Water', 'Energy', 'Other'];

const DEFAULT_FILTERS = { search: '', status: '', priority: '', action_type: '', linked_type: '', overdue: false, page: 1, per_page: 15 };

const EMPTY_FORM = {
  title: '', description: '', action_type: 'Corrective', category: 'Environmental',
  priority: 'Medium', assigned_to: '', due_date: '', start_date: '',
  completion_date: '', completion_notes: '', cost_estimate: '', actual_cost: '',
  verification_required: false, notes: '', status: 'Open',
};

export default function ActionsList({ env }: Props) {
  const [filters, setFilters] = useState<any>({ ...DEFAULT_FILTERS });
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [form, setForm] = useState<any>({ ...EMPTY_FORM });
  const [saving, setSaving] = useState(false);
  const toast = useToast();

  useEffect(() => { env.fetchActions(filters); }, []);

  const applyFilters = () => env.fetchActions(filters);
  const resetFilters = () => { const f = { ...DEFAULT_FILTERS }; setFilters(f); env.fetchActions(f); };

  const openCreate = () => { setEditing(null); setForm({ ...EMPTY_FORM }); setShowForm(true); };
  const openEdit = (item: any) => {
    setEditing(item);
    setForm({
      title: item.title || '', description: item.description || '',
      action_type: item.action_type || 'Corrective', category: item.category || 'Environmental',
      priority: item.priority || 'Medium', assigned_to: item.assigned_to || '',
      due_date: item.due_date?.split('T')[0] || '', start_date: item.start_date?.split('T')[0] || '',
      completion_date: item.completion_date?.split('T')[0] || '', completion_notes: item.completion_notes || '',
      cost_estimate: item.cost_estimate ?? '', actual_cost: item.actual_cost ?? '',
      verification_required: item.verification_required || false, notes: item.notes || '',
      status: item.status || 'Open',
    });
    setShowForm(true);
  };

  const handleSave = async () => {
    if (!form.title) { toast.warning('Title is required'); return; }
    if ((form.status === 'Completed' || form.status === 'Closed') && !form.completion_notes) {
      toast.warning('Completion notes are required when status is Completed or Closed'); return;
    }
    setSaving(true);
    try {
      if (editing) await env.updateAction(editing.id, form);
      else await env.createAction(form);
      setShowForm(false);
      env.fetchActions(filters);
    } catch (e: any) { toast.error(e.message); }
    setSaving(false);
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Delete this action?')) return;
    await env.deleteAction(id);
    env.fetchActions(filters);
  };

  const isOverdue = (item: any) => item.due_date && new Date(item.due_date) < new Date() && item.status !== 'Completed' && item.status !== 'Closed';

  const handleExport = createEnvExportHandler({
    title: 'Corrective Actions',
    filename: 'actions_export',
    headers: ['Code', 'Title', 'Type', 'Priority', 'Status', 'Assigned To', 'Due Date'],
    getRows: () => (env.actions || []).map((a: any) => [
      a.action_code, a.title || '', a.action_type || '', a.priority || '',
      a.status || '', a.assigned_to_user?.full_name || a.assigned_to || '', a.due_date?.split('T')[0] || '',
    ]),
  });

  return (
    <div>
      <div className="env-section-header">
        <div className="env-section-header-left">
          <h2 className="env-section-title">Corrective Actions</h2>
          <span className="env-section-count">{env.actionsPagination?.total ?? 0} actions</span>
        </div>
        <div className="env-section-header-actions">
          <ExportDropdown onExport={handleExport} />
          <button className="env-btn env-btn--primary" onClick={openCreate}>
            <Plus size={15} /> Add Action
          </button>
        </div>
      </div>

      <div className="env-filters-row">
        <input placeholder="Search..." value={filters.search} onChange={e => setFilters({ ...filters, search: e.target.value })} onKeyDown={e => e.key === 'Enter' && applyFilters()} />
        <select value={filters.status} onChange={e => setFilters({ ...filters, status: e.target.value })}>
          <option value="">All Statuses</option>
          {ACTION_STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
        </select>
        <select value={filters.priority} onChange={e => setFilters({ ...filters, priority: e.target.value })}>
          <option value="">All Priorities</option>
          {ACTION_PRIORITIES.map(p => <option key={p} value={p}>{p}</option>)}
        </select>
        <select value={filters.action_type} onChange={e => setFilters({ ...filters, action_type: e.target.value })}>
          <option value="">All Types</option>
          {ACTION_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
        </select>
        <select value={filters.linked_type} onChange={e => setFilters({ ...filters, linked_type: e.target.value })}>
          <option value="">All Linked</option>
          {LINKED_TYPES.map(t => <option key={t} value={t}>{t.charAt(0).toUpperCase() + t.slice(1)}</option>)}
        </select>
        <button
          className={`env-btn env-btn--sm ${filters.overdue ? 'env-btn--danger' : 'env-btn--secondary'}`}
          onClick={() => { const next = { ...filters, overdue: !filters.overdue }; setFilters(next); env.fetchActions(next); }}
        >
          <AlertTriangle size={14} /> Overdue
        </button>
        <button className="env-btn env-btn--sm env-btn--primary" onClick={applyFilters}>
          <Search size={14} /> Search
        </button>
        <button className="env-btn env-btn--sm env-btn--ghost" onClick={resetFilters}>
          <RotateCcw size={14} /> Reset
        </button>
      </div>

      {env.actionsLoading ? (
        <div className="env-empty-state"><div className="env-spinner" /></div>
      ) : (env.actions?.length ?? 0) === 0 ? (
        <div className="env-empty-state">No actions found</div>
      ) : (
        <>
          <div className="env-card" style={{ padding: 0, overflow: 'auto' }}>
            <table className="env-table">
              <thead>
                <tr>
                  <th>Code</th><th>Title</th><th>Type</th><th>Priority</th><th>Status</th>
                  <th>Assigned To</th><th>Due Date</th><th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {(env.actions || []).map((a: any) => (
                  <tr key={a.id} style={isOverdue(a) ? { background: '#FEF2F2' } : {}}>
                    <td style={{ fontWeight: 600, fontSize: 13 }}>{a.action_code}</td>
                    <td style={{ maxWidth: 220, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{a.title}</td>
                    <td>{a.action_type || '-'}</td>
                    <td>
                      <span style={{
                        padding: '2px 8px', borderRadius: 9999, fontSize: 11, fontWeight: 600,
                        background: a.priority === 'Critical' ? '#FEE2E2' : a.priority === 'High' ? '#FFF7ED' : a.priority === 'Medium' ? '#DBEAFE' : '#F0FDF4',
                        color: a.priority === 'Critical' ? '#991B1B' : a.priority === 'High' ? '#C2410C' : a.priority === 'Medium' ? '#1E40AF' : '#166534',
                      }}>{a.priority}</span>
                    </td>
                    <td><EnvStatusBadge status={a.status} /></td>
                    <td>{a.assigned_to_user?.full_name || a.assigned_to || '-'}</td>
                    <td style={isOverdue(a) ? { color: 'var(--color-danger)', fontWeight: 700 } : {}}>{a.due_date?.split('T')[0] || '-'}</td>
                    <td>
                      <div className="flex items-center justify-center gap-1 table-actions">
                        <button className="action-btn action-btn--view" title="View" onClick={() => openEdit(a)}>
                          <Eye size={15} />
                        </button>
                        <button className="action-btn action-btn--edit" title="Edit" onClick={() => openEdit(a)}>
                          <Pencil size={15} />
                        </button>
                        <button className="action-btn action-btn--delete" title="Delete" onClick={() => handleDelete(a.id)}>
                          <Trash2 size={15} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {(env.actionsPagination?.lastPage ?? 1) > 1 && (
            <div className="env-pagination">
              {Array.from({ length: env.actionsPagination.lastPage }, (_, i) => (
                <button key={i} className={env.actionsPagination.page === i + 1 ? 'active' : ''} onClick={() => env.fetchActions({ ...filters, page: i + 1 })}>{i + 1}</button>
              ))}
            </div>
          )}
        </>
      )}

      {showForm && (
        <div className="env-modal-overlay" onClick={() => setShowForm(false)}>
          <div className="env-modal" onClick={e => e.stopPropagation()} style={{ maxWidth: 750 }}>
            <div className="env-modal-header">
              <h3>{editing ? 'Edit Action' : 'New Corrective Action'}</h3>
              <button type="button" className="env-modal-close" onClick={() => setShowForm(false)} title="Close">
                <XIcon size={18} />
              </button>
            </div>
            <div className="env-form-group">
              <label>Title *</label>
              <input value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} required />
            </div>
            <div className="env-form-group">
              <label>Description</label>
              <textarea value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} rows={3} />
            </div>
            <div className="env-form-row">
              <div className="env-form-group">
                <label>Action Type</label>
                <select value={form.action_type} onChange={e => setForm({ ...form, action_type: e.target.value })}>
                  {ACTION_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>
              <div className="env-form-group">
                <label>Category</label>
                <select value={form.category} onChange={e => setForm({ ...form, category: e.target.value })}>
                  {ACTION_CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              <div className="env-form-group">
                <label>Priority</label>
                <select value={form.priority} onChange={e => setForm({ ...form, priority: e.target.value })}>
                  {ACTION_PRIORITIES.map(p => <option key={p} value={p}>{p}</option>)}
                </select>
              </div>
            </div>
            <div className="env-form-row">
              <div className="env-form-group">
                <label>Status</label>
                <select value={form.status} onChange={e => setForm({ ...form, status: e.target.value })}>
                  {ACTION_STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
              <div className="env-form-group"><label>Assigned To</label><input value={form.assigned_to} onChange={e => setForm({ ...form, assigned_to: e.target.value })} /></div>
            </div>
            <div className="env-form-row">
              <div className="env-form-group"><label>Start Date</label><input type="date" value={form.start_date} onChange={e => setForm({ ...form, start_date: e.target.value })} /></div>
              <div className="env-form-group"><label>Due Date</label><input type="date" value={form.due_date} onChange={e => setForm({ ...form, due_date: e.target.value })} /></div>
              <div className="env-form-group"><label>Completion Date</label><input type="date" value={form.completion_date} onChange={e => setForm({ ...form, completion_date: e.target.value })} /></div>
            </div>
            <div className="env-form-row">
              <div className="env-form-group"><label>Cost Estimate</label><input type="number" value={form.cost_estimate} onChange={e => setForm({ ...form, cost_estimate: e.target.value })} /></div>
              <div className="env-form-group"><label>Actual Cost</label><input type="number" value={form.actual_cost} onChange={e => setForm({ ...form, actual_cost: e.target.value })} /></div>
            </div>
            <div className="env-form-group"><label>Completion Notes</label><textarea value={form.completion_notes} onChange={e => setForm({ ...form, completion_notes: e.target.value })} rows={2} /></div>
            <div className="env-form-group"><label>Notes</label><textarea value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} rows={2} /></div>
            <div className="env-form-group" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <input type="checkbox" checked={form.verification_required} onChange={e => setForm({ ...form, verification_required: e.target.checked })} id="verify-check" />
              <label htmlFor="verify-check" style={{ margin: 0 }}>Verification Required</label>
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
