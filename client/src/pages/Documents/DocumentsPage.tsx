import { useState, useCallback } from 'react';
import { Plus, RefreshCw, AlertTriangle, BarChart3, Search } from 'lucide-react';
import ExportDropdown from '../../components/ui/ExportDropdown';
import { useToast } from '../../components/ui/Toast';
import type { ExportFormat } from '../../components/ui/ExportDropdown';
import { useDocuments } from './hooks/useDocuments';
import DocumentKPICards from './components/DocumentKPICards';
import DocumentFilters from './components/DocumentFilters';
import DocumentTable from './components/DocumentTable';
import DocumentForm from './components/DocumentForm';
import DocumentDetail from './components/DocumentDetail';
import type { DcDocument, DcFilters } from './hooks/useDocuments';
import './DocumentsPage.css';

export default function DocumentsPage() {
  const toast = useToast();
  const [activeTab, setActiveTab] = useState<'list' | 'alerts' | 'analytics'>('list');
  const [showForm, setShowForm] = useState(false);
  const [editingDoc, setEditingDoc] = useState<DcDocument | null>(null);
  const [viewingDoc, setViewingDoc] = useState<DcDocument | null>(null);
  const [searchInput, setSearchInput] = useState('');

  const {
    documents, stats, loading, statsLoading, error,
    filters, setFilters, pagination,
    fetchDocuments, fetchStats, fetchDocument,
    createDocument, updateDocument, deleteDocument,
    changeStatus,
    createRevision, uploadRevisionFile, activateRevision,
    submitForReview, submitReview,
    submitForApproval, submitApproval,
    addLink, removeLink,
    exportDocuments,
  } = useDocuments();

  // ── Handlers ──────────────────────────────────────

  const handleAddNew = () => {
    setEditingDoc(null);
    setShowForm(true);
  };

  const handleEdit = useCallback((doc: DcDocument) => {
    setEditingDoc(doc);
    setShowForm(true);
    setViewingDoc(null);
  }, []);

  const handleView = useCallback(async (doc: DcDocument) => {
    try {
      const full = await fetchDocument(doc.id);
      setViewingDoc(full || doc);
    } catch (err) {
      console.error('Failed to fetch document details:', err);
      setViewingDoc(doc);
    }
  }, [fetchDocument]);

  const handleFormSubmit = async (formData: FormData) => {
    await createDocument(formData);
    setShowForm(false);
    setEditingDoc(null);
  };

  const handleFormUpdate = async (id: number, data: Record<string, unknown>) => {
    await updateDocument(id, data);
    setShowForm(false);
    setEditingDoc(null);
  };

  const handleDelete = useCallback(async (doc: DcDocument) => {
    if (!confirm(`Delete document ${doc.document_code}? This action uses soft-delete.`)) return;
    try {
      await deleteDocument(doc.id);
      toast.success('Document deleted successfully');
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to delete document';
      toast.error(message);
    }
  }, [deleteDocument, toast]);

  const handleSort = useCallback((field: string) => {
    setFilters(f => ({
      ...f,
      sort_by: field,
      sort_dir: f.sort_by === field && f.sort_dir === 'asc' ? 'desc' : 'asc',
      page: 1,
    }));
  }, [setFilters]);

  const handlePageChange = useCallback((page: number) => {
    setFilters(f => ({ ...f, page }));
  }, [setFilters]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setFilters(f => ({ ...f, search: searchInput, page: 1 }));
  };

  const handleFilterReset = () => {
    setSearchInput('');
    setFilters({
      search: '', document_type: '', document_category: '', status: '',
      department: '', confidentiality_level: '', priority: '',
      is_expired: '', is_overdue_review: '', is_expiring_soon: '',
      contractor_id: '', site: '', area: '', date_from: '', date_to: '', period: '',
      sort_by: 'document_title', sort_dir: 'asc', per_page: 20, page: 1,
    });
  };

  const handleKPIFilterClick = useCallback((filter: Record<string, string>) => {
    setFilters(f => ({ ...f, ...filter, page: 1 }));
    setActiveTab('list');
  }, [setFilters]);

  const handleRefresh = useCallback(() => {
    fetchDocuments();
    fetchStats();
  }, [fetchDocuments, fetchStats]);

  const handleRefreshDetail = useCallback(async () => {
    if (!viewingDoc) return;
    try {
      const full = await fetchDocument(viewingDoc.id);
      setViewingDoc(full || viewingDoc);
    } catch (err) { console.error('Failed to refresh document detail:', err); }
  }, [viewingDoc, fetchDocument]);

  // Alert counts
  const expiryAlertCount = (stats?.expiry_alerts?.length ?? 0) + (stats?.review_alerts?.length ?? 0);

  return (
    <div className="dc-page">
      {/* Header */}
      <div className="dc-page-header">
        <div>
          <h1 className="dc-page-title">Document Control</h1>
          <p className="dc-page-subtitle">Document register, revision control, review & approval workflows</p>
        </div>
        <div className="dc-page-actions">
          <form onSubmit={handleSearch} className="dc-search-form">
            <div className="dc-search-wrap">
              <Search size={15} className="dc-search-icon" />
              <input
                type="text"
                placeholder="Search documents..."
                value={searchInput}
                onChange={e => setSearchInput(e.target.value)}
                className="dc-search-input"
              />
            </div>
          </form>
          <button className="dc-btn dc-btn-ghost" onClick={handleRefresh} title="Refresh">
            <RefreshCw size={16} className={loading ? 'dc-spin' : ''} />
          </button>
          <ExportDropdown onExport={(fmt: ExportFormat) => exportDocuments(fmt)} />
          <button className="dc-btn dc-btn-primary" onClick={handleAddNew}>
            <Plus size={16} /> New Document
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="dc-tabs">
        <button
          className={`dc-tab ${activeTab === 'list' ? 'dc-tab-active' : ''}`}
          onClick={() => setActiveTab('list')}
        >
          Document Register
        </button>
        <button
          className={`dc-tab ${activeTab === 'alerts' ? 'dc-tab-active' : ''}`}
          onClick={() => setActiveTab('alerts')}
        >
          <AlertTriangle size={14} />
          Expiry & Review Alerts
          {expiryAlertCount > 0 && (
            <span className={`dc-tab-badge ${(stats?.kpis.expired ?? 0) > 0 ? 'dc-tab-badge-danger' : 'dc-tab-badge-warning'}`}>
              {expiryAlertCount}
            </span>
          )}
        </button>
        <button
          className={`dc-tab ${activeTab === 'analytics' ? 'dc-tab-active' : ''}`}
          onClick={() => setActiveTab('analytics')}
        >
          <BarChart3 size={14} />
          Analytics
        </button>
      </div>

      {/* Error */}
      {error && (
        <div className="dc-error">
          <AlertTriangle size={16} /> {error}
          <button onClick={handleRefresh} className="dc-error-retry">Retry</button>
        </div>
      )}

      {/* ── Tab: Document Register ───────────────────── */}
      {activeTab === 'list' && (
        <>
          <DocumentKPICards stats={stats} loading={statsLoading} onFilterClick={handleKPIFilterClick} />
          <DocumentFilters filters={filters} onChange={(f: DcFilters) => setFilters(f)} onReset={handleFilterReset} />
          <DocumentTable
            documents={documents}
            loading={loading}
            filters={filters}
            onSort={handleSort}
            onView={handleView}
            onEdit={handleEdit}
            onDelete={handleDelete}
            pagination={pagination}
            onPageChange={handlePageChange}
          />
        </>
      )}

      {/* ── Tab: Alerts ──────────────────────────────── */}
      {activeTab === 'alerts' && stats && (
        <div className="dc-alerts-container">
          {/* Expired Documents */}
          {stats.expiry_alerts.filter(a => a.is_expired).length > 0 && (
            <div className="dc-alert-section">
              <h3 className="dc-alert-header dc-alert-header-danger">Expired Documents</h3>
              <div className="dc-alert-list">
                {stats.expiry_alerts.filter(a => a.is_expired).map(alert => (
                  <div key={alert.id} className="dc-alert-item dc-alert-item-danger">
                    <div className="dc-alert-content">
                      <strong>{alert.document_code}</strong>
                      <span className="dc-alert-doc">{alert.document_title}</span>
                      <span className="dc-alert-type">{alert.document_type}</span>
                    </div>
                    <span className="dc-alert-days">Expired {Math.abs(alert.days_to_expiry)} days ago</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Expiring Soon */}
          {stats.expiry_alerts.filter(a => !a.is_expired).length > 0 && (
            <div className="dc-alert-section">
              <h3 className="dc-alert-header dc-alert-header-warning">Expiring Soon</h3>
              <div className="dc-alert-list">
                {stats.expiry_alerts.filter(a => !a.is_expired).map(alert => (
                  <div key={alert.id} className="dc-alert-item dc-alert-item-warning">
                    <div className="dc-alert-content">
                      <strong>{alert.document_code}</strong>
                      <span className="dc-alert-doc">{alert.document_title}</span>
                      <span className="dc-alert-type">{alert.document_type}</span>
                    </div>
                    <span className="dc-alert-days">{alert.days_to_expiry} days left</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Overdue Reviews */}
          {stats.review_alerts.length > 0 && (
            <div className="dc-alert-section">
              <h3 className="dc-alert-header dc-alert-header-danger">Overdue Reviews</h3>
              <div className="dc-alert-list">
                {stats.review_alerts.map(alert => (
                  <div key={alert.id} className="dc-alert-item dc-alert-item-danger">
                    <div className="dc-alert-content">
                      <strong>{alert.document_code}</strong>
                      <span className="dc-alert-doc">{alert.document_title}</span>
                    </div>
                    <span className="dc-alert-days">{alert.days_overdue} days overdue</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Pending Workflow */}
          {stats.pending_workflow.length > 0 && (
            <div className="dc-alert-section">
              <h3 className="dc-alert-header dc-alert-header-info">Pending Workflow</h3>
              <div className="dc-alert-list">
                {stats.pending_workflow.map(item => (
                  <div key={item.id} className="dc-alert-item dc-alert-item-info">
                    <div className="dc-alert-content">
                      <strong>{item.document_code}</strong>
                      <span className="dc-alert-doc">{item.document_title}</span>
                      <span className="dc-alert-type">{item.status}</span>
                    </div>
                    <div className="dc-alert-workflow-counts">
                      {item.pending_reviews_count > 0 && <span className="dc-alert-badge-review">{item.pending_reviews_count} review(s)</span>}
                      {item.pending_approvals_count > 0 && <span className="dc-alert-badge-approval">{item.pending_approvals_count} approval(s)</span>}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {stats.expiry_alerts.length === 0 && stats.review_alerts.length === 0 && stats.pending_workflow.length === 0 && (
            <div className="dc-empty">No alerts at this time. All documents are in good standing.</div>
          )}
        </div>
      )}

      {/* ── Tab: Analytics ───────────────────────────── */}
      {activeTab === 'analytics' && stats && (
        <div className="dc-analytics-container">
          {/* Summary Strip */}
          <div className="dc-analytics-strip">
            {(stats.kpis.expired ?? 0) > 0 && (
              <div className="dc-analytics-alert dc-analytics-alert-danger">
                {stats.kpis.expired} expired document(s)
              </div>
            )}
            {(stats.kpis.overdue_review ?? 0) > 0 && (
              <div className="dc-analytics-alert dc-analytics-alert-danger">
                {stats.kpis.overdue_review} overdue review(s)
              </div>
            )}
            {(stats.kpis.expiring_soon ?? 0) > 0 && (
              <div className="dc-analytics-alert dc-analytics-alert-warning">
                {stats.kpis.expiring_soon} expiring soon
              </div>
            )}
            {(stats.kpis.pending_approvals ?? 0) > 0 && (
              <div className="dc-analytics-alert dc-analytics-alert-info">
                {stats.kpis.pending_approvals} pending approval(s)
              </div>
            )}
          </div>

          <div className="dc-analytics-grid">
            {/* Status Distribution */}
            <div className="dc-analytics-card">
              <h4 className="dc-analytics-card-title">Status Distribution</h4>
              <div className="dc-chart-bars">
                {stats.by_status.map(item => (
                  <div key={item.status} className="dc-chart-bar-row">
                    <span className="dc-chart-label">{item.status}</span>
                    <div className="dc-chart-bar-track">
                      <div
                        className="dc-chart-bar-fill"
                        style={{ width: `${Math.max(5, (item.count / Math.max(1, stats.kpis.total_documents)) * 100)}%` }}
                      />
                    </div>
                    <span className="dc-chart-value">{item.count}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* By Document Type */}
            <div className="dc-analytics-card">
              <h4 className="dc-analytics-card-title">By Document Type</h4>
              <div className="dc-chart-bars">
                {stats.by_type.map(item => (
                  <div key={item.document_type} className="dc-chart-bar-row">
                    <span className="dc-chart-label">{item.document_type}</span>
                    <div className="dc-chart-bar-track">
                      <div
                        className="dc-chart-bar-fill dc-chart-bar-type"
                        style={{ width: `${Math.max(5, (item.count / Math.max(1, stats.by_type[0]?.count ?? 1)) * 100)}%` }}
                      />
                    </div>
                    <span className="dc-chart-value">{item.count}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* By Category */}
            <div className="dc-analytics-card">
              <h4 className="dc-analytics-card-title">By Category</h4>
              <div className="dc-chart-bars">
                {stats.by_category.map(item => (
                  <div key={item.document_category} className="dc-chart-bar-row">
                    <span className="dc-chart-label">{item.document_category}</span>
                    <div className="dc-chart-bar-track">
                      <div
                        className="dc-chart-bar-fill dc-chart-bar-category"
                        style={{ width: `${Math.max(5, (item.count / Math.max(1, stats.by_category[0]?.count ?? 1)) * 100)}%` }}
                      />
                    </div>
                    <span className="dc-chart-value">{item.count}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* By Department */}
            <div className="dc-analytics-card">
              <h4 className="dc-analytics-card-title">By Department</h4>
              <div className="dc-chart-bars">
                {stats.by_department.map(item => (
                  <div key={item.department} className="dc-chart-bar-row">
                    <span className="dc-chart-label">{item.department || 'Unassigned'}</span>
                    <div className="dc-chart-bar-track">
                      <div
                        className="dc-chart-bar-fill dc-chart-bar-dept"
                        style={{ width: `${Math.max(5, (item.count / Math.max(1, stats.by_department[0]?.count ?? 1)) * 100)}%` }}
                      />
                    </div>
                    <span className="dc-chart-value">{item.count}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Monthly Trend */}
            <div className="dc-analytics-card dc-analytics-card-wide">
              <h4 className="dc-analytics-card-title">Monthly Trend (12 months)</h4>
              <div className="dc-chart-bars">
                {stats.monthly_trend.map(item => (
                  <div key={item.month} className="dc-chart-bar-row">
                    <span className="dc-chart-label">{item.month}</span>
                    <div className="dc-chart-bar-track">
                      <div
                        className="dc-chart-bar-fill dc-chart-bar-trend"
                        style={{ width: `${Math.max(5, (item.documents_created / Math.max(1, Math.max(...stats.monthly_trend.map(m => m.documents_created)))) * 100)}%` }}
                      />
                    </div>
                    <span className="dc-chart-value">{item.documents_created} created / {item.documents_activated} activated</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Form Drawer */}
      {showForm && (
        <DocumentForm
          open={showForm}
          onClose={() => { setShowForm(false); setEditingDoc(null); }}
          editDoc={editingDoc}
          onSubmit={handleFormSubmit}
          onUpdate={handleFormUpdate}
        />
      )}

      {/* Detail View */}
      {viewingDoc && (
        <DocumentDetail
          document={viewingDoc}
          onClose={() => setViewingDoc(null)}
          onEdit={handleEdit}
          actions={{
            changeStatus,
            createRevision,
            uploadRevisionFile,
            activateRevision,
            submitForReview,
            submitReview,
            submitForApproval,
            submitApproval,
            addLink,
            removeLink,
          }}
        />
      )}
    </div>
  );
}
