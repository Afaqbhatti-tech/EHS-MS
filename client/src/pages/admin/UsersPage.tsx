import { useState, useEffect, type FormEvent } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { UserPlus, Copy, RefreshCw, Check, ChevronDown, ChevronUp } from 'lucide-react';
import PageHeader from '../../components/ui/PageHeader';
import Button from '../../components/ui/Button';
import Badge from '../../components/ui/Badge';
import Modal from '../../components/ui/Modal';
import { PageSpinner } from '../../components/ui/Spinner';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:8000/api';

interface UserRecord {
  id: string;
  name: string;
  email: string;
  role: string;
  contractor: string | null;
  permissions: Record<string, boolean>;
  isActive: boolean;
  passwordSet: boolean;
  lastLoginAt: string | null;
  createdAt: string;
}

interface RoleOption {
  value: string;
  label: string;
}

const CONTRACTORS = ['CCCC', 'CCC Rail', 'Artal', 'FFT Direct'];

const PERMISSION_GROUPS = [
  {
    label: 'Observations',
    perms: ['can_create_observation', 'can_verify_observation', 'can_close_observation'],
  },
  {
    label: 'Incidents & Violations',
    perms: ['can_create_incident', 'can_investigate_incident', 'can_issue_warning'],
  },
  {
    label: 'Permits',
    perms: ['can_record_permit', 'can_approve_permit'],
  },
  {
    label: 'Equipment & Training',
    perms: ['can_inspect_equipment', 'can_manage_training'],
  },
  {
    label: 'Operations',
    perms: ['can_manage_manpower', 'can_manage_drills', 'can_manage_campaigns'],
  },
  {
    label: 'Documents & AI',
    perms: ['can_upload_documents', 'can_approve_rams', 'can_generate_ai_ra', 'can_review_ai_drafts'],
  },
  {
    label: 'Reporting & Dashboard',
    perms: ['can_export_reports', 'can_manage_posters', 'can_view_management_dashboard'],
  },
];

function formatPermLabel(perm: string) {
  return perm
    .replace(/^can_/, '')
    .replace(/_/g, ' ')
    .replace(/\b\w/g, c => c.toUpperCase());
}

