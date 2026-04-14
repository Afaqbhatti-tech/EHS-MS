import React, { useState } from 'react';
import DocumentStatusBadge from './DocumentStatusBadge';
import RevisionBadge from './RevisionBadge';
import ConfidentialityBadge from './ConfidentialityBadge';
import DocumentExpiryBadge from './DocumentExpiryBadge';
import ReviewStatusBadge from './ReviewStatusBadge';
import ApprovalStatusBadge from './ApprovalStatusBadge';
import type { DcDocument, DcRevision, DcReview, DcApproval } from '../hooks/useDocuments';

interface Actions {
  changeStatus: (id: number, status: string, reason: string) => Promise<void>;
  createRevision: (docId: number, formData: FormData) => Promise<any>;
  uploadRevisionFile: (docId: number, revId: number, formData: FormData) => Promise<void>;
  activateRevision: (docId: number, revId: number) => Promise<void>;
  submitForReview: (docId: number, revId: number, reviewers: Record<string, unknown>[]) => Promise<void>;
  submitReview: (docId: number, revId: number, reviewId: number, data: Record<string, unknown>) => Promise<void>;
  submitForApproval: (docId: number, revId: number, approvers: Record<string, unknown>[]) => Promise<void>;
  submitApproval: (docId: number, revId: number, approvalId: number, data: Record<string, unknown>) => Promise<void>;
  addLink: (docId: number, data: Record<string, unknown>) => Promise<void>;
  removeLink: (docId: number, linkId: number) => Promise<void>;
}

interface Props {
  document: DcDocument | null;
  onClose: () => void;
  onEdit: (doc: DcDocument) => void;
  actions: Actions;
}

type Tab = 'overview' | 'revisions' | 'review' | 'links' | 'history';

