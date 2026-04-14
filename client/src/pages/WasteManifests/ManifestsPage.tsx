import { useState, useCallback } from 'react';
import { Plus, RefreshCw } from 'lucide-react';
import { useManifests } from './hooks/useManifests';
import ManifestKPICards from './components/ManifestKPICards';
import ManifestFilters from './components/ManifestFilters';
import ManifestTable from './components/ManifestTable';
import ManifestForm from './components/ManifestForm';
import ManifestDetail from './components/ManifestDetail';
import ManifestAnalytics from './components/ManifestAnalytics';
import DispatchModal from './components/DispatchModal';
import ReceivingModal from './components/ReceivingModal';
import DisposalModal from './components/DisposalModal';
import type { Manifest } from './hooks/useManifests';
import { useToast } from '../../components/ui/Toast';
import './ManifestsPage.css';

export default function ManifestsPage() {
  const [activeTab, setActiveTab] = useState<'list' | 'analytics'>('list');
  const [showForm, setShowForm] = useState(false);
  const [editingManifest, setEditingManifest] = useState<Manifest | null>(null);
  const [viewingManifest, setViewingManifest] = useState<Manifest | null>(null);
  const [dispatchManifest, setDispatchManifest] = useState<Manifest | null>(null);
  const [receivingManifest, setReceivingManifest] = useState<Manifest | null>(null);
  const [disposalManifest, setDisposalManifest] = useState<Manifest | null>(null);

  const toast = useToast();

  const {
    manifests, stats, loading, statsLoading, error, isRefreshing,
    pagination, filters, setFilters,
    fetchManifest, createManifest, updateManifest, deleteManifest,
    changeStatus, confirmDispatch, confirmReceiving, confirmDisposal,
    exportManifests, refresh,
  } = useManifests();

  const handleAddNew = () => {
    setEditingManifest(null);
    setShowForm(true);
  };

  const handleEdit = useCallback((manifest: Manifest) => {
    setEditingManifest(manifest);
    setShowForm(true);
    setViewingManifest(null);
  }, []);

  const handleView = useCallback(async (manifest: Manifest) => {
    try {
      const full = await fetchManifest(manifest.id);
      setViewingManifest(full);
    } catch (err) {
      toast.error('Failed to load manifest details');
      setViewingManifest(manifest);
    }
  }, [fetchManifest, toast]);

  const handleFormSubmit = async (formData: Record<string, unknown>) => {
    try {
      if (editingManifest) {
        await updateManifest(editingManifest.id, formData);
        toast.success('Manifest updated successfully');
      } else {
        await createManifest(formData);
        toast.success('Manifest created successfully');
      }
      setShowForm(false);
      setEditingManifest(null);
    } catch (err: any) {
      toast.error(err?.message || 'Failed to save manifest');
    }
  };

  const handleDelete = useCallback(async (manifest: Manifest) => {
    if (!confirm(`Delete manifest ${manifest.manifest_code}? This cannot be undone.`)) return;
    try {
      await deleteManifest(manifest.id);
      toast.success('Manifest deleted successfully');
    } catch (err: any) {
      toast.error(err?.message || 'Failed to delete manifest');
    }
  }, [deleteManifest, toast]);

  const handleCancel = useCallback(async (manifest: Manifest) => {
    const reason = prompt('Cancellation reason:');
    if (!reason) return;
    try {
      await changeStatus(manifest.id, { status: 'Cancelled', cancellation_reason: reason });
      toast.success('Manifest cancelled successfully');
      setViewingManifest(null);
    } catch (err: any) {
      toast.error(err?.message || 'Failed to cancel manifest');
    }
  }, [changeStatus, toast]);

  const handleStatusChange = useCallback(async (id: number, data: { status: string }) => {
    await changeStatus(id, data);
    // Refresh the detail view
    try {
      const full = await fetchManifest(id);
      setViewingManifest(full);
    } catch (err) {
      toast.error('Status updated but failed to refresh details');
    }
  }, [changeStatus, fetchManifest, toast]);

  const handleDispatchConfirm = useCallback(async (id: number, data: Record<string, unknown>) => {
    try {
      await confirmDispatch(id, data);
      toast.success('Dispatch confirmed successfully');
      setDispatchManifest(null);
      setViewingManifest(null);
    } catch (err: any) {
      toast.error(err?.message || 'Failed to confirm dispatch');
    }
  }, [confirmDispatch, toast]);

  const handleReceivingConfirm = useCallback(async (id: number, data: Record<string, unknown>) => {
    try {
      await confirmReceiving(id, data);
      toast.success('Receiving confirmed successfully');
      setReceivingManifest(null);
      setViewingManifest(null);
    } catch (err: any) {
      toast.error(err?.message || 'Failed to confirm receiving');
    }
  }, [confirmReceiving, toast]);

  const handleDisposalConfirm = useCallback(async (id: number, formData: FormData) => {
    try {
      await confirmDisposal(id, formData);
      toast.success('Disposal confirmed successfully');
      setDisposalManifest(null);
      setViewingManifest(null);
    } catch (err: any) {
      toast.error(err?.message || 'Failed to confirm disposal');
    }
  }, [confirmDisposal, toast]);

  const handlePageChange = useCallback((page: number) => {
    setFilters(prev => ({ ...prev, page }));
  }, [setFilters]);

  const tabs = [
    { key: 'list' as const, label: 'Manifest Register' },
    { key: 'analytics' as const, label: 'Analytics' },
  ];

  return (
    <div className="min-h-full manifest-page">
      {/* Page Header */}
      <div className="flex items-start justify-between gap-3 mb-6 pb-5 border-b border-border flex-wrap">
        <div>
          <h1 className="text-[22px] font-bold text-text-primary leading-tight">
            Waste Manifests
          </h1>
          <p className="text-[13px] text-text-secondary mt-1">
            Chain-of-custody tracking for waste from generation to final disposal
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
            className="inline-flex items-center gap-1.5 px-4 py-2 text-[12px] font-semibold text-white bg-primary-500 rounded-[var(--radius-sm)] hover:bg-primary-600 shadow-sm transition-colors"
          >
            <Plus size={14} />
            New Manifest
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-0 mb-5 border-b border-border">
        {tabs.map(tab => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`px-4 py-2.5 text-[13px] font-medium border-b-2 transition-colors ${
              activeTab === tab.key
                ? 'border-primary-500 text-primary-600'
                : 'border-transparent text-text-tertiary hover:text-text-secondary'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {activeTab === 'list' && (
        <>
          {/* KPI Cards */}
          <ManifestKPICards stats={stats} loading={statsLoading} />

          {/* Filters */}
          <ManifestFilters
            filters={filters}
            onChange={setFilters}
            onExport={exportManifests}
          />

          {/* Error */}
          {error && (
            <div className="p-3 rounded-[var(--radius-sm)] bg-red-50 border border-red-200 text-[12px] text-red-700 mb-4">
              {error}
            </div>
          )}

          {/* Table */}
          <ManifestTable
            manifests={manifests}
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
        <ManifestAnalytics stats={stats} loading={statsLoading} />
      )}

      {/* Form Drawer */}
      <ManifestForm
        open={showForm}
        onClose={() => { setShowForm(false); setEditingManifest(null); }}
        onSubmit={handleFormSubmit}
        manifest={editingManifest}
      />

      {/* Detail Drawer */}
      {viewingManifest && (
        <ManifestDetail
          manifest={viewingManifest}
          onClose={() => setViewingManifest(null)}
          onEdit={handleEdit}
          onDispatch={setDispatchManifest}
          onReceive={setReceivingManifest}
          onDispose={setDisposalManifest}
          onCancel={handleCancel}
          onStatusChange={handleStatusChange}
        />
      )}

      {/* Workflow Modals */}
      {dispatchManifest && (
        <DispatchModal
          open={!!dispatchManifest}
          onClose={() => setDispatchManifest(null)}
          manifest={dispatchManifest}
          onConfirm={handleDispatchConfirm}
        />
      )}
      {receivingManifest && (
        <ReceivingModal
          open={!!receivingManifest}
          onClose={() => setReceivingManifest(null)}
          manifest={receivingManifest}
          onConfirm={handleReceivingConfirm}
        />
      )}
      {disposalManifest && (
        <DisposalModal
          open={!!disposalManifest}
          onClose={() => setDisposalManifest(null)}
          manifest={disposalManifest}
          onConfirm={handleDisposalConfirm}
        />
      )}
    </div>
  );
}
