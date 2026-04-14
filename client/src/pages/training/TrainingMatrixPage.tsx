import { useState, useEffect, useCallback } from 'react';
import { Plus, RefreshCw, Users, Shield, Trash2, Settings, Search, Upload } from 'lucide-react';
import { useTraining } from './hooks/useTraining';
import { TrainingKPICards } from './components/TrainingKPICards';
import { TrainingFilters } from './components/TrainingFilters';
import { TrainingTable } from './components/TrainingTable';
import { TrainingForm } from './components/TrainingForm';
import { TrainingDetail } from './components/TrainingDetail';
import { TrainingCharts } from './components/TrainingCharts';
import { BulkAssignForm } from './components/BulkAssignForm';
import { TrainingStatusBadge } from './components/TrainingStatusBadge';
import { ImportModal } from '../../components/Import';
import type { TrainingRecord, ComplianceMatrix } from './hooks/useTraining';
import { useToast } from '../../components/ui/Toast';
import { api } from '../../services/api';
import { useAuth } from '../../contexts/AuthContext';

export default function TrainingMatrixPage() {
  const [activeTab, setActiveTab] = useState<'list' | 'compliance' | 'requirements' | 'analytics'>('list');
  const [showForm, setShowForm] = useState(false);
  const [showBulkForm, setShowBulkForm] = useState(false);
  const [showImport, setShowImport] = useState(false);
  const [editingRecord, setEditingRecord] = useState<TrainingRecord | null>(null);
  const [viewingRecord, setViewingRecord] = useState<TrainingRecord | null>(null);

  const {
    records, stats, topics, filterOptions, requirements, loading, statsLoading,
    error, pagination, filters, setFilters,
    createRecord, updateRecord, deleteRecord,
    checkDuplicate, bulkPreview, bulkAssign,
    searchWorkers, fetchComplianceMatrix, fetchRequirements,
    addRequirement, removeRequirement,
    uploadCertificate, removeCertificate,
    exportData, refresh, isRefreshing,
  } = useTraining();

  const toast = useToast();
  const { hasPermission } = useAuth();

  // Permission checks
  const canCreate = hasPermission('can_create_training');
  const canEdit = hasPermission('can_edit_training');
  const canDelete = hasPermission('can_delete_training');
  const canBulkAssign = hasPermission('can_bulk_assign_training');
  const canExport = hasPermission('can_export_training');
  const canManageRequirements = hasPermission('can_manage_training_requirements');
  const canViewCompliance = hasPermission('section_training_compliance');

  // ── Compliance Matrix State ──
  const [complianceData, setComplianceData] = useState<ComplianceMatrix | null>(null);
  const [complianceProfession, setComplianceProfession] = useState('');
  const [complianceSearch, setComplianceSearch] = useState('');
  const [complianceLoading, setComplianceLoading] = useState(false);

  const loadCompliance = useCallback(async () => {
    setComplianceLoading(true);
    try {
      const data = await fetchComplianceMatrix(complianceProfession || undefined, complianceSearch || undefined);
      setComplianceData(data);
    } catch { /* ignore */ }
    setComplianceLoading(false);
  }, [complianceProfession, complianceSearch, fetchComplianceMatrix]);

  useEffect(() => {
    if (activeTab === 'compliance') loadCompliance();
  }, [activeTab, loadCompliance]);

  // ── Requirements State ──
  const [reqProfession, setReqProfession] = useState('');
  const [reqTopicKey, setReqTopicKey] = useState('');
  const [reqAdding, setReqAdding] = useState(false);

  useEffect(() => {
    if (activeTab === 'requirements') fetchRequirements();
  }, [activeTab, fetchRequirements]);

  const handleAddRequirement = async () => {
    if (!reqProfession || !reqTopicKey) return;
    setReqAdding(true);
    try {
      await addRequirement({ profession: reqProfession, training_topic_key: reqTopicKey, is_mandatory: true });
      toast.success('Training requirement added');
      setReqTopicKey('');
    } catch (err: any) {
      toast.error(err.message || 'Failed to add requirement');
    }
    setReqAdding(false);
  };

  const handleRemoveRequirement = async (id: string) => {
    try {
      await removeRequirement(id);
      toast.success('Requirement removed');
    } catch (err: any) {
      toast.error(err.message || 'Failed to remove');
    }
  };

  // ── Record View with Audit Logs ──
  const handleView = async (record: TrainingRecord) => {
    try {
      const full = await api.get<TrainingRecord>(`/training/records/${record.id}`);
      setViewingRecord(full);
    } catch {
      setViewingRecord(record);
    }
  };

  const handleAddNew = () => {
    setEditingRecord(null);
    setShowForm(true);
  };

  const handleEdit = (record: TrainingRecord) => {
    setEditingRecord(record);
    setShowForm(true);
  };

  const handleFormSubmit = async (formData: Record<string, unknown> | FormData) => {
    try {
      if (editingRecord) {
        await updateRecord(editingRecord.id, formData);
        toast.success('Training record updated');
      } else {
        await createRecord(formData);
        toast.success('Training record created');
      }
      setShowForm(false);
      setEditingRecord(null);
    } catch (err: any) {
      toast.error(err.message || 'Operation failed');
      throw err;
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteRecord(id);
      toast.success('Training record deleted');
      setViewingRecord(null);
    } catch (err: any) {
      toast.error(err.message || 'Delete failed');
    }
  };

  const handleUploadCert = async (recordId: string, file: File) => {
    try {
      await uploadCertificate(recordId, file);
      toast.success('Certificate uploaded');
      // Refresh the viewing record
      const full = await api.get<TrainingRecord>(`/training/records/${recordId}`);
      setViewingRecord(full);
    } catch (err: any) {
      toast.error(err.message || 'Upload failed');
    }
  };

  const handleRemoveCert = async (recordId: string) => {
    try {
      await removeCertificate(recordId);
      toast.success('Certificate removed');
      const full = await api.get<TrainingRecord>(`/training/records/${recordId}`);
      setViewingRecord(full);
    } catch (err: any) {
      toast.error(err.message || 'Remove failed');
    }
  };

  const tabs = [
    { key: 'list' as const, label: 'Training Records', visible: true },
    { key: 'compliance' as const, label: 'Compliance Matrix', visible: canViewCompliance },
    { key: 'requirements' as const, label: 'Trade Requirements', visible: canManageRequirements },
    { key: 'analytics' as const, label: 'Analytics', visible: true },
  ].filter(t => t.visible);

  // Group requirements by profession
  const reqGrouped: Record<string, typeof requirements> = {};
  requirements.forEach(r => {
    if (!reqGrouped[r.profession]) reqGrouped[r.profession] = [];
    reqGrouped[r.profession].push(r);
  });

  const inputClasses = 'w-full px-3 py-2 text-[13px] bg-surface-sunken border border-border rounded-[var(--radius-sm)] text-text-primary focus:outline-none focus:ring-[3px] focus:ring-primary-500/10 focus:border-primary-500 focus:bg-surface transition-all';

  return (
    <div className="min-h-full">
      {/* Page Header */}
      <div className="flex items-start justify-between gap-3 mb-6 pb-5 border-b border-border flex-wrap">
        <div>
          <h1 className="text-[22px] font-bold text-text-primary leading-tight">Training Matrix</h1>
          <p className="text-[13px] text-text-secondary mt-1">Track worker training records, compliance, and certifications</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={refresh} disabled={isRefreshing} className="p-2 text-text-tertiary bg-surface border border-border rounded-[var(--radius-md)] hover:bg-surface-sunken transition-colors disabled:opacity-50" title="Refresh">
            <RefreshCw size={16} className={isRefreshing ? 'animate-spin' : ''} />
          </button>
          <button onClick={() => setShowImport(true)} className="inline-flex items-center gap-1.5 px-4 py-2 text-[13px] font-semibold text-text-primary bg-surface border border-border rounded-[var(--radius-md)] hover:bg-surface-sunken transition-colors">
            <Upload size={16} />
            Import
          </button>
          {canBulkAssign && (
            <button onClick={() => setShowBulkForm(true)} className="inline-flex items-center gap-1.5 px-4 py-2 text-[13px] font-semibold text-text-primary bg-surface border border-border rounded-[var(--radius-md)] hover:bg-surface-sunken transition-colors">
              <Users size={16} />
              Bulk Assign
            </button>
          )}
          {canCreate && (
            <button onClick={handleAddNew} className="inline-flex items-center gap-1.5 px-4 py-2 text-[13px] font-semibold text-white bg-primary-600 rounded-[var(--radius-md)] hover:bg-primary-700 transition-colors shadow-xs">
              <Plus size={16} />
              Add Record
            </button>
          )}
        </div>
      </div>

      {/* KPI Cards */}
      <TrainingKPICards kpis={stats?.kpis} loading={statsLoading} />

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

      {/* ── Training Records Tab ── */}
      {activeTab === 'list' && (
        <>
          <TrainingFilters
            filters={filters}
            onFilterChange={(key, val) => setFilters(prev => ({ ...prev, [key]: val, page: key === 'page' ? val as number : 1 }))}
            onExport={canExport ? exportData : undefined}
            filterOptions={filterOptions}
            loading={loading}
          />
          {error && (
            <div className="mb-4 p-3 bg-danger-50 border border-danger-100 rounded-[var(--radius-md)] flex items-center justify-between">
              <span className="text-[13px] text-danger-700">{error}</span>
              <button onClick={refresh} className="text-[12px] font-medium text-danger-600 hover:text-danger-700 underline">Retry</button>
            </div>
          )}
          <TrainingTable
            records={records}
            loading={loading}
            pagination={pagination}
            onPageChange={(page) => setFilters(prev => ({ ...prev, page }))}
            onView={handleView}
            onEdit={canEdit ? handleEdit : undefined}
            onDelete={canDelete ? handleDelete : undefined}
            onAddNew={canCreate ? handleAddNew : undefined}
          />
        </>
      )}

      {/* ── Compliance Matrix Tab ── */}
      {activeTab === 'compliance' && (
        <div className="space-y-4">
          <div className="flex items-center gap-3 flex-wrap">
            <select value={complianceProfession} onChange={e => setComplianceProfession(e.target.value)} className={`${inputClasses} max-w-[200px]`}>
              <option value="">All Professions</option>
              {(filterOptions?.professions || []).map(p => <option key={p} value={p}>{p}</option>)}
            </select>
            <div className="relative flex-1 max-w-[300px]">
              <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-text-tertiary" />
              <input type="text" value={complianceSearch} onChange={e => setComplianceSearch(e.target.value)} placeholder="Search worker..." className={`${inputClasses} pl-8`} />
            </div>
            <button onClick={loadCompliance} disabled={complianceLoading} className="px-4 py-2 text-[13px] font-medium text-primary-600 bg-primary-50 border border-primary-200 rounded-[var(--radius-md)] hover:bg-primary-100 transition-colors">
              {complianceLoading ? 'Loading...' : 'Load Matrix'}
            </button>
          </div>

          {complianceData && complianceData.workers.length > 0 ? (
            <div className="bg-surface border border-border rounded-[var(--radius-lg)] overflow-x-auto">
              <table className="w-full text-[12px]">
                <thead>
                  <tr className="bg-surface-sunken border-b border-border">
                    <th className="text-left px-3 py-2 font-semibold text-text-tertiary text-[10px] uppercase tracking-wider sticky left-0 bg-surface-sunken z-10 min-w-[180px]">Worker</th>
                    <th className="text-center px-2 py-2 font-semibold text-text-tertiary text-[10px] uppercase tracking-wider min-w-[50px]">%</th>
                    {complianceData.topics.map(t => (
                      <th key={t.key} className="text-center px-2 py-2 font-semibold text-text-tertiary text-[10px] uppercase tracking-wider min-w-[100px]">{t.label}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {complianceData.workers.map(w => (
                    <tr key={w.id} className="border-b border-border hover:bg-surface-sunken/50">
                      <td className="px-3 py-2 sticky left-0 bg-surface z-10">
                        <p className="font-medium text-text-primary text-[12px]">{w.name}</p>
                        <p className="text-[10px] text-text-tertiary">{w.worker_id} - {w.profession}</p>
                      </td>
                      <td className="px-2 py-2 text-center">
                        <span className={`inline-block px-1.5 py-0.5 rounded text-[11px] font-bold ${
                          w.compliance_pct >= 100 ? 'bg-success-50 text-success-700' :
                          w.compliance_pct >= 50 ? 'bg-warning-50 text-warning-700' :
                          'bg-danger-50 text-danger-700'
                        }`}>
                          {w.compliance_pct}%
                        </span>
                      </td>
                      {complianceData.topics.map(t => {
                        const topicStatus = w.topics[t.key];
                        if (!topicStatus) return <td key={t.key} className="px-2 py-2 text-center text-text-tertiary">-</td>;
                        return (
                          <td key={t.key} className="px-2 py-2 text-center">
                            <TrainingStatusBadge status={topicStatus.status as any} />
                            {topicStatus.expiry_date && (
                              <p className="text-[9px] text-text-tertiary mt-0.5">{topicStatus.expiry_date}</p>
                            )}
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : complianceData && complianceData.workers.length === 0 ? (
            <div className="bg-surface border border-border rounded-[var(--radius-lg)] p-12 text-center">
              <Shield size={32} className="text-text-tertiary mx-auto mb-3" />
              <h3 className="text-[15px] font-semibold text-text-primary mb-1">No Compliance Data</h3>
              <p className="text-[13px] text-text-tertiary">Add trade requirements in the "Trade Requirements" tab first, then come back to see the compliance matrix.</p>
            </div>
          ) : (
            <div className="bg-surface border border-border rounded-[var(--radius-lg)] p-12 text-center">
              <Shield size={32} className="text-text-tertiary mx-auto mb-3" />
              <h3 className="text-[15px] font-semibold text-text-primary mb-1">Compliance Matrix</h3>
              <p className="text-[13px] text-text-tertiary">Select a profession and click "Load Matrix" to see worker compliance status against required trainings.</p>
            </div>
          )}
        </div>
      )}

      {/* ── Trade Requirements Tab ── */}
      {activeTab === 'requirements' && (
        <div className="space-y-5">
          {/* Add Requirement Form */}
          <div className="bg-surface border border-border rounded-[var(--radius-lg)] p-5">
            <h3 className="text-[14px] font-bold text-text-primary mb-3 flex items-center gap-2">
              <Settings size={16} />
              Add Training Requirement by Trade
            </h3>
            <div className="flex items-end gap-3 flex-wrap">
              <div className="flex-1 min-w-[180px]">
                <label className="block text-[11px] font-semibold text-text-tertiary uppercase tracking-wider mb-1.5">Profession / Trade</label>
                <select value={reqProfession} onChange={e => setReqProfession(e.target.value)} className={inputClasses}>
                  <option value="">Select profession...</option>
                  {(filterOptions?.professions || []).map(p => <option key={p} value={p}>{p}</option>)}
                </select>
              </div>
              <div className="flex-1 min-w-[200px]">
                <label className="block text-[11px] font-semibold text-text-tertiary uppercase tracking-wider mb-1.5">Training Topic</label>
                <select value={reqTopicKey} onChange={e => setReqTopicKey(e.target.value)} className={inputClasses}>
                  <option value="">Select topic...</option>
                  {topics.map(t => <option key={t.key} value={t.key}>{t.label} ({t.category})</option>)}
                </select>
              </div>
              <button onClick={handleAddRequirement} disabled={reqAdding || !reqProfession || !reqTopicKey} className="px-5 py-2 text-[13px] font-semibold text-white bg-primary-600 rounded-[var(--radius-md)] hover:bg-primary-700 disabled:opacity-50 transition-colors shadow-xs whitespace-nowrap">
                {reqAdding ? 'Adding...' : 'Add Requirement'}
              </button>
            </div>
          </div>

          {/* Current Requirements */}
          {Object.keys(reqGrouped).length > 0 ? (
            <div className="space-y-4">
              {Object.entries(reqGrouped).sort(([a], [b]) => a.localeCompare(b)).map(([profession, reqs]) => (
                <div key={profession} className="bg-surface border border-border rounded-[var(--radius-lg)] overflow-hidden">
                  <div className="px-4 py-3 bg-surface-sunken border-b border-border">
                    <h4 className="text-[13px] font-bold text-text-primary">{profession}</h4>
                    <p className="text-[11px] text-text-tertiary">{reqs.length} required training{reqs.length !== 1 ? 's' : ''}</p>
                  </div>
                  <div className="divide-y divide-border">
                    {reqs.map(req => (
                      <div key={req.id} className="flex items-center justify-between px-4 py-2.5 hover:bg-surface-sunken/50">
                        <div>
                          <p className="text-[13px] font-medium text-text-primary">{req.topic_label}</p>
                          {req.topic_category && <p className="text-[11px] text-text-tertiary">{req.topic_category}</p>}
                        </div>
                        <button onClick={() => handleRemoveRequirement(req.id)} className="p-1.5 text-text-tertiary hover:text-danger-600 hover:bg-danger-50 rounded-[var(--radius-sm)] transition-colors">
                          <Trash2 size={14} />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="bg-surface border border-border rounded-[var(--radius-lg)] p-12 text-center">
              <Settings size={32} className="text-text-tertiary mx-auto mb-3" />
              <h3 className="text-[15px] font-semibold text-text-primary mb-1">No Trade Requirements Defined</h3>
              <p className="text-[13px] text-text-tertiary">Use the form above to map which training topics are required for each profession/trade.</p>
            </div>
          )}
        </div>
      )}

      {/* ── Analytics Tab ── */}
      {activeTab === 'analytics' && (
        <TrainingCharts stats={stats} loading={statsLoading} />
      )}

      {/* Form Drawer */}
      {showForm && (
        <TrainingForm
          record={editingRecord}
          topics={topics}
          onSubmit={handleFormSubmit}
          onClose={() => { setShowForm(false); setEditingRecord(null); }}
          searchWorkers={async (q) => searchWorkers(q)}
          checkDuplicate={checkDuplicate}
        />
      )}

      {/* Detail Drawer */}
      {viewingRecord && (
        <TrainingDetail
          record={viewingRecord}
          onClose={() => setViewingRecord(null)}
          onEdit={canEdit ? (r) => {
            setEditingRecord(r);
            setViewingRecord(null);
            setShowForm(true);
          } : undefined}
          onDelete={canDelete ? handleDelete : undefined}
          onUploadCertificate={handleUploadCert}
          onRemoveCertificate={handleRemoveCert}
        />
      )}

      {/* Bulk Assign Drawer */}
      {showBulkForm && (
        <BulkAssignForm
          topics={topics}
          filterOptions={filterOptions}
          onSubmit={bulkAssign}
          onClose={() => setShowBulkForm(false)}
          searchWorkers={searchWorkers}
          bulkPreview={bulkPreview}
        />
      )}

      {/* Import Reconciliation Modal */}
      <ImportModal
        open={showImport}
        onClose={() => setShowImport(false)}
        module="training"
        onComplete={refresh}
      />
    </div>
  );
}
