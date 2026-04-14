import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '../../contexts/AuthContext';
import { api } from '../../services/api';
import {
  X, Download, FileText, User, Calendar, Clock,
  CheckCircle2, XCircle, Send, RotateCcw, Upload, AlertTriangle,
  Layers, ShieldCheck, AlertOctagon, MessageSquare, Trash2,
} from 'lucide-react';
import { useState, useRef } from 'react';
import { StatusBadge } from '../../components/ui/Badge';
import Button from '../../components/ui/Button';
import { PageSpinner } from '../../components/ui/Spinner';
import TypedDeleteConfirmModal from '../../components/ui/TypedDeleteConfirmModal';

// ─── Types ──────────────────────────────────────
interface VersionData {
  id: string;
  version_number: number;
  file_path: string;
  file_name: string;
  file_size: number;
  mime_type: string;
  notes: string | null;
  uploaded_by: { id: string; name: string } | null;
  created_at: string;
}

interface DocDetail {
  id: string;
  ref_number: string;
  title: string;
  description: string | null;
  contractor: string | null;
  zone: string | null;
  status: string;
  current_version: number;
  due_date: string | null;
  tags: string[] | null;
  rejected_reason: string | null;
  work_line: { id: string; name: string; slug: string; color: string } | null;
  submitted_by: { id: string; name: string } | null;
  approved_by: { id: string; name: string } | null;
  approved_at: string | null;
  latest_version: { id: string; version_number: number; file_name: string; file_size: number; uploaded_at: string } | null;
  versions: VersionData[];
  created_at: string;
  updated_at: string;
}


interface LinkedMockup {
  id: string;
  ref_number: string;
  title: string;
  approval_status: string;
  revision_number: number;
  can_proceed: boolean;
  compliance_status: string | null;
  mockup_type: string | null;
  created_at: string;
}

const MOCKUP_STATUS_STYLES: Record<string, string> = {
  'Draft': 'bg-gray-100 text-gray-700 border-gray-200',
  'Submitted for Review': 'bg-blue-50 text-blue-700 border-blue-200',
  'Approved': 'bg-green-50 text-green-700 border-green-200',
  'Rejected': 'bg-red-50 text-red-700 border-red-200',
  'Approved with Comments': 'bg-amber-50 text-amber-700 border-amber-200',
  'Pending Compliance': 'bg-orange-50 text-orange-700 border-orange-200',
  'Comments Resolved': 'bg-emerald-50 text-emerald-700 border-emerald-200',
  'Re-submitted': 'bg-indigo-50 text-indigo-700 border-indigo-200',
  'Superseded': 'bg-gray-100 text-gray-500 border-gray-200',
};

interface Props {
  documentId: string;
  onClose: () => void;
  workLineSlug: string;
}

