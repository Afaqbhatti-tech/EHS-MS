import { useState, useCallback } from 'react';
import { Plus, RefreshCw, AlertTriangle, BarChart3, Upload } from 'lucide-react';
import ExportDropdown from '../../components/ui/ExportDropdown';
import type { ExportFormat } from '../../components/ui/ExportDropdown';
import { useContractors } from './hooks/useContractors';
import ContractorKPICards from './components/ContractorKPICards';
import ContractorFilters from './components/ContractorFilters';
import ContractorTable from './components/ContractorTable';
import ContractorForm from './components/ContractorForm';
import ContractorDetail from './components/ContractorDetail';
import { ImportModal } from '../../components/Import';
import type { Contractor } from './hooks/useContractors';
import { useToast } from '../../components/ui/Toast';
import './ContractorsPage.css';

export default function ContractorsPage() {
  const [activeTab, setActiveTab] = useState<'list' | 'alerts' | 'analytics'>('list');
  const [showForm, setShowForm] = useState(false);
  const [editingContractor, setEditingContractor] = useState<Contractor | null>(null);
  const [viewingContractor, setViewingContractor] = useState<Contractor | null>(null);
  const [showImport, setShowImport] = useState(false);

  const toast = useToast();

  const {
    contractors, stats, loading, statsLoading, error, isRefreshing,
    pagination, filters, setFilters,
    fetchContractor, createContractor, updateContractor, deleteContractor,
    changeStatus, addContact, updateContact, removeContact,
    uploadDocument, removeDocument, verifyDocument,
    exportContractors, refresh,
  } = useContractors();

  const handleAddNew = () => {
    setEditingContractor(null);
    setShowForm(true);
  };

  const handleEdit = useCallback((contractor: Contractor) => {
    setEditingContractor(contractor);
    setShowForm(true);
    setViewingContractor(null);
  }, []);

  const handleView = useCallback(async (contractor: Contractor) => {
    try {
      const full = await fetchContractor(contractor.id);
      if (full) {
        setViewingContractor(full);
      } else {
        toast.error('Failed to load contractor details. Please try again.');
      }
    } catch (err) {
      console.error('Failed to fetch contractor details:', err);
      toast.error('Failed to load contractor details. Showing cached data.');
      setViewingContractor(contractor);
    }
  }, [fetchContractor, toast]);

  const handleFormSubmit = async (formData: Record<string, unknown>) => {
    if (editingContractor) {
      await updateContractor(editingContractor.id, formData);
    } else {
      await createContractor(formData);
    }
    setShowForm(false);
    setEditingContractor(null);
  };

  const handleDelete = useCallback(async (contractor: Contractor) => {
    if (!confirm(`Delete contractor ${contractor.contractor_code}? This cannot be undone.`)) return;
    await deleteContractor(contractor.id);
  }, [deleteContractor]);

  const handleStatusChange = useCallback(async (id: number, data: { status: string; reason?: string; notes?: string }) => {
    await changeStatus(id, data);
    try {
      const full = await fetchContractor(id);
      setViewingContractor(full);
    } catch (err) {
      console.error('Failed to refresh contractor after status change:', err);
      toast.error('Status updated but failed to refresh details');
    }
  }, [changeStatus, fetchContractor, toast]);

  const handleRefreshDetail = useCallback(async () => {
    if (!viewingContractor) return;
    try {
      const full = await fetchContractor(viewingContractor.id);
      setViewingContractor(full);
    } catch (err) {
      console.error('Failed to refresh contractor detail:', err);
      toast.error('Failed to refresh contractor details');
    }
  }, [viewingContractor, fetchContractor, toast]);

  const alertCount = (stats?.kpis.with_expired_docs ?? 0) + (stats?.kpis.contracts_expiring_soon ?? 0);

  return (
    <div className="ctr-page">
      {/* Header */}
      <div className="ctr-page-header">
        <div>
          <h1 className="ctr-page-title">Contractor Records</h1>
          <p className="ctr-page-subtitle">Contractor compliance, documents, and operational management</p>
        </div>
        <div className="ctr-page-actions">
          <button className="ctr-btn ctr-btn-ghost" onClick={refresh} disabled={isRefreshing}>
            <RefreshCw size={16} className={isRefreshing ? 'ctr-spin' : ''} />
          </button>
          <ExportDropdown onExport={(fmt: ExportFormat) => exportContractors(fmt)} />
          <button className="ctr-btn ctr-btn-ghost" onClick={() => setShowImport(true)}>
            <Upload size={16} /> Import
          </button>
          <button className="ctr-btn ctr-btn-primary" onClick={handleAddNew}>
            <Plus size={16} /> Register Contractor
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="ctr-tabs">
        <button
          className={`ctr-tab ${activeTab === 'list' ? 'ctr-tab-active' : ''}`}
          onClick={() => setActiveTab('list')}
        >
          Contractor Register
        </button>
        <button
          className={`ctr-tab ${activeTab === 'alerts' ? 'ctr-tab-active' : ''}`}
          onClick={() => setActiveTab('alerts')}
        >
          <AlertTriangle size={14} />
          Expiry Alerts
          {alertCount > 0 && (
            <span className={`ctr-tab-badge ${(stats?.kpis.with_expired_docs ?? 0) > 0 ? 'ctr-tab-badge-danger' : 'ctr-tab-badge-warning'}`}>
              {alertCount}
            </span>
          )}
        </button>
        <button
          className={`ctr-tab ${activeTab === 'analytics' ? 'ctr-tab-active' : ''}`}
          onClick={() => setActiveTab('analytics')}
        >
          <BarChart3 size={14} />
          Analytics
        </button>
      </div>

      {/* Error */}
      {error && (
        <div className="ctr-error">
          <AlertTriangle size={16} /> {error}
          <button onClick={refresh} className="ctr-error-retry">Retry</button>
        </div>
      )}

      {/* Tab Content */}
      {activeTab === 'list' && (
        <>
          <ContractorKPICards stats={stats} loading={statsLoading} />
          <ContractorFilters
            filters={filters}
            onFilterChange={setFilters}
            onExport={() => exportContractors('xlsx')}
          />
          <ContractorTable
            contractors={contractors}
            onView={handleView}
            onEdit={handleEdit}
            onDelete={handleDelete}
            loading={loading}
          />

          {/* Pagination */}
          {pagination.last_page > 1 && (
            <div className="ctr-pagination">
              <span className="ctr-pagination-info">
                Showing {((pagination.current_page - 1) * pagination.per_page) + 1}–
                {Math.min(pagination.current_page * pagination.per_page, pagination.total)} of {pagination.total}
              </span>
              <div className="ctr-pagination-btns">
                <button
                  disabled={pagination.current_page <= 1}
                  onClick={() => setFilters(f => ({ ...f, page: f.page - 1 }))}
                  className="ctr-btn ctr-btn-sm ctr-btn-outline"
                >
                  Previous
                </button>
                <button
                  disabled={pagination.current_page >= pagination.last_page}
                  onClick={() => setFilters(f => ({ ...f, page: f.page + 1 }))}
                  className="ctr-btn ctr-btn-sm ctr-btn-outline"
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </>
      )}

      {activeTab === 'alerts' && stats && (
        <div className="ctr-alerts-container">
          {/* Expired Documents */}
          {stats.expiry_alerts.filter(a => a.days_to_expiry < 0).length > 0 && (
            <div className="ctr-alert-section">
              <h3 className="ctr-alert-header ctr-alert-header-danger">Expired Documents</h3>
              <div className="ctr-alert-list">
                {stats.expiry_alerts.filter(a => a.days_to_expiry < 0).map((alert, i) => (
                  <div key={i} className="ctr-alert-item ctr-alert-item-danger">
                    <span className="ctr-alert-icon">⛔</span>
                    <div className="ctr-alert-content">
                      <strong>{alert.contractor_name}</strong>
                      <span className="ctr-alert-doc">{alert.document_type}</span>
                    </div>
                    <span className="ctr-alert-days">Expired {Math.abs(alert.days_to_expiry)} days ago</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Expiring Within 7 Days */}
          {stats.expiry_alerts.filter(a => a.days_to_expiry >= 0 && a.days_to_expiry <= 7).length > 0 && (
            <div className="ctr-alert-section">
              <h3 className="ctr-alert-header ctr-alert-header-critical">Expiring Within 7 Days</h3>
              <div className="ctr-alert-list">
                {stats.expiry_alerts.filter(a => a.days_to_expiry >= 0 && a.days_to_expiry <= 7).map((alert, i) => (
                  <div key={i} className="ctr-alert-item ctr-alert-item-critical">
                    <span className="ctr-alert-icon">🔴</span>
                    <div className="ctr-alert-content">
                      <strong>{alert.contractor_name}</strong>
                      <span className="ctr-alert-doc">{alert.document_type}</span>
                    </div>
                    <span className="ctr-alert-days">{alert.days_to_expiry} days left</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Expiring Within 30 Days */}
          {stats.expiry_alerts.filter(a => a.days_to_expiry > 7 && a.days_to_expiry <= 30).length > 0 && (
            <div className="ctr-alert-section">
              <h3 className="ctr-alert-header ctr-alert-header-warning">Expiring Within 30 Days</h3>
              <div className="ctr-alert-list">
                {stats.expiry_alerts.filter(a => a.days_to_expiry > 7 && a.days_to_expiry <= 30).map((alert, i) => (
                  <div key={i} className="ctr-alert-item ctr-alert-item-warning">
                    <span className="ctr-alert-icon">⏰</span>
                    <div className="ctr-alert-content">
                      <strong>{alert.contractor_name}</strong>
                      <span className="ctr-alert-doc">{alert.document_type}</span>
                    </div>
                    <span className="ctr-alert-days">{alert.days_to_expiry} days left</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Contracts Expiring */}
          {stats.contract_expiry_alerts.length > 0 && (
            <div className="ctr-alert-section">
              <h3 className="ctr-alert-header ctr-alert-header-warning">Contracts Expiring</h3>
              <div className="ctr-alert-list">
                {stats.contract_expiry_alerts.map((alert, i) => (
                  <div key={i} className="ctr-alert-item ctr-alert-item-warning">
                    <span className="ctr-alert-icon">📅</span>
                    <div className="ctr-alert-content">
                      <strong>{alert.contractor_name}</strong>
                      <span className="ctr-alert-doc">Contract ends {alert.contract_end_date}</span>
                    </div>
                    <span className="ctr-alert-days">{alert.days_remaining} days left</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {stats.expiry_alerts.length === 0 && stats.contract_expiry_alerts.length === 0 && (
            <div className="ctr-empty">No expiry alerts at this time.</div>
          )}
        </div>
      )}

      {activeTab === 'analytics' && stats && (
        <div className="ctr-analytics-container">
          {/* Summary Strip */}
          <div className="ctr-analytics-strip">
            {stats.kpis.with_expired_docs > 0 && (
              <div className="ctr-analytics-alert ctr-analytics-alert-danger">
                ⛔ {stats.kpis.with_expired_docs} expired document(s)
              </div>
            )}
            {stats.kpis.with_expiring_docs > 0 && (
              <div className="ctr-analytics-alert ctr-analytics-alert-warning">
                ⏰ {stats.kpis.with_expiring_docs} expiring this month
              </div>
            )}
            {stats.kpis.contracts_expiring_soon > 0 && (
              <div className="ctr-analytics-alert ctr-analytics-alert-warning">
                📅 {stats.kpis.contracts_expiring_soon} contract(s) expiring
              </div>
            )}
          </div>

          {/* Charts Grid */}
          <div className="ctr-analytics-grid">
            {/* Status Distribution */}
            <div className="ctr-analytics-card">
              <h4 className="ctr-analytics-card-title">Status Distribution</h4>
              <div className="ctr-chart-bars">
                {stats.by_status.map(item => (
                  <div key={item.status} className="ctr-chart-bar-row">
                    <span className="ctr-chart-label">{item.status}</span>
                    <div className="ctr-chart-bar-track">
                      <div
                        className="ctr-chart-bar-fill"
                        style={{ width: `${Math.max(5, (item.count / Math.max(1, stats.kpis.total_contractors)) * 100)}%` }}
                      />
                    </div>
                    <span className="ctr-chart-value">{item.count}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Compliance Distribution */}
            <div className="ctr-analytics-card">
              <h4 className="ctr-analytics-card-title">Compliance Status</h4>
              <div className="ctr-chart-bars">
                {stats.by_compliance.map(item => (
                  <div key={item.status} className="ctr-chart-bar-row">
                    <span className="ctr-chart-label">{item.status}</span>
                    <div className="ctr-chart-bar-track">
                      <div
                        className="ctr-chart-bar-fill ctr-chart-bar-compliance"
                        style={{ width: `${Math.max(5, (item.count / Math.max(1, stats.kpis.total_contractors)) * 100)}%` }}
                      />
                    </div>
                    <span className="ctr-chart-value">{item.count}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* By Company Type */}
            <div className="ctr-analytics-card">
              <h4 className="ctr-analytics-card-title">By Company Type</h4>
              <div className="ctr-chart-bars">
                {stats.by_type.map(item => (
                  <div key={item.company_type} className="ctr-chart-bar-row">
                    <span className="ctr-chart-label">{item.company_type}</span>
                    <div className="ctr-chart-bar-track">
                      <div
                        className="ctr-chart-bar-fill ctr-chart-bar-type"
                        style={{ width: `${Math.max(5, (item.count / Math.max(1, stats.by_type[0]?.count ?? 1)) * 100)}%` }}
                      />
                    </div>
                    <span className="ctr-chart-value">{item.count}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Monthly Trend */}
            <div className="ctr-analytics-card">
              <h4 className="ctr-analytics-card-title">Monthly Additions (12 months)</h4>
              <div className="ctr-chart-bars">
                {stats.monthly_trend.map(item => (
                  <div key={item.month} className="ctr-chart-bar-row">
                    <span className="ctr-chart-label">{item.month}</span>
                    <div className="ctr-chart-bar-track">
                      <div
                        className="ctr-chart-bar-fill ctr-chart-bar-trend"
                        style={{ width: `${Math.max(5, (item.contractors_added / Math.max(1, Math.max(...stats.monthly_trend.map(m => m.contractors_added)))) * 100)}%` }}
                      />
                    </div>
                    <span className="ctr-chart-value">{item.contractors_added}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Form Drawer */}
      {showForm && (
        <ContractorForm
          open={showForm}
          onClose={() => { setShowForm(false); setEditingContractor(null); }}
          onSubmit={handleFormSubmit}
          editData={editingContractor}
          loading={false}
        />
      )}

      {/* Detail View */}
      {viewingContractor && (
        <ContractorDetail
          contractor={viewingContractor}
          onClose={() => setViewingContractor(null)}
          onEdit={handleEdit}
          onStatusChange={handleStatusChange}
          onRefresh={handleRefreshDetail}
          addContact={(data) => addContact(viewingContractor.id, data)}
          updateContact={(contactId, data) => updateContact(viewingContractor.id, contactId, data)}
          removeContact={(contactId) => removeContact(viewingContractor.id, contactId)}
          uploadDocument={(formData) => uploadDocument(viewingContractor.id, formData)}
          removeDocument={(docId) => removeDocument(viewingContractor.id, docId)}
          verifyDocument={(docId, data) => verifyDocument(viewingContractor.id, docId, data)}
        />
      )}

      {/* Import Reconciliation Modal */}
      <ImportModal
        open={showImport}
        onClose={() => setShowImport(false)}
        module="contractors"
        onComplete={refresh}
      />
    </div>
  );
}
