import { useState, useCallback } from 'react';
import { Ban, Plus, RefreshCw, List, BarChart3 } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { useViolations } from './useViolations';
import ViolationKPICards from './components/ViolationKPICards';
import ViolationFilters from './components/ViolationFilters';
import ViolationTable from './components/ViolationTable';
import ViolationForm from './components/ViolationForm';
import ViolationDetail from './components/ViolationDetail';
import ViolationCharts from './components/ViolationCharts';
import ExportDropdown from '../../components/ui/ExportDropdown';
import { api } from '../../services/api';

type Tab = 'register' | 'analytics';

export default function ViolationPage() {
  const { hasPermission } = useAuth();
  const {
    violations, total, page, lastPage, isLoading,
    stats, isStatsLoading,
    filterOptions,
    selectedViolation, isDetailLoading,
    filters, updateFilter, resetFilters,
    selectedId, setSelectedId,
    create, update, updateStatus, assign, addInvestigation,
    addAction, updateAction, deleteAction, remove,
    upload, uploadEvidence,
    isCreating, isUpdating,
    refresh, isRefreshing,
  } = useViolations();

  const [tab, setTab] = useState<Tab>('register');
  const [showForm, setShowForm] = useState(false);
  const [editData, setEditData] = useState<Record<string, unknown> | null>(null);

  const canCreate = hasPermission('can_create_violation') || hasPermission('can_access_violations');
  const canExport = hasPermission('can_export_violations') || hasPermission('can_export_reports') || hasPermission('can_access_violations');

  const handleCreate = useCallback(async (data: Record<string, unknown>) => {
    await create(data);
  }, [create]);

  const handleExport = useCallback((format: string) => {
    const params = new URLSearchParams();
    params.set('format', format);
    if (filters.status) params.set('status', filters.status);
    if (filters.severity) params.set('severity', filters.severity);
    if (filters.date_from) params.set('date_from', filters.date_from);
    if (filters.date_to) params.set('date_to', filters.date_to);
    api.download(`/violations/export?${params.toString()}`);
  }, [filters]);

  const handleView = useCallback((id: string) => setSelectedId(id), [setSelectedId]);
  const handleCloseDetail = useCallback(() => setSelectedId(null), [setSelectedId]);

  return (
    <div className="space-y-4">
      {/* Page Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-danger-50 text-danger-600">
              <Ban size={22} />
            </div>
            <div>
              <h1 className="text-xl font-bold text-text-primary">Violation Register</h1>
              <p className="text-xs text-text-secondary mt-0.5">Track, investigate, and resolve workplace safety violations</p>
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
            <button onClick={() => { setEditData(null); setShowForm(true); }}
              className="btn-primary px-4 py-2 text-sm rounded-lg flex items-center gap-2">
              <Plus size={16} /> Report Violation
            </button>
          )}
        </div>
      </div>

      {/* KPI Cards */}
      <ViolationKPICards stats={stats} isLoading={isStatsLoading} />

      {/* Tabs */}
      <div className="flex items-center gap-1 border-b border-border">
        <button onClick={() => setTab('register')}
          className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${tab === 'register' ? 'border-primary-500 text-primary-700' : 'border-transparent text-text-secondary hover:text-text-primary'}`}>
          <List size={16} /> Register
        </button>
        <button onClick={() => setTab('analytics')}
          className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${tab === 'analytics' ? 'border-primary-500 text-primary-700' : 'border-transparent text-text-secondary hover:text-text-primary'}`}>
          <BarChart3 size={16} /> Analytics
        </button>
      </div>

      {tab === 'register' && (
        <>
          {/* Search + Filters */}
          <ViolationFilters filters={filters} filterOptions={filterOptions} updateFilter={updateFilter} resetFilters={resetFilters} />

          {/* Table */}
          <ViolationTable
            violations={violations}
            total={total}
            page={page}
            lastPage={lastPage}
            isLoading={isLoading}
            onView={handleView}
            onPageChange={p => updateFilter('page', p)}
          />
        </>
      )}

      {tab === 'analytics' && (
        <ViolationCharts stats={stats} isLoading={isStatsLoading} />
      )}

      {/* Form Modal */}
      {showForm && (
        <ViolationForm
          open={showForm}
          onClose={() => { setShowForm(false); setEditData(null); }}
          onSubmit={handleCreate}
          isSubmitting={isCreating}
          initialData={editData}
          contractors={filterOptions?.contractors ?? []}
        />
      )}

      {/* Detail Drawer */}
      {selectedId && (
        <ViolationDetail
          violation={selectedViolation}
          isLoading={isDetailLoading}
          onClose={handleCloseDetail}
          onStatusChange={(id, status, notes) => updateStatus({ id, status, close_notes: notes })}
          onAddInvestigation={(id, data) => addInvestigation({ id, data })}
          onAddAction={(id, data) => addAction({ id, data })}
          onUpdateAction={(vId, aId, data) => updateAction({ violationId: vId, actionId: aId, data })}
          onDeleteAction={(vId, aId) => deleteAction({ violationId: vId, actionId: aId })}
          onAssign={(id, name) => assign({ id, assigned_to_name: name })}
          onUploadEvidence={(id, files, type) => uploadEvidence({ id, files, related_type: type })}
        />
      )}
    </div>
  );
}