export default function DocumentDetail({ document: doc, onClose, onEdit, actions }: Props) {
  const [tab, setTab] = useState<Tab>('overview');
  const [showRevisionForm, setShowRevisionForm] = useState(false);
  const [showReviewerForm, setShowReviewerForm] = useState(false);
  const [showApproverForm, setShowApproverForm] = useState(false);
  const [showReviewModal, setShowReviewModal] = useState<DcReview | null>(null);
  const [showApprovalModal, setShowApprovalModal] = useState<DcApproval | null>(null);
  const [showStatusModal, setShowStatusModal] = useState(false);
  const [showLinkForm, setShowLinkForm] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);

  // Sub-form states
  const [revForm, setRevForm] = useState({ revision_number: '', reason_for_revision: '', change_summary: '', issue_date: '', effective_date: '', next_review_date: '', expiry_date: '' });
  const [revFile, setRevFile] = useState<File | null>(null);
  const [reviewers, setReviewers] = useState([{ name: '', role: '', review_party: '', due_date: '' }]);
  const [approvers, setApprovers] = useState([{ name: '', role: '', approval_party: '', due_date: '' }]);
  const [reviewForm, setReviewForm] = useState({ review_status: '', review_comments: '' });
  const [approvalForm, setApprovalForm] = useState({ approval_status: '', approval_comments: '' });
  const [statusForm, setStatusForm] = useState({ status: 'Obsolete', reason: '' });
  const [linkForm, setLinkForm] = useState({ linked_module: '', linked_id: '', linked_code: '', linked_title: '', link_notes: '' });

  if (!doc) return null;

  const activeRev = doc.revisions?.find(r => r.is_active) || doc.active_revision;
  const latestRev = doc.revisions?.[0];
  const workingRev = latestRev && !latestRev.is_active ? latestRev : activeRev;

  const handleActivate = async (revId: number) => {
    setActionLoading(true);
    try { await actions.activateRevision(doc.id, revId); } finally { setActionLoading(false); }
  };

  const handleCreateRevision = async () => {
    if (!revForm.revision_number || !revForm.reason_for_revision) return;
    setActionLoading(true);
    try {
      const fd = new FormData();
      Object.entries(revForm).forEach(([k, v]) => { if (v) fd.append(k, v); });
      if (revFile) fd.append('document_file', revFile);
      await actions.createRevision(doc.id, fd);
      setShowRevisionForm(false);
      setRevForm({ revision_number: '', reason_for_revision: '', change_summary: '', issue_date: '', effective_date: '', next_review_date: '', expiry_date: '' });
      setRevFile(null);
    } finally { setActionLoading(false); }
  };

  const handleSubmitForReview = async () => {
    const valid = reviewers.filter(r => r.name.trim());
    if (!valid.length || !workingRev) return;
    setActionLoading(true);
    try {
      await actions.submitForReview(doc.id, workingRev.id, valid);
      setShowReviewerForm(false);
      setReviewers([{ name: '', role: '', review_party: '', due_date: '' }]);
    } finally { setActionLoading(false); }
  };

  const handleSubmitReview = async () => {
    if (!showReviewModal || !reviewForm.review_status || !workingRev) return;
    setActionLoading(true);
    try {
      await actions.submitReview(doc.id, workingRev.id, showReviewModal.id, reviewForm);
      setShowReviewModal(null);
      setReviewForm({ review_status: '', review_comments: '' });
    } finally { setActionLoading(false); }
  };

  const handleSubmitForApproval = async () => {
    const valid = approvers.filter(a => a.name.trim());
    if (!valid.length || !workingRev) return;
    setActionLoading(true);
    try {
      await actions.submitForApproval(doc.id, workingRev.id, valid);
      setShowApproverForm(false);
      setApprovers([{ name: '', role: '', approval_party: '', due_date: '' }]);
    } finally { setActionLoading(false); }
  };

  const handleSubmitApproval = async () => {
    if (!showApprovalModal || !approvalForm.approval_status || !workingRev) return;
    setActionLoading(true);
    try {
      await actions.submitApproval(doc.id, workingRev.id, showApprovalModal.id, approvalForm);
      setShowApprovalModal(null);
      setApprovalForm({ approval_status: '', approval_comments: '' });
    } finally { setActionLoading(false); }
  };

  const handleChangeStatus = async () => {
    if (!statusForm.reason) return;
    setActionLoading(true);
    try {
      await actions.changeStatus(doc.id, statusForm.status, statusForm.reason);
      setShowStatusModal(false);
    } finally { setActionLoading(false); }
  };

  const handleAddLink = async () => {
    if (!linkForm.linked_module || !linkForm.linked_id) return;
    setActionLoading(true);
    try {
      await actions.addLink(doc.id, linkForm);
      setShowLinkForm(false);
      setLinkForm({ linked_module: '', linked_id: '', linked_code: '', linked_title: '', link_notes: '' });
    } finally { setActionLoading(false); }
  };

  const handleFileUpload = async (revId: number, file: File) => {
    const fd = new FormData();
    fd.append('document_file', file);
    setActionLoading(true);
    try { await actions.uploadRevisionFile(doc.id, revId, fd); } finally { setActionLoading(false); }
  };

  const storageUrl = import.meta.env.VITE_API_URL?.replace('/api', '') || 'http://localhost:8000';

  const tabs: { id: Tab; label: string; count?: number }[] = [
    { id: 'overview', label: 'Overview' },
    { id: 'revisions', label: `Revisions (${doc.revisions?.length || 0})` },
    { id: 'review', label: 'Review & Approval' },
    { id: 'links', label: `Links (${doc.links?.length || 0})` },
    { id: 'history', label: 'History' },
  ];

  return (
    <div className="dc-detail-overlay">
      <div className="dc-detail">
        {/* Header */}
        <div className="dc-detail-header">
          <button className="dc-detail-back" onClick={onClose}>← Back</button>
          <div className="dc-detail-title-row">
            <span className="dc-code-badge">{doc.document_code}</span>
            <DocumentStatusBadge status={doc.status} />
          </div>
          <h2 className="dc-detail-title">{doc.document_title}</h2>
          <div className="dc-detail-meta">
            <span className="dc-meta-badge">{doc.document_type}</span>
            {doc.document_category && <span className="dc-meta-text">{doc.document_category}</span>}
            <RevisionBadge revision={doc.current_revision_number || 'Rev 00'} isActive={doc.status === 'Active'} />
            {doc.owner && <span className="dc-meta-text">Owner: {doc.owner}</span>}
            {doc.department && <span className="dc-meta-text">{doc.department}</span>}
            <ConfidentialityBadge level={doc.confidentiality_level} />
          </div>

          {/* Expiry alerts */}
          {(doc.is_expired || doc.is_expiring_soon || doc.is_overdue_review) && (
            <div className={`dc-alert-strip ${doc.is_expired ? 'dc-alert-danger' : 'dc-alert-warning'}`}>
              {doc.is_expired && <span>⛔ Document has EXPIRED</span>}
              {doc.is_expiring_soon && !doc.is_expired && <span>⏰ Expiring soon</span>}
              {doc.is_overdue_review && <span>⚠ Review is overdue</span>}
            </div>
          )}

          {/* Action buttons */}
          <div className="dc-detail-actions">
            {doc.status === 'Draft' && workingRev && (
              <button className="dc-btn dc-btn-primary" onClick={() => setShowReviewerForm(true)}>Submit for Review</button>
            )}
            {doc.status === 'Draft' && (
              <button className="dc-btn dc-btn-secondary" onClick={() => setShowRevisionForm(true)}>New Revision</button>
            )}
            {doc.status === 'Under Review' && workingRev && (() => {
              const pendingReviews = workingRev.reviews?.filter(r => r.review_status === 'Pending').length || 0;
              return pendingReviews === 0 ? (
                <button className="dc-btn dc-btn-primary" onClick={() => setShowApproverForm(true)}>Submit for Approval</button>
              ) : null;
            })()}
            {['Approved', 'Approved with Comments'].includes(doc.status) && workingRev && (
              <button className="dc-btn dc-btn-success" onClick={() => handleActivate(workingRev.id)}>Activate Revision</button>
            )}
            {doc.status === 'Active' && (
              <>
                <button className="dc-btn dc-btn-secondary" onClick={() => setShowRevisionForm(true)}>New Revision</button>
                <button className="dc-btn dc-btn-danger-outline" onClick={() => setShowStatusModal(true)}>Obsolete / Archive</button>
              </>
            )}
            {!['Obsolete', 'Archived'].includes(doc.status) && (
              <button className="dc-btn dc-btn-secondary" onClick={() => onEdit(doc)}>Edit</button>
            )}
            {activeRev?.file_path && (
              <a href={`${storageUrl}/storage/${activeRev.file_path}`} target="_blank" rel="noreferrer" className="dc-btn dc-btn-secondary">Download</a>
            )}
          </div>
        </div>

        {/* Tabs */}
        <div className="dc-tabs">
          {tabs.map(t => (
            <button key={t.id} className={`dc-tab ${tab === t.id ? 'dc-tab-active' : ''}`} onClick={() => setTab(t.id)}>{t.label}</button>
          ))}
        </div>

        {/* Tab Content */}
        <div className="dc-tab-content">
          {tab === 'overview' && (
            <div className="dc-overview">
              <div className="dc-overview-main">
                <div className="dc-card">
                  <h3>Document Info</h3>
                  <div className="dc-info-grid">
                    <div><span className="dc-label">Type</span><span>{doc.document_type}</span></div>
                    <div><span className="dc-label">Category</span><span>{doc.document_category || '—'}</span></div>
                    <div><span className="dc-label">Number</span><span>{doc.document_number || '—'}</span></div>
                    <div><span className="dc-label">Language</span><span>{doc.language}</span></div>
                    <div><span className="dc-label">Priority</span><span>{doc.priority}</span></div>
                  </div>
                  {doc.description && <p className="dc-desc">{doc.description}</p>}
                </div>
                <div className="dc-card">
                  <h3>Ownership</h3>
                  <div className="dc-info-grid">
                    <div><span className="dc-label">Owner</span><span>{doc.owner || '—'}</span></div>
                    <div><span className="dc-label">Prepared By</span><span>{doc.prepared_by || '—'}</span></div>
                    <div><span className="dc-label">Responsible</span><span>{doc.responsible_person || '—'}</span></div>
                    <div><span className="dc-label">Department</span><span>{doc.department || '—'}</span></div>
                    <div><span className="dc-label">Site</span><span>{doc.site || '—'}</span></div>
                    <div><span className="dc-label">Area</span><span>{doc.area || '—'}</span></div>
                    <div><span className="dc-label">Zone</span><span>{doc.zone || '—'}</span></div>
                    <div><span className="dc-label">Contractor</span><span>{doc.contractor_name || '—'}</span></div>
                  </div>
                </div>
                {activeRev && (
                  <div className="dc-card">
                    <h3>Active Revision</h3>
                    <div className="dc-info-grid">
                      <div><span className="dc-label">Rev</span><span>{activeRev.revision_number}</span></div>
                      <div><span className="dc-label">Issue Date</span><span>{activeRev.issue_date || '—'}</span></div>
                      <div><span className="dc-label">Effective</span><span>{activeRev.effective_date || '—'}</span></div>
                      <div><span className="dc-label">Review Date</span><span>{activeRev.next_review_date || '—'}</span></div>
                      <div><span className="dc-label">Expiry</span><span>{activeRev.expiry_date || '—'}</span></div>
                    </div>
                    {activeRev.file_path && (
                      <div className="dc-file-info">
                        <span>{activeRev.original_name}</span>
                        {activeRev.file_size_kb && <span className="dc-file-size">{(activeRev.file_size_kb / 1024).toFixed(1)} MB</span>}
                        <a href={`${storageUrl}/storage/${activeRev.file_path}`} target="_blank" rel="noreferrer" className="dc-btn dc-btn-sm dc-btn-primary">Download</a>
                      </div>
                    )}
                  </div>
                )}
              </div>
              <div className="dc-overview-side">
                <div className="dc-card">
                  <h4>Quick Metrics</h4>
                  <div className="dc-metrics">
                    <div><span>{doc.revisions?.length || 0}</span><span>Revisions</span></div>
                    <div><span>{doc.links?.length || 0}</span><span>Links</span></div>
                  </div>
                </div>
                {doc.tags && doc.tags.length > 0 && (
                  <div className="dc-card">
                    <h4>Tags</h4>
                    <div className="dc-tags">{doc.tags.map((t, i) => <span key={i} className="dc-tag">{t}</span>)}</div>
                  </div>
                )}
              </div>
            </div>
          )}

          {tab === 'revisions' && (
            <div className="dc-revisions-tab">
              <div className="dc-rev-timeline">
                {(doc.revisions || []).map(rev => (
                  <div key={rev.id} className={`dc-rev-item ${rev.is_active ? 'dc-rev-active' : ''}`}>
                    <div className="dc-rev-header">
                      <RevisionBadge revision={rev.revision_number} isActive={rev.is_active} isSuperseded={rev.status === 'Superseded'} />
                      <DocumentStatusBadge status={rev.status} />
                      <span className="dc-rev-date">{new Date(rev.created_at).toLocaleDateString()}</span>
                    </div>
                    {rev.change_summary && <p className="dc-rev-summary">{rev.change_summary}</p>}
                    {rev.reason_for_revision && <p className="dc-rev-reason"><strong>Reason:</strong> {rev.reason_for_revision}</p>}
                    <div className="dc-rev-actions">
                      {rev.file_path ? (
                        <a href={`${storageUrl}/storage/${rev.file_path}`} target="_blank" rel="noreferrer" className="dc-btn dc-btn-sm dc-btn-secondary">
                          Download ({rev.original_name})
                        </a>
                      ) : (
                        ['Draft', 'Rejected'].includes(rev.status) && (
                          <label className="dc-btn dc-btn-sm dc-btn-secondary" style={{ cursor: 'pointer' }}>
                            Upload File
                            <input type="file" style={{ display: 'none' }} onChange={e => { if (e.target.files?.[0]) handleFileUpload(rev.id, e.target.files[0]); }} />
                          </label>
                        )
                      )}
                      {['Approved', 'Approved with Comments'].includes(rev.status) && !rev.is_active && (
                        <button className="dc-btn dc-btn-sm dc-btn-success" onClick={() => handleActivate(rev.id)} disabled={actionLoading}>Activate</button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
              <button className="dc-btn dc-btn-secondary" onClick={() => setShowRevisionForm(true)} style={{ marginTop: 16 }}>+ New Revision</button>
            </div>
          )}

          {tab === 'review' && (
            <div className="dc-review-tab">
              {workingRev && (
                <>
                  <h3>Reviews — {workingRev.revision_number}</h3>
                  {workingRev.reviews && workingRev.reviews.length > 0 ? (
                    <table className="dc-table dc-mini-table">
                      <thead><tr><th>Reviewer</th><th>Role</th><th>Party</th><th>Status</th><th>Comments</th><th>Date</th><th>Action</th></tr></thead>
                      <tbody>
                        {workingRev.reviews.map(r => (
                          <tr key={r.id}>
                            <td>{r.reviewer_name}</td>
                            <td>{r.reviewer_role || '—'}</td>
                            <td>{r.review_party || '—'}</td>
                            <td><ReviewStatusBadge status={r.review_status} /></td>
                            <td className="dc-text-sm">{r.review_comments || '—'}</td>
                            <td className="dc-text-sm">{r.reviewed_at ? new Date(r.reviewed_at).toLocaleDateString() : '—'}</td>
                            <td>
                              {r.review_status === 'Pending' && (
                                <button className="dc-btn dc-btn-sm dc-btn-primary" onClick={() => { setShowReviewModal(r); setReviewForm({ review_status: '', review_comments: '' }); }}>Submit Review</button>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  ) : <p className="dc-empty-msg">No reviews yet. Submit for review to add reviewers.</p>}

                  <h3 style={{ marginTop: 24 }}>Approvals — {workingRev.revision_number}</h3>
                  {workingRev.approvals && workingRev.approvals.length > 0 ? (
                    <table className="dc-table dc-mini-table">
                      <thead><tr><th>Approver</th><th>Role</th><th>Party</th><th>Status</th><th>Comments</th><th>Date</th><th>Action</th></tr></thead>
                      <tbody>
                        {workingRev.approvals.map(a => (
                          <tr key={a.id}>
                            <td>{a.approver_name}</td>
                            <td>{a.approver_role || '—'}</td>
                            <td>{a.approval_party || '—'}</td>
                            <td><ApprovalStatusBadge status={a.approval_status} /></td>
                            <td className="dc-text-sm">{a.approval_comments || '—'}</td>
                            <td className="dc-text-sm">{a.approved_at ? new Date(a.approved_at).toLocaleDateString() : '—'}</td>
                            <td>
                              {a.approval_status === 'Pending' && (
                                <button className="dc-btn dc-btn-sm dc-btn-primary" onClick={() => { setShowApprovalModal(a); setApprovalForm({ approval_status: '', approval_comments: '' }); }}>Submit Approval</button>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  ) : <p className="dc-empty-msg">No approvals yet. Submit for approval after all reviews are complete.</p>}
                </>
              )}
            </div>
          )}

          {tab === 'links' && (
            <div className="dc-links-tab">
              <button className="dc-btn dc-btn-secondary" onClick={() => setShowLinkForm(true)} style={{ marginBottom: 12 }}>+ Add Link</button>
              {doc.links && doc.links.length > 0 ? (
                <table className="dc-table dc-mini-table">
                  <thead><tr><th>Module</th><th>Code</th><th>Title</th><th>Notes</th><th>Date</th><th></th></tr></thead>
                  <tbody>
                    {doc.links.map(l => (
                      <tr key={l.id}>
                        <td className="dc-text-capitalize">{l.linked_module}</td>
                        <td>{l.linked_code || '—'}</td>
                        <td>{l.linked_title || '—'}</td>
                        <td className="dc-text-sm">{l.link_notes || '—'}</td>
                        <td className="dc-text-sm">{new Date(l.created_at).toLocaleDateString()}</td>
                        <td><button className="dc-btn dc-btn-sm dc-btn-delete" onClick={() => actions.removeLink(doc.id, l.id)}>Remove</button></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : <p className="dc-empty-msg">No linked records yet.</p>}
            </div>
          )}

          {tab === 'history' && (
            <div className="dc-history-tab">
              {doc.logs && doc.logs.length > 0 ? (
                <div className="dc-log-list">
                  {doc.logs.map(log => (
                    <div key={log.id} className="dc-log-item">
                      <div className="dc-log-dot" />
                      <div className="dc-log-content">
                        <div className="dc-log-action">{log.action}</div>
                        {log.from_status && log.to_status && (
                          <div className="dc-log-status">{log.from_status} → {log.to_status}</div>
                        )}
                        {log.description && <div className="dc-log-desc">{log.description}</div>}
                        <div className="dc-log-meta">
                          <span>{log.performed_by_name || 'System'}</span>
                          <span>{new Date(log.created_at).toLocaleString()}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : <p className="dc-empty-msg">No history yet.</p>}
            </div>
          )}
        </div>

        {/* ── Modals ── */}

        {/* New Revision Modal */}
        {showRevisionForm && (
          <div className="dc-modal-overlay" onClick={() => setShowRevisionForm(false)}>
            <div className="dc-modal" onClick={e => e.stopPropagation()}>
              <h3>New Revision</h3>
              <div className="dc-form-fields">
                <div className="dc-field-row">
                  <div className="dc-field"><label>Revision Number *</label><input value={revForm.revision_number} onChange={e => setRevForm(p => ({ ...p, revision_number: e.target.value }))} placeholder="Rev 01" /></div>
                  <div className="dc-field"><label>Issue Date</label><input type="date" value={revForm.issue_date} onChange={e => setRevForm(p => ({ ...p, issue_date: e.target.value }))} /></div>
                </div>
                <div className="dc-field-full"><label>Reason for Revision *</label><textarea value={revForm.reason_for_revision} onChange={e => setRevForm(p => ({ ...p, reason_for_revision: e.target.value }))} rows={2} /></div>
                <div className="dc-field-full"><label>Change Summary</label><textarea value={revForm.change_summary} onChange={e => setRevForm(p => ({ ...p, change_summary: e.target.value }))} rows={2} /></div>
                <div className="dc-field-row">
                  <div className="dc-field"><label>Next Review Date</label><input type="date" value={revForm.next_review_date} onChange={e => setRevForm(p => ({ ...p, next_review_date: e.target.value }))} /></div>
                  <div className="dc-field"><label>Expiry Date</label><input type="date" value={revForm.expiry_date} onChange={e => setRevForm(p => ({ ...p, expiry_date: e.target.value }))} /></div>
                </div>
                <div className="dc-field-full">
                  <label>Document File</label>
                  <input type="file" onChange={e => setRevFile(e.target.files?.[0] || null)} accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.jpg,.jpeg,.png" />
                </div>
              </div>
              <div className="dc-modal-footer">
                <button className="dc-btn dc-btn-secondary" onClick={() => setShowRevisionForm(false)}>Cancel</button>
                <button className="dc-btn dc-btn-primary" onClick={handleCreateRevision} disabled={actionLoading}>{actionLoading ? 'Creating...' : 'Create Revision'}</button>
              </div>
            </div>
          </div>
        )}

        {/* Reviewer Form Modal */}
        {showReviewerForm && (
          <div className="dc-modal-overlay" onClick={() => setShowReviewerForm(false)}>
            <div className="dc-modal" onClick={e => e.stopPropagation()}>
              <h3>Add Reviewers</h3>
              {reviewers.map((r, i) => (
                <div key={i} className="dc-field-row" style={{ marginBottom: 8 }}>
                  <div className="dc-field"><input placeholder="Name *" value={r.name} onChange={e => { const n = [...reviewers]; n[i].name = e.target.value; setReviewers(n); }} /></div>
                  <div className="dc-field"><input placeholder="Role" value={r.role} onChange={e => { const n = [...reviewers]; n[i].role = e.target.value; setReviewers(n); }} /></div>
                  <div className="dc-field"><input placeholder="Party (FFT/Lucid)" value={r.review_party} onChange={e => { const n = [...reviewers]; n[i].review_party = e.target.value; setReviewers(n); }} /></div>
                  <div className="dc-field"><input type="date" value={r.due_date} onChange={e => { const n = [...reviewers]; n[i].due_date = e.target.value; setReviewers(n); }} /></div>
                </div>
              ))}
              <button className="dc-btn dc-btn-sm dc-btn-secondary" onClick={() => setReviewers(p => [...p, { name: '', role: '', review_party: '', due_date: '' }])}>+ Add Another</button>
              <div className="dc-modal-footer">
                <button className="dc-btn dc-btn-secondary" onClick={() => setShowReviewerForm(false)}>Cancel</button>
                <button className="dc-btn dc-btn-primary" onClick={handleSubmitForReview} disabled={actionLoading}>{actionLoading ? 'Submitting...' : 'Submit for Review'}</button>
              </div>
            </div>
          </div>
        )}

        {/* Approver Form Modal */}
        {showApproverForm && (
          <div className="dc-modal-overlay" onClick={() => setShowApproverForm(false)}>
            <div className="dc-modal" onClick={e => e.stopPropagation()}>
              <h3>Add Approvers</h3>
              {approvers.map((a, i) => (
                <div key={i} className="dc-field-row" style={{ marginBottom: 8 }}>
                  <div className="dc-field"><input placeholder="Name *" value={a.name} onChange={e => { const n = [...approvers]; n[i].name = e.target.value; setApprovers(n); }} /></div>
                  <div className="dc-field"><input placeholder="Role" value={a.role} onChange={e => { const n = [...approvers]; n[i].role = e.target.value; setApprovers(n); }} /></div>
                  <div className="dc-field"><input placeholder="Party (FFT/Lucid/Client)" value={a.approval_party} onChange={e => { const n = [...approvers]; n[i].approval_party = e.target.value; setApprovers(n); }} /></div>
                  <div className="dc-field"><input type="date" value={a.due_date} onChange={e => { const n = [...approvers]; n[i].due_date = e.target.value; setApprovers(n); }} /></div>
                </div>
              ))}
              <button className="dc-btn dc-btn-sm dc-btn-secondary" onClick={() => setApprovers(p => [...p, { name: '', role: '', approval_party: '', due_date: '' }])}>+ Add Another</button>
              <div className="dc-modal-footer">
                <button className="dc-btn dc-btn-secondary" onClick={() => setShowApproverForm(false)}>Cancel</button>
                <button className="dc-btn dc-btn-primary" onClick={handleSubmitForApproval} disabled={actionLoading}>{actionLoading ? 'Submitting...' : 'Submit for Approval'}</button>
              </div>
            </div>
          </div>
        )}

        {/* Submit Review Modal */}
        {showReviewModal && (
          <div className="dc-modal-overlay" onClick={() => setShowReviewModal(null)}>
            <div className="dc-modal dc-modal-sm" onClick={e => e.stopPropagation()}>
              <h3>Submit Review</h3>
              <p>Reviewing as: <strong>{showReviewModal.reviewer_name}</strong></p>
              <div className="dc-field-full">
                <label>Decision *</label>
                <select value={reviewForm.review_status} onChange={e => setReviewForm(p => ({ ...p, review_status: e.target.value }))}>
                  <option value="">Select</option>
                  <option value="Approved">Approved</option>
                  <option value="Approved with Comments">Approved with Comments</option>
                  <option value="Rejected">Rejected</option>
                </select>
              </div>
              <div className="dc-field-full">
                <label>Comments</label>
                <textarea value={reviewForm.review_comments} onChange={e => setReviewForm(p => ({ ...p, review_comments: e.target.value }))} rows={3} />
              </div>
              <div className="dc-modal-footer">
                <button className="dc-btn dc-btn-secondary" onClick={() => setShowReviewModal(null)}>Cancel</button>
                <button className="dc-btn dc-btn-primary" onClick={handleSubmitReview} disabled={actionLoading}>{actionLoading ? 'Submitting...' : 'Submit'}</button>
              </div>
            </div>
          </div>
        )}

        {/* Submit Approval Modal */}
        {showApprovalModal && (
          <div className="dc-modal-overlay" onClick={() => setShowApprovalModal(null)}>
            <div className="dc-modal dc-modal-sm" onClick={e => e.stopPropagation()}>
              <h3>Submit Approval</h3>
              <p>Approving as: <strong>{showApprovalModal.approver_name}</strong></p>
              <div className="dc-field-full">
                <label>Decision *</label>
                <select value={approvalForm.approval_status} onChange={e => setApprovalForm(p => ({ ...p, approval_status: e.target.value }))}>
                  <option value="">Select</option>
                  <option value="Approved">Approved</option>
                  <option value="Approved with Comments">Approved with Comments</option>
                  <option value="Rejected">Rejected</option>
                </select>
              </div>
              <div className="dc-field-full">
                <label>Comments</label>
                <textarea value={approvalForm.approval_comments} onChange={e => setApprovalForm(p => ({ ...p, approval_comments: e.target.value }))} rows={3} />
              </div>
              <div className="dc-modal-footer">
                <button className="dc-btn dc-btn-secondary" onClick={() => setShowApprovalModal(null)}>Cancel</button>
                <button className="dc-btn dc-btn-primary" onClick={handleSubmitApproval} disabled={actionLoading}>{actionLoading ? 'Submitting...' : 'Submit'}</button>
              </div>
            </div>
          </div>
        )}

        {/* Change Status Modal */}
        {showStatusModal && (
          <div className="dc-modal-overlay" onClick={() => setShowStatusModal(false)}>
            <div className="dc-modal dc-modal-sm" onClick={e => e.stopPropagation()}>
              <h3>Change Document Status</h3>
              <div className="dc-field-full">
                <label>New Status</label>
                <select value={statusForm.status} onChange={e => setStatusForm(p => ({ ...p, status: e.target.value }))}>
                  <option value="Obsolete">Obsolete</option>
                  <option value="Archived">Archived</option>
                </select>
              </div>
              <div className="dc-field-full">
                <label>Reason *</label>
                <textarea value={statusForm.reason} onChange={e => setStatusForm(p => ({ ...p, reason: e.target.value }))} rows={3} />
              </div>
              <div className="dc-modal-footer">
                <button className="dc-btn dc-btn-secondary" onClick={() => setShowStatusModal(false)}>Cancel</button>
                <button className="dc-btn dc-btn-danger" onClick={handleChangeStatus} disabled={actionLoading}>{actionLoading ? 'Changing...' : 'Confirm'}</button>
              </div>
            </div>
          </div>
        )}

        {/* Add Link Modal */}
        {showLinkForm && (
          <div className="dc-modal-overlay" onClick={() => setShowLinkForm(false)}>
            <div className="dc-modal" onClick={e => e.stopPropagation()}>
              <h3>Add Link</h3>
              <div className="dc-form-fields">
                <div className="dc-field-row">
                  <div className="dc-field">
                    <label>Module *</label>
                    <select value={linkForm.linked_module} onChange={e => setLinkForm(p => ({ ...p, linked_module: e.target.value }))}>
                      <option value="">Select module</option>
                      {[{ value: 'rams', label: 'RAMS' }, { value: 'permit', label: 'Permit' }, { value: 'mockup', label: 'Mock-Up' }, { value: 'incident', label: 'Incident' }, { value: 'violation', label: 'Violation' }, { value: 'campaign', label: 'Campaign' }, { value: 'mom', label: 'MOM' }, { value: 'drill', label: 'Mock Drill' }, { value: 'contractor', label: 'Contractor' }, { value: 'training', label: 'Training' }].map(m => (
                        <option key={m.value} value={m.value}>{m.label}</option>
                      ))}
                    </select>
                  </div>
                  <div className="dc-field"><label>Record ID *</label><input value={linkForm.linked_id} onChange={e => setLinkForm(p => ({ ...p, linked_id: e.target.value }))} /></div>
                </div>
                <div className="dc-field-row">
                  <div className="dc-field"><label>Code</label><input value={linkForm.linked_code} onChange={e => setLinkForm(p => ({ ...p, linked_code: e.target.value }))} placeholder="e.g. PTW-0218" /></div>
                  <div className="dc-field"><label>Title</label><input value={linkForm.linked_title} onChange={e => setLinkForm(p => ({ ...p, linked_title: e.target.value }))} /></div>
                </div>
                <div className="dc-field-full"><label>Notes</label><textarea value={linkForm.link_notes} onChange={e => setLinkForm(p => ({ ...p, link_notes: e.target.value }))} rows={2} /></div>
              </div>
              <div className="dc-modal-footer">
                <button className="dc-btn dc-btn-secondary" onClick={() => setShowLinkForm(false)}>Cancel</button>
                <button className="dc-btn dc-btn-primary" onClick={handleAddLink} disabled={actionLoading}>{actionLoading ? 'Adding...' : 'Add Link'}</button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
