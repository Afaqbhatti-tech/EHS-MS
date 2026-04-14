import { useState, useEffect } from 'react';
import { Navigate, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { api } from '../../services/api';
import Badge from '../../components/ui/Badge';
import { useToast } from '../../components/ui/Toast';
import {
  Shield, KeyRound, Users, Settings, ChevronRight, Crown, Search,
  Filter, Clock, UserCheck, type LucideIcon,
} from 'lucide-react';
import { PERMISSION_TYPE_LABELS } from '../../constants/permissions';
import { UsersContent } from './UsersPage';

// ─── Types ─────────────────────────────────────

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

interface AuditLogEntry {
  id: string;
  actorName: string;
  targetRole: string;
  action: string;
  changes: Record<string, any> | string | null;
  createdAt: string;
}

type TabKey = 'roles' | 'users' | 'audit';

interface TabDef {
  key: TabKey;
  label: string;
  icon: LucideIcon;
  permission: string;
}

// ─── Helpers ───────────────────────────────────

function formatActionLabel(action: string): string {
  return action
    .replace(/_/g, ' ')
    .replace(/\b\w/g, c => c.toUpperCase());
}

function formatChangesSummary(changes: Record<string, any> | string | null): string {
  if (!changes) return '—';
  if (typeof changes === 'string') return changes;

  const enabled = changes.enabled ?? changes.granted ?? 0;
  const disabled = changes.disabled ?? changes.revoked ?? 0;

  const parts: string[] = [];
  if (typeof enabled === 'number' && enabled > 0) parts.push(`Enabled ${enabled}`);
  if (typeof disabled === 'number' && disabled > 0) parts.push(`Disabled ${disabled}`);
  if (Array.isArray(changes.enabled)) parts.push(`Enabled ${changes.enabled.length}`);
  if (Array.isArray(changes.disabled)) parts.push(`Disabled ${changes.disabled.length}`);

  if (parts.length === 0) {
    // Fallback: try to summarize keys
    const keys = Object.keys(changes);
    if (keys.length === 0) return '—';
    return `${keys.length} change${keys.length !== 1 ? 's' : ''}`;
  }

  return parts.join(', ');
}

function formatTimestamp(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;

  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined,
    hour: '2-digit',
    minute: '2-digit',
  });
}

// ─── Main Component ────────────────────────────

