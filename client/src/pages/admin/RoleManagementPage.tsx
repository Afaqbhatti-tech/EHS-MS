import { useState, useEffect, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import {
  Shield, Users, ChevronRight, Plus, Pencil, Trash2,
  AlertTriangle, Check, Lock,
} from 'lucide-react';
import PageHeader from '../../components/ui/PageHeader';
import Button from '../../components/ui/Button';
import Badge from '../../components/ui/Badge';
import Modal from '../../components/ui/Modal';
import { PageSpinner } from '../../components/ui/Spinner';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:8000/api';

interface RoleInfo {
  id: string;
  role: string;
  slug: string;
  name: string;
  label: string;
  description: string;
  isSystem: boolean;
  grantedCount: number;
  totalPermissions: number;
  userCount: number;
}

// ─── Slug generator ─────
function slugify(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '');
}

export default function RoleManagementPage() {
  const { token, hasRole } = useAuth();
  const navigate = useNavigate();
  const headers: Record<string, string> = { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json', 'ngrok-skip-browser-warning': '1' };

  const [roles, setRoles] = useState<RoleInfo[]>([]);
  const [loading, setLoading] = useState(true);

  // Modal states
  const [showAddModal, setShowAddModal] = useState(false);
  const [editRole, setEditRole] = useState<RoleInfo | null>(null);
  const [deleteRole, setDeleteRole] = useState<RoleInfo | null>(null);

  // Toast state
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  const isMaster = hasRole('master');

  const fetchRoles = () => {
    setLoading(true);
    fetch(`${API_BASE}/roles`, { headers })
      .then(r => r.json())
      .then(d => setRoles(d.roles || []))
      .catch(console.error)
      .finally(() => setLoading(false));
  };

  useEffect(fetchRoles, [token]);

  const showToast = (message: string, type: 'success' | 'error') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  return (
    <div className="max-w-[1024px]">
      {/* Toast */}
      {toast && (
        <div className={`fixed top-4 right-4 z-[60] px-4 py-3 rounded-[var(--radius-md)] shadow-lg text-[13px] font-medium flex items-center gap-2 ${
          toast.type === 'success'
            ? 'bg-success-50 text-success-700 border border-success-100'
            : 'bg-danger-50 text-danger-700 border border-danger-100'
        }`}>
          {toast.type === 'success' ? <Check size={16} /> : <AlertTriangle size={16} />}
          {toast.message}
        </div>
      )}

      <PageHeader
        title="Role Management"
        subtitle="Configure roles and permissions. Click a role to manage its permissions."
        icon={<Shield />}
        actions={
          isMaster ? (
            <Button variant="primary" icon={<Plus size={16} />} onClick={() => setShowAddModal(true)}>
              Add Role
            </Button>
          ) : undefined
        }
      />

      {/* Role List */}
      {loading ? (
        <PageSpinner label="Loading roles..." />
      ) : (
        <div className="grid gap-3">
          {roles.map(r => {
            const pct = r.totalPermissions > 0 ? Math.round((r.grantedCount / r.totalPermissions) * 100) : 0;
            const isMasterRole = r.slug === 'master';

            return (
              <div
                key={r.slug}
                className="bg-surface rounded-[var(--radius-lg)] border border-border p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4 hover:border-primary-200 hover:shadow-sm transition-all duration-150"
              >
                {/* Icon */}
                <button
                  onClick={() => navigate(`/admin/roles/${r.slug}`)}
                  className={`w-11 h-11 rounded-[var(--radius-md)] flex items-center justify-center shrink-0 ${
                    isMasterRole ? 'bg-warning-50 text-warning-600' : r.isSystem ? 'bg-primary-50 text-primary-600' : 'bg-[#F5F3FF] text-[#8B5CF6]'
                  }`}
                >
                  <Shield size={20} />
                </button>

                {/* Info */}
                <button
                  onClick={() => navigate(`/admin/roles/${r.slug}`)}
                  className="flex-1 min-w-0 text-left"
                >
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-semibold text-text-primary">{r.name}</span>
                    {isMasterRole && (
                      <Badge variant="warning">FULL ACCESS</Badge>
                    )}
                    {r.isSystem && !isMasterRole && (
                      <span className="text-[10px] bg-surface-sunken text-text-tertiary px-1.5 py-0.5 rounded font-medium flex items-center gap-0.5">
                        <Lock size={8} /> SYSTEM
                      </span>
                    )}
                    {!r.isSystem && (
                      <Badge variant="primary">CUSTOM</Badge>
                    )}
                  </div>
                  {r.description && (
                    <p className="text-[11px] text-text-tertiary mt-0.5 truncate">{r.description}</p>
                  )}
                  <div className="flex items-center gap-4 mt-1 text-[11px] text-text-tertiary">
                    <span className="flex items-center gap-1">
                      <Users size={12} />
                      {r.userCount} user{r.userCount !== 1 ? 's' : ''}
                    </span>
                    <span>
                      {r.grantedCount}/{r.totalPermissions} permissions ({pct}%)
                    </span>
                    <span className="text-text-disabled font-mono text-[10px]">{r.slug}</span>
                  </div>
                  {!isMasterRole && (
                    <div className="mt-2 w-full bg-surface-sunken rounded-full h-1.5">
                      <div
                        className="bg-primary-500 h-1.5 rounded-full transition-all duration-500"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  )}
                </button>

                {/* Actions */}
                <div className="flex items-center gap-1 shrink-0 self-end sm:self-center">
                  {isMaster && (
                    <>
                      <button
                        onClick={(e) => { e.stopPropagation(); setEditRole(r); }}
                        className="p-2 rounded-[var(--radius-sm)] hover:bg-surface-sunken text-text-tertiary hover:text-primary-600 transition-colors duration-150"
                        title="Edit role"
                      >
                        <Pencil size={16} />
                      </button>
                      {!r.isSystem && (
                        <button
                          onClick={(e) => { e.stopPropagation(); setDeleteRole(r); }}
                          className="p-2 rounded-[var(--radius-sm)] hover:bg-danger-50 text-text-tertiary hover:text-danger-600 transition-colors duration-150"
                          title="Delete role"
                        >
                          <Trash2 size={16} />
                        </button>
                      )}
                    </>
                  )}
                  <button
                    onClick={() => navigate(`/admin/roles/${r.slug}`)}
                    className="p-2 rounded-[var(--radius-sm)] hover:bg-surface-sunken text-text-tertiary transition-colors duration-150"
                  >
                    <ChevronRight size={18} />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Add Role Modal */}
      {showAddModal && (
        <AddRoleModal
          headers={headers}
          onClose={() => setShowAddModal(false)}
          onCreated={(msg) => {
            setShowAddModal(false);
            showToast(msg, 'success');
            fetchRoles();
          }}
          onError={(msg) => showToast(msg, 'error')}
        />
      )}

      {/* Edit Role Modal */}
      {editRole && (
        <EditRoleModal
          role={editRole}
          headers={headers}
          onClose={() => setEditRole(null)}
          onSaved={(msg) => {
            setEditRole(null);
            showToast(msg, 'success');
            fetchRoles();
          }}
          onError={(msg) => showToast(msg, 'error')}
        />
      )}

      {/* Delete Role Modal */}
      {deleteRole && (
        <DeleteRoleModal
          role={deleteRole}
          allRoles={roles}
          headers={headers}
          onClose={() => setDeleteRole(null)}
          onDeleted={(msg) => {
            setDeleteRole(null);
            showToast(msg, 'success');
            fetchRoles();
          }}
          onError={(msg) => showToast(msg, 'error')}
        />
      )}
    </div>
  );
}

// ─────────────────────────────────────────────
// Add Role Modal
// ─────────────────────────────────────────────

interface AddRoleModalProps {
  headers: Record<string, string>;
  onClose: () => void;
  onCreated: (message: string) => void;
  onError: (message: string) => void;
}

function AddRoleModal({ headers, onClose, onCreated, onError }: AddRoleModalProps) {
  const [name, setName] = useState('');
  const [slug, setSlug] = useState('');
  const [slugEdited, setSlugEdited] = useState(false);
  const [description, setDescription] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const handleNameChange = (value: string) => {
    setName(value);
    if (!slugEdited) {
      setSlug(slugify(value));
    }
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setSubmitting(true);

    try {
      const res = await fetch(`${API_BASE}/roles`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ name, slug, description: description || undefined }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.message || 'Failed to create role');
        onError(data.message || 'Failed to create role');
        return;
      }
      onCreated(`Role "${name}" created successfully`);
    } catch {
      setError('Network error');
      onError('Network error');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal
      open={true}
      onClose={onClose}
      title="Add New Role"
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>Cancel</Button>
          <Button
            variant="primary"
            loading={submitting}
            disabled={!name.trim() || !slug.trim()}
            onClick={() => { const form = document.getElementById('add-role-form') as HTMLFormElement; form?.requestSubmit(); }}
          >
            Create Role
          </Button>
        </>
      }
    >
      <form id="add-role-form" onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="bg-danger-50 border border-danger-100 text-danger-700 rounded-[var(--radius-md)] px-4 py-3 text-[13px]">{error}</div>
        )}

        <div>
          <label className="block text-[13px] font-medium text-text-secondary mb-1.5">Role Name *</label>
          <input
            value={name}
            onChange={e => handleNameChange(e.target.value)}
            required
            placeholder="e.g. Project Manager"
            className="w-full h-[42px] px-3 bg-surface border border-border rounded-[var(--radius-sm)] text-[14px] text-text-primary placeholder:text-text-tertiary outline-none transition-all duration-150 focus:border-primary-500 focus:ring-3 focus:ring-primary-100"
          />
        </div>

        <div>
          <label className="block text-[13px] font-medium text-text-secondary mb-1.5">
            Slug / Key *
            <span className="text-text-disabled font-normal ml-1">(auto-generated, editable)</span>
          </label>
          <input
            value={slug}
            onChange={e => { setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, '')); setSlugEdited(true); }}
            required
            placeholder="e.g. project_manager"
            className="w-full h-[42px] px-3 bg-surface border border-border rounded-[var(--radius-sm)] text-[14px] text-text-primary font-mono placeholder:text-text-tertiary outline-none transition-all duration-150 focus:border-primary-500 focus:ring-3 focus:ring-primary-100"
          />
          <p className="text-[11px] text-text-tertiary mt-1">Lowercase letters, numbers, underscores only. Used internally.</p>
        </div>

        <div>
          <label className="block text-[13px] font-medium text-text-secondary mb-1.5">Description</label>
          <textarea
            value={description}
            onChange={e => setDescription(e.target.value)}
            rows={2}
            placeholder="Optional description of this role's purpose"
            className="w-full px-3 py-2.5 bg-surface border border-border rounded-[var(--radius-sm)] text-[14px] text-text-primary placeholder:text-text-tertiary outline-none transition-all duration-150 focus:border-primary-500 focus:ring-3 focus:ring-primary-100 resize-none"
          />
        </div>

        <div className="bg-info-50 border border-info-100 rounded-[var(--radius-md)] p-3 text-[13px] text-info-600">
          After creating the role, you can configure its permissions from the role detail page.
        </div>
      </form>
    </Modal>
  );
}

