import { useState, useEffect, type FormEvent } from 'react';
import { Copy, RefreshCw, Check, ChevronDown, ChevronUp, KeyRound, Pencil, Trash2, Search } from 'lucide-react';
import Button from '../../components/ui/Button';
import Badge from '../../components/ui/Badge';
import Modal from '../../components/ui/Modal';
import { PageSpinner } from '../../components/ui/Spinner';
import { useToast } from '../../components/ui/Toast';
import { api } from '../../services/api';

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

interface ContractorOption {
  id: number;
  contractor_code: string;
  contractor_name: string;
}


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

export function UsersContent() {
  const toast = useToast();
  const [users, setUsers] = useState<UserRecord[]>([]);
  const [roles, setRoles] = useState<RoleOption[]>([]);
  const [contractors, setContractors] = useState<ContractorOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [editingUser, setEditingUser] = useState<UserRecord | null>(null);
  const [showResetPassword, setShowResetPassword] = useState(false);
  const [setupLink, setSetupLink] = useState('');
  const [copied, setCopied] = useState(false);

  const fetchUsers = () => {
    setLoading(true);
    api.get<{ users: UserRecord[] }>('/users')
      .then(d => setUsers(d.users || []))
      .catch(() => toast.error('Failed to load users'))
      .finally(() => setLoading(false));
  };

  const fetchRoles = () => {
    api.get<{ roles: Array<{ value: string; label: string }> }>('/roles/dropdown')
      .then(d => setRoles((d.roles || []).map(r => ({ value: r.value, label: r.label }))))
      .catch(() => toast.error('Failed to load roles'));
  };

  const fetchContractors = () => {
    api.get<ContractorOption[]>('/contractors/list-active')
      .then(d => setContractors(Array.isArray(d) ? d : []))
      .catch(() => { /* contractors dropdown is optional */ });
  };

  useEffect(() => { fetchUsers(); fetchRoles(); fetchContractors(); }, []);

  const copyLink = (link: string) => {
    navigator.clipboard.writeText(link);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleResendSetup = async (userId: string) => {
    try {
      const data = await api.post<{ setupUrl: string }>(`/users/${userId}/resend-setup`, {});
      if (data.setupUrl) setSetupLink(data.setupUrl);
      toast.success('Setup link sent successfully');
    } catch (err: any) {
      toast.error(err?.message || 'Failed to resend setup link');
    }
  };

  const toggleActive = async (user: UserRecord) => {
    try {
      await api.put(`/users/${user.id}`, { isActive: !user.isActive });
      toast.success(`User ${user.isActive ? 'deactivated' : 'activated'} successfully`);
      fetchUsers();
    } catch (err: any) {
      toast.error(err?.message || 'Failed to update user status');
    }
  };

  return (
    <div className="max-w-[1440px]">
      {/* Action bar */}
      <div className="flex justify-end mb-4">
        <Button
          variant="primary"
          icon={<KeyRound size={16} />}
          onClick={() => setShowResetPassword(true)}
        >
          Reset Password
        </Button>
      </div>

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
                    <div className="flex items-center justify-end gap-1 table-actions">
                      <button
                        onClick={() => { setEditingUser(u); setShowCreate(false); }}
                        className="action-btn action-btn--edit"
                        title="Edit"
                      >
                        <Pencil size={15} />
                      </button>
                      {!u.passwordSet && (
                        <button
                          onClick={() => handleResendSetup(u.id)}
                          className="action-btn action-btn--view"
                          title="Resend Setup Link"
                        >
                          <RefreshCw size={15} />
                        </button>
                      )}
                      <button
                        onClick={() => toggleActive(u)}
                        className="action-btn action-btn--delete"
                        title={u.isActive ? 'Deactivate' : 'Activate'}
                      >
                        {u.isActive ? <Trash2 size={15} /> : <RefreshCw size={15} />}
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
                  <div className="flex items-center gap-2 pt-1 flex-wrap">
                    <button
                      onClick={() => { setEditingUser(u); setShowCreate(false); }}
                      className="inline-flex items-center gap-1 text-primary-600 hover:text-primary-700 text-[12px] font-medium"
                    >
                      <Pencil size={12} /> Edit
                    </button>
                    {!u.passwordSet && (
                      <button
                        onClick={() => handleResendSetup(u.id)}
                        className="inline-flex items-center gap-1 text-info-600 hover:text-info-700 text-[12px] font-medium"
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
          roles={roles}
          contractors={contractors}
          onClose={() => { setShowCreate(false); setEditingUser(null); }}
          onSaved={(link) => {
            if (link) setSetupLink(link);
            setShowCreate(false);
            setEditingUser(null);
            fetchUsers();
          }}
        />
      )}

      {/* Reset Password Modal */}
      {showResetPassword && (
        <ResetPasswordModal
          users={users}
          onClose={() => setShowResetPassword(false)}
          onSaved={(msg) => {
            setShowResetPassword(false);
            toast.success(msg);
          }}
        />
      )}
    </div>
  );
}

export default function UsersPage() {
  return <UsersContent />;
}

// ─── Create / Edit Modal ────────────────────────

interface ModalProps {
  user: UserRecord | null;
  roles: RoleOption[];
  contractors: ContractorOption[];
  onClose: () => void;
  onSaved: (setupLink?: string) => void;
}

function UserModal({ user, roles, contractors, onClose, onSaved }: ModalProps) {
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
      const data = await api.get<{ permissions: Record<string, boolean> }>(`/users/role-defaults/${r}`);
      setPermissions(data.permissions);
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
      const body = isEdit
        ? { name, role, contractor: contractor || null, permissions }
        : { name, email, role, contractor: contractor || null };

      const data = isEdit
        ? await api.put<{ setupUrl?: string }>(`/users/${user!.id}`, body)
        : await api.post<{ setupUrl?: string }>('/users', body);

      onSaved(data.setupUrl);
    } catch (err: any) {
      setError(err.message || 'Failed to save user');
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
              {contractors.map(c => (
                <option key={c.id} value={c.contractor_name}>{c.contractor_name}</option>
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

// ─── Reset Password Modal ────────────────────────

interface ResetPasswordModalProps {
  users: UserRecord[];
  onClose: () => void;
  onSaved: (message: string) => void;
}

function ResetPasswordModal({ users, onClose, onSaved }: ResetPasswordModalProps) {
  const [selectedUserId, setSelectedUserId] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const selectedUser = users.find(u => u.id === selectedUserId) || null;
  const activeUsers = users.filter(u => u.isActive);
  const filteredUsers = activeUsers.filter(u =>
    u.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    u.email.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const passwordValid = newPassword.length >= 8
    && /[A-Z]/.test(newPassword)
    && /[a-z]/.test(newPassword)
    && /[0-9]/.test(newPassword)
    && /[^A-Za-z0-9]/.test(newPassword);
  const passwordsMatch = newPassword === confirmPassword && confirmPassword.length > 0;

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!selectedUser) {
      setError('Please select a user first.');
      return;
    }
    if (!passwordValid) {
      setError('Password must be at least 8 characters with uppercase, lowercase, number, and special character.');
      return;
    }
    if (!passwordsMatch) {
      setError('Passwords do not match.');
      return;
    }

    setError('');
    setSubmitting(true);
    try {
      await api.put(`/users/${selectedUser.id}/reset-password`, {
        new_password: newPassword,
        new_password_confirmation: confirmPassword,
      });
      onSaved(`Password for "${selectedUser.name}" has been reset successfully`);
    } catch (err: any) {
      setError(err.message || 'Failed to reset password');
    } finally {
      setSubmitting(false);
    }
  };

  const inputCls = 'w-full h-[42px] px-3 bg-surface border border-border rounded-[var(--radius-sm)] text-[14px] text-text-primary placeholder:text-text-tertiary outline-none transition-all duration-150 focus:border-primary-500 focus:ring-3 focus:ring-primary-100';

  return (
    <Modal
      open={true}
      onClose={onClose}
      title="Reset Password"
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>Cancel</Button>
          <Button
            variant="primary"
            icon={<KeyRound size={16} />}
            loading={submitting}
            disabled={!selectedUser || !passwordValid || !passwordsMatch}
            onClick={() => { const form = document.getElementById('reset-pw-form') as HTMLFormElement; form?.requestSubmit(); }}
          >
            Reset Password
          </Button>
        </>
      }
    >
      <form id="reset-pw-form" onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="bg-danger-50 border border-danger-100 text-danger-700 rounded-[var(--radius-md)] px-4 py-3 text-[13px]">{error}</div>
        )}

        {/* User selector */}
        <div>
          <label className="block text-[13px] font-medium text-text-secondary mb-1.5">Select User</label>
          <div className="relative mb-2">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-tertiary pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Search by name or email..."
              className={`${inputCls} pl-8`}
            />
          </div>
          <div className="border border-border rounded-[var(--radius-sm)] max-h-[180px] overflow-y-auto">
            {filteredUsers.length === 0 ? (
              <div className="px-3 py-4 text-center text-[12px] text-text-tertiary">No users found</div>
            ) : (
              filteredUsers.map(u => (
                <button
                  key={u.id}
                  type="button"
                  onClick={() => { setSelectedUserId(u.id); setSearchQuery(''); }}
                  className={`w-full text-left px-3 py-2.5 flex items-center justify-between gap-2 text-[13px] transition-colors duration-100 border-b border-border last:border-0 ${
                    selectedUserId === u.id
                      ? 'bg-primary-50 text-primary-700'
                      : 'hover:bg-surface-sunken text-text-primary'
                  }`}
                >
                  <div className="min-w-0">
                    <p className="font-medium truncate">{u.name}</p>
                    <p className={`text-[11px] truncate ${selectedUserId === u.id ? 'text-primary-500' : 'text-text-tertiary'}`}>{u.email}</p>
                  </div>
                  {selectedUserId === u.id && <Check size={14} className="shrink-0 text-primary-600" />}
                </button>
              ))
            )}
          </div>
        </div>

        {/* Selected user info */}
        {selectedUser && (
          <div className="bg-surface-sunken border border-border rounded-[var(--radius-md)] p-3">
            <p className="text-[13px] text-text-secondary">
              Resetting password for <span className="font-semibold text-text-primary">{selectedUser.name}</span>
            </p>
            <p className="text-[11px] text-text-tertiary mt-0.5">{selectedUser.email}</p>
          </div>
        )}

        <div>
          <label className="block text-[13px] font-medium text-text-secondary mb-1.5">New Password</label>
          <input
            type="password"
            value={newPassword}
            onChange={e => setNewPassword(e.target.value)}
            required
            placeholder="Min 8 chars, upper, lower, number, special"
            className={inputCls}
          />
          {newPassword && !passwordValid && (
            <p className="text-[11px] text-danger-600 mt-1">Must be 8+ chars with uppercase, lowercase, number, and special character.</p>
          )}
        </div>

        <div>
          <label className="block text-[13px] font-medium text-text-secondary mb-1.5">Confirm Password</label>
          <input
            type="password"
            value={confirmPassword}
            onChange={e => setConfirmPassword(e.target.value)}
            required
            placeholder="Re-enter password"
            className={inputCls}
          />
          {confirmPassword && !passwordsMatch && (
            <p className="text-[11px] text-danger-600 mt-1">Passwords do not match.</p>
          )}
        </div>
      </form>
    </Modal>
  );
}
