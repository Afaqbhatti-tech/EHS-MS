import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { ArrowLeft, Save, Users, UserCog, Shield, Lock } from 'lucide-react';
import { PERMISSION_GROUPS, formatPermLabel } from '../../constants/permissions';
import Button from '../../components/ui/Button';
import Badge from '../../components/ui/Badge';
import Modal from '../../components/ui/Modal';
import { PageSpinner } from '../../components/ui/Spinner';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:8000/api';

interface RoleUser {
  id: string;
  name: string;
  email: string;
  username: string | null;
  isActive: boolean;
  hasOverrides: boolean;
}

interface RoleMetadata {
  id: string;
  slug: string;
  name: string;
  description: string;
  isSystem: boolean;
  isActive: boolean;
}

export default function RoleDetailPage() {
  const { role } = useParams<{ role: string }>();
  const { token } = useAuth();
  const navigate = useNavigate();
  const headers = { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json', 'ngrok-skip-browser-warning': '1' };

  const [roleMeta, setRoleMeta] = useState<RoleMetadata | null>(null);
  const [permissions, setPermissions] = useState<Record<string, boolean>>({});
  const [originalPerms, setOriginalPerms] = useState<Record<string, boolean>>({});
  const [users, setUsers] = useState<RoleUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  // User override modal state
  const [overrideUser, setOverrideUser] = useState<RoleUser | null>(null);
  const [overrideData, setOverrideData] = useState<{
    roleDefaults: Record<string, boolean>;
    overrides: Record<string, boolean>;
    effective: Record<string, boolean>;
  } | null>(null);
  const [overrideLoading, setOverrideLoading] = useState(false);
  const [overrideSaving, setOverrideSaving] = useState(false);
  const [localOverrides, setLocalOverrides] = useState<Record<string, boolean | null>>({});

  const isMaster = role === 'master';
  const roleLabel = roleMeta?.name || role || '';

  useEffect(() => {
    if (!role) return;
    setLoading(true);

    Promise.all([
      fetch(`${API_BASE}/roles`, { headers }).then(r => r.json()),
      fetch(`${API_BASE}/roles/${role}/permissions`, { headers }).then(r => r.json()),
      fetch(`${API_BASE}/roles/${role}/users`, { headers }).then(r => r.json()),
    ])
      .then(([rolesData, permData, userData]) => {
        const meta = (rolesData.roles || []).find((r: any) => r.slug === role || r.role === role);
        if (meta) {
          setRoleMeta({
            id: meta.id,
            slug: meta.slug || meta.role,
            name: meta.name || meta.label,
            description: meta.description || '',
            isSystem: !!meta.isSystem,
            isActive: meta.isActive !== false,
          });
        }
        setPermissions(permData.permissions || {});
        setOriginalPerms(permData.permissions || {});
        setUsers(userData.users || []);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [role, token]);

  const hasChanges = JSON.stringify(permissions) !== JSON.stringify(originalPerms);

  const handleSave = async () => {
    if (!role || isMaster) return;
    setSaving(true);
    try {
      const res = await fetch(`${API_BASE}/roles/${role}/permissions`, {
        method: 'PUT',
        headers,
        body: JSON.stringify({ permissions }),
      });
      if (res.ok) {
        setOriginalPerms({ ...permissions });
        setSaved(true);
        setTimeout(() => setSaved(false), 2000);
        const userData = await fetch(`${API_BASE}/roles/${role}/users`, { headers }).then(r => r.json());
        setUsers(userData.users || []);
      }
    } catch (err) {
      console.error('Save error:', err);
    } finally {
      setSaving(false);
    }
  };

  const togglePerm = (key: string) => {
    setPermissions(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const grantedCount = Object.values(permissions).filter(Boolean).length;
  const totalCount = Object.keys(permissions).length;

  // ─── User Override Modal ────────────────────────
  const openOverrideModal = async (user: RoleUser) => {
    setOverrideUser(user);
    setOverrideLoading(true);
    setOverrideData(null);
    setLocalOverrides({});

    try {
      const res = await fetch(`${API_BASE}/roles/user-overrides/${user.id}`, { headers });
      const data = await res.json();
      setOverrideData({
        roleDefaults: data.roleDefaults || {},
        overrides: data.overrides || {},
        effective: data.effective || {},
      });
      setLocalOverrides(data.overrides || {});
    } catch (err) {
      console.error(err);
    } finally {
      setOverrideLoading(false);
    }
  };

  const cycleOverride = (perm: string) => {
    if (!overrideData) return;
    const roleDefault = !!overrideData.roleDefaults[perm];
    const currentOverride = localOverrides[perm];

    if (currentOverride === undefined || currentOverride === null) {
      setLocalOverrides(prev => ({ ...prev, [perm]: !roleDefault }));
    } else if (currentOverride !== roleDefault) {
      const copy = { ...localOverrides };
      delete copy[perm];
      setLocalOverrides(copy);
    } else {
      const copy = { ...localOverrides };
      delete copy[perm];
      setLocalOverrides(copy);
    }
  };

  const saveOverrides = async () => {
    if (!overrideUser) return;
    setOverrideSaving(true);

    try {
      const res = await fetch(`${API_BASE}/roles/user-overrides/${overrideUser.id}`, {
        method: 'PUT',
        headers,
        body: JSON.stringify({ overrides: localOverrides }),
      });
      if (res.ok) {
        setOverrideUser(null);
        const userData = await fetch(`${API_BASE}/roles/${role}/users`, { headers }).then(r => r.json());
        setUsers(userData.users || []);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setOverrideSaving(false);
    }
  };

  if (loading) {
    return <PageSpinner label="Loading role..." />;
  }

  return (
    <div className="max-w-[1024px]">
      {/* Header */}
      <div className="flex items-center gap-3 pb-6 mb-6 border-b border-border">
        <button onClick={() => navigate('/admin/roles')} className="p-2 hover:bg-surface-sunken rounded-[var(--radius-sm)] transition-colors duration-150">
          <ArrowLeft size={18} className="text-text-secondary" />
        </button>
        <div className="flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <h1 className="text-[24px] leading-[32px] font-bold text-text-primary tracking-tight">{roleLabel}</h1>
            {isMaster && (
              <Badge variant="warning">FULL ACCESS — All permissions always granted</Badge>
            )}
            {roleMeta?.isSystem && !isMaster && (
              <span className="text-[10px] bg-surface-sunken text-text-tertiary px-2 py-0.5 rounded font-medium flex items-center gap-1">
                <Lock size={10} /> SYSTEM ROLE
              </span>
            )}
            {roleMeta && !roleMeta.isSystem && (
              <Badge variant="primary">CUSTOM ROLE</Badge>
            )}
          </div>
          {roleMeta?.description && (
            <p className="text-[11px] text-text-tertiary mt-0.5">{roleMeta.description}</p>
          )}
          <p className="text-[13px] text-text-secondary mt-0.5">
            {grantedCount}/{totalCount} permissions granted
            <span className="text-text-disabled font-mono text-[11px] ml-2">({role})</span>
          </p>
        </div>

        {!isMaster && (
          <Button
            variant={hasChanges ? 'primary' : saved ? 'secondary' : 'secondary'}
            icon={<Save size={16} />}
            disabled={!hasChanges && !saved}
            loading={saving}
            onClick={handleSave}
            className={saved ? 'bg-success-50 text-success-700 border-success-200' : ''}
          >
            {saving ? 'Saving...' : saved ? 'Saved!' : 'Save Changes'}
          </Button>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Permissions Panel */}
        <div className="lg:col-span-2 space-y-4">
          {PERMISSION_GROUPS.map(group => {
            const groupPerms = group.perms.filter(p => p in permissions);
            if (!groupPerms.length) return null;

            return (
              <div key={group.label} className="bg-surface rounded-[var(--radius-lg)] border border-border overflow-hidden">
                <div className="px-4 py-3 bg-surface-sunken border-b border-border">
                  <h3 className="text-[11px] font-semibold uppercase tracking-wider text-text-secondary">
                    {group.label}
                  </h3>
                </div>
                <div className="p-4 grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {groupPerms.map(perm => (
                    <label
                      key={perm}
                      className={`flex items-center gap-3 px-3 py-2 rounded-[var(--radius-sm)] cursor-pointer transition-colors duration-150 ${
                        isMaster
                          ? 'bg-success-50 cursor-default'
                          : permissions[perm]
                            ? 'bg-primary-50 hover:bg-primary-100'
                            : 'bg-surface-sunken hover:bg-[#E8EBF0]'
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={isMaster || !!permissions[perm]}
                        onChange={() => togglePerm(perm)}
                        disabled={isMaster}
                        className="rounded border-border-strong text-primary-600 focus:ring-primary-500 w-4 h-4"
                      />
                      <span className={`text-[13px] ${permissions[perm] || isMaster ? 'text-text-primary' : 'text-text-tertiary'}`}>
                        {formatPermLabel(perm)}
                      </span>
                    </label>
                  ))}
                </div>
              </div>
            );
          })}
        </div>

        {/* Users Panel */}
        <div className="space-y-4">
          {/* Role Info Card */}
          {roleMeta && (
            <div className="bg-surface rounded-[var(--radius-lg)] border border-border">
              <div className="px-4 py-3 bg-surface-sunken border-b border-border flex items-center gap-2">
                <Shield size={14} className="text-text-tertiary" />
                <h3 className="text-[11px] font-semibold uppercase tracking-wider text-text-secondary">
                  Role Info
                </h3>
              </div>
              <div className="p-4 space-y-2 text-[13px]">
                <div>
                  <span className="text-text-tertiary">Name:</span>
                  <span className="ml-2 text-text-primary font-medium">{roleMeta.name}</span>
                </div>
                <div>
                  <span className="text-text-tertiary">Slug:</span>
                  <span className="ml-2 text-text-primary font-mono text-[11px]">{roleMeta.slug}</span>
                </div>
                {roleMeta.description && (
                  <div>
                    <span className="text-text-tertiary">Description:</span>
                    <p className="text-text-secondary mt-0.5 text-[11px]">{roleMeta.description}</p>
                  </div>
                )}
                <div>
                  <span className="text-text-tertiary">Type:</span>
                  <span className="ml-2">
                    <Badge variant={roleMeta.isSystem ? 'neutral' : 'primary'}>
                      {roleMeta.isSystem ? 'System Role' : 'Custom Role'}
                    </Badge>
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* Users List */}
          <div className="bg-surface rounded-[var(--radius-lg)] border border-border">
            <div className="px-4 py-3 bg-surface-sunken border-b border-border flex items-center gap-2">
              <Users size={14} className="text-text-tertiary" />
              <h3 className="text-[11px] font-semibold uppercase tracking-wider text-text-secondary">
                Users with this role ({users.length})
              </h3>
            </div>
            <div className="divide-y divide-border">
              {users.length === 0 ? (
                <div className="p-4 text-[13px] text-text-tertiary text-center">No users with this role</div>
              ) : (
                users.map(u => (
                  <div key={u.id} className="px-4 py-3 flex items-center justify-between">
                    <div className="min-w-0">
                      <p className="text-[13px] font-medium text-text-primary truncate">{u.name}</p>
                      <p className="text-[11px] text-text-tertiary truncate">{u.email}</p>
                      {u.hasOverrides && (
                        <Badge variant="warning" className="mt-0.5">Custom overrides</Badge>
                      )}
                    </div>
                    {!isMaster && (
                      <button
                        onClick={() => openOverrideModal(u)}
                        className="shrink-0 p-1.5 rounded-[var(--radius-sm)] hover:bg-surface-sunken text-text-tertiary hover:text-primary-600 transition-colors duration-150"
                        title="Manage individual permissions"
                      >
                        <UserCog size={16} />
                      </button>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ─── User Override Modal ──────────────────────── */}
      <Modal
        open={!!overrideUser}
        onClose={() => setOverrideUser(null)}
        title="Permission Overrides"
        subtitle={overrideUser ? `${overrideUser.name} — ${roleLabel}` : ''}
        size="lg"
        footer={
          <>
            <Button variant="secondary" onClick={() => setOverrideUser(null)}>Cancel</Button>
            <Button variant="primary" loading={overrideSaving} onClick={saveOverrides}>
              Save Overrides
            </Button>
          </>
        }
      >
        {overrideLoading ? (
          <PageSpinner label="Loading permissions..." />
        ) : overrideData ? (
          <div>
            <div className="mb-4 p-3 bg-info-50 border border-info-100 rounded-[var(--radius-md)] text-[13px] text-info-600">
              Click a permission to toggle between: <strong>Inherit from role</strong> (gray),
              <strong className="text-success-700"> Granted</strong> (green), or
              <strong className="text-danger-700"> Denied</strong> (red).
            </div>

            {PERMISSION_GROUPS.map(group => {
              const groupPerms = group.perms.filter(p => p in overrideData.roleDefaults);
              if (!groupPerms.length) return null;

              return (
                <div key={group.label} className="mb-4">
                  <h4 className="text-[11px] font-semibold uppercase tracking-wider text-text-tertiary mb-2">
                    {group.label}
                  </h4>
                  <div className="space-y-1">
                    {groupPerms.map(perm => {
                      const roleDefault = !!overrideData.roleDefaults[perm];
                      const hasOverride = perm in localOverrides;
                      const overrideValue = localOverrides[perm];

                      let effectiveValue: boolean;
                      let stateLabel: string;
                      let stateBg: string;

                      if (hasOverride) {
                        effectiveValue = !!overrideValue;
                        stateLabel = overrideValue ? 'GRANTED' : 'DENIED';
                        stateBg = overrideValue
                          ? 'bg-success-50 border-success-100'
                          : 'bg-danger-50 border-danger-100';
                      } else {
                        effectiveValue = roleDefault;
                        stateLabel = 'INHERIT';
                        stateBg = 'bg-surface-sunken border-border';
                      }

                      return (
                        <button
                          key={perm}
                          onClick={() => cycleOverride(perm)}
                          className={`w-full flex items-center justify-between px-3 py-2 rounded-[var(--radius-sm)] border text-left transition-all duration-150 ${stateBg} hover:shadow-xs`}
                        >
                          <div className="flex items-center gap-3">
                            <div className={`w-3 h-3 rounded-full ${
                              effectiveValue ? 'bg-success-500' : 'bg-danger-500'
                            }`} />
                            <span className="text-[13px] text-text-primary">{formatPermLabel(perm)}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            {hasOverride && (
                              <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                                overrideValue
                                  ? 'text-success-700 bg-success-100'
                                  : 'text-danger-700 bg-danger-100'
                              }`}>
                                {stateLabel}
                              </span>
                            )}
                            {!hasOverride && (
                              <span className="text-[10px] text-text-disabled font-medium">
                                {roleDefault ? 'ON' : 'OFF'} (role default)
                              </span>
                            )}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        ) : null}
      </Modal>
    </div>
  );
}
