import { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { api } from '../../services/api';
import Badge from '../../components/ui/Badge';
import { useToast } from '../../components/ui/Toast';
import {
  ArrowLeft, Save, Shield, Lock, Search,
  ChevronDown, ChevronRight, ToggleLeft, ToggleRight,
  Check, X, Eye, Zap, Settings, Database,
  LayoutDashboard, Brain, ClipboardCheck, Users, CheckSquare, Package,
  FolderKanban, ClipboardList, FileText, GraduationCap, Wrench, Ban,
  AlertTriangle, Siren, CalendarDays, FileEdit, Upload, FolderOpen,
  Megaphone, Image, Leaf, Truck, HardHat, BarChart3,
  type LucideIcon,
} from 'lucide-react';
import {
  type RegistryModule,
  type RegistryPermission,
  PERMISSION_TYPE_LABELS,
} from '../../constants/permissions';

// ─── Icon Map ────────────────────────────────────

const ICON_MAP: Record<string, LucideIcon> = {
  LayoutDashboard, Brain, Eye, ClipboardCheck, Users, CheckSquare, Package,
  FolderKanban, ClipboardList, FileText, GraduationCap, Wrench, Ban,
  AlertTriangle, Siren, CalendarDays, FileEdit, Upload, FolderOpen,
  Megaphone, Image, Leaf, Truck, HardHat, BarChart3, Shield, Settings,
  Database,
};

// ─── Type Badge Styles ───────────────────────────

const TYPE_STYLES: Record<string, string> = {
  module:  'bg-blue-50 text-blue-700',
  section: 'bg-purple-50 text-purple-700',
  data:    'bg-emerald-50 text-emerald-700',
  action:  'bg-amber-50 text-amber-700',
};

const TYPE_ICONS: Record<string, LucideIcon> = {
  module:  Shield,
  section: Eye,
  data:    Database,
  action:  Zap,
};

// ─── Interfaces ──────────────────────────────────

interface RoleSummary {
  slug: string;
  name: string;
  description: string;
  isSystem: boolean;
  grantedCount: number;
  totalPermissions: number;
  userCount: number;
}

// ─── Toggle Switch Component ─────────────────────

function Toggle({
  enabled,
  disabled,
  onChange,
  size = 'md',
}: {
  enabled: boolean;
  disabled?: boolean;
  onChange: () => void;
  size?: 'sm' | 'md';
}) {
  const w = size === 'sm' ? 'w-[34px]' : 'w-[40px]';
  const h = size === 'sm' ? 'h-[18px]' : 'h-[22px]';
  const dot = size === 'sm' ? 'w-[14px] h-[14px]' : 'w-[18px] h-[18px]';
  const translate = size === 'sm'
    ? (enabled ? 'translate-x-[16px]' : 'translate-x-[2px]')
    : (enabled ? 'translate-x-[18px]' : 'translate-x-[2px]');

  return (
    <button
      type="button"
      role="switch"
      aria-checked={enabled}
      disabled={disabled}
      onClick={onChange}
      className={`
        ${w} ${h} rounded-full relative inline-flex items-center shrink-0 transition-all duration-200
        ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
        ${enabled ? 'bg-green-500' : 'bg-gray-300'}
      `}
    >
      <span
        className={`
          ${dot} rounded-full bg-white shadow-sm transition-transform duration-200
          ${translate}
        `}
      />
    </button>
  );
}

// ─── Main Component ──────────────────────────────

export default function RoleDetailPage() {
  const { role } = useParams<{ role: string }>();
  const navigate = useNavigate();
  const toast = useToast();

  // Data state
  const [roleMeta, setRoleMeta] = useState<RoleSummary | null>(null);
  const [registry, setRegistry] = useState<RegistryModule[]>([]);
  const [allKeys, setAllKeys] = useState<string[]>([]);
  const [permissions, setPermissions] = useState<Record<string, boolean>>({});
  const [originalPerms, setOriginalPerms] = useState<Record<string, boolean>>({});

  // UI state
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [expandedModules, setExpandedModules] = useState<Set<string>>(new Set());

  const isMaster = role === 'master';

  // ─── Data Fetching ───────────────────────────────

  useEffect(() => {
    if (!role) return;
    setLoading(true);

    Promise.all([
      api.get<{ roles: RoleSummary[] }>('/roles'),
      api.get<{ registry: RegistryModule[]; allKeys: string[] }>('/roles/permissions/registry'),
      api.get<{ permissions: Record<string, boolean> }>(`/roles/${role}/permissions`),
    ])
      .then(([rolesData, registryData, permData]) => {
        const meta = (rolesData.roles || []).find(
          (r) => r.slug === role
        );
        if (meta) setRoleMeta(meta);

        setRegistry(registryData.registry || []);
        setAllKeys(registryData.allKeys || []);
        setPermissions(permData.permissions || {});
        setOriginalPerms(permData.permissions || {});

        // Auto-expand first module
        if (registryData.registry?.length) {
          setExpandedModules(new Set([registryData.registry[0].key]));
        }
      })
      .catch((err) => {
        console.error('Failed to load role data:', err);
        toast.error('Failed to load role data');
      })
      .finally(() => setLoading(false));
  }, [role]); // eslint-disable-line react-hooks/exhaustive-deps

  // ─── Computed Values ─────────────────────────────

  const hasChanges = useMemo(
    () => JSON.stringify(permissions) !== JSON.stringify(originalPerms),
    [permissions, originalPerms]
  );

  const grantedCount = useMemo(
    () => Object.values(permissions).filter(Boolean).length,
    [permissions]
  );

  const totalCount = allKeys.length || Object.keys(permissions).length;

  const progressPercent = totalCount > 0 ? Math.round((grantedCount / totalCount) * 100) : 0;

  // ─── Search / Filter ─────────────────────────────

  const filteredRegistry = useMemo(() => {
    if (!searchTerm.trim()) return registry;

    const q = searchTerm.toLowerCase();
    return registry
      .map((mod) => {
        const moduleMatches = mod.label.toLowerCase().includes(q) ||
          mod.key.toLowerCase().includes(q);

        if (moduleMatches) return mod;

        const matchingPerms = mod.permissions.filter(
          (p) =>
            p.label.toLowerCase().includes(q) ||
            p.key.toLowerCase().includes(q)
        );

        if (matchingPerms.length === 0) return null;

        return { ...mod, permissions: matchingPerms };
      })
      .filter(Boolean) as RegistryModule[];
  }, [registry, searchTerm]);

  // When searching, expand all matching modules
  const effectiveExpanded = useMemo(() => {
    if (searchTerm.trim()) {
      return new Set(filteredRegistry.map((m) => m.key));
    }
    return expandedModules;
  }, [searchTerm, filteredRegistry, expandedModules]);

  // ─── Actions ─────────────────────────────────────

  const togglePerm = (key: string) => {
    if (isMaster) return;
    setPermissions((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const toggleModule = (moduleKey: string) => {
    setExpandedModules((prev) => {
      const next = new Set(prev);
      if (next.has(moduleKey)) {
        next.delete(moduleKey);
      } else {
        next.add(moduleKey);
      }
      return next;
    });
  };

  const toggleAllInModule = (mod: RegistryModule) => {
    if (isMaster) return;
    const modulePermKeys = mod.permissions.map((p) => p.key);
    const allEnabled = modulePermKeys.every((k) => permissions[k]);

    setPermissions((prev) => {
      const next = { ...prev };
      modulePermKeys.forEach((k) => {
        next[k] = !allEnabled;
      });
      return next;
    });
  };

  const enableAll = () => {
    if (isMaster) return;
    setPermissions((prev) => {
      const next = { ...prev };
      allKeys.forEach((k) => {
        next[k] = true;
      });
      return next;
    });
  };

  const disableAll = () => {
    if (isMaster) return;
    setPermissions((prev) => {
      const next = { ...prev };
      allKeys.forEach((k) => {
        next[k] = false;
      });
      return next;
    });
  };

  const handleSave = async () => {
    if (!role || isMaster) return;
    setSaving(true);
    try {
      const result = await api.put<{ message: string; permissions: Record<string, boolean> }>(
        `/roles/${role}/permissions`,
        { permissions }
      );
      setOriginalPerms(result.permissions || { ...permissions });
      setPermissions(result.permissions || { ...permissions });
      toast.success('Permissions saved successfully');
    } catch (err: any) {
      console.error('Save error:', err);
      toast.error(err?.message || 'Failed to save permissions');
    } finally {
      setSaving(false);
    }
  };

  // ─── Helpers ─────────────────────────────────────

  function getModuleStats(mod: RegistryModule): { enabled: number; total: number } {
    const total = mod.permissions.length;
    const enabled = mod.permissions.filter((p) => isMaster || permissions[p.key]).length;
    return { enabled, total };
  }

  function groupPermissionsByType(perms: RegistryPermission[]): Record<string, RegistryPermission[]> {
    const groups: Record<string, RegistryPermission[]> = {};
    const order = ['module', 'section', 'data', 'action'];

    order.forEach((type) => {
      const matched = perms.filter((p) => p.type === type);
      if (matched.length > 0) {
        groups[type] = matched;
      }
    });

    return groups;
  }

  // ─── Loading State ───────────────────────────────

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-2 border-indigo-200 border-t-indigo-600 rounded-full animate-spin" />
          <p className="text-sm text-gray-500">Loading role permissions...</p>
        </div>
      </div>
    );
  }

  // ─── Render ──────────────────────────────────────

  return (
    <div className="max-w-[960px] mx-auto pb-24">
      {/* ── Header ──────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-start gap-4 mb-6">
        <button
          onClick={() => navigate('/admin/roles')}
          className="p-2 hover:bg-gray-100 rounded-lg transition-colors self-start shrink-0"
        >
          <ArrowLeft size={18} className="text-gray-500" />
        </button>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2.5 flex-wrap">
            <h1 className="text-xl sm:text-2xl font-bold text-gray-900 tracking-tight">
              {roleMeta?.name || role}
            </h1>
            {roleMeta?.userCount !== undefined && (
              <Badge variant="info">
                {roleMeta.userCount} {roleMeta.userCount === 1 ? 'user' : 'users'}
              </Badge>
            )}
            {roleMeta?.isSystem && (
              <span className="inline-flex items-center gap-1 text-[10px] font-medium bg-gray-100 text-gray-500 px-2 py-0.5 rounded">
                <Lock size={10} /> SYSTEM
              </span>
            )}
          </div>
          {roleMeta?.description && (
            <p className="text-[13px] text-gray-500 mt-1">{roleMeta.description}</p>
          )}
        </div>
      </div>

      {/* ── Master Role Banner ──────────────────────── */}
      {isMaster && (
        <div className="mb-6 p-4 bg-amber-50 border border-amber-200 rounded-xl flex items-start gap-3">
          <Shield size={20} className="text-amber-600 shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-semibold text-amber-800">Full Access Role</p>
            <p className="text-[13px] text-amber-700 mt-0.5">
              Master role has full access to all permissions. This cannot be modified.
            </p>
          </div>
        </div>
      )}

      {/* ── Search Bar ──────────────────────────────── */}
      <div className="mb-4">
        <div className="relative">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Search permissions..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 text-sm bg-white border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-300 transition-all"
          />
          {searchTerm && (
            <button
              onClick={() => setSearchTerm('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 p-0.5 hover:bg-gray-100 rounded transition-colors"
            >
              <X size={14} className="text-gray-400" />
            </button>
          )}
        </div>
      </div>

      {/* ── Summary Bar ─────────────────────────────── */}
      <div className="mb-6 p-4 bg-white rounded-xl border border-gray-200">
        <div className="flex flex-col sm:flex-row sm:items-center gap-3">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-2">
              <span className="text-sm font-medium text-gray-700">
                {isMaster ? totalCount : grantedCount} of {totalCount} permissions enabled
              </span>
              <span className="text-xs text-gray-400">
                ({isMaster ? 100 : progressPercent}%)
              </span>
            </div>
            <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden">
              <div
                className="h-full bg-indigo-500 rounded-full transition-all duration-300"
                style={{ width: `${isMaster ? 100 : progressPercent}%` }}
              />
            </div>
          </div>

          {!isMaster && (
            <div className="flex items-center gap-2 shrink-0">
              <button
                onClick={enableAll}
                className="px-3 py-1.5 text-xs font-medium text-green-700 bg-green-50 hover:bg-green-100 rounded-lg transition-colors"
              >
                Enable All
              </button>
              <button
                onClick={disableAll}
                className="px-3 py-1.5 text-xs font-medium text-red-700 bg-red-50 hover:bg-red-100 rounded-lg transition-colors"
              >
                Disable All
              </button>
            </div>
          )}
        </div>
      </div>

      {/* ── Permission Tree ─────────────────────────── */}
      <div className="space-y-3">
        {filteredRegistry.length === 0 && (
          <div className="py-12 text-center">
            <Search size={32} className="mx-auto text-gray-300 mb-3" />
            <p className="text-sm text-gray-500">No permissions match your search.</p>
          </div>
        )}

        {filteredRegistry.map((mod) => {
          const isExpanded = effectiveExpanded.has(mod.key);
          const stats = getModuleStats(mod);
          const Icon = ICON_MAP[mod.icon] || Settings;
          const allInModuleEnabled = mod.permissions.every(
            (p) => isMaster || permissions[p.key]
          );
          const someInModuleEnabled = mod.permissions.some(
            (p) => isMaster || permissions[p.key]
          );
          const grouped = groupPermissionsByType(mod.permissions);

          return (
            <div
              key={mod.key}
              className="bg-white rounded-xl border border-gray-200 overflow-hidden"
            >
              {/* Module Header */}
              <div
                className="flex items-center gap-3 px-4 py-3 hover:bg-gray-50 cursor-pointer transition-colors select-none"
                onClick={() => toggleModule(mod.key)}
              >
                {/* Expand/Collapse Icon */}
                <span className="text-gray-400 shrink-0">
                  {isExpanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                </span>

                {/* Module Icon */}
                <span className="w-8 h-8 rounded-lg bg-indigo-50 flex items-center justify-center shrink-0">
                  <Icon size={16} className="text-indigo-600" />
                </span>

                {/* Module Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-semibold text-gray-900">{mod.label}</span>
                    <span className="text-[11px] text-gray-400">
                      {stats.enabled}/{stats.total}
                    </span>
                  </div>
                  {mod.description && (
                    <p className="text-[12px] text-gray-400 truncate">{mod.description}</p>
                  )}
                </div>

                {/* Module-level toggle all */}
                <div
                  className="shrink-0"
                  onClick={(e) => {
                    e.stopPropagation();
                    toggleAllInModule(mod);
                  }}
                >
                  <Toggle
                    enabled={allInModuleEnabled}
                    disabled={isMaster}
                    onChange={() => toggleAllInModule(mod)}
                    size="sm"
                  />
                </div>
              </div>

              {/* Module Content (Expanded) */}
              {isExpanded && (
                <div className="border-t border-gray-100 px-4 py-3">
                  {Object.entries(grouped).map(([type, perms]) => {
                    const TypeIcon = TYPE_ICONS[type] || Settings;

                    return (
                      <div key={type} className="mb-4 last:mb-0">
                        {/* Type Group Header */}
                        <div className="flex items-center gap-2 mb-2">
                          <TypeIcon size={13} className="text-gray-400" />
                          <span className="text-[11px] font-semibold uppercase tracking-wider text-gray-400">
                            {PERMISSION_TYPE_LABELS[type] || type}
                          </span>
                        </div>

                        {/* Permission Rows */}
                        <div className="space-y-0.5">
                          {perms.map((perm) => {
                            const isEnabled = isMaster || !!permissions[perm.key];
                            const isHighlighted =
                              searchTerm.trim() &&
                              (perm.label.toLowerCase().includes(searchTerm.toLowerCase()) ||
                                perm.key.toLowerCase().includes(searchTerm.toLowerCase()));

                            return (
                              <div
                                key={perm.key}
                                className={`
                                  flex items-center justify-between gap-3 px-3 py-2 rounded-lg transition-colors
                                  ${isHighlighted ? 'bg-yellow-50 ring-1 ring-yellow-200' : 'hover:bg-gray-50'}
                                  ${type === 'module' ? 'bg-blue-50/40' : ''}
                                `}
                              >
                                <div className="flex items-center gap-2.5 min-w-0">
                                  <span
                                    className={`text-[13px] ${
                                      isEnabled ? 'text-gray-900' : 'text-gray-400'
                                    }`}
                                  >
                                    {perm.label}
                                  </span>
                                  <span
                                    className={`
                                      inline-flex items-center px-1.5 py-[1px] rounded text-[10px] font-medium shrink-0
                                      ${TYPE_STYLES[perm.type] || 'bg-gray-50 text-gray-600'}
                                    `}
                                  >
                                    {perm.type}
                                  </span>
                                </div>

                                <Toggle
                                  enabled={isEnabled}
                                  disabled={isMaster}
                                  onChange={() => togglePerm(perm.key)}
                                />
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* ── Sticky Save Bar ─────────────────────────── */}
      {hasChanges && !isMaster && (
        <div className="fixed bottom-0 left-0 right-0 z-30">
          <div className="max-w-[960px] mx-auto px-4 pb-4">
            <div className="flex items-center justify-between gap-4 px-5 py-3 bg-white rounded-xl border border-gray-200 shadow-lg">
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <div className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
                <span>You have unsaved changes</span>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => {
                    setPermissions({ ...originalPerms });
                  }}
                  className="px-4 py-2 text-sm font-medium text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  Discard
                </button>
                <button
                  onClick={handleSave}
                  disabled={saving}
                  className="inline-flex items-center gap-2 px-5 py-2 text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 rounded-lg transition-colors"
                >
                  {saving ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      Saving...
                    </>
                  ) : (
                    <>
                      <Save size={15} />
                      Save Changes
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