export default function UsersPage() {
  const { token } = useAuth();
  const [users, setUsers] = useState<UserRecord[]>([]);
  const [roles, setRoles] = useState<RoleOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [editingUser, setEditingUser] = useState<UserRecord | null>(null);
  const [setupLink, setSetupLink] = useState('');
  const [copied, setCopied] = useState(false);

  const headers = { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json', 'ngrok-skip-browser-warning': '1' };

  const fetchUsers = () => {
    setLoading(true);
    fetch(`${API_BASE}/users`, { headers })
      .then(r => r.json())
      .then(d => setUsers(d.users || []))
      .catch(console.error)
      .finally(() => setLoading(false));
  };

  const fetchRoles = () => {
    fetch(`${API_BASE}/roles/dropdown`, { headers })
      .then(r => r.json())
      .then(d => setRoles((d.roles || []).map((r: any) => ({ value: r.value, label: r.label }))))
      .catch(console.error);
  };

  useEffect(() => { fetchUsers(); fetchRoles(); }, [token]);

  const copyLink = (link: string) => {
    navigator.clipboard.writeText(link);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleResendSetup = async (userId: string) => {
    const res = await fetch(`${API_BASE}/users/${userId}/resend-setup`, {
      method: 'POST',
      headers,
    });
    const data = await res.json();
    if (res.ok) {
      setSetupLink(data.setupUrl);
    }
  };

  const toggleActive = async (user: UserRecord) => {
    await fetch(`${API_BASE}/users/${user.id}`, {
      method: 'PUT',
      headers,
      body: JSON.stringify({ isActive: !user.isActive }),
    });
    fetchUsers();
  };

  return (
    <div className="max-w-[1440px]">
      <PageHeader
        title="Users & Permissions"
        subtitle="Manage user accounts, roles, and access control"
        icon={<UserPlus />}
        actions={
          <Button
            variant="primary"
            icon={<UserPlus size={16} />}
            onClick={() => { setShowCreate(true); setEditingUser(null); setSetupLink(''); }}
          >
            Create User
          </Button>
        }
      />

      {/* Setup link banner */}
      {setupLink && (
        <div className="bg-info-50 border border-info-100 rounded-[var(--radius-md)] p-4 mb-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div className="flex-1 min-w-0">
            <p className="text-[13px] font-medium text-info-600 mb-1">Password Setup Link</p>
            <p className="text-[11px] text-info-600 truncate font-mono">{setupLink}</p>
          </div>
          <Button
            variant="primary"
            size="sm"
            icon={copied ? <Check size={14} /> : <Copy size={14} />}
            onClick={() => copyLink(setupLink)}
          >
            {copied ? 'Copied!' : 'Copy'}
          </Button>
        </div>
      )}

      {/* Users Table */}
      <div className="bg-surface rounded-[var(--radius-lg)] shadow-sm border border-border overflow-hidden">
        {/* Desktop table */}
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full text-[13px]">
            <thead>
              <tr className="bg-surface-sunken border-b border-border">
                <th className="text-left px-4 py-3 text-[11px] uppercase tracking-wider font-medium text-text-secondary">Name</th>
                <th className="text-left px-4 py-3 text-[11px] uppercase tracking-wider font-medium text-text-secondary">Email</th>
                <th className="text-left px-4 py-3 text-[11px] uppercase tracking-wider font-medium text-text-secondary">Role</th>
                <th className="text-left px-4 py-3 text-[11px] uppercase tracking-wider font-medium text-text-secondary">Contractor</th>
                <th className="text-left px-4 py-3 text-[11px] uppercase tracking-wider font-medium text-text-secondary">Status</th>
                <th className="text-left px-4 py-3 text-[11px] uppercase tracking-wider font-medium text-text-secondary">Last Login</th>
                <th className="text-right px-4 py-3 text-[11px] uppercase tracking-wider font-medium text-text-secondary">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={7}><PageSpinner label="Loading users..." /></td></tr>
              ) : users.length === 0 ? (
                <tr><td colSpan={7} className="text-center py-12 text-text-tertiary text-[13px]">No users found</td></tr>
              ) : users.map(u => (
                <tr key={u.id} className="border-b border-border last:border-0 hover:bg-surface-sunken transition-colors duration-150">
                  <td className="px-4 py-3 font-medium text-text-primary">{u.name}</td>
                  <td className="px-4 py-3 text-text-secondary">{u.email}</td>
                  <td className="px-4 py-3">
                    <Badge variant="primary">
                      {roles.find(r => r.value === u.role)?.label || u.role}
                    </Badge>
                  </td>
                  <td className="px-4 py-3 text-text-secondary">{u.contractor || '—'}</td>
                  <td className="px-4 py-3">
                    <Badge variant={u.isActive ? 'success' : 'danger'} dot>
                      {u.isActive ? 'Active' : 'Inactive'}
                    </Badge>
                  </td>
                  <td className="px-4 py-3 text-text-tertiary text-[11px]">
                    {u.lastLoginAt ? new Date(u.lastLoginAt).toLocaleString() : 'Never'}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <button
                        onClick={() => { setEditingUser(u); setShowCreate(false); }}
                        className="text-primary-600 hover:text-primary-700 text-[11px] font-medium transition-colors duration-150"
                      >
                        Edit
                      </button>
                      {!u.passwordSet && (
                        <button
                          onClick={() => handleResendSetup(u.id)}
                          className="inline-flex items-center gap-1 text-warning-600 hover:text-warning-700 text-[11px] font-medium transition-colors duration-150"
                        >
                          <RefreshCw size={12} /> Setup Link
                        </button>
                      )}
                      <button
                        onClick={() => toggleActive(u)}
                        className={`text-[11px] font-medium transition-colors duration-150 ${u.isActive ? 'text-danger-600 hover:text-danger-700' : 'text-success-600 hover:text-success-700'}`}
                      >
                        {u.isActive ? 'Deactivate' : 'Activate'}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Mobile card view */}
        <div className="md:hidden">
          {loading ? (
            <PageSpinner label="Loading users..." />
          ) : users.length === 0 ? (
            <div className="text-center py-12 text-text-tertiary text-[13px]">No users found</div>
          ) : (
            <div className="divide-y divide-border">
              {users.map(u => (
                <div key={u.id} className="p-4 space-y-2">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="text-[13px] font-medium text-text-primary truncate">{u.name}</p>
                      <p className="text-[11px] text-text-tertiary truncate">{u.email}</p>
                    </div>
                    <Badge variant={u.isActive ? 'success' : 'danger'} dot>
                      {u.isActive ? 'Active' : 'Inactive'}
                    </Badge>
                  </div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <Badge variant="primary">
                      {roles.find(r => r.value === u.role)?.label || u.role}
                    </Badge>
                    {u.contractor && (
                      <span className="text-[11px] text-text-tertiary">{u.contractor}</span>
                    )}
                  </div>
                  <div className="flex items-center gap-3 pt-1">
                    <button
                      onClick={() => { setEditingUser(u); setShowCreate(false); }}
                      className="text-primary-600 hover:text-primary-700 text-[12px] font-medium"
                    >
                      Edit
                    </button>
                    {!u.passwordSet && (
                      <button
                        onClick={() => handleResendSetup(u.id)}
                        className="inline-flex items-center gap-1 text-warning-600 hover:text-warning-700 text-[12px] font-medium"
                      >
                        <RefreshCw size={12} /> Setup Link
                      </button>
                    )}
                    <button
                      onClick={() => toggleActive(u)}
                      className={`text-[12px] font-medium ${u.isActive ? 'text-danger-600' : 'text-success-600'}`}
                    >
                      {u.isActive ? 'Deactivate' : 'Activate'}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Create / Edit Modal */}
      {(showCreate || editingUser) && (
        <UserModal
          user={editingUser}
          headers={headers}
          roles={roles}
          onClose={() => { setShowCreate(false); setEditingUser(null); }}
          onSaved={(link) => {
            if (link) setSetupLink(link);
            setShowCreate(false);
            setEditingUser(null);
            fetchUsers();
          }}
        />
      )}
    </div>
  );
}

// ─── Create / Edit Modal ────────────────────────

interface ModalProps {
  user: UserRecord | null;
  headers: Record<string, string>;
  roles: RoleOption[];
  onClose: () => void;
  onSaved: (setupLink?: string) => void;
}

function UserModal({ user, headers, roles, onClose, onSaved }: ModalProps) {
  const isEdit = !!user;
  const [name, setName] = useState(user?.name || '');
  const [email, setEmail] = useState(user?.email || '');
  const [role, setRole] = useState(user?.role || 'safety_officer');
  const [contractor, setContractor] = useState(user?.contractor || '');
  const [permissions, setPermissions] = useState<Record<string, boolean>>(user?.permissions || {});
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [showPerms, setShowPerms] = useState(false);

  // Load role defaults when role changes (create mode only)
  const loadDefaults = async (r: string) => {
    if (isEdit) return;
    try {
      const res = await fetch(`${API_BASE}/users/role-defaults/${r}`, { headers });
      const data = await res.json();
      if (res.ok) setPermissions(data.permissions);
    } catch { /* ignore */ }
  };

  useEffect(() => {
    if (!isEdit) loadDefaults(role);
  }, [role]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setSubmitting(true);

    try {
      const url = isEdit ? `${API_BASE}/users/${user!.id}` : `${API_BASE}/users`;
      const method = isEdit ? 'PUT' : 'POST';
      const body = isEdit
        ? { name, role, contractor: contractor || null, permissions }
        : { name, email, role, contractor: contractor || null };

      const res = await fetch(url, {
        method,
        headers,
        body: JSON.stringify(body),
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data.message || 'Failed to save user');
        return;
      }

      onSaved(data.setupUrl);
    } catch {
      setError('Network error');
    } finally {
      setSubmitting(false);
    }
  };

  const togglePerm = (key: string) => {
    setPermissions(prev => ({ ...prev, [key]: !prev[key] }));
  };

  return (
    <Modal
      open={true}
      onClose={onClose}
      title={isEdit ? 'Edit User' : 'Create User'}
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>Cancel</Button>
          <Button variant="primary" loading={submitting} onClick={() => { const form = document.getElementById('user-modal-form') as HTMLFormElement; form?.requestSubmit(); }}>
            {isEdit ? 'Save Changes' : 'Create User'}
          </Button>
        </>
      }
    >
      <form id="user-modal-form" onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="flex items-start gap-2.5 bg-danger-50 border border-danger-100 text-danger-700 rounded-[var(--radius-md)] px-4 py-3 text-[13px]">
            {error}
          </div>
        )}

        <div>
          <label className="block text-[13px] font-medium text-text-secondary mb-1.5">Full Name</label>
          <input
            value={name}
            onChange={e => setName(e.target.value)}
            required
            className="w-full h-[42px] px-3 bg-surface border border-border rounded-[var(--radius-sm)] text-[14px] text-text-primary placeholder:text-text-tertiary outline-none transition-all duration-150 focus:border-primary-500 focus:ring-3 focus:ring-primary-100"
          />
        </div>

        {!isEdit && (
          <div>
            <label className="block text-[13px] font-medium text-text-secondary mb-1.5">Email</label>
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              required
              className="w-full h-[42px] px-3 bg-surface border border-border rounded-[var(--radius-sm)] text-[14px] text-text-primary placeholder:text-text-tertiary outline-none transition-all duration-150 focus:border-primary-500 focus:ring-3 focus:ring-primary-100"
            />
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-[13px] font-medium text-text-secondary mb-1.5">Role</label>
            <select
              value={role}
              onChange={e => setRole(e.target.value)}
              className="w-full h-[42px] px-3 bg-surface border border-border rounded-[var(--radius-sm)] text-[14px] text-text-primary outline-none transition-all duration-150 focus:border-primary-500 focus:ring-3 focus:ring-primary-100"
            >
              {roles.map(r => (
                <option key={r.value} value={r.value}>{r.label}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-[13px] font-medium text-text-secondary mb-1.5">Contractor</label>
            <select
              value={contractor}
              onChange={e => setContractor(e.target.value)}
              className="w-full h-[42px] px-3 bg-surface border border-border rounded-[var(--radius-sm)] text-[14px] text-text-primary outline-none transition-all duration-150 focus:border-primary-500 focus:ring-3 focus:ring-primary-100"
            >
              <option value="">None (Internal)</option>
              {CONTRACTORS.map(c => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Permissions panel */}
        {isEdit && (
          <div className="border border-border rounded-[var(--radius-md)]">
            <button
              type="button"
              onClick={() => setShowPerms(v => !v)}
              className="w-full flex items-center justify-between px-4 py-3 text-[13px] font-medium text-text-primary hover:bg-surface-sunken transition-colors duration-150"
            >
              Feature Permissions
              {showPerms ? <ChevronUp size={16} className="text-text-tertiary" /> : <ChevronDown size={16} className="text-text-tertiary" />}
            </button>
            {showPerms && (
              <div className="px-4 pb-4 space-y-4">
                {PERMISSION_GROUPS.map(group => (
                  <div key={group.label}>
                    <p className="text-[11px] font-semibold text-text-tertiary uppercase tracking-wider mb-2">{group.label}</p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {group.perms.map(perm => (
                        <label key={perm} className="flex items-center gap-2 text-[13px] cursor-pointer">
                          <input
                            type="checkbox"
                            checked={!!permissions[perm]}
                            onChange={() => togglePerm(perm)}
                            className="rounded border-border-strong text-primary-600 focus:ring-primary-500"
                          />
                          <span className="text-text-primary">{formatPermLabel(perm)}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </form>
    </Modal>
  );
}
