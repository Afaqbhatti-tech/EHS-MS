import { useState } from 'react';
import { Plus, RefreshCw } from 'lucide-react';
import { useObservations } from './hooks/useObservations';
import { ObservationKPICards } from './components/ObservationKPICards';
import { ObservationFilters } from './components/ObservationFilters';
import { ObservationTable } from './components/ObservationTable';
import { ObservationForm } from './components/ObservationForm';
import { ObservationDetail } from './components/ObservationDetail';
import { ObservationCharts } from './components/ObservationCharts';
import { useToast } from '../../components/ui/Toast';
import type { Observation, ObservationFilters as Filters } from './hooks/useObservations';

export default function ObservationPage() {
  const [activeTab, setActiveTab] = useState<'list' | 'analytics'>('list');
  const [showForm, setShowForm] = useState(false);
  const [editingObs, setEditingObs] = useState<Observation | null>(null);
  const [viewingObs, setViewingObs] = useState<Observation | null>(null);
  const toast = useToast();

  const {
    observations, stats, filterOptions, loading, statsLoading,
    error, pagination, filters, setFilters,
    createObservation, updateObservation,
    updateStatus, deleteObservation, uploadFiles, exportData,
    refresh, isRefreshing,
  } = useObservations();

  const handleAddNew = () => {
    setEditingObs(null);
    setShowForm(true);
  };

  const handleEdit = (obs: Observation) => {
    setEditingObs(obs);
    setShowForm(true);
  };

  const handleView = (obs: Observation) => {
    setViewingObs(obs);
  };

  const handleFormSubmit = async (formData: Record<string, unknown>) => {
    try {
      if (editingObs) {
        await updateObservation(editingObs.id, formData);
      } else {
        await createObservation(formData);
      }
      setShowForm(false);
      setEditingObs(null);
    } catch (err: any) {
      toast.error(err.message || 'An error occurred while saving the observation');
    }
  };

  return (
    <div className="min-h-full">
      {/* Page Header */}
      <div className="flex items-start justify-between gap-3 mb-6 pb-5 border-b border-border flex-wrap">
        <div>
          <h1 className="text-[22px] font-bold text-text-primary leading-tight">
            Daily EHS Observations
          </h1>
          <p className="text-[13px] text-text-secondary mt-1">
            Track, manage, and close site safety observations
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={refresh}
            disabled={isRefreshing}
            className="p-2 text-text-tertiary bg-surface border border-border rounded-[var(--radius-md)] hover:bg-surface-sunken transition-colors disabled:opacity-50"
            title="Refresh"
          >
            <RefreshCw size={16} className={isRefreshing ? 'animate-spin' : ''} />
          </button>
          <button
            onClick={handleAddNew}
            className="inline-flex items-center gap-1.5 px-4 py-2 text-[13px] font-semibold text-white bg-primary-600 rounded-[var(--radius-md)] hover:bg-primary-700 transition-colors shadow-xs"
          >
            <Plus size={16} />
            Add Observation
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <ObservationKPICards kpis={stats?.kpis} loading={statsLoading} />

      {/* Tab Navigation */}
      <div className="flex gap-0 mb-5 border-b-2 border-border">
        <button
          className={`px-5 py-2.5 text-[13px] font-medium border-b-2 -mb-[2px] transition-colors ${
            activeTab === 'list'
              ? 'text-primary-600 border-primary-600 font-semibold'
              : 'text-text-tertiary border-transparent hover:text-text-primary'
          }`}
          onClick={() => setActiveTab('list')}
        >
          Observation List
        </button>
        <button
          className={`px-5 py-2.5 text-[13px] font-medium border-b-2 -mb-[2px] transition-colors ${
            activeTab === 'analytics'
              ? 'text-primary-600 border-primary-600 font-semibold'
              : 'text-text-tertiary border-transparent hover:text-text-primary'
          }`}
          onClick={() => setActiveTab('analytics')}
        >
          Analytics & Charts
        </button>
      </div>

      {/* Tab Content */}
      {activeTab === 'list' && (
        <>
          <ObservationFilters
            filters={filters}
            onFilterChange={(key, val) =>
              setFilters(prev => ({ ...prev, [key]: val, page: key === 'page' ? val as number : 1 }))
            }
            onClearFilters={() =>
              setFilters(prev => ({
                ...prev, search: '', status: '', category: '', priority: '',
                contractor: '', observation_type: '', responsible_supervisor: '',
                period: '', date_from: '', date_to: '', page: 1,
              }))
            }
            onExport={exportData}
            filterOptions={filterOptions}
            loading={loading}
          />

          {error && (
            <div className="mb-4 p-3 bg-danger-50 border border-danger-100 rounded-[var(--radius-md)] flex items-center justify-between">
              <span className="text-[13px] text-danger-700">{error}</span>
              <button onClick={refresh} className="text-[12px] font-medium text-danger-600 hover:text-danger-700 underline">Retry</button>
            </div>
          )}

          <ObservationTable
            observations={observations}
            loading={loading}
            pagination={pagination}
            onPageChange={(page) => setFilters(prev => ({ ...prev, page }))}
            onView={handleView}
            onEdit={handleEdit}
            onDelete={deleteObservation}
            onStatusChange={updateStatus}
            onAddNew={handleAddNew}
          />
        </>
      )}

      {activeTab === 'analytics' && (
        <ObservationCharts stats={stats} loading={statsLoading} />
      )}

      {/* Form Drawer */}
      {showForm && (
        <ObservationForm
          observation={editingObs}
          onSubmit={handleFormSubmit}
          onClose={() => {
            setShowForm(false);
            setEditingObs(null);
          }}
          filterOptions={filterOptions}
          onUploadFiles={uploadFiles}
        />
      )}

      {/* Detail Drawer */}
      {viewingObs && (
        <ObservationDetail
          observation={viewingObs}
          onClose={() => setViewingObs(null)}
          onEdit={() => {
            setEditingObs(viewingObs);
            setViewingObs(null);
            setShowForm(true);
          }}
        />
      )}
    </div>
  );
}
