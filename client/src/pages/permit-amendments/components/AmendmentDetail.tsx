import React, { useState, useCallback, useEffect } from 'react';
import {
  X,
  Edit3,
  Send,
  CheckCircle,
  XCircle,
  MessageSquare,
  Ban,
  FileText,
  Shield,
  AlertTriangle,
  MapPin,
  Clock,
  User,
  Loader2,
  Paperclip,
  Image,
  FileIcon,
  Download,
} from 'lucide-react';
import { format } from 'date-fns';
import type { Amendment, AmendmentLog, AmendmentAttachment } from '../hooks/useAmendments';
import AmendmentStatusBadge from './AmendmentStatusBadge';
import AmendmentCategoryBadge from './AmendmentCategoryBadge';
import RevisionBadge from './RevisionBadge';
import AmendmentTypeBadge from './AmendmentTypeBadge';
import ChangeRowsTable from './ChangeRowsTable';

/* ── Types ─────────────────────────────────────────── */

interface AmendmentDetailProps {
  amendment: Amendment | null;
  onClose: () => void;
  onEdit: () => void;
  onRefresh: () => void;
  onSubmitForReview: (id: string) => Promise<void>;
  onApprove: (id: string, data: { approval_comments?: string; conditions?: string }) => Promise<void>;
  onReject: (id: string, data: { rejection_reason: string }) => Promise<void>;
  onApproveWithComments: (id: string, data: { approval_comments: string; conditions?: string }) => Promise<void>;
  onCancel: (id: string, data: { cancellation_reason: string }) => Promise<void>;
}

/* ── Helpers ───────────────────────────────────────── */

function formatDate(value: string | null | undefined): string {
  if (!value) return '\u2014';
  try {
    return format(new Date(value), 'dd MMM yyyy');
  } catch {
    return value;
  }
}

function formatTimestamp(value: string | null | undefined): string {
  if (!value) return '\u2014';
  try {
    return format(new Date(value), 'dd MMM yyyy, HH:mm');
  } catch {
    return value;
  }
}

/** Map a log action string to a dot color class */
function logDotClass(action: string): string {
  const lower = action.toLowerCase();
  if (lower.includes('creat')) return 'amendment-audit-log__dot--created';
  if (lower.includes('submit')) return 'amendment-audit-log__dot--submitted';
  if (lower.includes('review') || lower.includes('under')) return 'amendment-audit-log__dot--reviewed';
  if (lower.includes('approv')) return 'amendment-audit-log__dot--approved';
  if (lower.includes('reject')) return 'amendment-audit-log__dot--rejected';
  if (lower.includes('revis')) return 'amendment-audit-log__dot--revised';
  if (lower.includes('cancel')) return 'amendment-audit-log__dot--cancelled';
  return 'amendment-audit-log__dot--default';
}

function logActionClass(action: string): string {
  const lower = action.toLowerCase();
  if (lower.includes('approv')) return 'amendment-audit-log__action--approve';
  if (lower.includes('reject')) return 'amendment-audit-log__action--reject';
  if (lower.includes('submit')) return 'amendment-audit-log__action--submit';
  if (lower.includes('revis')) return 'amendment-audit-log__action--revise';
  return '';
}

/** Status-based top border color for the drawer */
const STATUS_BORDER_COLORS: Record<string, string> = {
  Draft: 'var(--color-text-tertiary)',
  Submitted: '#3B82F6',
  'Under Review': '#F59E0B',
  Approved: 'var(--color-success-600)',
  Rejected: 'var(--color-danger-600)',
  'Approved with Comments': '#F59E0B',
  Cancelled: '#9CA3AF',
  Superseded: '#D1D5DB',
};

function getFileIcon(attachment: AmendmentAttachment) {
  const type = (attachment.file_type || '').toLowerCase();
  if (type.includes('pdf')) return <FileText size={18} style={{ color: 'var(--color-danger-500)' }} />;
  if (type.includes('image') || attachment.is_image) return <Image size={18} style={{ color: 'var(--color-info-500)' }} />;
  return <FileIcon size={18} style={{ color: 'var(--color-text-tertiary)' }} />;
}

/* ── Approval Action Type ────────────────────────── */

