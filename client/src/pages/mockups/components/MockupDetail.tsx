import { useState, useEffect, useRef } from 'react';
import {
  X, Pencil, MapPin, User, Clock, FileText,
  Send, CheckCircle2, MessageSquare, ShieldCheck,
  AlertOctagon, Loader2, History, Upload, Trash2,
  ChevronRight, AlertTriangle, GitBranch, Users, Camera,
} from 'lucide-react';
import { format } from 'date-fns';
import type { MockupDetail as MockupDetailType, MockupComment, MockupApproverItem, MockupPersonnelItem, MockupAttachmentItem, RevisionEntry } from '../hooks/useMockups';

interface Props {
  mockupId: string;
  getMockupDetail: (id: string) => Promise<MockupDetailType>;
  onEdit: () => void;
  onClose: () => void;
  submitForReview: (id: string) => Promise<unknown>;
  approve: (id: string, note?: string, remarks?: string) => Promise<unknown>;
  reject: (id: string, reason: string) => Promise<unknown>;
  approveWithComments: (id: string, comments: string) => Promise<unknown>;
  createRevision: (id: string, note: string) => Promise<unknown>;
  addComment: (id: string, text: string, type?: string, parentId?: string) => Promise<unknown>;
  resolveComment: (mockupId: string, commentId: string, note?: string) => Promise<unknown>;
  uploadAttachments: (id: string, type: string, files: File[]) => Promise<unknown>;
  deleteAttachment: (mockupId: string, attachmentId: string) => Promise<unknown>;
  uploadPhotos: (id: string, files: File[]) => Promise<unknown>;
  deletePhoto: (id: string, path: string) => Promise<unknown>;
  canReview: boolean;
}

const STATUS_STYLES: Record<string, { bg: string; border: string; text: string }> = {
  'Draft': { bg: 'bg-gray-50', border: 'border-gray-300', text: 'text-gray-700' },
  'Submitted for Review': { bg: 'bg-blue-50', border: 'border-blue-400', text: 'text-blue-700' },
  'Approved': { bg: 'bg-green-50', border: 'border-green-500', text: 'text-green-700' },
  'Rejected': { bg: 'bg-red-50', border: 'border-red-500', text: 'text-red-700' },
  'Approved with Comments': { bg: 'bg-amber-50', border: 'border-amber-500', text: 'text-amber-700' },
  'Pending Compliance': { bg: 'bg-orange-50', border: 'border-orange-500', text: 'text-orange-700' },
  'Comments Resolved': { bg: 'bg-emerald-50', border: 'border-emerald-500', text: 'text-emerald-700' },
  'Re-submitted': { bg: 'bg-indigo-50', border: 'border-indigo-400', text: 'text-indigo-700' },
  'Superseded': { bg: 'bg-gray-100', border: 'border-gray-400', text: 'text-gray-500' },
};

const TABS = ['Details', 'Photos & Attachments', 'Comments', 'History'] as const;

