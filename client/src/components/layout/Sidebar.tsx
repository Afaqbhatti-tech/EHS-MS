import { useEffect } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { ROUTE_PERMISSION_MAP } from '../../constants/permissions';
import {
  LayoutDashboard, Eye, ClipboardCheck, FileText, Shield,
  Users, Truck, GraduationCap, CheckSquare, Wrench,
  AlertTriangle, Ban, Siren, FolderOpen, Megaphone,
  Image, BarChart3, Leaf, Brain, Settings,
  FileEdit, CalendarDays, ClipboardList, KeyRound,
  LogOut, FolderKanban, X,
  type LucideIcon,
} from 'lucide-react';

function canAccessRoute(role: string, permissions: Record<string, boolean>, route: string): boolean {
  if (role === 'master') return true;
  const requiredPerm = ROUTE_PERMISSION_MAP[route];
  if (!requiredPerm) return false;
  if (requiredPerm === '*') return true;
  return !!permissions[requiredPerm];
}

interface NavItem { to: string; icon: LucideIcon; label: string }
interface NavGroup { label: string; items: NavItem[] }

const navGroups: NavGroup[] = [
  {
    label: 'Overview',
    items: [
      { to: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
      { to: '/ai-intelligence', icon: Brain, label: 'AI Intelligence' },
    ],
  },
  {
    label: 'Daily Operations',
    items: [
      { to: '/observations', icon: Eye, label: 'Observations' },
      { to: '/permits', icon: ClipboardCheck, label: 'Permits to Work' },
      { to: '/manpower', icon: Users, label: 'Manpower & Hours' },
      { to: '/checklists', icon: CheckSquare, label: 'Checklists' },
    ],
  },
  {
    label: 'Procedures & Meetings',
    items: [
      { to: '/rams-board', icon: FolderKanban, label: 'RAMs Board' },
      { to: '/mockup-register', icon: ClipboardList, label: 'Mock-Up Register' },
      { to: '/weekly-mom', icon: FileText, label: 'Weekly MOM' },
    ],
  },
  {
    label: 'People & Assets',
    items: [
      { to: '/training-matrix', icon: GraduationCap, label: 'Training Matrix' },
      { to: '/equipment', icon: Wrench, label: 'Equipment Register' },
      { to: '/violations', icon: Ban, label: 'Violations' },
    ],
  },
  {
    label: 'Incidents & Emergency',
    items: [
      { to: '/incidents', icon: AlertTriangle, label: 'Incidents' },
      { to: '/mock-drills', icon: Siren, label: 'Mock Drills / ERP' },
    ],
  },
  {
    label: 'Permits',
    items: [
      { to: '/permits/calendar', icon: CalendarDays, label: 'PTW Calendar' },
      { to: '/permit-amendments', icon: FileEdit, label: 'Permit Amendments' },
    ],
  },
  {
    label: 'Documents',
    items: [
      { to: '/document-control', icon: FolderOpen, label: 'Document Control' },
      { to: '/campaigns', icon: Megaphone, label: 'Campaigns' },
      { to: '/poster-generator', icon: Image, label: 'Poster Generator' },
    ],
  },
  {
    label: 'Environmental',
    items: [
      { to: '/environmental', icon: Leaf, label: 'Env. Overview' },
      { to: '/environmental/waste-manifests', icon: Truck, label: 'Waste Manifests' },
      { to: '/environmental/contractor-records', icon: Shield, label: 'Contractor Records' },
    ],
  },
  {
    label: 'Analytics & Admin',
    items: [
      { to: '/reports', icon: BarChart3, label: 'KPIs & Reports' },
      { to: '/admin/users', icon: Settings, label: 'Users & Permissions' },
      { to: '/admin/roles', icon: KeyRound, label: 'Role Management' },
    ],
  },
];

const ROLE_LABELS: Record<string, string> = {
  master: 'Master', system_admin: 'System Admin', ehs_manager: 'EHS Manager',
  safety_officer: 'Safety Officer', officer: 'Officer', site_engineer: 'Site Engineer',
  contractor_hse: 'Contractor HSE', client_consultant: 'Client / Consultant',
  client: 'Client', viewer_management: 'Viewer / Mgmt', lead: 'Lead', office: 'Office',
};

interface SidebarProps {
  open: boolean;
  onClose: () => void;
}

export default function Sidebar({ open, onClose }: SidebarProps) {
  const { user, logout } = useAuth();
  const location = useLocation();
  const role = user?.role || '';
  const permissions = user?.permissions || {};

  const initials = user?.name
    ? user.name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()
    : '??';

  // Close sidebar on route change (mobile)
  useEffect(() => {
    onClose();
  }, [location.pathname]);

  // Lock body scroll when mobile sidebar is open
  useEffect(() => {
    if (open) {
      document.body.style.overflow = 'hidden';
      return () => { document.body.style.overflow = ''; };
    }
  }, [open]);

  const sidebarContent = (
    <>
      {/* Logo */}
      <div className="h-16 flex items-center justify-between px-4 border-b border-white/[0.06] shrink-0">
        <div>
          <h1 className="text-[17px] font-bold tracking-[-0.02em] text-white leading-tight">
            EHS<span className="inline-block w-2 h-2 rounded-full bg-primary-500 mx-[3px] mb-[2px]" />OS
          </h1>
          <p className="text-[11px] text-sidebar-group leading-tight">KAEC Rail Project</p>
        </div>
        {/* Close button — visible only on mobile */}
        <button
          onClick={onClose}
          className="lg:hidden p-1.5 rounded-[var(--radius-sm)] text-sidebar-text/50 hover:text-white hover:bg-white/[0.06] transition-colors duration-150"
        >
          <X size={18} />
        </button>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto py-3 px-2 space-y-5">
        {navGroups.map((group) => {
          const visibleItems = group.items.filter(item => canAccessRoute(role, permissions, item.to));
          if (!visibleItems.length) return null;

          return (
            <div key={group.label}>
              <p className="px-3 mb-1.5 text-[10px] font-medium uppercase tracking-[0.08em] text-sidebar-group select-none">
                {group.label}
              </p>
              <ul className="space-y-0.5">
                {visibleItems.map((item) => (
                  <li key={item.to}>
                    <NavLink
                      to={item.to}
                      end={item.to === '/dashboard'}
                      className={({ isActive }) =>
                        `flex items-center gap-2.5 px-3 py-[9px] text-[13px] font-medium rounded-[var(--radius-md)] mx-0 transition-all duration-100 ${
                          isActive
                            ? 'bg-sidebar-active text-sidebar-active-text border-l-[3px] border-sidebar-active-border pl-[9px]'
                            : 'text-sidebar-text/75 hover:bg-sidebar-hover hover:text-white border-l-[3px] border-transparent pl-[9px]'
                        }`
                      }
                    >
                      <item.icon size={18} className="shrink-0 opacity-80" />
                      <span className="truncate">{item.label}</span>
                    </NavLink>
                  </li>
                ))}
              </ul>
            </div>
          );
        })}
      </nav>

      {/* User Profile */}
      {user && (
        <div className="border-t border-white/[0.06] px-3 py-3 shrink-0 safe-bottom">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-full bg-primary-600 flex items-center justify-center text-[11px] font-bold text-white shrink-0">
              {initials}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[13px] font-semibold text-white truncate">{user.name}</p>
              <p className="text-[10px] text-sidebar-group truncate">{ROLE_LABELS[role] || role}</p>
            </div>
            <button
              onClick={logout}
              className="p-1.5 rounded-[var(--radius-sm)] text-sidebar-text/50 hover:text-danger-500 hover:bg-white/[0.06] transition-colors duration-150"
              title="Sign out"
            >
              <LogOut size={16} />
            </button>
          </div>
        </div>
      )}
    </>
  );

  return (
    <>
      {/* Mobile overlay backdrop */}
      {open && (
        <div
          className="sidebar-overlay lg:hidden"
          onClick={onClose}
          aria-hidden="true"
        />
      )}

      {/* Sidebar panel */}
      <aside
        className={`
          fixed inset-y-0 left-0 z-50 w-[272px] sm:w-[248px] bg-sidebar text-white flex flex-col h-screen overflow-hidden
          sidebar-drawer
          lg:static lg:z-auto lg:translate-x-0 lg:shrink-0
          ${open ? '' : 'closed'}
        `}
      >
        {sidebarContent}
      </aside>
    </>
  );
}