// ─────────────────────────────────────────────
// Edit Role Modal
// ─────────────────────────────────────────────

interface EditRoleModalProps {
  role: RoleInfo;
  headers: Record<string, string>;
  onClose: () => void;
  onSaved: (message: string) => void;
  onError: (message: string) => void;
}

function EditRoleModal({ role, headers, onClose, onSaved, onError }: EditRoleModalProps) {
  const [name, setName] = useState(role.name);
  const [slug, setSlug] = useState(role.slug);
  const [description, setDescription] = useState(role.description);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setSubmitting(true);

    try {
      const body: Record<string, string> = {};
      if (name !== role.name) body.name = name;
      if (slug !== role.slug) body.slug = slug;
      if (description !== role.description) body.description = description;

      if (Object.keys(body).length === 0) {
        onClose();
        return;
      }

      const res = await fetch(`${API_BASE}/roles/${role.slug}`, {
        method: 'PUT',
        headers,
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.message || 'Failed to update role');
        onError(data.message || 'Failed to update role');
        return;
      }
      onSaved(`Role "${name}" updated successfully`);
    } catch {
      setError('Network error');
      onError('Network error');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal
      open={true}
      onClose={onClose}
      title={`Edit Role — ${role.name}`}
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>Cancel</Button>
          <Button
            variant="primary"
            loading={submitting}
            onClick={() => { const form = document.getElementById('edit-role-form') as HTMLFormElement; form?.requestSubmit(); }}
          >
            Save Changes
          </Button>
        </>
      }
    >
      <form id="edit-role-form" onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="bg-danger-50 border border-danger-100 text-danger-700 rounded-[var(--radius-md)] px-4 py-3 text-[13px]">{error}</div>
        )}

        <div>
          <label className="block text-[13px] font-medium text-text-secondary mb-1.5">Role Name</label>
          <input
            value={name}
            onChange={e => setName(e.target.value)}
            required
            className="w-full h-[42px] px-3 bg-surface border border-border rounded-[var(--radius-sm)] text-[14px] text-text-primary outline-none transition-all duration-150 focus:border-primary-500 focus:ring-3 focus:ring-primary-100"
          />
        </div>

        <div>
          <label className="block text-[13px] font-medium text-text-secondary mb-1.5">Slug / Key</label>
          {role.isSystem ? (
            <div className="flex items-center gap-2">
              <input
                value={slug}
                disabled
                className="w-full h-[42px] px-3 bg-surface-sunken border border-border rounded-[var(--radius-sm)] text-[14px] font-mono text-text-disabled"
              />
              <span className="text-[11px] text-warning-600 whitespace-nowrap flex items-center gap-1">
                <Lock size={12} /> Protected
              </span>
            </div>
          ) : (
            <input
              value={slug}
              onChange={e => setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ''))}
              required
              className="w-full h-[42px] px-3 bg-surface border border-border rounded-[var(--radius-sm)] text-[14px] text-text-primary font-mono outline-none transition-all duration-150 focus:border-primary-500 focus:ring-3 focus:ring-primary-100"
            />
          )}
        </div>

        <div>
          <label className="block text-[13px] font-medium text-text-secondary mb-1.5">Description</label>
          <textarea
            value={description}
            onChange={e => setDescription(e.target.value)}
            rows={2}
            className="w-full px-3 py-2.5 bg-surface border border-border rounded-[var(--radius-sm)] text-[14px] text-text-primary outline-none transition-all duration-150 focus:border-primary-500 focus:ring-3 focus:ring-primary-100 resize-none"
          />
        </div>
      </form>
    </Modal>
  );
}