export default function AccessManagementPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const { hasPermission } = useAuth();
  const toast = useToast();

  const canManageRoles = hasPermission('can_manage_roles');
  const canManageUsers = hasPermission('can_manage_users');

  // Redirect if no access at all
  if (!canManageRoles && !canManageUsers) {
    return <Navigate to="/dashboard" replace />;
  }

  // Determine active tab from URL
  const getActiveTab = (): TabKey => {
    if (location.pathname.includes('/admin/users')) return 'users';
    if (location.pathname.includes('/admin/audit')) return 'audit';
    return 'roles';
  };

  const [activeTab, setActiveTab] = useState<TabKey>(getActiveTab);

  // Sync tab with URL
  useEffect(() => {
    setActiveTab(getActiveTab());
  }, [location.pathname]);

  // Guard tabs by permission
  if (activeTab === 'users' && !canManageUsers) {
    return <Navigate to="/admin/roles" replace />;
  }
  if ((activeTab === 'roles' || activeTab === 'audit') && !canManageRoles) {
    return <Navigate to="/admin/users" replace />;
  }

  const ALL_TABS: TabDef[] = [
    { key: 'roles', label: 'Roles & Permissions', icon: KeyRound, permission: 'can_manage_roles' },
    { key: 'users', label: 'Users', icon: Users, permission: 'can_manage_users' },
    { key: 'audit', label: 'Audit Log', icon: Clock, permission: 'can_manage_roles' },
  ];

  const visibleTabs = ALL_TABS.filter(t => hasPermission(t.permission));

  const handleTabChange = (tab: TabKey) => {
    switch (tab) {
      case 'roles':
        navigate('/admin/roles');
        break;
      case 'users':
        navigate('/admin/users');
        break;
      case 'audit':
        navigate('/admin/audit');
        break;
    }
  };

  return (
    <div>
      {/* Header */}
      <div className="mb-4 sm:mb-6">
        <div className="flex items-center gap-3 min-w-0 pb-4">
          <span className="text-primary-600 shrink-0 [&>svg]:size-5 sm:[&>svg]:size-6">
            <Shield />
          </span>
          <div className="min-w-0">
            <h1 className="text-[20px] sm:text-[24px] leading-[28px] sm:leading-[32px] font-bold text-text-primary tracking-tight">
              Access Management
            </h1>
            <p className="text-[12px] sm:text-[13px] text-text-secondary mt-0.5">
              Manage roles, permissions, and access control
            </p>
          </div>
        </div>

        {/* Tab bar */}
        <div className="flex gap-1 border-b border-border">
          {visibleTabs.map(tab => (
            <button
              key={tab.key}
              onClick={() => handleTabChange(tab.key)}
              className={`flex items-center gap-2 px-4 py-2.5 text-[13px] font-medium border-b-2 -mb-px transition-colors duration-150 ${
                activeTab === tab.key
                  ? 'border-primary-500 text-primary-600'
                  : 'border-transparent text-text-tertiary hover:text-text-secondary'
              }`}
            >
              <tab.icon size={16} />
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      {activeTab === 'roles' && <RolesTab />}
      {activeTab === 'users' && <UsersContent />}
      {activeTab === 'audit' && <AuditLogTab />}
    </div>
  );
}

// ─── Tab 1: Roles & Permissions ────────────────

function RolesTab() {
  const navigate = useNavigate();
  const toast = useToast();

  const [roles, setRoles] = useState<RoleInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchQuery, setSearchQuery] = useState('');

  const fetchRoles = () => {
    setLoading(true);
    setError('');
    api.get<{ roles: RoleInfo[] }>('/roles')
      .then(d => setRoles(d.roles || []))
      .catch(err => {
        console.error(err);
        setError('Failed to load roles');
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchRoles();
  }, []);

  const filteredRoles = roles.filter(r =>
    r.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    r.slug.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-2 border-primary-200 border-t-primary-600 rounded-full animate-spin" />
          <p className="text-[13px] text-text-tertiary">Loading roles...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-danger-50 border border-danger-100 text-danger-700 rounded-xl p-6 text-center">
        <p className="text-[13px] font-medium">{error}</p>
        <button
          onClick={fetchRoles}
          className="mt-3 text-[12px] font-medium text-primary-600 hover:text-primary-700 underline"
        >
          Try again
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-[1024px]">
      {/* Search bar */}
      <div className="mb-4">
        <div className="relative max-w-sm">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-tertiary pointer-events-none" />
          <input
            type="text"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder="Search roles..."
            className="w-full h-[40px] pl-9 pr-3 bg-white border border-border rounded-lg text-[13px] text-text-primary placeholder:text-text-tertiary outline-none transition-all duration-150 focus:border-primary-500 focus:ring-3 focus:ring-primary-100"
          />
        </div>
      </div>

      {/* Role cards */}
      {filteredRoles.length === 0 ? (
        <div className="text-center py-16">
          <Shield size={32} className="mx-auto text-text-disabled mb-3" />
          <p className="text-[13px] text-text-tertiary">
            {searchQuery ? 'No roles match your search' : 'No roles found'}
          </p>
        </div>
      ) : (
        <div className="grid gap-3">
          {filteredRoles.map(r => {
            const isMasterRole = r.slug === 'master';
            const pct = r.totalPermissions > 0
              ? Math.round((r.grantedCount / r.totalPermissions) * 100)
              : 0;

            return (
              <div
                key={r.slug}
                className="bg-white rounded-xl border border-border shadow-sm p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4 hover:border-primary-200 hover:shadow-md transition-all duration-150"
              >
                {/* Role icon */}
                <div
                  className={`w-11 h-11 rounded-lg flex items-center justify-center shrink-0 ${
                    isMasterRole
                      ? 'bg-amber-100 text-amber-700'
                      : r.isSystem
                        ? 'bg-blue-100 text-blue-700'
                        : 'bg-gray-100 text-gray-600'
                  }`}
                >
                  {isMasterRole ? <Crown size={20} /> : <Shield size={20} />}
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-semibold text-[14px] text-text-primary">
                      {r.name}
                    </span>
                    {isMasterRole && (
                      <Badge variant="warning">FULL ACCESS</Badge>
                    )}
                    {r.isSystem && !isMasterRole && (
                      <span className="text-[10px] bg-gray-100 text-text-tertiary px-1.5 py-0.5 rounded font-medium">
                        SYSTEM
                      </span>
                    )}
                    {!r.isSystem && (
                      <Badge variant="primary">CUSTOM</Badge>
                    )}
                  </div>

                  {r.description && (
                    <p className="text-[12px] text-text-tertiary mt-0.5 truncate">
                      {r.description}
                    </p>
                  )}

                  <div className="flex items-center gap-4 mt-1.5 text-[12px] text-text-tertiary">
                    <span className="flex items-center gap-1">
                      <Users size={13} />
                      {r.userCount} user{r.userCount !== 1 ? 's' : ''}
                    </span>
                    <span className="flex items-center gap-1">
                      <KeyRound size={13} />
                      {isMasterRole
                        ? `${r.totalPermissions} / ${r.totalPermissions} permissions`
                        : `${r.grantedCount} / ${r.totalPermissions} permissions`
                      }
                    </span>
                  </div>

                  {/* Progress bar */}
                  {!isMasterRole && (
                    <div className="mt-2.5 w-full max-w-xs bg-gray-100 rounded-full h-1.5">
                      <div
                        className="bg-primary-500 h-1.5 rounded-full transition-all duration-500"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  )}
                  {isMasterRole && (
                    <div className="mt-2.5 w-full max-w-xs bg-amber-100 rounded-full h-1.5">
                      <div
                        className="bg-amber-500 h-1.5 rounded-full"
                        style={{ width: '100%' }}
                      />
                    </div>
                  )}
                </div>

                {/* Action button */}
                <div className="shrink-0 self-end sm:self-center">
                  {!isMasterRole ? (
                    <button
                      onClick={() => navigate(`/admin/roles/${r.slug}`)}
                      className="inline-flex items-center gap-1.5 px-3.5 py-2 text-[12px] font-medium text-primary-600 bg-primary-50 hover:bg-primary-100 rounded-lg transition-colors duration-150"
                    >
                      Permissions
                      <ChevronRight size={14} />
                    </button>
                  ) : (
                    <span className="inline-flex items-center gap-1.5 px-3.5 py-2 text-[12px] font-medium text-amber-600 bg-amber-50 rounded-lg cursor-default">
                      <Crown size={14} />
                      All Granted
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ─── Tab 3: Audit Log ──────────────────────────

function AuditLogTab() {
  const [logs, setLogs] = useState<AuditLogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    setLoading(true);
    setError('');
    api.get<{ logs: AuditLogEntry[] }>('/roles/audit-logs')
      .then(d => setLogs(d.logs || []))
      .catch(err => {
        console.error(err);
        setError('Failed to load audit logs');
      })
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-2 border-primary-200 border-t-primary-600 rounded-full animate-spin" />
          <p className="text-[13px] text-text-tertiary">Loading audit logs...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-danger-50 border border-danger-100 text-danger-700 rounded-xl p-6 text-center">
        <p className="text-[13px] font-medium">{error}</p>
        <button
          onClick={() => {
            setLoading(true);
            setError('');
            api.get<{ logs: AuditLogEntry[] }>('/roles/audit-logs')
              .then(d => setLogs(d.logs || []))
              .catch(err => { console.error(err); setError('Failed to load audit logs'); })
              .finally(() => setLoading(false));
          }}
          className="mt-3 text-[12px] text-primary-600 hover:underline font-medium"
        >
          Try again
        </button>
      </div>
    );
  }

  if (logs.length === 0) {
    return (
      <div className="text-center py-16">
        <Clock size={32} className="mx-auto text-text-disabled mb-3" />
        <p className="text-[14px] font-medium text-text-secondary mb-1">No audit logs yet</p>
        <p className="text-[12px] text-text-tertiary">
          Permission changes will be recorded here
        </p>
      </div>
    );
  }

  return (
    <div className="max-w-[1024px]">
      {/* Desktop table view */}
      <div className="hidden md:block bg-white rounded-xl border border-border shadow-sm overflow-hidden">
        <table className="w-full text-[13px]">
          <thead>
            <tr className="bg-gray-50 border-b border-border">
              <th className="text-left px-4 py-3 text-[11px] uppercase tracking-wider font-medium text-text-secondary">
                Actor
              </th>
              <th className="text-left px-4 py-3 text-[11px] uppercase tracking-wider font-medium text-text-secondary">
                Action
              </th>
              <th className="text-left px-4 py-3 text-[11px] uppercase tracking-wider font-medium text-text-secondary">
                Target Role
              </th>
              <th className="text-left px-4 py-3 text-[11px] uppercase tracking-wider font-medium text-text-secondary">
                Changes
              </th>
              <th className="text-left px-4 py-3 text-[11px] uppercase tracking-wider font-medium text-text-secondary">
                Timestamp
              </th>
            </tr>
          </thead>
          <tbody>
            {logs.map(log => (
              <tr
                key={log.id}
                className="border-b border-border last:border-0 hover:bg-gray-50 transition-colors duration-100"
              >
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-full bg-primary-100 text-primary-700 flex items-center justify-center text-[11px] font-semibold shrink-0">
                      {log.actorName
                        .split(' ')
                        .map(w => w[0])
                        .slice(0, 2)
                        .join('')
                        .toUpperCase()}
                    </div>
                    <span className="font-medium text-text-primary">{log.actorName}</span>
                  </div>
                </td>
                <td className="px-4 py-3">
                  <span className="text-text-secondary">{formatActionLabel(log.action)}</span>
                </td>
                <td className="px-4 py-3">
                  <Badge variant="neutral">{log.targetRole}</Badge>
                </td>
                <td className="px-4 py-3 text-text-tertiary">
                  {formatChangesSummary(log.changes)}
                </td>
                <td className="px-4 py-3 text-text-tertiary text-[12px]">
                  <div className="flex items-center gap-1.5">
                    <Clock size={12} />
                    {formatTimestamp(log.createdAt)}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Mobile timeline view */}
      <div className="md:hidden space-y-3">
        {logs.map(log => (
          <div
            key={log.id}
            className="bg-white rounded-xl border border-border shadow-sm p-4"
          >
            <div className="flex items-start justify-between gap-3 mb-2">
              <div className="flex items-center gap-2 min-w-0">
                <div className="w-7 h-7 rounded-full bg-primary-100 text-primary-700 flex items-center justify-center text-[11px] font-semibold shrink-0">
                  {log.actorName
                    .split(' ')
                    .map(w => w[0])
                    .slice(0, 2)
                    .join('')
                    .toUpperCase()}
                </div>
                <span className="font-medium text-[13px] text-text-primary truncate">
                  {log.actorName}
                </span>
              </div>
              <span className="text-[11px] text-text-tertiary whitespace-nowrap flex items-center gap-1">
                <Clock size={11} />
                {formatTimestamp(log.createdAt)}
              </span>
            </div>

            <p className="text-[13px] text-text-secondary mb-1.5">
              {formatActionLabel(log.action)}
            </p>

            <div className="flex items-center gap-2 flex-wrap">
              <Badge variant="neutral">{log.targetRole}</Badge>
              <span className="text-[11px] text-text-tertiary">
                {formatChangesSummary(log.changes)}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