export default function DocumentDetailDrawer({ documentId, onClose, workLineSlug }: Props) {
  const { hasPermission } = useAuth();
  const canUpload = hasPermission('can_upload_rams');
  const canApprove = hasPermission('can_approve_rams');
  const queryClient = useQueryClient();

  const [showUpload, setShowUpload] = useState(false);
  const [uploadNotes, setUploadNotes] = useState('');
  const [rejectReason, setRejectReason] = useState('');
  const [showReject, setShowReject] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const { data: doc, isLoading } = useQuery<DocDetail>({
    queryKey: ['rams-document', documentId],
    queryFn: () => api.get(`/rams/documents/${documentId}`),
  });

  const { data: linkedMockups = [] } = useQuery<LinkedMockup[]>({
    queryKey: ['rams-linked-mockups', documentId],
    queryFn: async () => {
      const res = await api.get<{ data: LinkedMockup[] }>(`/mockups?rams_document_id=${documentId}&per_page=50`);
      return res.data || [];
    },
    enabled: !!documentId,
  });

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ['rams-document', documentId] });
    queryClient.invalidateQueries({ queryKey: ['rams-work-line', workLineSlug] });
    queryClient.invalidateQueries({ queryKey: ['rams-work-lines'] });
    queryClient.invalidateQueries({ queryKey: ['rams-stats'] });
  };

  const statusMutation = useMutation({
    mutationFn: (payload: { status: string; rejected_reason?: string }) =>
      api.patch(`/rams/documents/${documentId}/status`, payload),
    onSuccess: () => {
      invalidate();
      setShowReject(false);
      setRejectReason('');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: () => api.delete(`/rams/documents/${documentId}`),
    onSuccess: () => {
      invalidate();
      setShowDeleteConfirm(false);
      onClose();
    },
  });

  const uploadMutation = useMutation({
    mutationFn: (file: File) => {
      const fd = new FormData();
      fd.append('file', file);
      if (uploadNotes) fd.append('notes', uploadNotes);
      return api.uploadForm(`/rams/documents/${documentId}/versions`, fd);
    },
    onSuccess: () => {
      invalidate();
      setShowUpload(false);
      setUploadNotes('');
      if (fileRef.current) fileRef.current.value = '';
    },
  });

  const handleFileUpload = () => {
    const file = fileRef.current?.files?.[0];
    if (file) uploadMutation.mutate(file);
  };

  const handleDownload = (versionId: string, fileName: string) => {
    api.download(`/rams/versions/${versionId}/download`, fileName);
  };

  const formatBytes = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const formatDate = (iso: string) => {
    const d = new Date(iso);
    return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
  };

  const formatDateTime = (iso: string) => {
    const d = new Date(iso);
    return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <div className="absolute inset-0 bg-black/30 backdrop-blur-[1px]" onClick={onClose} />

      <div className="relative w-full max-w-full sm:max-w-lg bg-surface shadow-xl overflow-hidden flex flex-col">
        {/* Header */}
        <div className="shrink-0 bg-surface border-b border-border px-4 sm:px-5 py-3 sm:py-4 flex items-center justify-between z-10">
          <h2 className="text-[17px] font-bold text-text-primary">Document Details</h2>
          <div className="flex items-center gap-1">
            <button onClick={() => setShowDeleteConfirm(true)} className="p-1.5 rounded-[var(--radius-sm)] hover:bg-danger-50 text-text-tertiary hover:text-danger-600 transition-colors duration-150" title="Delete Document">
              <Trash2 size={16} />
            </button>
            <button onClick={onClose} className="p-1 rounded-[var(--radius-sm)] hover:bg-surface-sunken text-text-tertiary transition-colors duration-150">
              <X size={18} />
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto min-h-0 overscroll-contain">
        {isLoading && <PageSpinner label="Loading..." />}

        {doc && (
          <div className="px-4 sm:px-5 py-4 space-y-5">
            {/* Title & Ref */}
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="text-[11px] font-mono text-text-tertiary">{doc.ref_number}</span>
                <StatusBadge status={doc.status} />
              </div>
              <h3 className="text-[17px] font-semibold text-text-primary">{doc.title}</h3>
              {doc.description && <p className="text-[13px] text-text-secondary mt-1">{doc.description}</p>}
            </div>

            {/* Rejection reason */}
            {doc.status === 'Rejected' && doc.rejected_reason && (
              <div className="bg-danger-50 border border-danger-100 rounded-[var(--radius-md)] p-3 flex items-start gap-2">
                <AlertTriangle size={16} className="text-danger-500 mt-0.5 shrink-0" />
                <div>
                  <p className="text-[11px] font-medium text-danger-700">Rejection Reason</p>
                  <p className="text-[13px] text-danger-600 mt-0.5">{doc.rejected_reason}</p>
                </div>
              </div>
            )}

            {/* Metadata grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {doc.contractor && <MetaItem label="Contractor" value={doc.contractor} />}
              {doc.zone && <MetaItem label="Zone" value={doc.zone} />}
              {doc.due_date && <MetaItem label="Due Date" value={formatDate(doc.due_date)} icon={<Calendar size={12} />} />}
              {doc.submitted_by && <MetaItem label="Submitted By" value={doc.submitted_by.name} icon={<User size={12} />} />}
              {doc.approved_by && <MetaItem label="Approved By" value={doc.approved_by.name} icon={<CheckCircle2 size={12} />} />}
              {doc.approved_at && <MetaItem label="Approved At" value={formatDateTime(doc.approved_at)} icon={<Clock size={12} />} />}
              <MetaItem label="Created" value={formatDateTime(doc.created_at)} icon={<Clock size={12} />} />
              <MetaItem label="Last Updated" value={formatDateTime(doc.updated_at)} icon={<Clock size={12} />} />
            </div>

            {/* Tags */}
            {doc.tags && doc.tags.length > 0 && (
              <div>
                <p className="text-[11px] font-medium text-text-tertiary mb-1">Tags</p>
                <div className="flex flex-wrap gap-1.5">
                  {doc.tags.map(tag => (
                    <span key={tag} className="px-2 py-0.5 bg-surface-sunken text-text-secondary rounded-full text-[11px]">
                      {tag}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Action buttons */}
            <div className="flex flex-wrap gap-2">
              {canUpload && ['Draft', 'Rejected'].includes(doc.status) && (
                <Button
                  variant="primary"
                  size="sm"
                  icon={<Send size={13} />}
                  disabled={doc.current_version < 1 || statusMutation.isPending}
                  onClick={() => statusMutation.mutate({ status: 'Submitted' })}
                >
                  Submit for Review
                </Button>
              )}
              {canApprove && ['Submitted', 'Under Review'].includes(doc.status) && (
                <>
                  <Button
                    variant="secondary"
                    size="sm"
                    icon={<Clock size={13} />}
                    disabled={doc.status === 'Under Review' || statusMutation.isPending}
                    onClick={() => statusMutation.mutate({ status: 'Under Review' })}
                  >
                    Mark Under Review
                  </Button>
                  <Button
                    variant="primary"
                    size="sm"
                    icon={<CheckCircle2 size={13} />}
                    disabled={statusMutation.isPending}
                    onClick={() => statusMutation.mutate({ status: 'Approved' })}
                    className="bg-success-600 hover:bg-success-700"
                  >
                    Approve
                  </Button>
                  <Button
                    variant="danger"
                    size="sm"
                    icon={<XCircle size={13} />}
                    disabled={statusMutation.isPending}
                    onClick={() => setShowReject(true)}
                  >
                    Reject
                  </Button>
                </>
              )}
              {canUpload && ['Submitted', 'Under Review', 'Approved', 'Rejected', 'Superseded'].includes(doc.status) && (
                <Button
                  variant="secondary"
                  size="sm"
                  icon={<RotateCcw size={13} />}
                  disabled={statusMutation.isPending}
                  onClick={() => statusMutation.mutate({ status: 'Draft' })}
                >
                  Revert to Draft
                </Button>
              )}
            </div>

            {/* Reject reason input */}
            {showReject && (
              <div className="bg-danger-50 border border-danger-100 rounded-[var(--radius-md)] p-3 space-y-2">
                <textarea
                  value={rejectReason}
                  onChange={e => setRejectReason(e.target.value)}
                  placeholder="Reason for rejection..."
                  rows={3}
                  className="w-full text-[13px] border border-danger-200 rounded-[var(--radius-sm)] px-3 py-2 bg-surface text-text-primary placeholder:text-text-tertiary outline-none focus:border-danger-500 focus:ring-2 focus:ring-danger-100"
                />
                <div className="flex gap-2">
                  <Button
                    variant="danger"
                    size="sm"
                    disabled={!rejectReason.trim() || statusMutation.isPending}
                    onClick={() => statusMutation.mutate({ status: 'Rejected', rejected_reason: rejectReason })}
                  >
                    Confirm Reject
                  </Button>
                  <Button variant="secondary" size="sm" onClick={() => { setShowReject(false); setRejectReason(''); }}>
                    Cancel
                  </Button>
                </div>
              </div>
            )}

            {/* Upload new version */}
            {canUpload && (
              <div>
                <button
                  onClick={() => setShowUpload(!showUpload)}
                  className="flex items-center gap-1.5 text-[13px] text-primary-600 hover:text-primary-700 font-medium transition-colors duration-150"
                >
                  <Upload size={14} /> Upload New Version
                </button>
                {showUpload && (
                  <div className="mt-2 bg-surface-sunken border border-border rounded-[var(--radius-md)] p-3 space-y-2">
                    <input ref={fileRef} type="file" className="text-[13px] text-text-secondary" accept=".pdf,.doc,.docx,.xls,.xlsx,.dwg,.zip" />
                    <textarea
                      value={uploadNotes}
                      onChange={e => setUploadNotes(e.target.value)}
                      placeholder="Version notes (optional)..."
                      rows={2}
                      className="w-full text-[13px] border border-border rounded-[var(--radius-sm)] px-3 py-2 bg-surface text-text-primary placeholder:text-text-tertiary outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-100"
                    />
                    <Button
                      variant="primary"
                      size="sm"
                      icon={<Upload size={13} />}
                      loading={uploadMutation.isPending}
                      onClick={handleFileUpload}
                    >
                      Upload
                    </Button>
                    {uploadMutation.isError && (
                      <p className="text-[11px] text-danger-600">{(uploadMutation.error as Error).message}</p>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* Status mutation error */}
            {statusMutation.isError && (
              <p className="text-[11px] text-danger-600">{(statusMutation.error as Error).message}</p>
            )}

            {/* Linked Mock-Ups */}
            {linkedMockups.length > 0 && (
              <div>
                <h4 className="text-[13px] font-semibold text-text-primary mb-2 flex items-center gap-1.5">
                  <Layers size={14} className="text-text-tertiary" />
                  Linked Mock-Ups ({linkedMockups.length})
                </h4>
                <div className="space-y-2">
                  {linkedMockups.map(m => (
                    <div key={m.id} className="bg-surface-sunken border border-border rounded-[var(--radius-md)] p-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2 min-w-0">
                          <span className="text-[11px] font-mono text-text-tertiary shrink-0">{m.ref_number}</span>
                          <span className="text-[12px] font-medium text-text-primary truncate">{m.title}</span>
                        </div>
                        <span className="text-[10px] font-mono text-text-tertiary shrink-0 ml-2">Rev {m.revision_number}</span>
                      </div>
                      <div className="flex items-center gap-2 mt-1.5">
                        <span className={`inline-flex items-center px-1.5 py-[1px] rounded-full text-[10px] font-semibold border ${
                          MOCKUP_STATUS_STYLES[m.approval_status] || 'bg-gray-100 text-gray-600 border-gray-200'
                        }`}>
                          {m.approval_status}
                        </span>
                        {m.can_proceed && <ShieldCheck size={12} className="text-green-600" title="Can Proceed" />}
                        {m.compliance_status === 'Pending' && <AlertTriangle size={12} className="text-orange-600" title="Pending Compliance" />}
                        {m.mockup_type && <span className="text-[10px] text-text-tertiary">{m.mockup_type}</span>}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Versions list */}
            <div>
              <h4 className="text-[13px] font-semibold text-text-primary mb-2">
                Version History ({doc.versions.length})
              </h4>
              {doc.versions.length === 0 ? (
                <p className="text-[11px] text-text-tertiary">No files uploaded yet.</p>
              ) : (
                <div className="space-y-2">
                  {doc.versions.map(v => (
                    <div key={v.id} className="bg-surface-sunken border border-border rounded-[var(--radius-md)] p-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <FileText size={14} className="text-text-tertiary" />
                          <div>
                            <p className="text-[13px] font-medium text-text-primary">
                              v{v.version_number} — {v.file_name}
                            </p>
                            <p className="text-[11px] text-text-disabled">
                              {formatBytes(v.file_size)} · {formatDateTime(v.created_at)}
                              {v.uploaded_by && ` · ${v.uploaded_by.name}`}
                            </p>
                          </div>
                        </div>
                        <button
                          onClick={() => handleDownload(v.id, v.file_name)}
                          className="p-1.5 rounded-[var(--radius-sm)] hover:bg-surface text-text-tertiary hover:text-primary-600 transition-colors duration-150"
                          title="Download"
                        >
                          <Download size={14} />
                        </button>
                      </div>
                      {v.notes && <p className="text-[11px] text-text-tertiary mt-1.5 pl-6">{v.notes}</p>}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
        </div>
      </div>

      <TypedDeleteConfirmModal
        open={showDeleteConfirm}
        onClose={() => setShowDeleteConfirm(false)}
        onConfirm={() => deleteMutation.mutate()}
        itemType="RAMS Document"
        itemName={doc?.title}
        message="This document and all its versions will be permanently deleted."
      />
    </div>
  );
}

function MetaItem({ label, value, icon }: { label: string; value: string; icon?: React.ReactNode }) {
  return (
    <div>
      <p className="text-[10px] font-medium text-text-disabled uppercase tracking-wider">{label}</p>
      <p className="text-[13px] text-text-primary flex items-center gap-1 mt-0.5">
        {icon && <span className="text-text-tertiary">{icon}</span>}
        {value}
      </p>
    </div>
  );
}
