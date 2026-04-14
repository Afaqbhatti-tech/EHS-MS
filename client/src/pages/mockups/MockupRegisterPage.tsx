import { useState } from 'react';
import { Plus, RefreshCw } from 'lucide-react';
import { useToast } from '../../components/ui/Toast';
import { useAuth } from '../../contexts/AuthContext';
import { useMockups } from './hooks/useMockups';
import { MockupKPICards } from './components/MockupKPICards';
import { MockupFilters } from './components/MockupFilters';
import { MockupTable } from './components/MockupTable';
import MockupForm from './components/MockupForm';
import MockupDetailDrawer from './components/MockupDetail';
import { ImportMockupModal } from './components/ImportMockupModal';
import type { Mockup, MockupFilters as Filters } from './hooks/useMockups';

export default function MockupRegisterPage() {
  const toast = useToast();
  const { hasRole } = useAuth();
  const [showForm, setShowForm] = useState(false);
  const [editingMockup, setEditingMockup] = useState<Mockup | null>(null);
  const [viewingMockupId, setViewingMockupId] = useState<string | null>(null);
  const [showImport, setShowImport] = useState(false);

  const canReview = hasRole('admin') || hasRole('safety_manager') || hasRole('safety_officer');

  const {
    mockups, stats, filterOptions, loading, statsLoading,
    error, pagination, filters, setFilters,
    createMockup, updateMockup, deleteMockup,
    getMockupDetail, submitForReview, approve, reject,
    approveWithComments, createRevision,
    addComment, resolveComment,
    uploadPhotos, deletePhoto,
    uploadAttachments, deleteAttachment,
    importMockups, exportData, refresh, isRefreshing,
  } = useMockups();

  const handleAddNew = () => {
    setEditingMockup(null);
    setShowForm(true);
  };

  const handleEdit = (m: Mockup) => {
    setEditingMockup(m);
    setViewingMockupId(null);
    setShowForm(true);
  };

  const handleView = (m: Mockup) => {
    setViewingMockupId(m.id);
  };

  const handleFormSubmit = async (formData: Record<string, unknown>) => {
    try {
      if (editingMockup) {
        await updateMockup(editingMockup.id, formData);
        toast.success('Mock-up updated successfully');
      } else {
        await createMockup(formData);
        toast.success('Mock-up created successfully');
      }
      setShowForm(false);
      setEditingMockup(null);
    } catch (err: any) {
      toast.error(err.message || 'An error occurred while saving the mockup');
    }
  };

  return (
    <div className="min-h-full">
      {/* Page Header */}
      <div className="flex items-start justify-between gap-3 mb-6 pb-5 border-b border-border flex-wrap">
        <div>
          <h1 className="text-[22px] font-bold text-text-primary leading-tight">
            Mock-Up Register
          </h1>
          <p className="text-[13px] text-text-secondary mt-1">
            Pre-execution validation workflow — track mock-up demonstrations, approvals, and RAMS linkage
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
            New Mock-Up
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <MockupKPICards kpis={stats?.kpis} loading={statsLoading} />

      {/* Filters */}
      <MockupFilters
        filters={filters}
        onFilterChange={(key, val) =>
          setFilters(prev => ({ ...prev, [key]: val, page: key === 'page' ? val as number : 1 }))
        }
        onExport={exportData}
        onImport={() => setShowImport(true)}
        filterOptions={filterOptions}
        loading={loading}
      />

      {/* Error */}
      {error && (
        <div className="mb-4 p-3 bg-danger-50 border border-danger-100 rounded-[var(--radius-md)] flex items-center justify-between">
          <span className="text-[13px] text-danger-700">{error}</span>
          <button onClick={refresh} className="text-[12px] font-medium text-danger-600 hover:text-danger-700 underline">Retry</button>
        </div>
      )}

      {/* Table */}
      <MockupTable
        mockups={mockups}
        loading={loading}
        pagination={pagination}
        onPageChange={(page) => setFilters(prev => ({ ...prev, page }))}
        onView={handleView}
        onEdit={handleEdit}
        onDelete={async (id: string) => {
          try {
            await deleteMockup(id);
            toast.success('Mock-up deleted successfully');
          } catch (err: any) {
            toast.error(err.message || 'Failed to delete mock-up');
          }
        }}
        onAddNew={handleAddNew}
      />

      {/* Form Drawer */}
      {showForm && (
        <MockupForm
          mockup={editingMockup}
          onSubmit={handleFormSubmit}
          onClose={() => {
            setShowForm(false);
            setEditingMockup(null);
          }}
          filterOptions={filterOptions}
        />
      )}

      {/* Detail Drawer */}
      {viewingMockupId && (
        <MockupDetailDrawer
          mockupId={viewingMockupId}
          onClose={() => setViewingMockupId(null)}
          onEdit={() => {
            const m = mockups.find(mk => mk.id === viewingMockupId);
            if (m) {
              setEditingMockup(m);
              setViewingMockupId(null);
              setShowForm(true);
            }
          }}
          getMockupDetail={getMockupDetail}
          submitForReview={submitForReview}
          approve={approve}
          reject={reject}
          approveWithComments={approveWithComments}
          createRevision={createRevision}
          addComment={addComment}
          resolveComment={resolveComment}
          uploadAttachments={uploadAttachments}
          deleteAttachment={deleteAttachment}
          uploadPhotos={uploadPhotos}
          deletePhoto={deletePhoto}
          canReview={canReview}
        />
      )}

      {/* Import Modal */}
      {showImport && (
        <ImportMockupModal
          open={showImport}
          onClose={() => setShowImport(false)}
          onImport={importMockups}
          onRefresh={refresh}
        />
      )}
    </div>
  );
}
