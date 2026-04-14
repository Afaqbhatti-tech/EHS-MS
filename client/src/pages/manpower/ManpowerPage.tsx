import { useState, useRef } from 'react';
import { Plus, RefreshCw, Upload } from 'lucide-react';
import { CARD_VIEW_PER_PAGE } from '../../utils/fetchAllPages';
import { useToast } from '../../components/ui/Toast';
import { useManpower } from './hooks/useManpower';
import { ManpowerKPICards } from './components/ManpowerKPICards';
import { ManpowerFilters } from './components/ManpowerFilters';
import { WorkerTable } from './components/WorkerTable';
import { WorkerCards } from './components/WorkerCards';
import { WorkerForm } from './components/WorkerForm';
import { WorkerDetail } from './components/WorkerDetail';
import { ManpowerCharts } from './components/ManpowerCharts';
import { ImportModal } from '../../components/Import';
import type { Worker, ManpowerFilters as Filters } from './hooks/useManpower';

export default function ManpowerPage() {
  const [activeTab, setActiveTab] = useState<'list' | 'analytics'>('list');
  const [viewMode, setViewModeState] = useState<'table' | 'cards'>('table');
  const [showForm, setShowForm] = useState(false);
  const [editingWorker, setEditingWorker] = useState<Worker | null>(null);
  const [viewingWorker, setViewingWorker] = useState<Worker | null>(null);
  const [showImport, setShowImport] = useState(false);

  const toast = useToast();
  const savedTablePageRef = useRef(1);

  const {
    workers, stats, filterOptions, loading, statsLoading,
    error, pagination, filters, setFilters,
    createWorker, updateWorker, deleteWorker,
    fetchWorkerDetail, fetchWorkerHours, recordHours, deleteHoursRecord,
    migrateIqama, exportData, refresh, isRefreshing,
  } = useManpower();

  const handleViewModeChange = (mode: 'table' | 'cards') => {
    if (viewMode === 'table' && mode === 'cards') {
      savedTablePageRef.current = filters.page || 1;
    }
    setViewModeState(mode);
    setFilters(prev => ({
      ...prev,
      per_page: mode === 'cards' ? CARD_VIEW_PER_PAGE : 25,
      page: mode === 'cards' ? 1 : savedTablePageRef.current,
    }));
  };

  const handleAddNew = () => {
    setEditingWorker(null);
    setShowForm(true);
  };

  const handleEdit = (worker: Worker) => {
    setEditingWorker(worker);
    setShowForm(true);
  };

  const handleView = (worker: Worker) => {
    setViewingWorker(worker);
  };

  const handleFormSubmit = async (formData: Record<string, unknown>) => {
    try {
      if (editingWorker) {
        await updateWorker(editingWorker.id, formData);
        toast.success('Worker updated successfully');
      } else {
        await createWorker(formData);
        toast.success('Worker added successfully');
      }
      setShowForm(false);
      setEditingWorker(null);
    } catch (err: any) {
      toast.error(err.message || 'An error occurred while saving the worker');
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Are you sure you want to delete this worker? This cannot be undone.')) return;
    try {
      await deleteWorker(id);
      toast.success('Worker deleted successfully');
    } catch (err: any) {
      toast.error(err.message || 'An error occurred while deleting the worker');
    }
  };

  const tabs = [
    { key: 'list' as const, label: 'Worker List' },
    { key: 'analytics' as const, label: 'Analytics & Charts' },
  ];

  return (
    <div className="min-h-full">
      {/* Page Header */}
      <div className="flex items-start justify-between gap-3 mb-6 pb-5 border-b border-border flex-wrap">
        <div>
          <h1 className="text-[22px] font-bold text-text-primary leading-tight">
            Manpower & Hours
          </h1>
          <p className="text-[13px] text-text-secondary mt-1">
            Track workforce, induction status, and daily hours
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={refresh}
            disabled={isRefreshing}
            className="h-9 w-9 flex items-center justify-center text-text-tertiary bg-surface border border-border rounded-[var(--radius-md)] hover:bg-surface-sunken transition-colors disabled:opacity-50"
            title="Refresh"
          >
            <RefreshCw size={16} className={isRefreshing ? 'animate-spin' : ''} />
          </button>
          <button
            onClick={() => setShowImport(true)}
            className="inline-flex items-center gap-1.5 h-9 px-4 text-[13px] font-semibold text-text-primary bg-surface border border-border rounded-[var(--radius-md)] hover:bg-surface-sunken transition-colors"
          >
            <Upload size={16} />
            Import
          </button>
          <button
            onClick={handleAddNew}
            className="inline-flex items-center gap-1.5 h-9 px-4 text-[13px] font-semibold text-white bg-primary-600 rounded-[var(--radius-md)] hover:bg-primary-700 transition-colors shadow-xs"
          >
            <Plus size={16} />
            Add Worker
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <ManpowerKPICards
        kpis={stats?.kpis}
        loading={statsLoading}
        onLegacyReviewClick={() => {
          setActiveTab('list');
          setFilters(prev => ({ ...prev, legacy_review: prev.legacy_review === '1' ? '' : '1', page: 1 }));
        }}
      />

      {/* Tab Navigation */}
      <div className="flex gap-0 mb-5 border-b-2 border-border">
        {tabs.map(tab => (
          <button
            key={tab.key}
            className={`px-5 py-2.5 text-[13px] font-medium border-b-2 -mb-[2px] transition-colors ${
              activeTab === tab.key
                ? 'text-primary-600 border-primary-600 font-semibold'
                : 'text-text-tertiary border-transparent hover:text-text-primary'
            }`}
            onClick={() => setActiveTab(tab.key)}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      {activeTab === 'list' && (
        <>
          <ManpowerFilters
            filters={filters}
            onFilterChange={(key, val) =>
              setFilters(prev => ({ ...prev, [key]: val, page: key === 'page' ? val as number : 1 }))
            }
            onExport={exportData}
            filterOptions={filterOptions}
            loading={loading}
            viewMode={viewMode}
            onViewModeChange={handleViewModeChange}
            legacyReviewCount={stats?.kpis?.legacy_review_count}
          />

          {error && (
            <div className="mb-4 p-3 bg-danger-50 border border-danger-100 rounded-[var(--radius-md)] flex items-center justify-between">
              <span className="text-[13px] text-danger-700">{error}</span>
              <button onClick={refresh} className="text-[12px] font-medium text-danger-600 hover:text-danger-700 underline">Retry</button>
            </div>
          )}

          {viewMode === 'table' ? (
            <WorkerTable
              workers={workers}
              loading={loading}
              pagination={pagination}
              onPageChange={(page) => setFilters(prev => ({ ...prev, page }))}
              onView={handleView}
              onEdit={handleEdit}
              onDelete={handleDelete}
              onStatusChange={async (id: string, data: Record<string, unknown>) => {
                try {
                  await updateWorker(id, data);
                } catch (err: any) {
                  toast.error(err.message || 'Failed to update worker status');
                }
              }}
              onAddNew={handleAddNew}
            />
          ) : (
            <WorkerCards
              workers={workers}
              loading={loading}
              onView={handleView}
              onEdit={handleEdit}
              onDelete={handleDelete}
            />
          )}
        </>
      )}

      {activeTab === 'analytics' && (
        <ManpowerCharts stats={stats} loading={statsLoading} />
      )}

      {/* Form Drawer */}
      {showForm && (
        <WorkerForm
          worker={editingWorker}
          onSubmit={handleFormSubmit}
          onClose={() => {
            setShowForm(false);
            setEditingWorker(null);
          }}
          filterOptions={filterOptions}
        />
      )}

      {/* Detail Drawer */}
      {viewingWorker && (
        <WorkerDetail
          worker={viewingWorker}
          onClose={() => setViewingWorker(null)}
          onEdit={() => {
            setEditingWorker(viewingWorker);
            setViewingWorker(null);
            setShowForm(true);
          }}
          fetchWorkerDetail={fetchWorkerDetail}
          fetchWorkerHours={fetchWorkerHours}
          recordHours={recordHours}
          deleteHoursRecord={deleteHoursRecord}
          migrateIqama={migrateIqama}
        />
      )}

      {/* Import Reconciliation Modal */}
      <ImportModal
        open={showImport}
        onClose={() => setShowImport(false)}
        module="workers"
        onComplete={refresh}
      />
    </div>
  );
}
