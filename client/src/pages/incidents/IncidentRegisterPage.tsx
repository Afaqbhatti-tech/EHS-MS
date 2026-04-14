import { useState, useCallback, useEffect } from 'react';
import { AlertTriangle, Plus, RefreshCw, ArrowLeft, BarChart3, List, X as XIcon } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import type { Incident } from './useIncidents';
import { useIncidents } from './useIncidents';
import IncidentKPICards from './components/IncidentKPICards';
import IncidentFilters from './components/IncidentFilters';
import IncidentTable from './components/IncidentTable';
import IncidentForm from './components/IncidentForm';
import IncidentDetail from './components/IncidentDetail';
import IncidentCharts from './components/IncidentCharts';
import ExportDropdown from '../../components/ui/ExportDropdown';
import { useToast } from '../../components/ui/Toast';
import { api } from '../../services/api';

type Tab = 'register' | 'analytics';

export default function IncidentRegisterPage() {
  const { hasPermission } = useAuth();
  const toast = useToast();
  const hook = useIncidents();
  const {
    total, stats,
    listQuery, statsQuery,
    filters,
    selectedId, setSelectedId,
    updateStatus, assign, addInvestigation,
    addAction, updateAction, deleteAction,
    uploadEvidence, deleteEvidence,
    detail, detailQuery,
    refresh, isRefreshing,
  } = hook;

  const [tab, setTab] = useState<Tab>('register');
  const [showForm, setShowForm] = useState(false);
  const [editingIncident, setEditingIncident] = useState<Incident | null>(null);

  // Lock body scroll when form drawer is open
  useEffect(() => {
    if (!showForm) return;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = ''; };
  }, [showForm]);

  const canCreate = hasPermission('can_create_incident') || hasPermission('can_access_incidents');
  const canExport = hasPermission('can_export_incidents') || hasPermission('can_export_reports') || hasPermission('can_access_incidents');

  const handleExport = useCallback((format: string) => {
    const params = new URLSearchParams();
    params.set('format', format);
    if (filters.status) params.set('status', filters.status);
    if (filters.severity) params.set('severity', filters.severity);
    if (filters.incident_type) params.set('incident_type', filters.incident_type);
    if (filters.date_from) params.set('date_from', filters.date_from);
    if (filters.date_to) params.set('date_to', filters.date_to);
    if (filters.contractor) params.set('contractor', filters.contractor);
    if (filters.location) params.set('location', filters.location);
    api.download(`/incidents/export?${params.toString()}`);
  }, [filters]);

  const handleView = useCallback((id: string) => setSelectedId(id), [setSelectedId]);
  const handleCloseDetail = useCallback(() => setSelectedId(null), [setSelectedId]);

  const handleEdit = useCallback((id: string) => {
    // Find the incident from the list, or use detail if already loaded
    const found = hook.incidents.find(inc => inc.id === id) || (detail?.id === id ? detail : null);
    if (found) {
      setEditingIncident(found);
      setShowForm(true);
    }
  }, [hook.incidents, detail]);

  const handleEditFromDetail = useCallback(() => {
    if (detail) {
      setEditingIncident(detail);
      setSelectedId(null);
      setShowForm(true);
    }
  }, [detail, setSelectedId]);

  // ─── Detail View ─────
  if (selectedId) {
    return (
      <div className="space-y-4">
        <button
          onClick={handleCloseDetail}
          className="flex items-center gap-1.5 text-[13px] text-text-secondary hover:text-text-primary transition-colors"
        >
          <ArrowLeft size={16} /> Back to Register
        </button>
        <IncidentDetail hook={hook} onClose={handleCloseDetail} onEdit={handleEditFromDetail} />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Page Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-warning-50 text-warning-600">
              <AlertTriangle size={22} />
            </div>
            <div>
              <h1 className="text-xl font-bold text-text-primary">Incident Register</h1>
              <p className="text-xs text-text-secondary mt-0.5">
                Report, investigate, and resolve workplace incidents &middot; {total} incident{total !== 1 ? 's' : ''}
              </p>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={refresh} className="btn-secondary p-2 rounded-lg" title="Refresh" disabled={isRefreshing}>
            <RefreshCw size={16} className={isRefreshing ? 'animate-spin' : ''} />
          </button>
          {canExport && (
            <ExportDropdown onExport={handleExport} disabled={!total} />
          )}
          {canCreate && (
            <button
              onClick={() => setShowForm(true)}
              className="btn-primary px-4 py-2 text-sm rounded-lg flex items-center gap-2"
            >
              <Plus size={16} /> Report Incident
            </button>
          )}
        </div>
      </div>

      {/* KPI Cards */}
      <IncidentKPICards stats={stats} isLoading={statsQuery.isLoading} />

      {/* Tabs */}
      <div className="flex items-center gap-1 border-b border-border">
        <button
          onClick={() => setTab('register')}
          className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
            tab === 'register'
              ? 'border-primary-500 text-primary-700'
              : 'border-transparent text-text-secondary hover:text-text-primary'
          }`}
        >
          <List size={16} /> Register
        </button>
        <button
          onClick={() => setTab('analytics')}
          className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
            tab === 'analytics'
              ? 'border-primary-500 text-primary-700'
              : 'border-transparent text-text-secondary hover:text-text-primary'
          }`}
        >
          <BarChart3 size={16} /> Analytics
        </button>
      </div>

      {/* Tab Content */}
      {tab === 'register' && (
        <>
          <IncidentFilters hook={hook} />
          <IncidentTable hook={hook} onRowClick={handleView} onEdit={handleEdit} />
        </>
      )}

      {tab === 'analytics' && (
        <IncidentCharts stats={stats} isLoading={statsQuery.isLoading} />
      )}

      {/* Form Drawer Overlay */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex justify-end">
          <div
            className="absolute inset-0 bg-black/40 backdrop-blur-[2px] animate-in fade-in duration-200"
            onClick={() => { setShowForm(false); setEditingIncident(null); }}
          />
          <div className="relative w-full max-w-3xl bg-surface shadow-xl overflow-hidden flex flex-col animate-in slide-in-from-right duration-300">
            <div className="shrink-0 flex items-center justify-between px-6 py-4 bg-surface border-b border-border">
              <div>
                <h2 className="text-lg font-semibold text-text-primary">
                  {editingIncident ? `Edit Incident — ${editingIncident.incident_code}` : 'Report New Incident'}
                </h2>
                <p className="text-xs text-text-secondary mt-0.5">
                  {editingIncident ? 'Update the incident details below' : 'Fill in the details below to report an incident'}
                </p>
              </div>
              <button
                onClick={() => { setShowForm(false); setEditingIncident(null); }}
                className="p-1.5 rounded-lg text-text-tertiary hover:bg-surface-sunken hover:text-text-secondary transition-colors"
              >
                <XIcon size={18} />
              </button>
            </div>
            <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain px-6 py-5">
              <IncidentForm
                key={editingIncident?.id || 'new'}
                existingIncident={editingIncident}
                onSuccess={() => {
                  setShowForm(false);
                  setEditingIncident(null);
                  refresh();
                  toast.success(editingIncident ? 'Incident updated successfully!' : 'Incident reported successfully!');
                }}
                onCancel={() => { setShowForm(false); setEditingIncident(null); }}
                hook={hook}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