type ApprovalAction = 'approve' | 'approveWithComments' | 'reject' | 'cancel' | null;

/* ── Component ─────────────────────────────────────── */

const AmendmentDetail: React.FC<AmendmentDetailProps> = ({
  amendment,
  onClose,
  onEdit,
  onRefresh,
  onSubmitForReview,
  onApprove,
  onReject,
  onApproveWithComments,
  onCancel,
}) => {
  /* ── Panel state ───────────────────────────────── */

  const [activeAction, setActiveAction] = useState<ApprovalAction>(null);
  const [actionComment, setActionComment] = useState('');
  const [actionConditions, setActionConditions] = useState('');
  const [actionSubmitting, setActionSubmitting] = useState(false);
  const [submitReviewLoading, setSubmitReviewLoading] = useState(false);

  /* ── Reset on amendment change ─────────────────── */

  useEffect(() => {
    setActiveAction(null);
    setActionComment('');
    setActionConditions('');
    setActionSubmitting(false);
    setSubmitReviewLoading(false);
  }, [amendment?.id]);

  /* ── Keyboard ──────────────────────────────────── */

  useEffect(() => {
    if (!amendment) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (activeAction) {
          setActiveAction(null);
        } else {
          onClose();
        }
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [amendment, activeAction, onClose]);

  /* ── Action handlers ───────────────────────────── */

  const handleSubmitForReview = useCallback(async () => {
    if (!amendment) return;
    setSubmitReviewLoading(true);
    try {
      await onSubmitForReview(amendment.id);
      onRefresh();
    } catch {
      // Handled upstream
    } finally {
      setSubmitReviewLoading(false);
    }
  }, [amendment, onSubmitForReview, onRefresh]);

  const handleActionConfirm = useCallback(async () => {
    if (!amendment || !activeAction) return;
    setActionSubmitting(true);
    try {
      switch (activeAction) {
        case 'approve':
          await onApprove(amendment.id, {
            approval_comments: actionComment.trim() || undefined,
            conditions: actionConditions.trim() || undefined,
          });
          break;
        case 'approveWithComments':
          if (!actionComment.trim()) return;
          await onApproveWithComments(amendment.id, {
            approval_comments: actionComment.trim(),
            conditions: actionConditions.trim() || undefined,
          });
          break;
        case 'reject':
          if (!actionComment.trim()) return;
          await onReject(amendment.id, {
            rejection_reason: actionComment.trim(),
          });
          break;
        case 'cancel':
          if (!actionComment.trim()) return;
          await onCancel(amendment.id, {
            cancellation_reason: actionComment.trim(),
          });
          break;
      }
      setActiveAction(null);
      setActionComment('');
      setActionConditions('');
      onRefresh();
    } catch {
      // Handled upstream
    } finally {
      setActionSubmitting(false);
    }
  }, [amendment, activeAction, actionComment, actionConditions, onApprove, onApproveWithComments, onReject, onCancel, onRefresh]);

  const openAction = useCallback((action: ApprovalAction) => {
    setActiveAction(action);
    setActionComment('');
    setActionConditions('');
  }, []);

  /* ── Early return ──────────────────────────────── */

  if (!amendment) return null;

  /* ── Derived data ──────────────────────────────── */

  const status = amendment.status;
  const isDraftOrRejected = status === 'Draft' || status === 'Rejected';
  const isSubmittedOrUnderReview = status === 'Submitted' || status === 'Under Review';
  const isApproved = status === 'Approved' || status === 'Approved with Comments';
  const isRejected = status === 'Rejected';
  const topBorderColor = STATUS_BORDER_COLORS[status] || 'var(--color-border)';

  const changes = amendment.changes || [];
  const attachments = amendment.attachments || [];
  const logs = amendment.logs || [];

  /* ── Render ────────────────────────────────────── */

  return (
    <>
      {/* Overlay */}
      <div className="amendment-detail-overlay" onClick={onClose} />

      {/* Drawer */}
      <div
        className="amendment-detail-drawer"
        role="dialog"
        aria-modal="true"
        style={{ borderTop: `3px solid ${topBorderColor}` }}
      >
        {/* ── Header ─────────────────────────────── */}
        <div className="amendment-detail-drawer__header">
          <div style={{ flex: 1, minWidth: 0 }}>
            {/* Badges row */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginBottom: 6 }}>
              <span className="amendment-code">{amendment.amendment_code}</span>
              <AmendmentStatusBadge status={amendment.status} />
              <AmendmentCategoryBadge category={amendment.amendment_category as 'Minor' | 'Major'} />
              <RevisionBadge revision={amendment.revision_number} isActive={amendment.is_active_revision} />
            </div>

            {/* Title */}
            <h2
              style={{
                fontSize: 16,
                fontWeight: 700,
                color: 'var(--color-text-primary)',
                margin: 0,
                lineHeight: 1.4,
              }}
            >
              {amendment.amendment_title}
            </h2>
          </div>

          {/* Header actions */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
            <button
              className="btn-secondary px-3 py-1.5 text-xs rounded-lg flex items-center gap-1.5"
              onClick={onEdit}
              title="Edit"
              type="button"
            >
              <Edit3 size={13} />
              Edit
            </button>
            <button
              onClick={onClose}
              style={{
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                padding: 4,
                color: 'var(--color-text-tertiary)',
                display: 'flex',
                alignItems: 'center',
              }}
              title="Close"
            >
              <XIcon size={20} />
            </button>
          </div>
        </div>

        {/* ── Body ───────────────────────────────── */}
        <div className="amendment-detail-drawer__body">

          {/* ── Permit Context Card ──────────────── */}
          <div className="permit-context-card">
            <div className="permit-context-card__icon">
              <Shield size={20} />
            </div>
            <div className="permit-context-card__body">
              <div className="permit-context-card__title">
                {amendment.permit_number_snapshot && (
                  <span className="permit-context-card__permit-number">
                    {amendment.permit_number_snapshot}
                  </span>
                )}
                <span>{amendment.permit_type_snapshot || 'Permit'}</span>
              </div>
              <div className="permit-context-card__meta">
                {amendment.permit_area_snapshot && (
                  <span className="permit-context-card__meta-item">
                    <MapPin size={12} />
                    {amendment.permit_area_snapshot}
                  </span>
                )}
                {amendment.permit?.status && (
                  <span className="permit-context-card__meta-item">
                    <FileText size={12} />
                    Status: {amendment.permit.status}
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* ── Info Grid ────────────────────────── */}
          <div className="amendment-detail-drawer__section">
            <div className="amendment-detail-drawer__section-title">
              <FileText size={14} />
              Amendment Details
            </div>
            <div className="amendment-detail-meta">
              <div className="amendment-detail-meta__item">
                <span className="amendment-detail-meta__label">Type</span>
                <span className="amendment-detail-meta__value">
                  <AmendmentTypeBadge type={amendment.amendment_type} />
                </span>
              </div>
              <div className="amendment-detail-meta__item">
                <span className="amendment-detail-meta__label">Category</span>
                <span className="amendment-detail-meta__value">
                  <AmendmentCategoryBadge category={amendment.amendment_category as 'Minor' | 'Major'} />
                </span>
              </div>
              <div className="amendment-detail-meta__item">
                <span className="amendment-detail-meta__label">Priority</span>
                <span className="amendment-detail-meta__value">
                  <PriorityIndicator priority={amendment.priority} />
                </span>
              </div>
              <div className="amendment-detail-meta__item">
                <span className="amendment-detail-meta__label">Request Date</span>
                <span className="amendment-detail-meta__value">{formatDate(amendment.request_date)}</span>
              </div>
              <div className="amendment-detail-meta__item">
                <span className="amendment-detail-meta__label">Effective From</span>
                <span className="amendment-detail-meta__value">{formatDate(amendment.effective_from)}</span>
              </div>
              <div className="amendment-detail-meta__item">
                <span className="amendment-detail-meta__label">Effective To</span>
                <span className="amendment-detail-meta__value">{formatDate(amendment.effective_to)}</span>
              </div>
              <div className="amendment-detail-meta__item">
                <span className="amendment-detail-meta__label">Requested By</span>
                <span className="amendment-detail-meta__value">
                  {amendment.requested_by_user?.name || amendment.requested_by || '\u2014'}
                </span>
              </div>
              <div className="amendment-detail-meta__item">
                <span className="amendment-detail-meta__label">Reviewed By</span>
                <span className="amendment-detail-meta__value">
                  {amendment.reviewed_by_user?.name || amendment.reviewed_by || '\u2014'}
                </span>
              </div>
              {amendment.reviewed_at && (
                <div className="amendment-detail-meta__item">
                  <span className="amendment-detail-meta__label">Reviewed At</span>
                  <span className="amendment-detail-meta__value">{formatTimestamp(amendment.reviewed_at)}</span>
                </div>
              )}
            </div>
          </div>

          {/* ── Major Change Warning ─────────────── */}
          {amendment.is_major_change_flagged && (
            <div className="major-change-warning">
              <AlertTriangle size={20} className="major-change-warning__icon" />
              <div className="major-change-warning__content">
                <div className="major-change-warning__title">Major Change Warning</div>
                <div className="major-change-warning__text">
                  {amendment.major_change_note || 'This amendment has been flagged as a major change requiring elevated review.'}
                </div>
              </div>
            </div>
          )}

          {/* ── Reason ───────────────────────────── */}
          <div className="amendment-detail-drawer__section">
            <div className="amendment-detail-drawer__section-title">
              <MessageSquare size={14} />
              Reason for Amendment
            </div>
            <div
              style={{
                fontSize: 13,
                color: 'var(--color-text-secondary)',
                lineHeight: 1.6,
                whiteSpace: 'pre-wrap',
              }}
            >
              {amendment.reason || amendment.amendment_reason || '\u2014'}
            </div>
          </div>

          {/* ── Change Rows Table ────────────────── */}
          <div className="amendment-detail-drawer__section">
            <div className="amendment-detail-drawer__section-title">
              <FileText size={14} />
              Change Details
              {changes.length > 0 && (
                <span
                  style={{
                    marginLeft: 6,
                    fontSize: 10,
                    fontWeight: 700,
                    padding: '1px 7px',
                    borderRadius: 9999,
                    background: 'var(--color-primary-50)',
                    color: 'var(--color-primary-700)',
                  }}
                >
                  {changes.length}
                </span>
              )}
            </div>
            <ChangeRowsTable changes={changes} mode="view" />
          </div>

          {/* ── Approval Panel ───────────────────── */}
          {isSubmittedOrUnderReview && (
            <div className="approval-panel">
              <div className="approval-panel__title">
                <Shield size={14} />
                Review Actions
              </div>

              {!activeAction && (
                <div className="approval-panel__actions">
                  <button
                    className="approval-panel__btn approval-panel__btn--approve"
                    onClick={() => openAction('approve')}
                    type="button"
                  >
                    <CheckCircle size={14} />
                    Approve
                  </button>
                  <button
                    className="approval-panel__btn approval-panel__btn--approve-with-comments"
                    onClick={() => openAction('approveWithComments')}
                    type="button"
                  >
                    <MessageSquare size={14} />
                    Approve with Comments
                  </button>
                  <button
                    className="approval-panel__btn approval-panel__btn--reject"
                    onClick={() => openAction('reject')}
                    type="button"
                  >
                    <XCircle size={14} />
                    Reject
                  </button>
                </div>
              )}

              {/* Approve confirm */}
              {activeAction === 'approve' && (
                <div className="approval-panel__confirm">
                  <div className="approval-panel__confirm-text">Approve this amendment?</div>
                  <textarea
                    className="approval-panel__comment-input"
                    value={actionComment}
                    onChange={(e) => setActionComment(e.target.value)}
                    placeholder="Optional approval comments..."
                    rows={2}
                  />
                  <textarea
                    className="approval-panel__comment-input"
                    value={actionConditions}
                    onChange={(e) => setActionConditions(e.target.value)}
                    placeholder="Optional conditions..."
                    rows={2}
                    style={{ marginTop: 6 }}
                  />
                  <div className="approval-panel__confirm-actions">
                    <button
                      className="approval-panel__btn approval-panel__btn--approve"
                      onClick={handleActionConfirm}
                      disabled={actionSubmitting}
                      type="button"
                    >
                      {actionSubmitting ? <Loader2 size={14} className="animate-spin" /> : <CheckCircle size={14} />}
                      Confirm Approve
                    </button>
                    <button
                      className="btn-secondary px-3 py-2 text-xs rounded-lg"
                      onClick={() => setActiveAction(null)}
                      disabled={actionSubmitting}
                      type="button"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              )}

              {/* Approve with Comments confirm */}
              {activeAction === 'approveWithComments' && (
                <div className="approval-panel__confirm">
                  <div className="approval-panel__confirm-text">Approve with conditions / comments</div>
                  <textarea
                    className="approval-panel__comment-input"
                    value={actionComment}
                    onChange={(e) => setActionComment(e.target.value)}
                    placeholder="Approval comments (required)..."
                    rows={3}
                  />
                  <textarea
                    className="approval-panel__comment-input"
                    value={actionConditions}
                    onChange={(e) => setActionConditions(e.target.value)}
                    placeholder="Conditions of approval (optional)..."
                    rows={2}
                    style={{ marginTop: 6 }}
                  />
                  <div className="approval-panel__confirm-actions">
                    <button
                      className="approval-panel__btn approval-panel__btn--approve-with-comments"
                      onClick={handleActionConfirm}
                      disabled={actionSubmitting || !actionComment.trim()}
                      type="button"
                    >
                      {actionSubmitting ? <Loader2 size={14} className="animate-spin" /> : <CheckCircle size={14} />}
                      Confirm
                    </button>
                    <button
                      className="btn-secondary px-3 py-2 text-xs rounded-lg"
                      onClick={() => setActiveAction(null)}
                      disabled={actionSubmitting}
                      type="button"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              )}

              {/* Reject confirm */}
              {activeAction === 'reject' && (
                <div className="approval-panel__confirm">
                  <div className="approval-panel__confirm-text" style={{ color: 'var(--color-danger-700)' }}>
                    Reject this amendment?
                  </div>
                  <textarea
                    className="approval-panel__comment-input"
                    value={actionComment}
                    onChange={(e) => setActionComment(e.target.value)}
                    placeholder="Rejection reason (required)..."
                    rows={3}
                  />
                  <div className="approval-panel__confirm-actions">
                    <button
                      className="approval-panel__btn approval-panel__btn--reject"
                      onClick={handleActionConfirm}
                      disabled={actionSubmitting || !actionComment.trim()}
                      type="button"
                    >
                      {actionSubmitting ? <Loader2 size={14} className="animate-spin" /> : <XCircle size={14} />}
                      Confirm Reject
                    </button>
                    <button
                      className="btn-secondary px-3 py-2 text-xs rounded-lg"
                      onClick={() => setActiveAction(null)}
                      disabled={actionSubmitting}
                      type="button"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Submit for Review button (Draft / Rejected) */}
          {isDraftOrRejected && (
            <div className="approval-panel">
              <div className="approval-panel__title">
                <Send size={14} />
                Workflow
              </div>
              <div className="approval-panel__actions">
                <button
                  className="approval-panel__btn approval-panel__btn--approve"
                  onClick={handleSubmitForReview}
                  disabled={submitReviewLoading}
                  type="button"
                >
                  {submitReviewLoading ? (
                    <Loader2 size={14} className="animate-spin" />
                  ) : (
                    <Send size={14} />
                  )}
                  Submit for Review
                </button>
                {!isDraftOrRejected || (
                  <button
                    className="approval-panel__btn"
                    style={{ color: 'var(--color-danger-600)', borderColor: 'var(--color-danger-200)' }}
                    onClick={() => openAction('cancel')}
                    type="button"
                  >
                    <Ban size={14} />
                    Cancel Amendment
                  </button>
                )}
              </div>

              {/* Cancel confirm */}
              {activeAction === 'cancel' && (
                <div className="approval-panel__confirm" style={{ marginTop: 12 }}>
                  <div className="approval-panel__confirm-text" style={{ color: 'var(--color-danger-700)' }}>
                    Cancel this amendment?
                  </div>
                  <textarea
                    className="approval-panel__comment-input"
                    value={actionComment}
                    onChange={(e) => setActionComment(e.target.value)}
                    placeholder="Cancellation reason (required)..."
                    rows={2}
                  />
                  <div className="approval-panel__confirm-actions">
                    <button
                      className="approval-panel__btn approval-panel__btn--reject"
                      onClick={handleActionConfirm}
                      disabled={actionSubmitting || !actionComment.trim()}
                      type="button"
                    >
                      {actionSubmitting ? <Loader2 size={14} className="animate-spin" /> : <Ban size={14} />}
                      Confirm Cancel
                    </button>
                    <button
                      className="btn-secondary px-3 py-2 text-xs rounded-lg"
                      onClick={() => setActiveAction(null)}
                      disabled={actionSubmitting}
                      type="button"
                    >
                      Back
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ── Rejection Info ───────────────────── */}
          {isRejected && amendment.rejection_reason && (
            <div
              className="amendment-detail-drawer__section"
              style={{
                background: 'var(--color-danger-50)',
                borderColor: 'var(--color-danger-200)',
                borderLeft: '4px solid var(--color-danger-500)',
              }}
            >
              <div className="amendment-detail-drawer__section-title" style={{ color: 'var(--color-danger-700)' }}>
                <XCircle size={14} />
                Rejection Details
              </div>
              <div style={{ fontSize: 13, color: 'var(--color-danger-700)', lineHeight: 1.6, whiteSpace: 'pre-wrap', marginBottom: 8 }}>
                {amendment.rejection_reason}
              </div>
              <div style={{ display: 'flex', gap: 16, fontSize: 11, color: 'var(--color-danger-600)' }}>
                {amendment.rejected_by && (
                  <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                    <User size={11} />
                    {amendment.rejected_by}
                  </span>
                )}
                {amendment.rejected_at && (
                  <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                    <Clock size={11} />
                    {formatTimestamp(amendment.rejected_at)}
                  </span>
                )}
              </div>
            </div>
          )}

          {/* ── Approval Info ────────────────────── */}
          {isApproved && (amendment.approval_comments || amendment.conditions) && (
            <div
              className="amendment-detail-drawer__section"
              style={{
                background: 'var(--color-success-50)',
                borderColor: 'var(--color-success-200)',
                borderLeft: '4px solid var(--color-success-500)',
              }}
            >
              <div className="amendment-detail-drawer__section-title" style={{ color: 'var(--color-success-700)' }}>
                <CheckCircle size={14} />
                Approval Details
              </div>
              {amendment.approval_comments && (
                <div style={{ fontSize: 13, color: 'var(--color-success-700)', lineHeight: 1.6, whiteSpace: 'pre-wrap', marginBottom: 8 }}>
                  {amendment.approval_comments}
                </div>
              )}
              {amendment.conditions && (
                <div style={{ marginBottom: 8 }}>
                  <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--color-success-700)', marginBottom: 2, textTransform: 'uppercase', letterSpacing: '0.03em' }}>
                    Conditions
                  </div>
                  <div style={{ fontSize: 13, color: 'var(--color-success-700)', lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>
                    {amendment.conditions}
                  </div>
                </div>
              )}
              <div style={{ display: 'flex', gap: 16, fontSize: 11, color: 'var(--color-success-600)' }}>
                {(amendment.reviewed_by_user?.name || amendment.reviewed_by) && (
                  <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                    <User size={11} />
                    {amendment.reviewed_by_user?.name || amendment.reviewed_by}
                  </span>
                )}
                {amendment.reviewed_at && (
                  <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                    <Clock size={11} />
                    {formatTimestamp(amendment.reviewed_at)}
                  </span>
                )}
              </div>
            </div>
          )}

          {/* ── Attachments ──────────────────────── */}
          {attachments.length > 0 && (
            <div className="amendment-detail-drawer__section">
              <div className="amendment-detail-drawer__section-title">
                <Paperclip size={14} />
                Attachments
                <span
                  style={{
                    marginLeft: 6,
                    fontSize: 10,
                    fontWeight: 700,
                    padding: '1px 7px',
                    borderRadius: 9999,
                    background: 'var(--color-surface-sunken)',
                    color: 'var(--color-text-tertiary)',
                  }}
                >
                  {attachments.length}
                </span>
              </div>
              <div className="amendment-attachments">
                {attachments.map((att) => (
                  <a
                    key={att.id}
                    href={att.url || att.file_path}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="amendment-attachments__item"
                    title={att.original_name || att.file_path}
                    style={{ textDecoration: 'none' }}
                  >
                    {att.is_image && att.url ? (
                      <img
                        src={att.url}
                        alt={att.original_name || 'Attachment'}
                        className="amendment-attachments__preview"
                      />
                    ) : (
                      <div className="amendment-attachments__icon">
                        {getFileIcon(att)}
                      </div>
                    )}
                    <div className="amendment-attachments__name">
                      {att.original_name || 'Attachment'}
                    </div>
                    {att.file_size_kb != null && (
                      <div className="amendment-attachments__size">
                        {att.file_size_kb < 1024
                          ? `${att.file_size_kb} KB`
                          : `${(att.file_size_kb / 1024).toFixed(1)} MB`}
                      </div>
                    )}
                    <Download size={12} style={{ color: 'var(--color-text-tertiary)' }} />
                  </a>
                ))}
              </div>
            </div>
          )}

          {/* ── Audit Log ────────────────────────── */}
          {logs.length > 0 && (
            <div className="amendment-detail-drawer__section">
              <div className="amendment-detail-drawer__section-title">
                <Clock size={14} />
                Audit Log
              </div>
              <div className="amendment-audit-log">
                {logs.map((log) => (
                  <div key={log.id} className="amendment-audit-log__item">
                    <div className={`amendment-audit-log__dot ${logDotClass(log.action)}`} />
                    <div className="amendment-audit-log__content">
                      <div className="amendment-audit-log__header">
                        <div>
                          <span className="amendment-audit-log__actor">
                            {log.performed_by_name || log.performed_by || 'System'}
                          </span>
                          {log.performed_by_role && (
                            <span style={{ fontSize: 10, color: 'var(--color-text-tertiary)', marginLeft: 4 }}>
                              ({log.performed_by_role})
                            </span>
                          )}
                        </div>
                        <span className="amendment-audit-log__time">
                          {formatTimestamp(log.created_at)}
                        </span>
                      </div>
                      <div className={`amendment-audit-log__action ${logActionClass(log.action)}`}>
                        {log.action}
                        {log.from_status && log.to_status && (
                          <span style={{ fontWeight: 400, color: 'var(--color-text-tertiary)', marginLeft: 4 }}>
                            ({log.from_status} {'\u2192'} {log.to_status})
                          </span>
                        )}
                      </div>
                      {log.description && (
                        <div className="amendment-audit-log__message">{log.description}</div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ── Notes ────────────────────────────── */}
          {amendment.notes && (
            <div className="amendment-detail-drawer__section">
              <div className="amendment-detail-drawer__section-title">
                <MessageSquare size={14} />
                Notes
              </div>
              <div
                style={{
                  fontSize: 13,
                  color: 'var(--color-text-secondary)',
                  lineHeight: 1.6,
                  whiteSpace: 'pre-wrap',
                }}
              >
                {amendment.notes}
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
};

/* ── Priority Indicator helper ───────────────────── */

const PRIORITY_COLORS: Record<string, { text: string; bg: string; border: string }> = {
  Low: { text: '#166534', bg: '#F0FDF4', border: '#BBF7D0' },
  Medium: { text: '#1E40AF', bg: '#DBEAFE', border: '#93C5FD' },
  High: { text: '#C2410C', bg: '#FFF7ED', border: '#FDBA74' },
  Urgent: { text: '#991B1B', bg: '#FEE2E2', border: '#FCA5A5' },
  Critical: { text: '#FFFFFF', bg: '#DC2626', border: '#DC2626' },
};

const PriorityIndicator: React.FC<{ priority: string }> = ({ priority }) => {
  const colors = PRIORITY_COLORS[priority] ?? { text: '#374151', bg: '#F3F4F6', border: '#D1D5DB' };
  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        padding: '2px 8px',
        borderRadius: 9999,
        fontSize: 11,
        fontWeight: 600,
        lineHeight: 1.4,
        whiteSpace: 'nowrap',
        backgroundColor: colors.bg,
        color: colors.text,
        border: `1px solid ${colors.border}`,
      }}
    >
      {priority}
    </span>
  );
};

export default AmendmentDetail;
