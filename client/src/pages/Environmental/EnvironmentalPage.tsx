import { useState, useEffect } from 'react';
import './EnvironmentalPage.css';
import useEnvironmental from './hooks/useEnvironmental';

// Import all sub-components
import EnvDashboard from './components/EnvDashboard';
import AspectsList from './components/AspectsList';
import RisksList from './components/RisksList';
import WasteList from './components/WasteList';
import MonitoringList from './components/MonitoringList';
import ResourceList from './components/ResourceList';
import IncidentsList from './components/IncidentsList';
import InspectionsList from './components/InspectionsList';
import ComplianceList from './components/ComplianceList';
import ObjectivesList from './components/ObjectivesList';
import ActionsList from './components/ActionsList';
import EnvAnalytics from './components/EnvAnalytics';

const SUB_SECTIONS = [
  { key: 'dashboard', label: 'Dashboard', icon: '\u{1F4CA}' },
  { key: 'aspects', label: 'Aspects & Impacts', icon: '\u{1F33F}' },
  { key: 'risks', label: 'Risk Assessment', icon: '\u26A0' },
  { key: 'waste', label: 'Waste Management', icon: '\u{1F5D1}' },
  { key: 'monitoring', label: 'Emissions Monitoring', icon: '\u{1F4E1}' },
  { key: 'resources', label: 'Resource Consumption', icon: '\u26A1' },
  { key: 'incidents', label: 'Incidents', icon: '\u{1F6A8}' },
  { key: 'inspections', label: 'Inspections', icon: '\u{1F50D}' },
  { key: 'compliance', label: 'Compliance Register', icon: '\u{1F4CB}' },
  { key: 'objectives', label: 'Objectives & Targets', icon: '\u{1F3AF}' },
  { key: 'actions', label: 'Corrective Actions', icon: '\u26A1' },
  { key: 'analytics', label: 'Reports / Analytics', icon: '\u{1F4C8}' },
] as const;

type SectionKey = (typeof SUB_SECTIONS)[number]['key'];

export default function EnvironmentalPage() {
  const [activeSection, setActiveSection] = useState<SectionKey>('dashboard');
  const env = useEnvironmental();

  useEffect(() => {
    env.fetchStats();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeSection]);

  /** Return badge count for a given section key, or 0 to hide */
  function getBadgeCount(key: SectionKey): number {
    if (!env.stats?.kpis) return 0;
    const kpis = env.stats.kpis;
    switch (key) {
      case 'aspects':
        return kpis.significant_aspects ?? 0;
      case 'risks':
        return kpis.high_risks ?? 0;
      case 'monitoring':
        return kpis.exceedances_this_month ?? 0;
      case 'incidents':
        return kpis.open_incidents ?? 0;
      case 'compliance':
        return Math.round(100 - (kpis.compliance_rate ?? 100));
      case 'actions':
        return kpis.open_actions ?? 0;
      case 'inspections':
        return kpis.pending_inspections ?? 0;
      default:
        return 0;
    }
  }

  /** Determine badge variant based on section semantics */
  function getBadgeVariant(key: SectionKey): 'danger' | 'warning' | 'info' {
    switch (key) {
      case 'incidents':
      case 'monitoring':
      case 'compliance':
        return 'danger';
      case 'actions':
      case 'inspections':
        return 'warning';
      default:
        return 'info';
    }
  }

  function renderContent() {
    switch (activeSection) {
      case 'dashboard':
        return <EnvDashboard env={env} />;
      case 'aspects':
        return <AspectsList env={env} />;
      case 'risks':
        return <RisksList env={env} />;
      case 'waste':
        return <WasteList env={env} />;
      case 'monitoring':
        return <MonitoringList env={env} />;
      case 'resources':
        return <ResourceList env={env} />;
      case 'incidents':
        return <IncidentsList env={env} />;
      case 'inspections':
        return <InspectionsList env={env} />;
      case 'compliance':
        return <ComplianceList env={env} />;
      case 'objectives':
        return <ObjectivesList env={env} />;
      case 'actions':
        return <ActionsList env={env} />;
      case 'analytics':
        return <EnvAnalytics env={env} />;
      default:
        return null;
    }
  }

  return (
    <div className="env-page">
      {/* ── Page Header ──────────────────────────── */}
      <div className="env-page-header">
        <h1 className="env-page-title">Environmental Management</h1>
        <p className="env-page-subtitle">
          Environmental protection, compliance, and monitoring
        </p>
      </div>

      {/* ── Body: Sub-nav + Content ──────────────── */}
      <div className="env-body">
        {/* Left sub-navigation */}
        <nav className="env-subnav">
          {SUB_SECTIONS.map((section) => {
            const count = getBadgeCount(section.key);
            const isActive = activeSection === section.key;
            return (
              <button
                key={section.key}
                className={`env-subnav-item${isActive ? ' active' : ''}`}
                onClick={() => setActiveSection(section.key)}
              >
                <span className="env-subnav-icon">{section.icon}</span>
                <span className="env-subnav-label">{section.label}</span>
                {count > 0 && (
                  <span
                    className={`env-subnav-badge env-subnav-badge--${getBadgeVariant(section.key)}`}
                  >
                    {count}
                  </span>
                )}
              </button>
            );
          })}
        </nav>

        {/* Right content area */}
        <main className="env-content">{renderContent()}</main>
      </div>
    </div>
  );
}
