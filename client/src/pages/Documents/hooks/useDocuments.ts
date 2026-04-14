import { useState, useCallback, useEffect } from 'react';
import { api } from '../../../services/api';

// ── Types ────────────────────────────────────────────────

export interface DcRevision {
  id: number;
  document_id: number;
  revision_number: string;
  version_label: string | null;
  status: string;
  is_active: boolean;
  issue_date: string | null;
  effective_date: string | null;
  next_review_date: string | null;
  expiry_date: string | null;
  change_summary: string | null;
  reason_for_revision: string | null;
  file_path: string | null;
  original_name: string | null;
  file_type: string | null;
  file_size_kb: number | null;
  submitted_for_review_at: string | null;
  submitted_by: string | null;
  approved_at: string | null;
  approved_by: string | null;
  approved_by_id: string | null;
  activated_at: string | null;
  notes: string | null;
  url: string | null;
  reviews?: DcReview[];
  approvals?: DcApproval[];
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface DcReview {
  id: number;
  document_revision_id: number;
  document_id: number;
  reviewer_id: string | null;
  reviewer_name: string | null;
  reviewer_role: string | null;
  review_status: string;
  review_comments: string | null;
  review_party: string | null;
  reviewed_at: string | null;
  due_date: string | null;
  created_at: string;
}

export interface DcApproval {
  id: number;
  document_revision_id: number;
  document_id: number;
  approver_id: string | null;
  approver_name: string | null;
  approver_role: string | null;
  approval_status: string;
  approval_comments: string | null;
  approval_party: string | null;
  approved_at: string | null;
  due_date: string | null;
  created_at: string;
}

export interface DcLink {
  id: number;
  document_id: number;
  document_revision_id: number | null;
  linked_module: string;
  linked_id: string;
  linked_code: string | null;
  linked_title: string | null;
  link_notes: string | null;
  created_by: string | null;
  created_at: string;
}

export interface DcLog {
  id: number;
  document_id: number;
  document_revision_id: number | null;
  action: string;
  from_status: string | null;
  to_status: string | null;
  performed_by: string | null;
  performed_by_name: string | null;
  performed_by_role: string | null;
  description: string | null;
  metadata: Record<string, unknown> | null;
  created_at: string;
  performer?: { id: string; full_name: string };
}

export interface DcDocument {
  id: number;
  document_code: string;
  document_number: string | null;
  document_title: string;
  short_title: string | null;
  document_type: string;
  document_category: string | null;
  description: string | null;
  department: string | null;
  owner: string | null;
  owner_id: string | null;
  prepared_by: string | null;
  responsible_person: string | null;
  site: string | null;
  project: string | null;
  area: string | null;
  zone: string | null;
  contractor_id: number | null;
  contractor_name: string | null;
  confidentiality_level: string;
  priority: string;
  language: string;
  tags: string[] | null;
  status: string;
  active_revision_id: number | null;
  current_revision_number: string | null;
  next_review_date: string | null;
  expiry_date: string | null;
  is_overdue_review: boolean;
  is_expired: boolean;
  is_expiring_soon: boolean;
  has_active_revision: boolean;
  created_by: string | null;
  updated_by: string | null;
  created_at: string;
  updated_at: string;
  // Relations
  active_revision?: DcRevision | null;
  revisions?: DcRevision[];
  reviews?: DcReview[];
  approvals?: DcApproval[];
  links?: DcLink[];
  logs?: DcLog[];
  owner_rel?: { id: string; full_name: string };
  created_by_rel?: { id: string; full_name: string };
  contractor?: { id: number; contractor_name: string };
  revisions_count?: number;
  links_count?: number;
}

export interface DcStats {
  kpis: {
    total_documents: number;
    active: number;
    under_review: number;
    draft: number;
    approved_pending_activation: number;
    expired: number;
    overdue_review: number;
    expiring_soon: number;
    pending_reviews: number;
    pending_approvals: number;
    obsolete_archived: number;
  };
  by_type: { document_type: string; count: number }[];
  by_category: { document_category: string; count: number }[];
  by_status: { status: string; count: number }[];
  by_department: { department: string; count: number }[];
  monthly_trend: { month: string; documents_created: number; documents_activated: number }[];
  expiry_alerts: { id: number; document_code: string; document_title: string; document_type: string; expiry_date: string; days_to_expiry: number; is_expired: boolean }[];
  review_alerts: { id: number; document_code: string; document_title: string; next_review_date: string; days_overdue: number }[];
  pending_workflow: { id: number; document_code: string; document_title: string; status: string; pending_reviews_count: number; pending_approvals_count: number }[];
}

export interface DcFilters {
  search: string;
  document_type: string;
  document_category: string;
  status: string;
  department: string;
  confidentiality_level: string;
  priority: string;
  is_expired: string;
  is_overdue_review: string;
  is_expiring_soon: string;
  contractor_id: string;
  site: string;
  area: string;
  date_from: string;
  date_to: string;
  period: string;
  sort_by: string;
  sort_dir: string;
  per_page: number;
  page: number;
}

const defaultFilters: DcFilters = {
  search: '',
  document_type: '',
  document_category: '',
  status: '',
  department: '',
  confidentiality_level: '',
  priority: '',
  is_expired: '',
  is_overdue_review: '',
  is_expiring_soon: '',
  contractor_id: '',
  site: '',
  area: '',
  date_from: '',
  date_to: '',
  period: '',
  sort_by: 'document_title',
  sort_dir: 'asc',
  per_page: 20,
  page: 1,
};

export function useDocuments() {
  const [documents, setDocuments] = useState<DcDocument[]>([]);
  const [stats, setStats] = useState<DcStats | null>(null);
  const [selectedDocument, setSelectedDocument] = useState<DcDocument | null>(null);
  const [loading, setLoading] = useState(false);
  const [statsLoading, setStatsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [filters, setFilters] = useState<DcFilters>(defaultFilters);
  const [pagination, setPagination] = useState({ total: 0, page: 1, per_page: 20, last_page: 1 });

  // ── Fetch List ─────────────────────────────────────

  const fetchDocuments = useCallback(async (f?: DcFilters) => {
    setLoading(true);
    setError(null);
    try {
      const p = f || filters;
      const params = new URLSearchParams();
      Object.entries(p).forEach(([k, v]) => {
        if (v !== '' && v !== undefined && v !== null) params.append(k, String(v));
      });
      const res = await api.get<{ data: DcDocument[]; total: number; page: number; per_page: number; last_page: number }>(
        `/document-control?${params.toString()}`
      );
      setDocuments(res.data);
      setPagination({ total: res.total, page: res.page, per_page: res.per_page, last_page: res.last_page });
    } catch (err: any) {
      setError(err.message || 'Failed to load documents');
    } finally {
      setLoading(false);
    }
  }, [filters]);

  // ── Fetch Stats ────────────────────────────────────

  const fetchStats = useCallback(async (year?: number) => {
    setStatsLoading(true);
    try {
      const y = year || new Date().getFullYear();
      const res = await api.get<DcStats>(`/document-control/stats?year=${y}`);
      setStats(res);
    } catch {
      // silent
    } finally {
      setStatsLoading(false);
    }
  }, []);

  // ── Fetch Single ───────────────────────────────────

  const fetchDocument = useCallback(async (id: number): Promise<DcDocument | null> => {
    try {
      const res = await api.get<{ data: DcDocument }>(`/document-control/${id}`);
      setSelectedDocument(res.data);
      return res.data;
    } catch {
      return null;
    }
  }, []);

  // ── CRUD ───────────────────────────────────────────

  const createDocument = useCallback(async (formData: FormData): Promise<DcDocument | null> => {
    const json = await api.uploadForm<{ data: DcDocument }>('/document-control', formData);
    await fetchDocuments();
    await fetchStats();
    return json.data;
  }, [fetchDocuments, fetchStats]);

  const updateDocument = useCallback(async (id: number, data: Record<string, unknown>): Promise<DcDocument | null> => {
    try {
      const res = await api.put<{ data: DcDocument }>(`/document-control/${id}`, data);
      await fetchDocuments();
      return res.data;
    } catch (err: any) {
      throw err;
    }
  }, [fetchDocuments]);

  const deleteDocument = useCallback(async (id: number): Promise<void> => {
    await api.delete(`/document-control/${id}`);
    await fetchDocuments();
    await fetchStats();
  }, [fetchDocuments, fetchStats]);

  // ── Status ─────────────────────────────────────────

  const changeStatus = useCallback(async (id: number, status: string, reason: string): Promise<void> => {
    await api.post(`/document-control/${id}/status`, { status, reason });
    await fetchDocuments();
    await fetchStats();
    if (selectedDocument?.id === id) await fetchDocument(id);
  }, [fetchDocuments, fetchStats, fetchDocument, selectedDocument]);

  // ── Revisions ──────────────────────────────────────

  const createRevision = useCallback(async (docId: number, formData: FormData): Promise<DcRevision | null> => {
    const json = await api.uploadForm<{ data: DcRevision }>(`/document-control/${docId}/revisions`, formData);
    if (selectedDocument?.id === docId) await fetchDocument(docId);
    return json.data;
  }, [fetchDocument, selectedDocument]);

  const uploadRevisionFile = useCallback(async (docId: number, revId: number, formData: FormData): Promise<void> => {
    await api.uploadForm(`/document-control/${docId}/revisions/${revId}/upload`, formData);
    if (selectedDocument?.id === docId) await fetchDocument(docId);
  }, [fetchDocument, selectedDocument]);

  const activateRevision = useCallback(async (docId: number, revId: number): Promise<void> => {
    await api.post(`/document-control/${docId}/revisions/${revId}/activate`, {});
    await fetchDocuments();
    await fetchStats();
    if (selectedDocument?.id === docId) await fetchDocument(docId);
  }, [fetchDocuments, fetchStats, fetchDocument, selectedDocument]);

  // ── Review Workflow ────────────────────────────────

  const submitForReview = useCallback(async (docId: number, revId: number, reviewers: Record<string, unknown>[]): Promise<void> => {
    await api.post(`/document-control/${docId}/revisions/${revId}/submit-review`, { reviewers });
    if (selectedDocument?.id === docId) await fetchDocument(docId);
    await fetchDocuments();
    await fetchStats();
  }, [fetchDocument, fetchDocuments, fetchStats, selectedDocument]);

  const submitReview = useCallback(async (docId: number, revId: number, reviewId: number, data: Record<string, unknown>): Promise<void> => {
    await api.post(`/document-control/${docId}/revisions/${revId}/reviews/${reviewId}`, data);
    if (selectedDocument?.id === docId) await fetchDocument(docId);
    await fetchDocuments();
    await fetchStats();
  }, [fetchDocument, fetchDocuments, fetchStats, selectedDocument]);

  // ── Approval Workflow ──────────────────────────────

  const submitForApproval = useCallback(async (docId: number, revId: number, approvers: Record<string, unknown>[]): Promise<void> => {
    await api.post(`/document-control/${docId}/revisions/${revId}/submit-approval`, { approvers });
    if (selectedDocument?.id === docId) await fetchDocument(docId);
    await fetchDocuments();
    await fetchStats();
  }, [fetchDocument, fetchDocuments, fetchStats, selectedDocument]);

  const submitApproval = useCallback(async (docId: number, revId: number, approvalId: number, data: Record<string, unknown>): Promise<void> => {
    await api.post(`/document-control/${docId}/revisions/${revId}/approvals/${approvalId}`, data);
    if (selectedDocument?.id === docId) await fetchDocument(docId);
    await fetchDocuments();
    await fetchStats();
  }, [fetchDocument, fetchDocuments, fetchStats, selectedDocument]);

  // ── Links ──────────────────────────────────────────

  const addLink = useCallback(async (docId: number, data: Record<string, unknown>): Promise<void> => {
    await api.post(`/document-control/${docId}/links`, data);
    if (selectedDocument?.id === docId) await fetchDocument(docId);
  }, [fetchDocument, selectedDocument]);

  const removeLink = useCallback(async (docId: number, linkId: number): Promise<void> => {
    await api.delete(`/document-control/${docId}/links/${linkId}`);
    if (selectedDocument?.id === docId) await fetchDocument(docId);
  }, [fetchDocument, selectedDocument]);

  // ── Export ─────────────────────────────────────────

  const exportDocuments = useCallback(async (format: string = 'csv') => {
    const params = new URLSearchParams();
    Object.entries(filters).forEach(([k, v]) => {
      if (v !== '' && v !== undefined && v !== null) params.append(k, String(v));
    });
    params.set('format', format);
    const ext = format === 'xlsx' ? 'xlsx' : format === 'pdf' ? 'pdf' : 'csv';
    await api.download(`/document-control/export?${params.toString()}`, `document_control_register_${new Date().toISOString().slice(0, 10)}.${ext}`);
  }, [filters]);

  // ── Auto-fetch ─────────────────────────────────────

  useEffect(() => {
    fetchDocuments();
  }, [filters]);

  useEffect(() => {
    fetchStats();
  }, []);

  return {
    documents, stats, selectedDocument, loading, statsLoading, error,
    filters, setFilters, pagination,
    fetchDocuments, fetchStats, fetchDocument,
    createDocument, updateDocument, deleteDocument,
    changeStatus,
    createRevision, uploadRevisionFile, activateRevision,
    submitForReview, submitReview,
    submitForApproval, submitApproval,
    addLink, removeLink,
    exportDocuments,
    setSelectedDocument,
  };
}
