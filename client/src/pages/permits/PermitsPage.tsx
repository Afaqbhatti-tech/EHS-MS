import { useState, useRef } from 'react';
import { Plus, RefreshCw } from 'lucide-react';
import { CARD_VIEW_PER_PAGE } from '../../utils/fetchAllPages';
import { useToast } from '../../components/ui/Toast';
import { usePermits } from './hooks/usePermits';
import { PermitKPICards } from './components/PermitKPICards';
import { PermitFilters } from './components/PermitFilters';
import { PermitTable } from './components/PermitTable';
import { PermitCards } from './components/PermitCards';
import { PermitForm } from './components/PermitForm';
import { PermitDetail } from './components/PermitDetail';
import { PermitCharts } from './components/PermitCharts';
import { PermitCalendarView } from './components/PermitCalendarView';
import type { Permit, CalendarPermit } from './hooks/usePermits';

export default function PermitsPage() {
  const toast = useToast();
  const [activeTab, setActiveTab] = useState<'list' | 'calendar' | 'analytics'>('list');
  const [viewMode, setViewModeState] = useState<'table' | 'cards'>('table');
  const [showForm, setShowForm] = useState(false);
  const [editingPermit, setEditingPermit] = useState<Permit | null>(null);
  const [viewingPermit, setViewingPermit] = useState<Permit | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const savedTablePageRef = useRef(1);

  const {
    permits, stats, calendarData, filterOptions, loading,
    statsLoading, error, pagination, filters, setFilters,
    createPermit, updatePermit, updateStatus,
    deletePermit, uploadFiles, exportData,
    fetchCalendar, refresh, isRefreshing,
  } = usePermits();

  const handleViewModeChange = (mode: 'table' | 'cards') => {
    if (viewMode === 'table' && mode === 'cards') {
      savedTablePageRef.current = filters.page || 1;
    }
    setViewModeState(mode);
    setFilters(prev => ({
      ...prev,
      per_page: mode === 'cards' ? CARD_VIEW_PER_PAGE : 20,
      page: mode === 'cards' ? 1 : savedTablePageRef.current,
    }));
  };

  const handleAddNew = () => {
    setEditingPermit(null);
    setShowForm(true);
  };

  const handleEdit = (permit: Permit) => {
    setEditingPermit(permit);
    setShowForm(true);
  };

  const handleView = (permit: Permit) => {
    setViewingPermit(permit);
  };

  const handleCalendarPermitClick = (cp: CalendarPermit) => {
    // Find full permit data or create a minimal view
    const fullPermit = permits.find(p => p.id === cp.id);
    if (fullPermit) {
      setViewingPermit(fullPermit);
    } else {
      // Fetch the full permit if not in current list
      setViewingPermit({
        id: cp.id,
        permit_number: cp.permit_number,
        permit_type: cp.permit_type,
        title: cp.title,
        area: cp.area,
        permit_date: cp.permit_date,
        permit_date_end: cp.permit_date_end,
        status: cp.status,
        type_config: { color: cp.color, lightColor: cp.lightColor, textColor: cp.textColor },
        type_abbr: cp.abbr,
        type_label: cp.type_label,
        // Defaults for fields not in calendar data
        phase: null, activity_type: null, description: null, contractor: null,
        issued_to: null, start_time: null, end_time: null,
        safety_measures: null, ppe_requirements: null,
        image_path: null, image_url: null, attachments: [],
        notes: null, approved_by: null, approved_at: null,
        closed_by: null, closed_at: null,
        created_at: '', updated_at: '',
      });
    }
  };

  const handleFormSubmit = async (formData: Record<string, unknown>) => {
    if (submitting) return;
    setSubmitting(true);
    try {
      if (editingPermit) {
        await updatePermit(editingPermit.id, formData);
        toast.success('Permit updated successfully');
      } else {
        await createPermit(formData);
        toast.success('Permit created successfully');
      }
      setShowForm(false);
      setEditingPermit(null);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to save permit';
      toast.error(message);
    } finally {
      setSubmitting(false);
    }
  };

  const tabs = [
    { key: 'list' as const, label: 'Permit List' },
    { key: 'calendar' as const, label: 'Calendar View' },
    { key: 'analytics' as const, label: 'Analytics' },
  ];

  return (
    <div className="min-h-full">
      {/* Page Header */}
      <div className="flex items-center justify-between gap-3 mb-5 flex-wrap">
        <div>
          <h1 className="text-[22px] font-bold text-text-primary leading-tight">
            Permits to Work
          </h1>
          <p className="text-[13px] text-text-secondary mt-0.5">
            Manage and track all site work permits
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
            New Permit
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <PermitKPICards kpis={stats?.kpis} loading={statsLoading} />

      {/* Tab Navigation */}
      <div className="flex gap-0 mb-4 border-b-2 border-border">
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
          <PermitFilters
            filters={filters}
            onFilterChange={(key, val) =>
              setFilters(prev => ({ ...prev, [key]: val, page: key === 'page' ? val as number : 1 }))
            }
            onExport={exportData}
            filterOptions={filterOptions}
            loading={loading}
            viewMode={viewMode}
            onViewModeChange={handleViewModeChange}
          />

          {error && (
            <div className="mb-4 p-3 bg-danger-50 border border-danger-100 rounded-[var(--radius-md)] flex items-center justify-between">
              <span className="text-[13px] text-danger-700">{error}</span>
              <button onClick={refresh} className="text-[12px] font-medium text-danger-600 hover:text-danger-700 underline">Retry</button>
            </div>
          )}

          {viewMode === 'table' ? (
            <PermitTable
              permits={permits}
              loading={loading}
              pagination={pagination}
              onPageChange={(page) => setFilters(prev => ({ ...prev, page }))}
              onView={handleView}
              onEdit={handleEdit}
              onDelete={deletePermit}
              onStatusChange={updateStatus}
              onAddNew={handleAddNew}
            />
          ) : (
            <PermitCards
              permits={permits}
              loading={loading}
              onView={handleView}
              onEdit={handleEdit}
              onDelete={deletePermit}
            />
          )}
        </>
      )}

      {activeTab === 'calendar' && (
        <PermitCalendarView
          calendarData={calendarData}
          onMonthChange={fetchCalendar}
          onPermitClick={handleCalendarPermitClick}
        />
      )}

      {activeTab === 'analytics' && (
        <PermitCharts stats={stats} loading={statsLoading} />
      )}

      {/* Form Drawer */}
      {showForm && (
        <PermitForm
          permit={editingPermit}
          onSubmit={handleFormSubmit}
          onClose={() => {
            setShowForm(false);
            setEditingPermit(null);
          }}
          filterOptions={filterOptions}
          onUploadFiles={uploadFiles}
        />
      )}

      {/* Detail Drawer */}
      {viewingPermit && (
        <PermitDetail
          permit={viewingPermit}
          onClose={() => setViewingPermit(null)}
          onEdit={() => {
            setEditingPermit(viewingPermit);
            setViewingPermit(null);
            setShowForm(true);
          }}
        />
      )}
    </div>
  );
}