export default function MockupDetailDrawer(props: Props) {
  const { mockupId, getMockupDetail, onEdit, onClose, submitForReview, approve, reject, approveWithComments, createRevision, addComment, resolveComment, uploadAttachments, deleteAttachment, uploadPhotos, deletePhoto, canReview } = props;
  const [detail, setDetail] = useState<MockupDetailType | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<(typeof TABS)[number]>('Details');
  const [actionLoading, setActionLoading] = useState(false);

  // Workflow inputs
  const [approvalNote, setApprovalNote] = useState('');
  const [approvalRemarks, setApprovalRemarks] = useState('');
  const [rejectionReason, setRejectionReason] = useState('');
  const [consultantComments, setConsultantComments] = useState('');
  const [revisionNote, setRevisionNote] = useState('');
  const [showWorkflowAction, setShowWorkflowAction] = useState<string | null>(null);

  // Comment inputs
  const [commentText, setCommentText] = useState('');
  const [commentType, setCommentType] = useState('Internal Note');
  const [resolvingId, setResolvingId] = useState<string | null>(null);
  const [resolveNote, setResolveNote] = useState('');

  const fetchDetail = async () => {
    setLoading(true);
    try {
      const d = await getMockupDetail(mockupId);
      setDetail(d);
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchDetail(); }, [mockupId]);

  const runAction = async (fn: () => Promise<unknown>) => {
    setActionLoading(true);
    try { await fn(); await fetchDetail(); setShowWorkflowAction(null); }
    catch (err: any) { alert(err?.response?.data?.message || err.message || 'Action failed'); }
    finally { setActionLoading(false); }
  };

  const storageBase = (import.meta.env.VITE_STORAGE_URL || (import.meta.env.VITE_API_URL || '').replace('/api', '') + '/storage/');

  if (loading || !detail) {
    return (
      <div className="fixed inset-0 z-50 flex">
        <div className="absolute inset-0 bg-black/30" onClick={onClose} />
        <div className="relative ml-auto w-full max-w-3xl bg-surface shadow-xl overflow-hidden flex items-center justify-center">
          <Loader2 className="animate-spin text-primary-500" size={32} />
        </div>
      </div>
    );
  }

  const m = detail;
  const style = STATUS_STYLES[m.approval_status] || STATUS_STYLES['Draft'];
  const tag = [m.phase, m.zone, m.trim_line].filter(Boolean).join(' / ');
  const isPendingCompliance = m.approval_status === 'Approved with Comments' || m.compliance_status === 'Pending';
  const canCreateRevision = ['Rejected', 'Approved with Comments'].includes(m.approval_status);
  const isReviewable = ['Submitted for Review', 'Re-submitted'].includes(m.approval_status);
  const canSubmit = ['Draft', 'Rejected', 'Re-submitted'].includes(m.approval_status) && !!m.rams_document;

  const fmtDate = (d: string | null) => { if (!d) return '—'; try { return format(new Date(d), 'dd MMM yyyy'); } catch { return d; } };
  const fmtDateTime = (d: string | null) => { if (!d) return '—'; try { return format(new Date(d), 'dd MMM yyyy HH:mm'); } catch { return d; } };

  return (
    <div className="fixed inset-0 z-50 flex">
      <div className="absolute inset-0 bg-black/30" onClick={onClose} />
      <div className="relative ml-auto w-full max-w-3xl bg-surface shadow-xl flex flex-col h-full overflow-hidden">
        {/* Header */}
        <div className={`shrink-0 px-5 py-4 border-b-2 ${style.border} bg-surface`}>
          <div className="flex items-start justify-between">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <span className="text-[12px] font-mono font-bold text-text-tertiary">{m.ref_number}</span>
                <span className="text-[11px] text-text-tertiary">Rev {m.revision_number}</span>
                {m.mockup_type && <span className="text-[10px] px-1.5 py-0.5 bg-primary-50 text-primary-600 rounded font-medium">{m.mockup_type}</span>}
              </div>
              <h2 className="text-[16px] font-bold text-text-primary truncate">{m.title}</h2>
              {tag && (
                <div className="mt-1 inline-flex items-center gap-1 text-[11px] px-2 py-0.5 bg-surface-sunken rounded border border-border text-text-secondary">
                  <MapPin size={11} /> {tag}
                </div>
              )}
            </div>
            <div className="flex items-center gap-2 ml-3">
              <button onClick={onEdit} className="p-1.5 rounded-[var(--radius-sm)] hover:bg-surface-sunken transition-colors text-text-tertiary" title="Edit"><Pencil size={16} /></button>
              <button onClick={onClose} className="p-1.5 rounded-[var(--radius-sm)] hover:bg-surface-sunken transition-colors text-text-tertiary"><X size={18} /></button>
            </div>
          </div>

          {/* Status Badge */}
          <div className="mt-3 flex items-center gap-3 flex-wrap">
            <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[12px] font-semibold border ${style.bg} ${style.border} ${style.text}`}>
              {m.approval_status}
            </span>
            {m.can_proceed && <span className="inline-flex items-center gap-1 text-green-600 text-[12px] font-semibold"><ShieldCheck size={14} /> Can Proceed</span>}
            {isPendingCompliance && <span className="inline-flex items-center gap-1 text-orange-600 text-[12px] font-semibold"><AlertTriangle size={14} /> Pending Compliance</span>}
            {m.unresolved_comment_count > 0 && <span className="inline-flex items-center gap-1 text-amber-600 text-[12px]"><MessageSquare size={13} /> {m.unresolved_comment_count} unresolved</span>}
            {m.rams_document && (
              <span className="text-[11px] text-text-tertiary">RAMS: <span className="font-mono font-medium text-text-secondary">{m.rams_document.ref_number}</span></span>
            )}
          </div>
        </div>

        {/* Tabs */}
        <div className="shrink-0 flex border-b border-border bg-surface-sunken px-5">
          {TABS.map(tab => (
            <button key={tab} onClick={() => setActiveTab(tab)} className={`px-3.5 py-2.5 text-[12px] font-medium border-b-2 transition-colors ${activeTab === tab ? 'border-primary-500 text-primary-600' : 'border-transparent text-text-tertiary hover:text-text-secondary'}`}>
              {tab}
            </button>
          ))}
        </div>

        {/* Tab Content */}
        <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain px-5 py-4">
          {activeTab === 'Details' && (
            <div className="space-y-5">
              {/* Basic Info Grid */}
              <section>
                <h3 className="text-[11px] font-semibold text-text-tertiary uppercase tracking-wider mb-2">Basic Information</h3>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  <InfoCell label="Area" value={m.area} />
                  <InfoCell label="Zone" value={m.zone} />
                  <InfoCell label="Phase" value={m.phase} />
                  <InfoCell label="Trim Line" value={m.trim_line} />
                  <InfoCell label="Site" value={m.site} />
                  <InfoCell label="Project" value={m.project} />
                  <InfoCell label="Contractor" value={m.contractor} />
                  <InfoCell label="Supervisor" value={m.supervisor_name} />
                  <InfoCell label="Mock-Up Date" value={fmtDate(m.mockup_date)} />
                </div>
              </section>

              {/* RAMS Info */}
              {m.rams_document && (
                <section>
                  <h3 className="text-[11px] font-semibold text-text-tertiary uppercase tracking-wider mb-2">Linked RAMS</h3>
                  <div className="p-3 bg-primary-50/50 border border-primary-100 rounded-[var(--radius-md)]">
                    <div className="flex items-center gap-2">
                      <FileText size={14} className="text-primary-500" />
                      <span className="text-[13px] font-semibold text-text-primary">{m.rams_document.ref_number}</span>
                      <span className="text-[12px] text-text-secondary">{m.rams_document.title}</span>
                    </div>
                    {m.rams_version && <p className="text-[11px] text-text-tertiary mt-1">Version: v{m.rams_version.version_number} — {m.rams_version.file_name}</p>}
                    {m.rams_work_line && <p className="text-[11px] text-text-tertiary">Work Line: {m.rams_work_line.name}</p>}
                  </div>
                </section>
              )}

              {/* Description */}
              {m.description && (
                <section>
                  <h3 className="text-[11px] font-semibold text-text-tertiary uppercase tracking-wider mb-2">Description</h3>
                  <p className="text-[13px] text-text-primary whitespace-pre-wrap">{m.description}</p>
                </section>
              )}

              {/* Personnel */}
              {m.personnel && m.personnel.length > 0 && (
                <section>
                  <h3 className="text-[11px] font-semibold text-text-tertiary uppercase tracking-wider mb-2 flex items-center gap-1"><Users size={12} /> Personnel Involved ({m.personnel.length})</h3>
                  <div className="space-y-1.5">
                    {m.personnel.map((p: MockupPersonnelItem, i: number) => (
                      <div key={i} className="flex items-center gap-3 p-2 bg-surface-sunken rounded border border-border text-[12px]">
                        <User size={13} className="text-text-tertiary" />
                        <span className="font-medium text-text-primary">{p.person_name}</span>
                        {p.designation && <span className="text-text-tertiary">— {p.designation}</span>}
                        {p.company && <span className="text-text-tertiary ml-auto">{p.company}</span>}
                      </div>
                    ))}
                  </div>
                </section>
              )}

              {/* Approvers */}
              {m.approvers && m.approvers.length > 0 && (
                <section>
                  <h3 className="text-[11px] font-semibold text-text-tertiary uppercase tracking-wider mb-2 flex items-center gap-1"><ShieldCheck size={12} /> Approvers / Signatories ({m.approvers.length})</h3>
                  <div className="space-y-1.5">
                    {m.approvers.map((a: MockupApproverItem, i: number) => (
                      <div key={i} className="flex items-center gap-3 p-2 bg-surface-sunken rounded border border-border text-[12px]">
                        <span className="font-medium text-text-primary">{a.name}</span>
                        {a.designation && <span className="text-text-tertiary">— {a.designation}</span>}
                        {a.approver_type && <span className="text-[10px] px-1.5 py-0.5 bg-primary-50 text-primary-600 rounded">{a.approver_type}</span>}
                        <span className={`ml-auto text-[10px] font-semibold px-1.5 py-0.5 rounded ${a.approval_status === 'Approved' ? 'bg-green-50 text-green-700' : a.approval_status === 'Rejected' ? 'bg-red-50 text-red-700' : 'bg-gray-100 text-gray-600'}`}>
                          {a.approval_status}
                        </span>
                        {a.approval_date && <span className="text-[10px] text-text-tertiary">{fmtDate(a.approval_date)}</span>}
                      </div>
                    ))}
                  </div>
                </section>
              )}

              {/* Status-Specific Remarks */}
              <section>
                <h3 className="text-[11px] font-semibold text-text-tertiary uppercase tracking-wider mb-2">Status-Specific Remarks</h3>

                {/* Approved: General Remarks */}
                {m.approval_status === 'Approved' && m.general_remarks && (
                  <div className="p-3 bg-green-50 border border-green-200 rounded-[var(--radius-md)] mb-2">
                    <p className="text-[11px] font-semibold text-green-700 mb-1">General Remarks (Approved)</p>
                    <p className="text-[13px] text-text-primary whitespace-pre-wrap">{m.general_remarks}</p>
                  </div>
                )}

                {/* Rejected: Rejection Reason */}
                {m.approval_status === 'Rejected' && m.rejection_reason && (
                  <div className="p-3 bg-red-50 border border-red-200 rounded-[var(--radius-md)] mb-2">
                    <p className="text-[11px] font-semibold text-red-700 mb-1">Rejection Reason</p>
                    <p className="text-[13px] text-text-primary whitespace-pre-wrap">{m.rejection_reason}</p>
                  </div>
                )}

                {/* Approved with Comments: Consultant Comments */}
                {(m.approval_status === 'Approved with Comments' || m.compliance_status === 'Pending') && m.consultant_comments && (
                  <div className="p-3 bg-amber-50 border border-amber-200 rounded-[var(--radius-md)] mb-2">
                    <p className="text-[11px] font-semibold text-amber-700 mb-1">Consultant Comments / Instructions (Pending Compliance)</p>
                    <p className="text-[13px] text-text-primary whitespace-pre-wrap">{m.consultant_comments}</p>
                  </div>
                )}

                {!m.general_remarks && !m.rejection_reason && !m.consultant_comments && (
                  <p className="text-[12px] text-text-tertiary italic">No status-specific remarks yet.</p>
                )}
              </section>

              {/* Revision History */}
              {m.revision_history && m.revision_history.length > 1 && (
                <section>
                  <h3 className="text-[11px] font-semibold text-text-tertiary uppercase tracking-wider mb-2 flex items-center gap-1"><GitBranch size={12} /> Revision History</h3>
                  <div className="space-y-1.5">
                    {m.revision_history.map((r: RevisionEntry) => {
                      const rs = STATUS_STYLES[r.approval_status] || STATUS_STYLES['Draft'];
                      return (
                        <div key={r.id} className={`flex items-center gap-3 p-2 rounded border text-[12px] ${r.is_current ? 'bg-primary-50/50 border-primary-200' : 'bg-surface-sunken border-border'}`}>
                          <span className="font-mono font-bold text-text-primary">Rev {r.revision_number}</span>
                          <span className={`px-1.5 py-0.5 rounded text-[10px] font-semibold ${rs.bg} ${rs.text}`}>{r.approval_status}</span>
                          <span className="text-text-tertiary">{fmtDate(r.created_at)}</span>
                          {r.is_current && <span className="ml-auto text-[10px] font-bold text-primary-600">CURRENT</span>}
                        </div>
                      );
                    })}
                  </div>
                </section>
              )}

              {/* Audit Info */}
              <section>
                <h3 className="text-[11px] font-semibold text-text-tertiary uppercase tracking-wider mb-2">Audit Info</h3>
                <div className="grid grid-cols-2 gap-3">
                  <InfoCell label="Created By" value={m.created_by?.name} />
                  <InfoCell label="Created At" value={fmtDateTime(m.created_at)} />
                  {m.submitted_by && <InfoCell label="Submitted By" value={m.submitted_by.name} />}
                  {m.submitted_at && <InfoCell label="Submitted At" value={fmtDateTime(m.submitted_at)} />}
                  {m.approved_by && <InfoCell label="Approved By" value={(m.approved_by as any).name} />}
                  {m.approved_at && <InfoCell label="Approved At" value={fmtDateTime(m.approved_at)} />}
                </div>
              </section>

              {/* Quick Submit Action (only on Details tab for convenience) */}
              {canSubmit && (
                <section className="border-t border-border pt-4">
                  <button onClick={() => runAction(() => submitForReview(m.id))} disabled={actionLoading} className="px-3 py-1.5 text-[12px] font-semibold bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50 transition-colors inline-flex items-center gap-1">
                    <Send size={13} /> Submit for Review
                  </button>
                </section>
              )}
            </div>
          )}

          {activeTab === 'Photos & Attachments' && (
            <div className="space-y-5">
              {/* Status-specific upload sections */}
              {['approved', 'rejected', 'comments', 'general'].map(type => {
                const typeLabel: Record<string, string> = {
                  approved: 'Approved Photos', rejected: 'Rejection Photos', comments: 'Comment-Related Photos', general: 'General Attachments',
                };
                const typeColor: Record<string, string> = {
                  approved: 'bg-green-50 border-green-200', rejected: 'bg-red-50 border-red-200',
                  comments: 'bg-amber-50 border-amber-200', general: 'bg-surface-sunken border-border',
                };
                const attachments = (m.typed_attachments || []).filter((a: MockupAttachmentItem) => a.attachment_type === type);
                return (
                  <section key={type}>
                    <div className="flex items-center justify-between mb-2">
                      <h3 className="text-[11px] font-semibold text-text-tertiary uppercase tracking-wider flex items-center gap-1">
                        <Camera size={12} /> {typeLabel[type]} ({attachments.length})
                      </h3>
                      <label className="inline-flex items-center gap-1 px-2 py-1 text-[11px] font-medium text-primary-600 bg-primary-50 rounded cursor-pointer hover:bg-primary-100 transition-colors">
                        <Upload size={12} /> Upload
                        <input type="file" multiple className="hidden" accept="image/*,.pdf,.doc,.docx" onChange={async (e) => {
                          const files = Array.from(e.target.files || []);
                          if (files.length) {
                            await uploadAttachments(m.id, type, files);
                            await fetchDetail();
                          }
                          e.target.value = '';
                        }} />
                      </label>
                    </div>
                    {attachments.length === 0 ? (
                      <p className="text-[12px] text-text-tertiary italic p-2">No {typeLabel[type].toLowerCase()} uploaded.</p>
                    ) : (
                      <div className="grid grid-cols-3 gap-2">
                        {attachments.map((a: MockupAttachmentItem) => (
                          <div key={a.id} className={`relative p-2 rounded border ${typeColor[type]} group`}>
                            {a.file_type?.startsWith('image/') ? (
                              <img src={storageBase + a.file_path} alt={a.original_name || ''} className="w-full h-24 object-cover rounded" loading="lazy" />
                            ) : (
                              <div className="w-full h-24 flex items-center justify-center bg-white rounded">
                                <FileText size={24} className="text-text-tertiary" />
                              </div>
                            )}
                            <p className="text-[10px] text-text-tertiary mt-1 truncate">{a.original_name}</p>
                            <button onClick={async () => { await deleteAttachment(m.id, a.id); await fetchDetail(); }}
                              className="absolute top-1 right-1 p-1 bg-red-500 text-white rounded opacity-0 group-hover:opacity-100 transition-opacity" title="Delete">
                              <Trash2 size={11} />
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </section>
                );
              })}

              {/* Legacy photos */}
              {m.photos && m.photos.length > 0 && (
                <section>
                  <h3 className="text-[11px] font-semibold text-text-tertiary uppercase tracking-wider mb-2">Legacy Photos ({m.photos.length})</h3>
                  <div className="grid grid-cols-3 gap-2">
                    {m.photos.map((p: string, i: number) => (
                      <div key={i} className="relative group">
                        <img src={storageBase + p} alt="" className="w-full h-24 object-cover rounded border border-border" loading="lazy" />
                        <button onClick={async () => { await deletePhoto(m.id, p); await fetchDetail(); }}
                          className="absolute top-1 right-1 p-1 bg-red-500 text-white rounded opacity-0 group-hover:opacity-100 transition-opacity">
                          <Trash2 size={11} />
                        </button>
                      </div>
                    ))}
                  </div>
                </section>
              )}
            </div>
          )}

          {activeTab === 'Comments' && (
            <div className="space-y-4">
              {/* Action Selector */}
              <div className="p-3 bg-surface-sunken border border-border rounded-[var(--radius-md)] space-y-3">
                <div>
                  <label className="text-[11px] font-semibold text-text-tertiary uppercase tracking-wider mb-1.5 block">Select Action</label>
                  <select
                    value={showWorkflowAction || 'none'}
                    onChange={e => {
                      setShowWorkflowAction(e.target.value === 'none' ? null : e.target.value);
                      setCommentText(''); setApprovalRemarks(''); setRejectionReason(''); setConsultantComments(''); setRevisionNote('');
                    }}
                    className="w-full h-9 px-3 text-[12px] font-medium border border-border rounded-[var(--radius-md)] bg-surface text-text-primary focus:outline-none focus:ring-[3px] focus:ring-primary-500/10 focus:border-primary-500"
                  >
                    <option value="none">Choose an action...</option>
                    <option value="internal-note">Internal Note</option>
                    <option value="review-comment">Review Comment</option>
                    {canReview && isReviewable && <option value="approve">Approve</option>}
                    {canReview && isReviewable && <option value="reject">Reject</option>}
                    {canReview && isReviewable && <option value="approve-comments">Approve with Comments</option>}
                    {canSubmit && <option value="submit">Submit for Review</option>}
                    {canCreateRevision && <option value="revision">Create New Revision</option>}
                  </select>
                </div>

                {/* Internal Note */}
                {showWorkflowAction === 'internal-note' && (
                  <div className="space-y-2">
                    <textarea value={commentText} onChange={e => setCommentText(e.target.value)} placeholder="Add an internal note..." rows={3} className="w-full px-3 py-2 text-[12px] border border-border rounded-[var(--radius-md)] bg-surface" />
                    <button onClick={async () => {
                      if (!commentText.trim()) return;
                      await addComment(m.id, commentText, 'Internal Note');
                      setCommentText(''); setShowWorkflowAction(null); await fetchDetail();
                    }} disabled={!commentText.trim()} className="px-3.5 py-1.5 text-[12px] font-semibold bg-primary-600 text-white rounded-[var(--radius-md)] hover:bg-primary-700 disabled:opacity-50 transition-colors">
                      Post Note
                    </button>
                  </div>
                )}

                {/* Review Comment */}
                {showWorkflowAction === 'review-comment' && (
                  <div className="space-y-2">
                    <textarea value={commentText} onChange={e => setCommentText(e.target.value)} placeholder="Add a review comment..." rows={3} className="w-full px-3 py-2 text-[12px] border border-amber-200 rounded-[var(--radius-md)] bg-amber-50/50" />
                    <p className="text-[11px] text-amber-700">Review comments require resolution before compliance can be confirmed.</p>
                    <button onClick={async () => {
                      if (!commentText.trim()) return;
                      await addComment(m.id, commentText, 'Review Comment');
                      setCommentText(''); setShowWorkflowAction(null); await fetchDetail();
                    }} disabled={!commentText.trim()} className="px-3.5 py-1.5 text-[12px] font-semibold bg-amber-600 text-white rounded-[var(--radius-md)] hover:bg-amber-700 disabled:opacity-50 transition-colors">
                      Post Review Comment
                    </button>
                  </div>
                )}

                {/* Approve */}
                {showWorkflowAction === 'approve' && (
                  <div className="p-3 bg-green-50 border border-green-200 rounded-[var(--radius-md)] space-y-2">
                    <p className="text-[11px] font-semibold text-green-700 flex items-center gap-1"><CheckCircle2 size={13} /> Approve this Mock-Up</p>
                    <textarea value={approvalRemarks} onChange={e => setApprovalRemarks(e.target.value)} placeholder="General remarks (optional)..." rows={3} className="w-full px-3 py-2 text-[12px] border border-green-200 rounded-[var(--radius-md)] bg-white" />
                    <button onClick={() => runAction(async () => { await approve(m.id, approvalNote, approvalRemarks); setShowWorkflowAction(null); })} disabled={actionLoading} className="px-3.5 py-1.5 text-[12px] font-semibold bg-green-600 text-white rounded-[var(--radius-md)] hover:bg-green-700 disabled:opacity-50 transition-colors">
                      {actionLoading ? 'Processing...' : 'Confirm Approve'}
                    </button>
                  </div>
                )}

                {/* Reject */}
                {showWorkflowAction === 'reject' && (
                  <div className="p-3 bg-red-50 border border-red-200 rounded-[var(--radius-md)] space-y-2">
                    <p className="text-[11px] font-semibold text-red-700 flex items-center gap-1"><AlertOctagon size={13} /> Reject this Mock-Up</p>
                    <textarea value={rejectionReason} onChange={e => setRejectionReason(e.target.value)} placeholder="Rejection reason (required, min 10 chars)..." rows={3} className="w-full px-3 py-2 text-[12px] border border-red-200 rounded-[var(--radius-md)] bg-white" />
                    <p className="text-[11px] text-red-600">The contractor will need to create a new revision to address these issues.</p>
                    <button onClick={() => runAction(async () => { await reject(m.id, rejectionReason); setShowWorkflowAction(null); })} disabled={actionLoading || rejectionReason.length < 10} className="px-3.5 py-1.5 text-[12px] font-semibold bg-red-600 text-white rounded-[var(--radius-md)] hover:bg-red-700 disabled:opacity-50 transition-colors">
                      {actionLoading ? 'Processing...' : 'Confirm Reject'}
                    </button>
                  </div>
                )}

                {/* Approve with Comments */}
                {showWorkflowAction === 'approve-comments' && (
                  <div className="p-3 bg-amber-50 border border-amber-200 rounded-[var(--radius-md)] space-y-2">
                    <p className="text-[11px] font-semibold text-amber-700 flex items-center gap-1"><MessageSquare size={13} /> Approve with Comments</p>
                    <textarea value={consultantComments} onChange={e => setConsultantComments(e.target.value)} placeholder="Consultant comments / instructions (required, min 10 chars)..." rows={3} className="w-full px-3 py-2 text-[12px] border border-amber-200 rounded-[var(--radius-md)] bg-white" />
                    <p className="text-[11px] text-amber-700">This mock-up will enter <strong>Pending Compliance</strong>. Work cannot proceed until all comments are resolved.</p>
                    <button onClick={() => runAction(async () => { await approveWithComments(m.id, consultantComments); setShowWorkflowAction(null); })} disabled={actionLoading || consultantComments.length < 10} className="px-3.5 py-1.5 text-[12px] font-semibold bg-amber-600 text-white rounded-[var(--radius-md)] hover:bg-amber-700 disabled:opacity-50 transition-colors">
                      {actionLoading ? 'Processing...' : 'Confirm Approve with Comments'}
                    </button>
                  </div>
                )}

                {/* Submit for Review */}
                {showWorkflowAction === 'submit' && (
                  <div className="p-3 bg-blue-50 border border-blue-200 rounded-[var(--radius-md)] space-y-2">
                    <p className="text-[11px] font-semibold text-blue-700 flex items-center gap-1"><Send size={13} /> Submit for Review</p>
                    <p className="text-[12px] text-text-secondary">This will send the mock-up for review. Make sure all required fields and RAMS linkage are set.</p>
                    <button onClick={() => runAction(async () => { await submitForReview(m.id); setShowWorkflowAction(null); })} disabled={actionLoading} className="px-3.5 py-1.5 text-[12px] font-semibold bg-blue-600 text-white rounded-[var(--radius-md)] hover:bg-blue-700 disabled:opacity-50 transition-colors">
                      {actionLoading ? 'Processing...' : 'Confirm Submit'}
                    </button>
                  </div>
                )}

                {/* Create New Revision */}
                {showWorkflowAction === 'revision' && (
                  <div className="p-3 bg-indigo-50 border border-indigo-200 rounded-[var(--radius-md)] space-y-2">
                    <p className="text-[11px] font-semibold text-indigo-700 flex items-center gap-1"><GitBranch size={13} /> Create New Revision</p>
                    <textarea value={revisionNote} onChange={e => setRevisionNote(e.target.value)} placeholder="What was corrected/changed in this revision? (required)..." rows={3} className="w-full px-3 py-2 text-[12px] border border-indigo-200 rounded-[var(--radius-md)] bg-white" />
                    <p className="text-[11px] text-indigo-700">A new revision will be created. The current revision will be marked as <strong>Superseded</strong>.</p>
                    <button onClick={() => runAction(async () => { await createRevision(m.id, revisionNote); setShowWorkflowAction(null); })} disabled={actionLoading || revisionNote.length < 5} className="px-3.5 py-1.5 text-[12px] font-semibold bg-indigo-600 text-white rounded-[var(--radius-md)] hover:bg-indigo-700 disabled:opacity-50 transition-colors">
                      {actionLoading ? 'Creating...' : 'Create Revision'}
                    </button>
                  </div>
                )}

                {/* No action selected prompt */}
                {!showWorkflowAction && (
                  <p className="text-[12px] text-text-tertiary italic">Select an action above to add a comment or take a workflow action.</p>
                )}
              </div>

              {/* Comment list */}
              {m.comments?.length === 0 && <p className="text-[12px] text-text-tertiary italic">No comments yet.</p>}
              {m.comments?.map((c: MockupComment) => (
                <CommentItem key={c.id} comment={c} mockupId={m.id} resolveComment={resolveComment} fetchDetail={fetchDetail} />
              ))}
            </div>
          )}

          {activeTab === 'History' && (
            <div className="space-y-2">
              {m.history?.length === 0 && <p className="text-[12px] text-text-tertiary italic">No history entries.</p>}
              {m.history?.map(h => {
                const actionColors: Record<string, string> = {
                  'Created': 'bg-blue-500', 'Approved': 'bg-green-500', 'Rejected': 'bg-red-500',
                  'Approved with Comments': 'bg-amber-500', 'Submitted for Review': 'bg-blue-400',
                  'Comment Resolved': 'bg-emerald-500', 'All Comments Resolved': 'bg-green-600',
                  'Re-submitted': 'bg-indigo-500', 'Photos Uploaded': 'bg-purple-400',
                  'Revision Created': 'bg-indigo-600', 'Superseded': 'bg-gray-400',
                  'Updated': 'bg-gray-400', 'Attachments Uploaded': 'bg-purple-500',
                };
                return (
                  <div key={h.id} className="flex items-start gap-3 p-2.5 bg-surface-sunken rounded border border-border">
                    <div className={`w-2.5 h-2.5 rounded-full mt-1 shrink-0 ${actionColors[h.action] || 'bg-gray-400'}`} />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-[12px] font-semibold text-text-primary">{h.action}</span>
                        {h.from_status && h.to_status && h.from_status !== h.to_status && (
                          <span className="text-[10px] text-text-tertiary">{h.from_status} <ChevronRight size={10} className="inline" /> {h.to_status}</span>
                        )}
                      </div>
                      {h.description && <p className="text-[11px] text-text-secondary mt-0.5">{h.description}</p>}
                      <p className="text-[10px] text-text-tertiary mt-1">{h.performed_by_name} ({h.performed_by_role}) — {fmtDateTime(h.created_at)}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function InfoCell({ label, value }: { label: string; value: string | null | undefined }) {
  return (
    <div className="p-2 bg-surface-sunken rounded border border-border">
      <p className="text-[10px] font-medium text-text-tertiary uppercase">{label}</p>
      <p className="text-[13px] text-text-primary mt-0.5">{value || '—'}</p>
    </div>
  );
}

function CommentItem({ comment, mockupId, resolveComment, fetchDetail }: {
  comment: MockupComment; mockupId: string;
  resolveComment: (mid: string, cid: string, note?: string) => Promise<unknown>;
  fetchDetail: () => Promise<void>;
}) {
  const [resolving, setResolving] = useState(false);
  const [note, setNote] = useState('');

  const typeColors: Record<string, string> = {
    'Review Comment': 'bg-amber-50 border-amber-200',
    'Rejection Reason': 'bg-red-50 border-red-200',
    'Approval Note': 'bg-green-50 border-green-200',
    'Re-submission Note': 'bg-indigo-50 border-indigo-200',
    'Resolution Note': 'bg-emerald-50 border-emerald-200',
    'Internal Note': 'bg-surface-sunken border-border',
  };

  const c = comment;
  return (
    <div className={`p-3 rounded border ${typeColors[c.comment_type] || typeColors['Internal Note']} ${c.is_resolved ? 'opacity-60' : ''}`}>
      <div className="flex items-center gap-2 mb-1">
        <span className="text-[12px] font-semibold text-text-primary">{c.user_name}</span>
        {c.user_role && <span className="text-[10px] px-1.5 py-0.5 bg-white/50 rounded text-text-tertiary">{c.user_role}</span>}
        <span className="text-[10px] px-1.5 py-0.5 rounded bg-white/50 text-text-tertiary font-medium">{c.comment_type}</span>
        {c.is_resolved && <span className="text-[10px] text-green-600 font-semibold ml-auto flex items-center gap-0.5"><CheckCircle2 size={11} /> Resolved</span>}
      </div>
      <p className="text-[12px] text-text-primary whitespace-pre-wrap">{c.comment_text}</p>
      {c.is_resolved && c.resolved_by_name && (
        <p className="text-[10px] text-text-tertiary mt-1">Resolved by {c.resolved_by_name} {c.resolution_note ? `— ${c.resolution_note}` : ''}</p>
      )}

      {/* Resolve button */}
      {!c.is_resolved && c.comment_type === 'Review Comment' && (
        <div className="mt-2">
          {!resolving ? (
            <button onClick={() => setResolving(true)} className="text-[11px] font-medium text-green-600 hover:underline">Resolve</button>
          ) : (
            <div className="space-y-1.5">
              <textarea value={note} onChange={e => setNote(e.target.value)} placeholder="Resolution note (optional)..." rows={2} className="w-full px-2 py-1.5 text-[11px] border border-border rounded bg-white" />
              <div className="flex gap-2">
                <button onClick={async () => { await resolveComment(mockupId, c.id, note); setResolving(false); setNote(''); await fetchDetail(); }}
                  className="px-2 py-1 text-[11px] font-semibold bg-green-600 text-white rounded hover:bg-green-700">Confirm Resolve</button>
                <button onClick={() => setResolving(false)} className="px-2 py-1 text-[11px] text-text-secondary">Cancel</button>
              </div>
            </div>
          )}
        </div>
      )}

      <p className="text-[10px] text-text-tertiary mt-1">{format(new Date(c.created_at), 'dd MMM yyyy HH:mm')}</p>

      {/* Replies */}
      {c.replies?.length > 0 && (
        <div className="ml-4 mt-2 space-y-2 border-l-2 border-border pl-3">
          {c.replies.map(r => (
            <CommentItem key={r.id} comment={r} mockupId={mockupId} resolveComment={resolveComment} fetchDetail={fetchDetail} />
          ))}
        </div>
      )}
    </div>
  );
}
