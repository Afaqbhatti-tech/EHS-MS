import { useState, useRef, useEffect } from 'react';
import {
  LogOut, ChevronDown, Search,
  User, Shield, HelpCircle,
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { useLocation, useNavigate } from 'react-router-dom';
import NotificationPanel from '../NotificationPanel';

const ROLE_LABELS: Record<string, string> = {
  system_admin: 'System Admin', ehs_manager: 'EHS Manager',
  safety_officer: 'Safety Officer', site_engineer: 'Site Engineer',
  contractor_hse: 'Contractor HSE', client_consultant: 'Client / Consultant',
  viewer_management: 'Viewer / Management', master: 'Master',
  officer: 'Officer', lead: 'Lead', client: 'Client', office: 'Office',
};

const PAGE_TITLES: Record<string, string> = {
  '/dashboard': 'Dashboard',
  '/profile': 'My Profile',
  '/ai-intelligence': 'AI Intelligence',
  '/observations': 'Observations',
  '/permits': 'Permits to Work',
  '/manpower': 'Manpower & Hours',
  '/checklists': 'Checklists',
  '/rams-board': 'RAMs Board',
  '/mockup-register': 'Mock-Up Register',
  '/weekly-mom': 'Weekly MOM',
  '/training-matrix': 'Training Matrix',
  '/equipment': 'Equipment Register',
  '/violations': 'Violations',
  '/incidents': 'Incidents',
  '/mock-drills': 'Mock Drills / ERP',
  '/permits/calendar': 'PTW Calendar',
  '/permit-amendments': 'Permit Amendments',
  '/document-control': 'Document Control',
  '/campaigns': 'Campaigns',
  '/poster-generator': 'Poster Generator',
  '/environmental': 'Environmental',
  '/environmental/waste-manifests': 'Waste Manifests',
  '/environmental/contractor-records': 'Contractor Records',
  '/reports': 'KPIs & Reports',
  '/admin/users': 'Users & Permissions',
  '/admin/roles': 'Role Management',
};

export default function Header() {
  const { user, logout, hasRole } = useAuth();
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const location = useLocation();
  const navigate = useNavigate();

  const pageTitle = PAGE_TITLES[location.pathname] || '';

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const initials = user?.name
    ? user.name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()
    : '??';

  return (
    <>
      <header className="h-16 bg-white border-b border-border flex items-center justify-between px-8 shrink-0">
        {/* Left — Page title */}
        <div>
          <h2 className="text-[17px] font-semibold text-text-primary leading-tight">{pageTitle}</h2>
        </div>

        {/* Center — Global search */}
        <div className="hidden md:flex items-center max-w-[400px] flex-1 mx-8">
          <div className="relative w-full">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-tertiary" />
            <input
              type="text"
              placeholder="Search anything..."
              className="w-full h-9 pl-9 pr-12 text-[13px] bg-surface-sunken border border-transparent rounded-[var(--radius-md)] text-text-primary placeholder:text-text-tertiary focus:border-primary-500 focus:ring-2 focus:ring-primary-100 focus:bg-white outline-none transition-all duration-150"
            />
            <kbd className="absolute right-3 top-1/2 -translate-y-1/2 hidden lg:inline-flex items-center px-1.5 py-0.5 text-[10px] font-medium text-text-tertiary bg-white border border-border rounded">
              ⌘K
            </kbd>
          </div>
        </div>

        {/* Right */}
        <div className="flex items-center gap-3">
          {/* Incident-free days */}
          <span className="hidden lg:inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-medium bg-success-50 text-success-700 border border-success-100">
            <span className="w-1.5 h-1.5 rounded-full bg-success-500" />
            87 Incident-Free Days
          </span>

          {/* Notifications */}
          <NotificationPanel />

          {/* User menu */}
          <div className="relative" ref={menuRef}>
            <button
              onClick={() => setMenuOpen(v => !v)}
              className="flex items-center gap-2.5 p-1.5 rounded-[var(--radius-md)] hover:bg-surface-sunken transition-colors duration-150"
            >
              <div className="w-8 h-8 rounded-full bg-primary-600 flex items-center justify-center text-[11px] font-bold text-white">
                {initials}
              </div>
              <div className="hidden sm:block text-left">
                <p className="text-[13px] font-medium text-text-primary leading-tight">{user?.name}</p>
                <p className="text-[10px] text-text-tertiary">{ROLE_LABELS[user?.role || ''] || user?.role}</p>
              </div>
              <ChevronDown size={14} className={`text-text-tertiary transition-transform duration-150 ${menuOpen ? 'rotate-180' : ''}`} />
            </button>

            {menuOpen && (
              <div className="absolute right-0 top-full mt-1.5 w-64 bg-white rounded-[var(--radius-lg)] shadow-xl border border-border py-1 z-50">
                {/* User info header */}
                {user && (
                  <div className="px-4 py-3 border-b border-border">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-primary-600 flex items-center justify-center text-[12px] font-bold text-white shrink-0">
                        {initials}
                      </div>
                      <div className="min-w-0">
                        <p className="text-[13px] font-semibold text-text-primary truncate">{user.name}</p>
                        <p className="text-[11px] text-text-tertiary truncate">{user.email}</p>
                        <p className="text-[10px] text-primary-600 font-medium mt-0.5">{ROLE_LABELS[user.role] || user.role}</p>
                      </div>
                    </div>
                  </div>
                )}

                {/* Menu items */}
                <div className="py-1">
                  {/* My Profile */}
                  <MenuItem
                    icon={<User size={15} />}
                    label="My Profile"
                    sublabel="View your account details"
                    onClick={() => {
                      setMenuOpen(false);
                      navigate('/profile');
                    }}
                  />

                  {/* Manage Roles — only visible to admins */}
                  {hasRole('master', 'system_admin', 'ehs_manager') && (
                    <MenuItem
                      icon={<Shield size={15} />}
                      label="Manage Roles"
                      sublabel="Permissions & access control"
                      onClick={() => {
                        setMenuOpen(false);
                        navigate('/admin/roles');
                      }}
                    />
                  )}

                  {/* Help & Support */}
                  <MenuItem
                    icon={<HelpCircle size={15} />}
                    label="Help & Support"
                    sublabel="Documentation & guides"
                    onClick={() => {
                      setMenuOpen(false);
                    }}
                  />
                </div>

                {/* Sign out */}
                <div className="border-t border-border pt-1">
                  <button
                    onClick={() => { setMenuOpen(false); logout(); }}
                    className="w-full flex items-center gap-3 px-4 py-2.5 text-[13px] text-danger-600 hover:bg-danger-50 transition-colors duration-150"
                  >
                    <LogOut size={15} />
                    <div className="text-left">
                      <span className="font-medium">Sign Out</span>
                      <p className="text-[10px] text-danger-500/70">End your current session</p>
                    </div>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </header>

    </>
  );
}

// ─── Reusable menu item ────────────────────────────
function MenuItem({ icon, label, sublabel, onClick }: {
  icon: React.ReactNode;
  label: string;
  sublabel: string;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-surface-sunken transition-colors duration-150 group"
    >
      <span className="text-text-tertiary group-hover:text-primary-600 transition-colors shrink-0">
        {icon}
      </span>
      <div className="text-left min-w-0">
        <span className="text-[13px] font-medium text-text-primary block">{label}</span>
        <span className="text-[10px] text-text-tertiary block">{sublabel}</span>
      </div>
    </button>
  );
}
