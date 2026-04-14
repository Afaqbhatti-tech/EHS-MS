import { useState, useCallback } from 'react';
import { Plus, RefreshCw } from 'lucide-react';
import { useAmendments } from './hooks/useAmendments';
import AmendmentKPICards from './components/AmendmentKPICards';
import AmendmentFilters from './components/AmendmentFilters';
import AmendmentTable from './components/AmendmentTable';
import AmendmentForm from './components/AmendmentForm';
import AmendmentDetail from './components/AmendmentDetail';
import { AmendmentAnalytics } from './components/AmendmentAnalytics';
import type { Amendment } from './hooks/useAmendments';
import { useToast } from '../../components/ui/Toast';
import './AmendmentsPage.css';

export default function AmendmentsPage() {
  const [activeTab, setActiveTab] = useState<'list' | 'analytics'>('list');
  const [showForm, setShowForm] = useState(false);
  const [editingAmendment, setEditingAmendment] = useState<Amendment | null>(null);
  const [viewingAmendment, setViewingAmendment] = useState<Amendment | null>(null);

  const toast = useToast();

  const {
    amendments, stats, loading, statsLoading, error, isRefreshing,
    pagination, filters, setFilters,
    fetchAmendment, createAmendment, updateAmendment, deleteAmendment,
    submitForReview, approve, reject, approveWithComments,
    cancel, exportAmendments, refresh,
  } = useAmendments();

  const handleAddNew = () => {
    setEditingAmendment(null);
    setShowForm(true);
  };

  const handleEdit = useCallback((amendment: Amendment) => {
    setEditingAmendment(amendment);
    setShowForm(true);
    setViewingAmendment(null);
  }, []);

  const handleView = useCallback(async (amendment: Amendment) => {
    try {
      const full = await fetchAmendment(amendment.id);
      setViewingAmendment(full);
    } catch (err) {
      console.error('Failed to fetch amendment details:', err);
      setViewingAmendment(amendment);
    }
  }, [fetchAmendment]);

  const handleFormSubmit = async (formData: Record<string, unknown>) => {
    try {
      if (editingAmendment) {
        await updateAmendment(editingAmendment.id, formData);
        toast.success('Amendment updated successfully');
      } else {
        await createAmendment(formData);
        toast.success('Amendment raised successfully');
      }
      setShowForm(false);
      setEditingAmendment(null);
    } catch (err: any) {
      toast.error(err.message || 'An error occurred while saving the amendment');
    }
  };

  const handleDelete = useCallback(async (amendment: Amendment) => {
    if (!confirm(`Delete amendment ${amendment.amendment_code}? This cannot be undone.`)) return;
    try {
      await deleteAmendment(amendment.id);
      toast.success('Amendment deleted successfully');
    } catch (err: any) {
      console.error('Failed to delete amendment:', err);
      toast.error(err.message || 'Failed to delete amendment');
    }
  }, [deleteAmendment, toast]);

  const handleDetailRefresh = useCallback(async () => {
    if (viewingAmendment) {
      try {
        const full = await fetchAmendment(viewingAmendment.id);
        setViewingAmendment(full);
      } catch (err) { console.error('Failed to refresh amendment detail:', err); }
    }
  }, [viewingAmendment, fetchAmendment]);

  const handlePageChange = useCallback((page: number) => {
    setFilters(prev => ({ ...prev, page }));
  }, [setFilters]);

  const tabs = [
    { key: 'list' as const, label: 'Amendment List' },
    { key: 'analytics' as const, label: 'Analytics' },
  ];

  return (
    <div className="min-h-full">
      {/* Page Header */}
      <div className="flex items-start justify-between gap-3 mb-6 pb-5 border-b border-border flex-wrap">
        <div>
          <h1 className="text-[22px] font-bold text-text-primary leading-tight">
            Permit Amendments
          </h1>
          <p className="text-[13px] text-text-secondary mt-1">
            Track and manage controlled changes to live permits
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={refresh}
            disabled={isRefreshing}
            className="inline-flex items-center gap-1.5 px-3 py-2 text-[12px] font-medium text-text-secondary bg-surface border border-border rounded-[var(--radius-sm)] hover:bg-surface-sunken transition-colors"
          >
            <RefreshCw size={13} className={isRefreshing ? 'animate-spin' : ''} />
            Refresh
          </button>
          <button
            onClick={handleAddNew}
            className="inline-flex items-center gap-1.5 px-4 py-2 text-[12px] font-semibold text-white bg-primary-600 rounded-[var(--radius-sm)] hover:bg-primary-700 transition-colors shadow-sm"
          >
            <Plus size={14} />
            Raise Amendment
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <AmendmentKPICards stats={stats} loading={statsLoading} />

      {/* Tabs */}
      <div className="flex items-center gap-1 mt-6 mb-4 border-b border-border">
        {tabs.map(tab => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`px-4 py-2.5 text-[13px] font-medium transition-colors border-b-2 -mb-px ${
              activeTab === tab.key
                ? 'text-primary-600 border-primary-600'
                : 'text-text-tertiary border-transparent hover:text-text-secondary'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Error */}
      {error && (
        <div className="mb-4 p-3 rounded-[var(--radius-md)] bg-danger-50 border border-danger-200 text-[12px] text-danger-700">
          {error}
        </div>
      )}

      {/* Tab Content */}
      {activeTab === 'list' && (
        <>
          <AmendmentFilters
            filters={filters}
            onFilterChange={(f) => setFilters({ ...f, page: 1 })}
            onExport={exportAmendments}
          />

          <AmendmentTable
            amendments={amendments}
            loading={loading}
            onView={handleView}
            onEdit={handleEdit}
            onDelete={handleDelete}
            pagination={pagination}
            onPageChange={handlePageChange}
          />
        </>
      )}

      {activeTab === 'analytics' && (
        <AmendmentAnalytics stats={stats} loading={statsLoading} />
      )}

      {/* Form Drawer */}
      {showForm && (
        <AmendmentForm
          isOpen={showForm}
          onClose={() => { setShowForm(false); setEditingAmendment(null); }}
          onSubmit={handleFormSubmit}
          amendment={editingAmendment}
        />
      )}

      {/* Detail Drawer */}
      {viewingAmendment && (
        <AmendmentDetail
          amendment={viewingAmendment}
          onClose={() => setViewingAmendment(null)}
          onEdit={() => handleEdit(viewingAmendment)}
          onRefresh={handleDetailRefresh}
          onSubmitForReview={submitForReview}
          onApprove={approve}
          onReject={reject}
          onApproveWithComments={approveWithComments}
          onCancel={cancel}
        />
      )}
    </div>
  );
}