// ─────────────────────────────────────────────
// Delete Role Modal
// ─────────────────────────────────────────────

interface DeleteRoleModalProps {
  role: RoleInfo;
  allRoles: RoleInfo[];
  headers: Record<string, string>;
  onClose: () => void;
  onDeleted: (message: string) => void;
  onError: (message: string) => void;
}

function DeleteRoleModal({ role, allRoles, headers, onClose, onDeleted, onError }: DeleteRoleModalProps) {
  const [reassignTo, setReassignTo] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [confirmText, setConfirmText] = useState('');

  const hasUsers = role.userCount > 0;
  const availableRoles = allRoles.filter(r => r.slug !== role.slug);

  const handleDelete = async () => {
    if (confirmText !== role.name) {
      setError(`Please type "${role.name}" to confirm deletion.`);
      return;
    }
    if (hasUsers && !reassignTo) {
      setError('Please select a role to reassign affected users to.');
      return;
    }

    setError('');
    setSubmitting(true);

    try {
      const res = await fetch(`${API_BASE}/roles/${role.slug}`, {
        method: 'DELETE',
        headers,
        body: JSON.stringify({ reassignTo: hasUsers ? reassignTo : undefined }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.message || 'Failed to delete role');
        onError(data.message || 'Failed to delete role');
        return;
      }
      onDeleted(data.message || `Role "${role.name}" deleted successfully`);
    } catch {
      setError('Network error');
      onError('Network error');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal
      open={true}
      onClose={onClose}
      title="Delete Role"
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>Cancel</Button>
          <Button
            variant="danger"
            icon={<Trash2 size={16} />}
            loading={submitting}
            disabled={confirmText !== role.name || (hasUsers && !reassignTo)}
            onClick={handleDelete}
          >
            Delete Role
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        {error && (
          <div className="bg-danger-50 border border-danger-100 text-danger-700 rounded-[var(--radius-md)] px-4 py-3 text-[13px]">{error}</div>
        )}

        <div className="bg-warning-50 border border-warning-100 rounded-[var(--radius-md)] p-4">
          <p className="text-[13px] text-warning-600 font-medium mb-1">
            You are about to delete the role "{role.name}"
          </p>
          <p className="text-[13px] text-warning-600">
            This action cannot be undone. All role-permission mappings for this role will be permanently removed.
          </p>
        </div>

        {hasUsers && (
          <div className="bg-danger-50 border border-danger-100 rounded-[var(--radius-md)] p-4">
            <p className="text-[13px] text-danger-700 font-medium mb-2">
              <AlertTriangle size={14} className="inline mr-1" />
              {role.userCount} user{role.userCount !== 1 ? 's are' : ' is'} currently assigned to this role.
            </p>
            <p className="text-[13px] text-danger-600 mb-3">
              You must reassign these users to another role before deletion.
            </p>

            <label className="block text-[13px] font-medium text-danger-700 mb-1.5">Reassign users to:</label>
            <select
              value={reassignTo}
              onChange={e => setReassignTo(e.target.value)}
              className="w-full h-[42px] px-3 bg-surface border border-danger-200 rounded-[var(--radius-sm)] text-[14px] text-text-primary outline-none transition-all duration-150 focus:border-danger-500 focus:ring-3 focus:ring-danger-100"
            >
              <option value="">Select a role...</option>
              {availableRoles.map(r => (
                <option key={r.slug} value={r.slug}>{r.name} ({r.userCount} users)</option>
              ))}
            </select>
          </div>
        )}

        <div>
          <label className="block text-[13px] font-medium text-text-secondary mb-1.5">
            Type <span className="font-bold text-danger-600">"{role.name}"</span> to confirm:
          </label>
          <input
            value={confirmText}
            onChange={e => setConfirmText(e.target.value)}
            placeholder={role.name}
            className="w-full h-[42px] px-3 bg-surface border border-border rounded-[var(--radius-sm)] text-[14px] text-text-primary placeholder:text-text-tertiary outline-none transition-all duration-150 focus:border-danger-500 focus:ring-3 focus:ring-danger-100"
          />
        </div>
      </div>
    </Modal>
  );
}
