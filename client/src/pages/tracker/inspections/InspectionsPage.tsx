import { useState, useEffect } from 'react';
import { Plus, RefreshCw } from 'lucide-react';
import { useTracker } from '../hooks/useTracker';
import { InspectionKPICards } from './components/InspectionKPICards';
import { InspectionFilters } from './components/InspectionFilters';
import { InspectionTable } from './components/InspectionTable';
import { InspectionDetailDrawer } from './components/InspectionDetailDrawer';
import { InspectionAnalytics } from './components/InspectionAnalytics';
import { InspectionSearchPanel } from './components/InspectionSearchPanel';
import { TrackerInspectionForm } from '../components/TrackerInspectionForm';
import TypedDeleteConfirmModal from '../../../components/ui/TypedDeleteConfirmModal';
import type { TrackerInspection, TrackerRecord, SearchItem, InspectionFilters as IFilters } from '../hooks/useTracker';

type Tab = 'all' | 'analytics';
type AddStep = null | 'search' | 'form';

export default function InspectionsPage() {
  const [activeTab, setActiveTab] = useState<Tab>('all');
  const [viewingInspection, setViewingInspection] = useState<TrackerInspection | null>(null);
  const [addStep, setAddStep] = useState<AddStep>(null);
  const [selectedRecord, setSelectedRecord] = useState<TrackerRecord | null>(null);
  const [loadingRecord, setLoadingRecord] = useState(false);
  const [editingInspection, setEditingInspection] = useState<TrackerInspection | null>(null);
  const [deletingInspection, setDeletingInspection] = useState<TrackerInspection | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  const {
    allInspections, inspectionStats, inspectionPagination,
    inspectionFilters, setInspectionFilters,
    inspectionsLoading, inspectionStatsLoading,
    fetchAllInspections, fetchInspectionStats,
    showInspection, exportInspections,
    searchItems, getRecordDetail, deleteInspection,
  } = useTracker();

  // Fetch inspections when filters change
  useEffect(() => {
    fetchAllInspections(inspectionFilters);
  }, [inspectionFilters, fetchAllInspections]);

  // Fetch stats on mount
  useEffect(() => {
    fetchInspectionStats();
  }, [fetchInspectionStats]);

  const handleFilterChange = (key: string, value: string | number) => {
    setInspectionFilters((prev: IFilters) => ({
      ...prev,
      [key]: value,
      page: key === 'page' ? value as number : 1,
    }));
  };

  const handleViewInspection = async (inspection: TrackerInspection) => {
    try {
      const detail = await showInspection(inspection.id);
      setViewingInspection(detail);
    } catch {
      setViewingInspection(inspection);
    }
  };

  const handleExport = (format: string) => {
    exportInspections(inspectionFilters, format);
  };

  const [isRefreshing, setIsRefreshing] = useState(false);
  const handleRefresh = () => {
    setIsRefreshing(true);
    Promise.all([fetchAllInspections(inspectionFilters), fetchInspectionStats()]).finally(() => setIsRefreshing(false));
  };

  // ── Edit Inspection Flow ──────────────────────────────

  const handleEditInspection = async (inspection: TrackerInspection) => {
    setLoadingRecord(true);
    try {
      const recordId = inspection.tracker_record_id ?? inspection.record?.id;
      if (!recordId) throw new Error('No record ID');
      const fullRecord = await getRecordDetail(recordId);
      setSelectedRecord(fullRecord);
      setEditingInspection(inspection);
      setAddStep('form');
    } catch {
      // Fallback minimal record from inspection.record
      if (inspection.record) {
        setSelectedRecord({
          id: inspection.record.id,
          record_code: inspection.record.record_code,
          equipment_name: inspection.record.equipment_name,
          category_key: inspection.record.category_key || '',
          category_label: inspection.record.category?.label || '',
          category_color: inspection.record.category?.color || '',
          category_light_color: inspection.record.category?.light_color || '',
          category_text_color: inspection.record.category?.text_color || '',
          item_subtype: inspection.record.item_subtype,
          plate_number: inspection.record.plate_number,
          serial_number: inspection.record.serial_number,
          sticker_number: inspection.record.sticker_number,
          condition: inspection.record.condition || 'Good',
          status: inspection.record.status,
        } as TrackerRecord);
        setEditingInspection(inspection);
        setAddStep('form');
      }
    } finally {
      setLoadingRecord(false);
    }
  };

  // ── Delete Inspection Flow ──────────────────────────────

  const handleDeleteInspection = (inspection: TrackerInspection) => {
    setDeletingInspection(inspection);
  };

  const confirmDeleteInspection = async () => {
    if (!deletingInspection) return;
    setDeleteLoading(true);
    try {
      await deleteInspection(deletingInspection.id);
      setDeletingInspection(null);
      setViewingInspection(null);
      handleRefresh();
    } catch (err: any) {
      console.error('Delete inspection failed:', err);
    } finally {
      setDeleteLoading(false);
    }
  };

  // ── Add Inspection Flow ────────────────────────────────

  const handleAddClick = () => {
    setAddStep('search');
    setSelectedRecord(null);
  };

  const handleSelectItem = async (item: SearchItem) => {
    setLoadingRecord(true);
    try {
      const fullRecord = await getRecordDetail(item.id);
      setSelectedRecord(fullRecord);
      setAddStep('form');
    } catch {
      // Fallback: build a minimal TrackerRecord from SearchItem
      setSelectedRecord({
        id: item.id,
        record_code: item.record_code,
        equipment_name: item.equipment_name,
        category_key: item.category_key,
        category_label: item.category_label || '',
        category_color: item.category_color || '',
        category_light_color: item.category_light_color || '',
        category_text_color: item.category_text_color || '',
        item_subtype: item.item_subtype,
        plate_number: item.plate_number,
        serial_number: item.serial_number,
        sticker_number: item.sticker_number,
        condition: item.condition || 'Good',
        status: item.status,
      } as TrackerRecord);
      setAddStep('form');
    } finally {
      setLoadingRecord(false);
    }
  };

  const handleFormSubmit = async (_recordId: number, _data: Record<string, unknown>) => {
    // The form already submitted via direct fetch — this callback just triggers refresh
    handleRefresh();
    return {};
  };

  const handleFormClose = () => {
    setAddStep(null);
    setSelectedRecord(null);
    setEditingInspection(null);
    // Refresh data after closing (whether submitted or not)
    handleRefresh();
  };

  const handleSearchClose = () => {
    setAddStep(null);
    setSelectedRecord(null);
  };

  const TABS: { key: Tab; label: string }[] = [
    { key: 'all', label: 'All Inspections' },
    { key: 'analytics', label: 'Analytics' },
  ];

  return (
    <div className="min-h-full">
      {/* Page Header */}
      <div className="flex items-start justify-between gap-3 mb-6 pb-5 border-b border-border flex-wrap">
        <div>
          <h1 className="text-[22px] font-bold text-text-primary leading-tight">
            Inspection Management
          </h1>
          <p className="text-[13px] text-text-secondary mt-1">
            Log, track, and manage equipment inspections across all categories
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handleAddClick}
            className="inline-flex items-center gap-1.5 px-4 py-2 text-[13px] font-semibold text-white bg-primary-600 rounded-[var(--radius-md)] hover:bg-primary-700 transition-colors shadow-xs"
          >
            <Plus size={15} />
            Add Inspection
          </button>
          <button
            onClick={handleRefresh}
            disabled={isRefreshing}
            className="p-2 text-text-tertiary bg-surface border border-border rounded-[var(--radius-md)] hover:bg-surface-sunken transition-colors disabled:opacity-50"
            title="Refresh"
          >
            <RefreshCw size={16} className={isRefreshing ? 'animate-spin' : ''} />
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <InspectionKPICards kpis={inspectionStats?.kpis || null} loading={inspectionStatsLoading} />

      {/* Tab Navigation */}
      <div className="flex gap-0 mb-5 border-b-2 border-border">
        {TABS.map(tab => (
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
            {tab.key === 'all' && inspectionPagination.total > 0 && (
              <span className="ml-1.5 text-[11px] font-medium text-text-tertiary">({inspectionPagination.total})</span>
            )}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      {activeTab === 'all' && (
        <>
          <InspectionFilters
            filters={inspectionFilters}
            onFilterChange={handleFilterChange}
            onExport={handleExport}
            loading={inspectionsLoading}
          />

          <InspectionTable
            items={allInspections}
            loading={inspectionsLoading}
            pagination={inspectionPagination}
            onPageChange={(page) => handleFilterChange('page', page)}
            onView={handleViewInspection}
            onEdit={handleEditInspection}
            onDelete={handleDeleteInspection}
          />
        </>
      )}

      {activeTab === 'analytics' && (
        <InspectionAnalytics
          stats={inspectionStats}
          loading={inspectionStatsLoading}
        />
      )}

      {/* Detail Drawer */}
      {viewingInspection && (
        <InspectionDetailDrawer
          inspection={viewingInspection}
          onClose={() => setViewingInspection(null)}
          onEdit={handleEditInspection}
          onDelete={handleDeleteInspection}
        />
      )}

      {/* Delete Confirmation Modal */}
      <TypedDeleteConfirmModal
        open={!!deletingInspection}
        onClose={() => setDeletingInspection(null)}
        onConfirm={confirmDeleteInspection}
        title="Delete Inspection"
        itemType="Inspection"
        itemName={deletingInspection ? `${deletingInspection.log_code} — ${deletingInspection.record?.equipment_name || 'Unknown'}` : ''}
        message="This inspection record and all its attachments will be permanently deleted."
        loading={deleteLoading}
        permanent
      />

      {/* Add Inspection — Step 1: Search & Select Equipment */}
      {addStep === 'search' && (
        <InspectionSearchPanel
          onSelect={handleSelectItem}
          onClose={handleSearchClose}
          searchItems={searchItems}
        />
      )}

      {/* Add Inspection — Step 2: Inspection Form */}
      {addStep === 'form' && selectedRecord && (
        <TrackerInspectionForm
          record={selectedRecord}
          onSubmit={handleFormSubmit}
          onClose={handleFormClose}
          existingInspection={editingInspection}
        />
      )}

      {/* Loading overlay when fetching full record */}
      {loadingRecord && (
        <>
          <div className="drawer-overlay" />
          <div className="fixed inset-0 z-[60] flex items-center justify-center">
            <div className="bg-surface border border-border rounded-[var(--radius-md)] px-8 py-6 shadow-lg text-center">
              <div className="w-8 h-8 border-3 border-primary-200 border-t-primary-600 rounded-full animate-spin mx-auto mb-3" />
              <p className="text-[13px] font-medium text-text-primary">Loading equipment details...</p>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
