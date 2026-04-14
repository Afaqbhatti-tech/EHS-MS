import { useState } from 'react';
import { Plus, RefreshCw, Upload } from 'lucide-react';
import { useToast } from '../../components/ui/Toast';
import { useMom } from './hooks/useMom';
import { MomKPICards } from './components/MomKPICards';
import { MomFilters } from './components/MomFilters';
import { MomTable } from './components/MomTable';
import { MomForm } from './components/MomForm';
import { MomDetail } from './components/MomDetail';
import { MomAnalytics } from './components/MomAnalytics';
import { MomOpenItemsView } from './components/MomOpenItemsView';
import { MomImportModal } from './components/MomImportModal';
import type { MomListItem, MomDetail as MomDetailType } from './hooks/useMom';
import './MomPage.css';

type PageTab = 'register' | 'open-items' | 'analytics';

export default function MomPage() {
  const toast = useToast();
  const [pageTab, setPageTab] = useState<PageTab>('register');
  const [showForm, setShowForm] = useState(false);
  const [editingMom, setEditingMom] = useState<MomListItem | null>(null);
  const [editingMomDetail, setEditingMomDetail] = useState<MomDetailType | null>(null);
  const [viewingMomId, setViewingMomId] = useState<string | null>(null);
  const [showImport, setShowImport] = useState(false);
  const [isExporting, setIsExporting] = useState(false);

  const {
    moms, stats, loading, statsLoading, error, pagination,
    filters, setFilters,
    createMom, updateMom, deleteMom, getMomDetail,
    addPoint, updatePoint, deletePoint, carryForward,
    searchPoints, uploadFiles, importDocument, confirmImport,
    uploadPointPhoto, deletePointPhoto, exportMoms, refresh, isRefreshing,
    analysing, analysisResult, analysisError, analyseMomDocument, clearAnalysis,
  } = useMom();

  const handleExportMoms = async (format: string) => {
    if (isExporting) return;
    if (!moms.length && format !== 'print') {
      toast.warning('No data to export');
      return;
    }
    setIsExporting(true);
    try {
      await exportMoms(format);
    } catch (err: any) {
      toast.error(err?.message || 'Failed to export MOMs');
    } finally {
      setIsExporting(false);
    }
  };

  const handleAddNew = () => {
    setEditingMom(null);
    setEditingMomDetail(null);
    setShowForm(true);
  };

  const handleEdit = async (m: MomListItem) => {
    setEditingMom(m);
    setViewingMomId(null);
    try {
      const detail = await getMomDetail(m.id);
      setEditingMomDetail(detail);
    } catch (err: any) {
      toast.error(err?.message || 'Failed to load MOM details');
      setEditingMomDetail(null);
    }
    setShowForm(true);
  };

  const handleView = (m: MomListItem) => {
    setViewingMomId(m.id);
  };

  const handleFormSubmit = async (formData: Record<string, unknown>) => {
    try {
      if (editingMom) {
        await updateMom(editingMom.id, formData);
      } else {
        await createMom(formData);
      }
      setShowForm(false);
      setEditingMom(null);
      setEditingMomDetail(null);
    } catch (err: any) {
      toast.error(err?.message || `Failed to ${editingMom ? 'update' : 'create'} MOM`);
    }
  };

  const openPointCount = stats?.kpis?.open_points ?? 0;

  return (
    <div className="min-h-full">
      {/* Page Header */}
      <div className="flex items-start justify-between gap-3 mb-6 pb-5 border-b border-border flex-wrap">
        <div>
          <h1 className="text-[22px] font-bold text-text-primary leading-tight">
            Weekly MOM
          </h1>
          <p className="text-[13px] text-text-secondary mt-1">
            Minutes of Meeting — weekly action tracking and progress reporting
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
            onClick={() => setShowImport(true)}
            className="inline-flex items-center gap-1.5 px-4 py-2 text-[13px] font-semibold text-primary-600 bg-primary-50 border border-primary-200 rounded-[var(--radius-md)] hover:bg-primary-100 transition-colors"
          >
            <Upload size={16} />
            Import Document
          </button>
          <button
            onClick={handleAddNew}
            className="inline-flex items-center gap-1.5 px-4 py-2 text-[13px] font-semibold text-white bg-primary-600 rounded-[var(--radius-md)] hover:bg-primary-700 transition-colors shadow-xs"
          >
            <Plus size={16} />
            New MOM
          </button>
        </div>
      </div>

      {/* Page Tabs */}
      <div className="mom-tabs" style={{ marginBottom: 20 }}>
        <button className={`mom-tab ${pageTab === 'register' ? 'mom-tab--active' : ''}`} onClick={() => setPageTab('register')}>
          MOM Register
        </button>
        <button className={`mom-tab ${pageTab === 'open-items' ? 'mom-tab--active' : ''}`} onClick={() => setPageTab('open-items')}>
          Open Items
          {openPointCount > 0 && <span className="mom-tab__count" style={{ background: '#FEE2E2', color: '#991B1B' }}>{openPointCount}</span>}
        </button>
        <button className={`mom-tab ${pageTab === 'analytics' ? 'mom-tab--active' : ''}`} onClick={() => setPageTab('analytics')}>
          Analytics
        </button>
      </div>

      {/* TAB: MOM Register */}
      {pageTab === 'register' && (
        <>
          <MomKPICards kpis={stats?.kpis} loading={statsLoading} />

          <MomFilters
            filters={filters}
            onFilterChange={(key, val) =>
              setFilters(prev => ({ ...prev, [key]: val, page: key === 'page' ? (val as number) : 1 }))
            }
            onExport={handleExportMoms}
            loading={loading}
            exporting={isExporting}
          />

          {error && (
            <div className="mb-4 p-3 bg-danger-50 border border-danger-100 rounded-[var(--radius-md)] flex items-center justify-between">
              <span className="text-[13px] text-danger-700">{error}</span>
              <button onClick={refresh} className="text-[12px] font-medium text-danger-600 hover:text-danger-700 underline">Retry</button>
            </div>
          )}

          <MomTable
            moms={moms}
            loading={loading}
            pagination={pagination}
            onPageChange={(page) => setFilters(prev => ({ ...prev, page }))}
            onView={handleView}
            onEdit={handleEdit}
            onDelete={deleteMom}
            onAddNew={handleAddNew}
          />
        </>
      )}

      {/* TAB: Open Items */}
      {pageTab === 'open-items' && (
        <MomOpenItemsView
          searchPoints={searchPoints}
          onUpdatePoint={updatePoint}
          onDeletePoint={deletePoint}
          onViewPoint={(momId) => setViewingMomId(momId)}
        />
      )}

      {/* TAB: Analytics */}
      {pageTab === 'analytics' && (
        <MomAnalytics stats={stats} loading={statsLoading} />
      )}

      {/* Form Drawer */}
      {showForm && (
        <MomForm
          mom={editingMom}
          momDetail={editingMomDetail}
          onSubmit={handleFormSubmit}
          onClose={() => {
            setShowForm(false);
            setEditingMom(null);
            setEditingMomDetail(null);
            clearAnalysis();
          }}
          uploadFiles={uploadFiles}
          previousMoms={moms}
          analysing={analysing}
          analysisResult={analysisResult}
          analysisError={analysisError}
          analyseMomDocument={analyseMomDocument}
          clearAnalysis={clearAnalysis}
        />
      )}

      {/* Detail Drawer */}
      {/* Import Modal */}
      <MomImportModal
        open={showImport}
        onClose={() => setShowImport(false)}
        onImport={importDocument}
        onConfirmImport={confirmImport}
      />

      {viewingMomId && (
        <MomDetail
          momId={viewingMomId}
          onClose={() => setViewingMomId(null)}
          onEdit={() => {
            const m = moms.find(mk => mk.id === viewingMomId);
            if (m) handleEdit(m);
          }}
          getMomDetail={getMomDetail}
          addPoint={addPoint}
          updatePoint={updatePoint}
          deletePoint={deletePoint}
          carryForward={carryForward}
          onRefresh={refresh}
          onViewMom={(id) => setViewingMomId(id)}
          uploadPointPhoto={uploadPointPhoto}
          deletePointPhoto={deletePointPhoto}
        />
      )}
    </div>
  );
}
